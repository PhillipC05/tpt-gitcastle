import { Account, isDotComAccount } from '../../models/account'
import { GitProvider, IProviderCapabilities } from '../../models/git-provider'
import {
  IAPIFullIdentity,
  IAPIEmail,
  IAPIRepository,
  IAPIPullRequest,
  getDotComAPIEndpoint,
  getEnterpriseAPIURL,
  getHTMLURL,
  API,
  requestOAuthToken
} from '../api'
import {
  IGitProvider,
  IOAuthConfig,
  IOAuthResult,
  IRepositorySearchOptions,
  BaseGitProvider,
} from './provider-interface'

/**
 * Default capabilities for GitHub provider
 */
const GitHubCapabilities: IProviderCapabilities = {
  supportsOAuth: true,
  supportsTokenAuth: true,
  supportsForking: true,
  supportsPullRequests: true,
  supportsIssues: true,
  usesGitHubAPI: true,
  supportsStarring: true,
  supportsReleases: true,
  supportsCI: true,
  supportsCopilot: true,
}



/**
 * GitHub.com and GitHub Enterprise provider implementation
 */
export class GitHubProvider extends BaseGitProvider implements IGitProvider {
  readonly provider: GitProvider = 'github'
  readonly capabilities = GitHubCapabilities

  getAPIEndpoint(account: Account): string {
    return isDotComAccount(account)
      ? getDotComAPIEndpoint()
      : getEnterpriseAPIURL(account.endpoint)
  }

  getWebURL(account: Account): string {
    return getHTMLURL(account.endpoint)
  }

  getOAuthConfig(account: Account): IOAuthConfig | null {
    const endpoint = this.getAPIEndpoint(account)
    const htmlURL = getHTMLURL(endpoint)
    const clientId = process.env.TEST_ENV ? '' : (globalThis as any).__OAUTH_CLIENT_ID__ || ''

    return {
      clientId,
      authorizationEndpoint: `${htmlURL}/login/oauth/authorize`,
      tokenEndpoint: `${htmlURL}/login/oauth/access_token`,
      scopes: ['repo', 'user', 'workflow'],
    }
  }


  async authenticateWithOAuth(
    code: string,
    state: string,
    account: Account
  ): Promise<IOAuthResult> {
    const endpoint = this.getAPIEndpoint(account)
    const token = await requestOAuthToken(endpoint, code)

    if (!token) {
      throw new Error('Failed to obtain OAuth token')
    }

    return {
      token,
      tokenType: 'bearer',
      scope: 'repo,user,workflow',
    }
  }

  async authenticateWithToken(
    token: string,
    endpoint: string
  ): Promise<{ user: IAPIFullIdentity; emails: ReadonlyArray<IAPIEmail> }> {
    const api = new API(endpoint, token)
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
    const url = new URL(`repos/${owner}/${name}/pulls`, account.endpoint)
    url.searchParams.set('state', state)
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
    return `https://github.com/${owner}/${name}`
  }

  getFileWebURL(
    owner: string,
    name: string,
    path: string,
    branch: string,
    line?: number
  ): string {
    const lineSuffix = line ? `#L${line}` : ''
    return `https://github.com/${owner}/${name}/blob/${branch}/${path}${lineSuffix}`
  }

  getCommitWebURL(owner: string, name: string, sha: string): string {
    return `https://github.com/${owner}/${name}/commit/${sha}`
  }

  getPullRequestWebURL(owner: string, name: string, prNumber: number): string {
    return `https://github.com/${owner}/${name}/pull/${prNumber}`
  }

  getIssueWebURL(owner: string, name: string, issueNumber: number): string {
    return `https://github.com/${owner}/${name}/issues/${issueNumber}`
  }

  getUserAvatarURL(username: string, size: number = 200): string {
    return `https://avatars.githubusercontent.com/${username}?s=${size}`
  }

  async ping(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/meta`, {
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
      const response = await fetch(`${endpoint}/meta`, {
        headers: { 'User-Agent': 'GitCastle-Desktop' },
      })
      const version = response.headers.get('x-github-enterprise-version')
      return version
    } catch (e) {
      return null
    }
  }
}

/**
 * Singleton instance of GitHub provider
 */
export const gitHubProvider = new GitHubProvider()
