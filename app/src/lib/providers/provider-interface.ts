import { Account } from '../../models/account'
import { GitProvider, IProviderCapabilities } from '../../models/git-provider'
import { IAPIFullIdentity, IAPIEmail, IAPIRepository, IAPIPullRequest } from '../api'


/**
 * Authentication method types
 */
export type AuthMethod = 'oauth' | 'token' | 'basic'

/**
 * OAuth configuration for a provider
 */
export interface IOAuthConfig {
  /** OAuth client ID */
  readonly clientId: string
  /** OAuth authorization endpoint URL */
  readonly authorizationEndpoint: string
  /** OAuth token endpoint URL */
  readonly tokenEndpoint: string
  /** OAuth scopes to request */
  readonly scopes: ReadonlyArray<string>
  /** Additional OAuth parameters */
  readonly additionalParams?: Record<string, string>
}

/**
 * Repository search/filter options
 */
export interface IRepositorySearchOptions {
  /** Filter by visibility */
  readonly visibility?: 'all' | 'public' | 'private'
  /** Filter by affiliation */
  readonly affiliation?: 'owner' | 'collaborator' | 'organization_member'
  /** Search query string */
  readonly query?: string
  /** Sort field */
  readonly sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  /** Sort direction */
  readonly direction?: 'asc' | 'desc'
  /** Pagination - page number */
  readonly page?: number
  /** Pagination - items per page */
  readonly perPage?: number
}

/**
 * Result of an OAuth flow
 */
export interface IOAuthResult {
  /** Access token */
  readonly token: string
  /** Token type (usually 'bearer') */
  readonly tokenType: string
  /** Refresh token (if provided) */
  readonly refreshToken?: string
  /** Token expiration time in seconds */
  readonly expiresIn?: number
  /** Scopes granted */
  readonly scope: string
}

/**
 * Base interface for all Git providers
 * 
 * This interface defines the contract that all Git hosting providers must implement
 * to be supported by GitCastle Desktop.
 */
export interface IGitProvider {
  /** Provider identifier */
  readonly provider: GitProvider

  /** Provider capabilities */
  readonly capabilities: IProviderCapabilities

  /**
   * Get the API endpoint URL for this provider
   * @param account The account to get endpoint for
   */
  getAPIEndpoint(account: Account): string

  /**
   * Get the web URL for this provider
   * @param account The account to get web URL for
   */
  getWebURL(account: Account): string

  /**
   * Get OAuth configuration for this provider
   * @param account The account to get OAuth config for
   */
  getOAuthConfig(account: Account): IOAuthConfig | null

  /**
   * Authenticate with OAuth
   * @param code OAuth authorization code
   * @param state OAuth state parameter
   * @param account The account being authenticated
   */
  authenticateWithOAuth(
    code: string,
    state: string,
    account: Account
  ): Promise<IOAuthResult>

  /**
   * Authenticate with personal access token
   * @param token The personal access token
   * @param endpoint The API endpoint
   */
  authenticateWithToken(
    token: string,
    endpoint: string
  ): Promise<{ user: IAPIUser; emails: ReadonlyArray<IAPIEmail> }>

  /**
   * Validate a token is still valid
   * @param account The account to validate
   */
  validateToken(account: Account): Promise<boolean>

  /**
   * Refresh an expired token (if supported)
   * @param account The account to refresh
   */
  refreshToken?(account: Account): Promise<IOAuthResult | null>

  /**
   * Fetch user information
   * @param account The account to fetch user for
   */
  fetchUser(account: Account): Promise<IAPIFullIdentity>


  /**
   * Fetch user emails
   * @param account The account to fetch emails for
   */
  fetchEmails(account: Account): Promise<ReadonlyArray<IAPIEmail>>

  /**
   * Fetch repositories for the authenticated user
   * @param account The account to fetch repositories for
   * @param options Search/filter options
   */
  fetchRepositories(
    account: Account,
    options?: IRepositorySearchOptions
  ): Promise<ReadonlyArray<IAPIRepository>>

  /**
   * Fetch a specific repository
   * @param account The account to use
   * @param owner Repository owner
   * @param name Repository name
   */
  fetchRepository(
    account: Account,
    owner: string,
    name: string
  ): Promise<IAPIRepository | null>

  /**
   * Check if the account can access a repository
   * @param account The account to check
   * @param owner Repository owner
   * @param name Repository name
   */
  canAccessRepository(
    account: Account,
    owner: string,
    name: string
  ): Promise<boolean>

  /**
   * Create a fork of a repository
   * @param account The account to use
   * @param owner Repository owner
   * @param name Repository name
   * @param organization Optional organization to fork to
   */
  forkRepository?(
    account: Account,
    owner: string,
    name: string,
    organization?: string
  ): Promise<IAPIRepository>

  /**
   * Fetch pull requests for a repository
   * @param account The account to use
   * @param owner Repository owner
   * @param name Repository name
   * @param state Filter by state
   */
  fetchPullRequests?(
    account: Account,
    owner: string,
    name: string,
    state?: 'open' | 'closed' | 'all'
  ): Promise<ReadonlyArray<IAPIPullRequest>>

