import { Account } from '../../models/account'
import { GitProvider, IProviderCapabilities } from '../../models/git-provider'
import {
  IAPIFullIdentity,
  IAPIEmail,
  IAPIRepository,
  IAPIPullRequest, API
} from '../api'
import {
  IGitProvider,
  IOAuthConfig,
  IOAuthResult,
  IRepositorySearchOptions,
  BaseGitProvider,
} from './provider-interface'

/**
 * Default capabilities for TPT GitCastle provider
 */
const GitCastleCapabilities: IProviderCapabilities = {
  supportsOAuth: true,
  supportsTokenAuth: true,
  supportsForking: true,
  supportsPullRequests: true,
  supportsIssues: true,
  usesGitHubAPI: true, // GitCastle uses GitHub-compatible API
  supportsStarring: true,
  supportsReleases: true,
  supportsCI: false,
  supportsCopilot: false,
}

/**
 * TPT GitCastle provider implementation
 * 
 * TPT GitCastle is a GitHub Enterprise-compatible Git hosting solution
 * provided by TPT Solutions (https://tptsolutions.co.nz)
 */
export class GitCastleProvider extends BaseGitProvider implements IGitProvider {
  readonly provider: GitProvider = 'gitcastle'
  readonly capabilities = GitCastleCapabilities

  /** Default GitCastle endpoint */
  static readonly DEFAULT_ENDPOINT = 'https://gitcastle.tptsolutions.co.nz'

  getAPIEndpoint(account: Account): string {
    // GitCastle uses GitHub Enterprise-style API endpoint
    const endpoint = account.endpoint || GitCastleProvider.DEFAULT_ENDPOINT
    return `${endpoint}/api/v3`
  }

  getWebURL(account: Account): string {
    return account.endpoint || GitCastleProvider.DEFAULT_ENDPOINT
  }

  getOAuthConfig(account: Account): IOAuthConfig | null {
    const webURL = this.getWebURL(account)

    return {
      clientId: process.env.GITCASTLE_OAUTH_CLIENT_ID || '',
      authorizationEndpoint: `${webURL}/login/oauth/authorize`,
      tokenEndpoint: `${webURL}/login/oauth/access_token`,
      scopes: ['repo', 'user', 'workflow'],
    }
  }

  async authenticateWithOAuth(
    code: string,
    state: string,
    account: Account
  ): Promise<IOAuthResult> {
    const config = this.getOAuthConfig(account)
    if (!config) {
      throw new Error('OAuth not configured for GitCastle')
    }

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        code,
        state,
      }),
    })

    if (!response.ok) {
      throw new Error(`OAuth token request failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      token: data.access_token,
      tokenType: data.token_type || 'bearer',
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope || 'repo,user,workflow',
    }
  }

  async authenticateWithToken(
    token: string,
    endpoint: string
  ): Promise<{ user: IAPIFullIdentity; emails: ReadonlyArray<IAPIEmail> }> {
    const api = new API(`${endpoint}/api/v3`, token)
    const [user, emails] = await Promise.all([
      api.fetchAccount(),
      api.fetchEmails(),
    ])

    return { user, emails }
  }

  async validateToken(account: Account): Promise<boolean> {
    try {
      const api = API.fromAccount(account)
      await api.fetchAccount()
      return true
    } catch (e) {
      return false
    }
  }

  async fetchUser(account: Account): Promise<IAPIFullIdentity> {
    const api = API.fromAccount(account)
    return api.fetchAccount()
  }

  async fetchEmails(account: Account): Promise<ReadonlyArray<IAPIEmail>> {
    const api = API.fromAccount(account)
    return api.fetchEmails()
  }

  async fetchRepositories(
    account: Account,
    options?: IRepositorySearchOptions
  ): Promise<ReadonlyArray<IAPIRepository>> {
    const api = API.fromAccount(account)
    const repos: IAPIRepository[] = []

    await api.streamUserRepositories(
      page => repos.push(...page),
      options?.affiliation,
      {
        perPage: options?.perPage || 100,
      }
    )

    return repos
  }

  async fetchRepository(
    account: Account,
    owner: string,
    name: string
  ): Promise<IAPIRepository | null> {
    const api = API.fromAccount(account)
    return api.fetchRepository(owner, name)
  }

  async canAccessRepository(
    account: Account,
    owner: string,
    name: string
  ): Promise<boolean> {
    const api = API.fromAccount(account)
    const repo = await api.fetchRepository(owner, name)
    return repo !== null
  }

  async forkRepository(
    account: Account,
    owner: string,
    name: string,
    organization?: string
  ): Promise<IAPIRepository> {
    const api = API.fromAccount(account)
    return api.forkRepository(owner, name)
  }

  async fetchPullRequests(
    account: Account,
    owner: string,
    name: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<ReadonlyArray<IAPIPullRequest>> {
    const api = API.fromAccount(account)
    return api.fetchAllOpenPullRequests(owner, name)
  }

  getCloneURL(
    repository: IAPIRepository,
    account: Account,
    protocol: 'https' | 'ssh'
  ): string {
    return protocol === 'ssh' ? repository.ssh_url : repository.clone_url
  }

  getRepositoryWebURL(owner: string, name: string): string {
    return `${GitCastleProvider.DEFAULT_ENDPOINT}/${owner}/${name}`
  }

  getFileWebURL(
    owner: string,
    name: string,
    path: string,
    branch: string,
    line?: number
  ): string {
    const lineSuffix = line ? `#L${line}` : ''
    return `${GitCastleProvider.DEFAULT_ENDPOINT}/${owner}/${name}/blob/${branch}/${path}${lineSuffix}`
  }

  getCommitWebURL(owner: string, name: string, sha: string): string {
    return `${GitCastleProvider.DEFAULT_ENDPOINT}/${owner}/${name}/commit/${sha}`
  }

  getPullRequestWebURL(owner: string, name: string, prNumber: number): string {
    return `${GitCastleProvider.DEFAULT_ENDPOINT}/${owner}/${name}/pull/${prNumber}`
  }

  getIssueWebURL(owner: string, name: string, issueNumber: number): string {
    return `${GitCastleProvider.DEFAULT_ENDPOINT}/${owner}/${name}/issues/${issueNumber}`
  }

  getUserAvatarURL(username: string, size: number = 200): string {
    // GitCastle uses Gravatar or similar service
    return `${GitCastleProvider.DEFAULT_ENDPOINT}/avatars/${username}?s=${size}`
  }

  async ping(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/api/v3/meta`, {
        method: 'HEAD',
        headers: { 'User-Agent': 'GitCastle-Desktop' },
      })
      return response.ok
    } catch (e) {
      return false
    }
  }

  async getVersion(endpoint: string): Promise<string | null> {
    try {
      const response = await fetch(`${endpoint}/api/v3/meta`, {
        headers: { 'User-Agent': 'GitCastle-Desktop' },
      })
      const data = await response.json()
      return data.installed_version || null
    } catch (e) {
      return null
    }
  }
}

/**
 * Singleton instance of GitCastle provider
 */
export const gitCastleProvider = new GitCastleProvider()
