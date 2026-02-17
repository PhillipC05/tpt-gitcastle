import { IDataStore, ISecureStore } from './stores'
import { getKeyForAccount } from '../auth'
import { Account, isDotComAccount, GitProvider } from '../../models/account'
import { fetchUser, EmailVisibility, getEnterpriseAPIURL } from '../api'
import { fatalError } from '../fatal-error'
import { TypedBaseStore } from './base-store'
import { isGHE } from '../endpoint-capabilities'
import { compare, compareDescending } from '../compare'
import { v4 as uuidv4 } from 'uuid'

// Ensure that GitHub.com accounts appear first followed by Enterprise
// accounts, sorted by the order in which they were added.
const sortAccounts = (accounts: ReadonlyArray<Account>) =>
  accounts
    .map((account, ix) => [account, ix] as const)
    .sort(
      ([xAccount, xIx], [yAccount, yIx]) =>
        compareDescending(
          isDotComAccount(xAccount),
          isDotComAccount(yAccount)
        ) || compare(xIx, yIx)
    )
    .map(([account]) => account)

/** The data-only interface for storage. */
interface IEmail {
  readonly email: string
  /**
   * Represents whether GitHub has confirmed the user has access to this
   * email address. New users require a verified email address before
   * they can sign into GitHub Desktop.
   */
  readonly verified: boolean
  /**
   * Flag for the user's preferred email address. Other email addresses
   * are provided for associating commit authors with the one GitHub account.
   */
  readonly primary: boolean

  /** The way in which the email is visible. */
  readonly visibility: EmailVisibility
}

function isKeyChainError(e: any) {
  const error = e as Error
  return (
    error.message &&
    error.message.startsWith(
      'The user name or passphrase you entered is not correct'
    )
  )
}

/** The data-only interface for storage. */
interface IAccount {
  readonly accountId: string
  readonly token: string
  readonly login: string
  readonly endpoint: string
  readonly emails: ReadonlyArray<IEmail>
  readonly avatarURL: string
  readonly id: number
  readonly name: string
  readonly provider: GitProvider
  readonly plan?: string
  readonly profileName?: string
  readonly isActive: boolean
}

/** The store for logged in accounts. */
export class AccountsStore extends TypedBaseStore<ReadonlyArray<Account>> {
  private dataStore: IDataStore
  private secureStore: ISecureStore

  private accounts: ReadonlyArray<Account> = []

  /** A promise that will resolve when the accounts have been loaded. */
  private loadingPromise: Promise<void>

  public constructor(dataStore: IDataStore, secureStore: ISecureStore) {
    super()

    this.dataStore = dataStore
    this.secureStore = secureStore
    this.loadingPromise = this.loadFromStore()
  }

  /**
   * Get the list of accounts in the cache.
   */
  public async getAll(): Promise<ReadonlyArray<Account>> {
    await this.loadingPromise

    return this.accounts.slice()
  }

  /**
   * Get the currently active account.
   */
  public async getActiveAccount(): Promise<Account | null> {
    await this.loadingPromise

    const activeAccount = this.accounts.find(a => a.isActive)
    return activeAccount || this.accounts[0] || null
  }

  /**
   * Set the active account.
   */
  public async setActiveAccount(account: Account): Promise<void> {
    await this.loadingPromise

    this.accounts = this.accounts.map(a => 
      a.accountId === account.accountId ? a.withActive(true) : a.withActive(false)
    )

    this.save()
  }

  /**
   * Add the account to the store.
   */
  public async addAccount(account: Account): Promise<Account | null> {
    await this.loadingPromise

    try {
      const key = getKeyForAccount(account)
      await this.secureStore.setItem(key, account.login, account.token)
    } catch (e) {
      log.error(`Error adding account '${account.login}'`, e)

      if (__DARWIN__ && isKeyChainError(e)) {
        this.emitError(
          new Error(
            `GitHub Desktop was unable to store the account token in the keychain. Please check you have unlocked access to the 'login' keychain.`
          )
        )
      } else {
        this.emitError(e)
      }
      return null
    }

    // Add new account to the list (no deduplication - allow multiple accounts per endpoint)
    this.accounts = sortAccounts([...this.accounts, account])

    // If this is the first account, make it active
    if (this.accounts.length === 1) {
      this.accounts = this.accounts.map(a => a.withActive(true))
    }

    this.save()
    return account
  }

  /** Refresh all accounts by fetching their latest info from the API. */
  public async refresh(): Promise<void> {
    this.accounts = await Promise.all(
      this.accounts.map(acc => this.tryUpdateAccount(acc))
    )

    this.save()
    this.emitUpdate(this.accounts)
  }

