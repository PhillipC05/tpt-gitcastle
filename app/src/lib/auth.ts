import { Account } from '../models/account'

/** Get the auth key for the account. */
export function getKeyForAccount(account: Account): string {
  // Use the account's storageKey which includes provider and accountId
  // This allows multiple accounts per endpoint
  return account.storageKey
}

/** Get the auth key for the endpoint. */
export function getKeyForEndpoint(endpoint: string): string {
  const appName = __DEV__ ? 'GitHub Desktop Dev' : 'GitHub'

  return `${appName} - ${endpoint}`
}

/** Get a legacy auth key for the endpoint (for backward compatibility). */
export function getLegacyKeyForEndpoint(endpoint: string): string {
  const appName = __DEV__ ? 'GitHub Desktop Dev' : 'GitHub'

  return `${appName} - ${endpoint}`
}
