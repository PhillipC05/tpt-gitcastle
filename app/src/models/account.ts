import { getDotComAPIEndpoint, getHTMLURL, IAPIEmail } from '../lib/api'
import { v4 as uuidv4 } from 'uuid'

/**
 * Supported Git providers
 */
export type GitProvider = 'github' | 'github-enterprise' | 'gitcastle' | 'gitlab' | 'gitea' | 'forgejo' | 'other'

/**
 * Returns a value indicating whether two account instances
 * can be considered equal. Equality is determined by comparing
 * the two instances' accountId. This allows
 * us to keep receiving updated Account details from the API
 * while still maintaining the association between repositories
 * and a particular account.
 */
export function accountEquals(x: Account, y: Account) {
  return x.accountId === y.accountId
}


/**
 * A Git account, representing the user found on GitHub, GitHub Enterprise,
 * TPT GitCastle, or other Git providers.
 *
 * This contains a token that will be used for operations that require authentication.
 */
export class Account {
  /** Create an account which can be used to perform unauthenticated API actions */
  public static anonymous(): Account {
    return new Account(
      uuidv4(),
      '',
      getDotComAPIEndpoint(),
      '',
      [],
      '',
      -1,
      '',
      'github',
      'free'
    )
  }

  private _friendlyEndpoint: string | undefined = undefined

  /**
   * Create an instance of an account
   *
   * @param accountId Unique identifier for this account (UUID)
   * @param login The login name for this account
   * @param endpoint The server for this account - GitHub or a GitHub Enterprise instance
   * @param token The access token used to perform operations on behalf of this account
   * @param emails The current list of email addresses associated with the account
   * @param avatarURL The profile URL to render for this account
   * @param id The GitHub.com or GitHub Enterprise database id for this account.
   * @param name The friendly name associated with this account
   * @param provider The Git provider type (github, github-enterprise, gitcastle, etc.)
   * @param plan The plan associated with this account
   * @param profileName User-defined name for this account (e.g., "Work", "Personal")
   * @param isActive Whether this is the currently active account
   * @param copilotEndpoint The endpoint for the Copilot API
   * @param isCopilotDesktopEnabled Whether Copilot for Desktop is enabled for this account
   * @param features The Desktop-specific features available to this account
   */
  public constructor(
    public readonly accountId: string,
    public readonly login: string,
    public readonly endpoint: string,
    public readonly token: string,
    public readonly emails: ReadonlyArray<IAPIEmail>,
    public readonly avatarURL: string,
    public readonly id: number,
    public readonly name: string,
    public readonly provider: GitProvider = 'github',
    public readonly plan?: string,
    public readonly profileName?: string,
    public readonly isActive: boolean = false,
    public readonly copilotEndpoint?: string,
    public readonly isCopilotDesktopEnabled?: boolean,
    public readonly features?: ReadonlyArray<string>
  ) {}

  public withToken(token: string): Account {
    return new Account(
      this.accountId,
      this.login,
      this.endpoint,
      token,
      this.emails,
      this.avatarURL,
      this.id,
      this.name,
      this.provider,
      this.plan,
      this.profileName,
      this.isActive,
      this.copilotEndpoint,
      this.isCopilotDesktopEnabled,
      this.features
    )
  }

  /**
   * Returns a new Account with the specified active state
   */
  public withActive(isActive: boolean): Account {
    return new Account(
      this.accountId,
      this.login,
      this.endpoint,
      this.token,
      this.emails,
      this.avatarURL,
      this.id,
      this.name,
      this.provider,
      this.plan,
      this.profileName,
      isActive,
      this.copilotEndpoint,
      this.isCopilotDesktopEnabled,
      this.features
    )
  }

  /**
   * Returns a new Account with the specified profile name
   */
  public withProfileName(profileName: string): Account {
    return new Account(
      this.accountId,
      this.login,
      this.endpoint,
      this.token,
      this.emails,
      this.avatarURL,
      this.id,
      this.name,
      this.provider,
      this.plan,
      profileName,
      this.isActive,
      this.copilotEndpoint,
      this.isCopilotDesktopEnabled,
      this.features
    )
  }


  /**
   * Get a name to display
   *
   * This will by default return the 'name' as it is the friendly name.
   * However, if not defined, we return the login
   */
  public get friendlyName(): string {
    return this.name !== '' ? this.name : this.login
  }

  /**
   * Get a human-friendly description of the Account endpoint.
   *
   * Accounts on GitHub.com will return the string 'GitHub.com'
   * whereas GitHub Enterprise accounts will return the
   * hostname without the protocol and/or path.
   */
  public get friendlyEndpoint(): string {
    return (this._friendlyEndpoint ??= isDotComAccount(this)
      ? 'GitHub.com'
      : new URL(getHTMLURL(this.endpoint)).hostname)
  }

  /**
   * Get the display name for this account.
   * Returns profileName if set, otherwise falls back to friendlyName
   */
  public get displayName(): string {
    return this.profileName || this.friendlyName
  }

  /**
   * Get a unique key for this account suitable for storage
   */
  public get storageKey(): string {
    return `${this.provider}-${this.accountId}`
  }

}

/**
 * Whether or not the given account is a GitHub.com account as opposed to
 * a GitHub Enteprise account.
 */
export const isDotComAccount = (account: Account) =>
  account.endpoint === getDotComAPIEndpoint()

/**
 * Whether or not the given account is a GitHub Enterprise account (as opposed to
 * a GitHub.com account)
 */
export const isEnterpriseAccount = (account: Account) =>
  !isDotComAccount(account) && account.provider === 'github-enterprise'

/**
 * Whether or not the given account is a TPT GitCastle account
 */
export const isGitCastleAccount = (account: Account) =>
  account.provider === 'gitcastle'

/**
 * Get the provider display name for an account
 */
export const getProviderDisplayName = (account: Account): string => {
  switch (account.provider) {
    case 'github':
      return isDotComAccount(account) ? 'GitHub' : 'GitHub Enterprise'
    case 'gitcastle':
      return 'TPT GitCastle'
    case 'gitlab':
      return 'GitLab'
    case 'gitea':
      return 'Gitea'
    case 'forgejo':
      return 'Forgejo'
    default:
      return 'Git'
  }
}