  /**
   * Attempts to update the Account with new information from
   * the API.
   *
   * If the update fails for whatever reason this function
   * will return the old Account instance. Usually updates fails
   * due to connectivity issues but in the future we should
   * investigate whether we're able to detect here that the
   * token is definitely not valid anymore and let the
   * user know that they've been signed out.
   */
  private async tryUpdateAccount(account: Account): Promise<Account> {
    try {
      return await updatedAccount(account)
    } catch (e) {
      log.warn(`Error refreshing account '${account.login}'`, e)
      return account
    }
  }

  /**
   * Remove the account from the store.
   */
  public async removeAccount(account: Account): Promise<void> {
    await this.loadingPromise

    try {
      await this.secureStore.deleteItem(
        getKeyForAccount(account),
        account.login
      )
    } catch (e) {
      log.error(`Error removing account '${account.login}'`, e)
      this.emitError(e)
      return
    }

    const wasActive = account.isActive
    this.accounts = this.accounts.filter(
      a => a.accountId !== account.accountId
    )

    // If we removed the active account and there are other accounts, make the first one active
    if (wasActive && this.accounts.length > 0) {
      this.accounts = this.accounts.map((a, index) => 
        index === 0 ? a.withActive(true) : a
      )
    }

    this.save()
  }

  /**
   * Update an existing account's profile name.
   */
  public async updateProfileName(account: Account, profileName: string): Promise<void> {
    await this.loadingPromise

    this.accounts = this.accounts.map(a => 
      a.accountId === account.accountId ? a.withProfileName(profileName) : a
    )

    this.save()
  }

  private getMigratedGHEAccounts(
    accounts: ReadonlyArray<IAccount>
  ): ReadonlyArray<IAccount> | null {
    let migrated = false
    const migratedAccounts = accounts.map(account => {
      let endpoint = account.endpoint
      const endpointURL = new URL(endpoint)
      // Migrate endpoints of subdomains of `.ghe.com` that use the `/api/v3`
      // path to the correct URL using the `api.` subdomain.
      if (isGHE(endpoint) && !endpointURL.hostname.startsWith('api.')) {
        endpoint = getEnterpriseAPIURL(endpoint)
        migrated = true
      }

      return {
        ...account,
        endpoint,
      }
    })

    return migrated ? migratedAccounts : null
  }

  /**
   * Load the users into memory from storage.
   */
  private async loadFromStore(): Promise<void> {
    const raw = this.dataStore.getItem('users')
    if (!raw || !raw.length) {
      return
    }

    const parsedAccounts: ReadonlyArray<IAccount> = JSON.parse(raw)
    const migratedAccounts = this.getMigratedGHEAccounts(parsedAccounts)
    const rawAccounts = migratedAccounts ?? parsedAccounts

    const accountsWithTokens = []
    for (const account of rawAccounts) {
      // Migration: Generate accountId for legacy accounts without one
      const accountId = account.accountId || uuidv4()
      
      // Migration: Determine provider from endpoint if not set
      const provider = account.provider || this.inferProvider(account.endpoint)

      const accountWithoutToken = new Account(
        accountId,
        account.login,
        account.endpoint,
        '',
        account.emails,
        account.avatarURL,
        account.id,
        account.name,
        provider,
        account.plan,
        account.profileName,
        account.isActive || false
      )

      const key = getKeyForAccount(accountWithoutToken)
      try {
        const token = await this.secureStore.getItem(key, account.login)
        accountsWithTokens.push(accountWithoutToken.withToken(token || ''))
      } catch (e) {
        log.error(`Error getting token for '${key}'. Skipping.`, e)

        this.emitError(e)
      }
    }

    this.accounts = sortAccounts(accountsWithTokens)
    
    // If no account is active, make the first one active
    if (this.accounts.length > 0 && !this.accounts.some(a => a.isActive)) {
      this.accounts = this.accounts.map((a, index) => 
        index === 0 ? a.withActive(true) : a
      )
    }
    
    // If any account was migrated, make sure to persist the new value
    if (migratedAccounts !== null) {
      this.save() // Save already emits an update
    } else {
      this.emitUpdate(this.accounts)
    }
  }

  /**
   * Infer the Git provider from the endpoint URL.
   * Used for migration of legacy accounts.
   */
  private inferProvider(endpoint: string): GitProvider {
    if (endpoint.includes('github.com') && !endpoint.includes('api.github.com')) {
      return 'github'
    }
    if (endpoint.includes('gitcastle.tptsolutions.co.nz')) {
      return 'gitcastle'
    }
    if (endpoint.includes('gitlab')) {
      return 'gitlab'
    }
    // Default to github-enterprise for other endpoints
    return 'github-enterprise'
  }

  private save() {
    const usersWithoutTokens = this.accounts.map(account =>
      account.withToken('')
    )
    this.dataStore.setItem('users', JSON.stringify(usersWithoutTokens))

    this.emitUpdate(this.accounts)
  }
}

async function updatedAccount(account: Account): Promise<Account> {
  if (!account.token) {
    return fatalError(
      `Cannot update an account which doesn't have a token: ${account.login}`
    )
  }

  return fetchUser(account.endpoint, account.token)
}