  /**
   * Create a pull request
   * @param account The account to use
   * @param owner Repository owner
   * @param name Repository name
   * @param title PR title
   * @param head Head branch
   * @param base Base branch
   * @param body PR body/description
   */
  createPullRequest?(
    account: Account,
    owner: string,
    name: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<IAPIPullRequest>

  /**
   * Get the clone URL for a repository
   * @param repository The repository
   * @param account The account (for authentication)
   * @param protocol 'https' or 'ssh'
   */
  getCloneURL(
    repository: IAPIRepository,
    account: Account,
    protocol: 'https' | 'ssh'
  ): string

  /**
   * Get the web URL for a repository
   * @param owner Repository owner
   * @param name Repository name
   */
  getRepositoryWebURL(owner: string, name: string): string

  /**
   * Get the web URL for a specific file in a repository
   * @param owner Repository owner
   * @param name Repository name
   * @param path File path
   * @param branch Branch name
   * @param line Line number (optional)
   */
  getFileWebURL(
    owner: string,
    name: string,
    path: string,
    branch: string,
    line?: number
  ): string

  /**
   * Get the web URL for a commit
   * @param owner Repository owner
   * @param name Repository name
   * @param sha Commit SHA
   */
  getCommitWebURL(owner: string, name: string, sha: string): string

  /**
   * Get the web URL for a pull request
   * @param owner Repository owner
   * @param name Repository name
   * @param prNumber Pull request number
   */
  getPullRequestWebURL?(owner: string, name: string, prNumber: number): string

  /**
   * Get the web URL for an issue
   * @param owner Repository owner
   * @param name Repository name
   * @param issueNumber Issue number
   */
  getIssueWebURL?(owner: string, name: string, issueNumber: number): string

  /**
   * Get the avatar URL for a user
   * @param username Username
   * @param size Desired avatar size
   */
  getUserAvatarURL(username: string, size?: number): string

  /**
   * Search repositories
   * @param account The account to use
   * @param query Search query
   * @param options Search options
   */
  searchRepositories?(
    account: Account,
    query: string,
    options?: IRepositorySearchOptions
  ): Promise<ReadonlyArray<IAPIRepository>>

  /**
   * Get rate limit status
   * @param account The account to check
   */
  getRateLimit?(account: Account): Promise<{
    limit: number
    remaining: number
    reset: Date
    used: number
  } | null>

  /**
   * Check if the provider is available/reachable
   * @param endpoint The endpoint to check
   */
  ping(endpoint: string): Promise<boolean>

  /**
   * Get the provider version (for enterprise/self-hosted)
   * @param endpoint The endpoint to check
   */
  getVersion?(endpoint: string): Promise<string | null>
}

/**
 * Abstract base class for Git providers
 * Provides common functionality that can be shared across providers
 */
export abstract class BaseGitProvider implements IGitProvider {
  abstract readonly provider: GitProvider
  abstract readonly capabilities: IProviderCapabilities

  abstract getAPIEndpoint(account: Account): string
  abstract getWebURL(account: Account): string
  abstract getOAuthConfig(account: Account): IOAuthConfig | null
  abstract authenticateWithOAuth(
    code: string,
    state: string,
    account: Account
  ): Promise<IOAuthResult>
  abstract authenticateWithToken(
    token: string,
    endpoint: string
  ): Promise<{ user: IAPIFullIdentity; emails: ReadonlyArray<IAPIEmail> }>

  abstract validateToken(account: Account): Promise<boolean>
  abstract fetchUser(account: Account): Promise<IAPIFullIdentity>

  abstract fetchEmails(account: Account): Promise<ReadonlyArray<IAPIEmail>>
  abstract fetchRepositories(
    account: Account,
    options?: IRepositorySearchOptions
  ): Promise<ReadonlyArray<IAPIRepository>>
  abstract fetchRepository(
    account: Account,
    owner: string,
    name: string
  ): Promise<IAPIRepository | null>
  abstract canAccessRepository(
    account: Account,
    owner: string,
    name: string
  ): Promise<boolean>
  abstract getCloneURL(
    repository: IAPIRepository,
    account: Account,
    protocol: 'https' | 'ssh'
  ): string
  abstract getRepositoryWebURL(owner: string, name: string): string
  abstract getFileWebURL(
    owner: string,
    name: string,
    path: string,
    branch: string,
    line?: number
  ): string
  abstract getCommitWebURL(owner: string, name: string, sha: string): string
  abstract ping(endpoint: string): Promise<boolean>

  // Optional methods with default implementations
  refreshToken?(account: Account): Promise<IOAuthResult | null>
  forkRepository?(
    account: Account,
    owner: string,
    name: string,
    organization?: string
  ): Promise<IAPIRepository>
  fetchPullRequests?(
    account: Account,
    owner: string,
    name: string,
    state?: 'open' | 'closed' | 'all'
  ): Promise<ReadonlyArray<IAPIPullRequest>>
  createPullRequest?(
    account: Account,
    owner: string,
    name: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<IAPIPullRequest>
  getPullRequestWebURL?(owner: string, name: string, prNumber: number): string
  getIssueWebURL?(owner: string, name: string, issueNumber: number): string
  searchRepositories?(
    account: Account,
    query: string,
    options?: IRepositorySearchOptions
  ): Promise<ReadonlyArray<IAPIRepository>>
  getRateLimit?(account: Account): Promise<{
    limit: number
    remaining: number
    reset: Date
    used: number
  } | null>
  getVersion?(endpoint: string): Promise<string | null>

  getUserAvatarURL(username: string, size: number = 200): string {
    // Default implementation - providers should override
    return `https://avatars.githubusercontent.com/${username}?s=${size}`
  }
}
