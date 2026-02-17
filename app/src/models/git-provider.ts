/**
 * GitProvider type - represents supported Git hosting providers
 */
export type GitProvider =
  | 'github'
  | 'github-enterprise'
  | 'gitcastle'
  | 'gitlab'
  | 'gitea'
  | 'forgejo'
  | 'other'

/**
 * Provider capabilities - what features each provider supports
 */
export interface IProviderCapabilities {
  /** Supports OAuth authentication */
  readonly supportsOAuth: boolean
  /** Supports personal access tokens */
  readonly supportsTokenAuth: boolean
  /** Supports repository forking */
  readonly supportsForking: boolean
  /** Supports pull requests */
  readonly supportsPullRequests: boolean
  /** Supports issues */
  readonly supportsIssues: boolean
  /** Supports GitHub-style API (v3 REST + GraphQL) */
  readonly usesGitHubAPI: boolean
  /** Supports repository starring */
  readonly supportsStarring: boolean
  /** Supports releases */
  readonly supportsReleases: boolean
  /** Supports actions/workflows */
  readonly supportsCI: boolean
  /** Supports copilot */
  readonly supportsCopilot: boolean
}

/**
 * Provider configuration
 */
export interface IProviderConfig {
  /** Provider identifier */
  readonly id: GitProvider
  /** Display name for UI */
  readonly displayName: string
  /** Default API endpoint (for cloud-hosted) */
  readonly defaultEndpoint?: string
  /** Whether this is a self-hosted/enterprise provider */
  readonly isEnterprise: boolean
  /** Provider capabilities */
  readonly capabilities: IProviderCapabilities
  /** Icon identifier for UI */
  readonly icon: string
  /** Brand color */
  readonly brandColor: string
}

/**
 * Get provider capabilities
 */
export function getProviderCapabilities(provider: GitProvider): IProviderCapabilities {
  switch (provider) {
    case 'github':
      return {
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
    case 'github-enterprise':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: true,
        supportsPullRequests: true,
        supportsIssues: true,
        usesGitHubAPI: true,
        supportsStarring: true,
        supportsReleases: true,
        supportsCI: true,
        supportsCopilot: false, // Depends on GHE version
      }
    case 'gitcastle':
      return {
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
    case 'gitlab':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: true,
        supportsPullRequests: true, // Called "Merge Requests"
        supportsIssues: true,
        usesGitHubAPI: false, // Uses GitLab API
        supportsStarring: true, // Called "Stars"
        supportsReleases: true,
        supportsCI: true,
        supportsCopilot: false,
      }
    case 'gitea':
    case 'forgejo':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: true,
        supportsPullRequests: true,
        supportsIssues: true,
        usesGitHubAPI: true, // Gitea/Forgejo have GitHub-compatible API
        supportsStarring: true,
        supportsReleases: true,
        supportsCI: true, // Via Gitea Actions
        supportsCopilot: false,
      }
    default:
      return {
        supportsOAuth: false,
        supportsTokenAuth: true,
        supportsForking: false,
        supportsPullRequests: false,
        supportsIssues: false,
        usesGitHubAPI: false,
        supportsStarring: false,
        supportsReleases: false,
        supportsCI: false,
        supportsCopilot: false,
      }
  }
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: GitProvider): IProviderConfig {
  const capabilities = getProviderCapabilities(provider)

  switch (provider) {
    case 'github':
      return {
        id: 'github',
        displayName: 'GitHub',
        defaultEndpoint: 'https://api.github.com',
        isEnterprise: false,
        capabilities,
        icon: 'github',
        brandColor: '#24292f',
      }
    case 'github-enterprise':
      return {
        id: 'github-enterprise',
        displayName: 'GitHub Enterprise',
        isEnterprise: true,
        capabilities,
        icon: 'github',
        brandColor: '#24292f',
      }
    case 'gitcastle':
      return {
        id: 'gitcastle',
        displayName: 'TPT GitCastle',
        defaultEndpoint: 'https://gitcastle.tptsolutions.co.nz/api/v3',
        isEnterprise: true,
        capabilities,
        icon: 'gitcastle',
        brandColor: '#0052cc',
      }
    case 'gitlab':
      return {
        id: 'gitlab',
        displayName: 'GitLab',
        defaultEndpoint: 'https://gitlab.com/api/v4',
        isEnterprise: false,
        capabilities,
        icon: 'gitlab',
        brandColor: '#fc6d26',
      }
    case 'gitea':
      return {
        id: 'gitea',
        displayName: 'Gitea',
        isEnterprise: true, // Self-hosted
        capabilities,
        icon: 'gitea',
        brandColor: '#609926',
      }
    case 'forgejo':
      return {
        id: 'forgejo',
        displayName: 'Forgejo',
        isEnterprise: true, // Self-hosted
        capabilities,
        icon: 'forgejo',
        brandColor: '#fb923c',
      }
    default:
      return {
        id: 'other',
        displayName: 'Other',
        isEnterprise: true,
        capabilities,
        icon: 'git',
        brandColor: '#f05133',
      }
  }
}

/**
 * Detect provider from endpoint URL
 */
export function detectProviderFromEndpoint(endpoint: string): GitProvider {
  const url = endpoint.toLowerCase()

  if (url.includes('github.com') && !url.includes('enterprise')) {
    return 'github'
  }

  if (url.includes('gitcastle.tptsolutions.co.nz') || url.includes('gitcastle')) {
    return 'gitcastle'
  }

  if (url.includes('gitlab.com') || url.includes('gitlab')) {
    return 'gitlab'
  }

  // GitHub Enterprise detection
  if (url.includes('github') && (url.includes('/api/v3') || url.includes('api.github'))) {
    return 'github-enterprise'
  }

  // Gitea/Forgejo detection
  if (url.includes('gitea')) {
    return 'gitea'
  }

  if (url.includes('forgejo')) {
    return 'forgejo'
  }

  // Default to other for unknown endpoints
  return 'other'
}

/**
 * Get display name for provider
 */
export function getProviderDisplayName(provider: GitProvider): string {
  return getProviderConfig(provider).displayName
}

/**
 * Check if provider uses GitHub-compatible API
 */
export function usesGitHubAPI(provider: GitProvider): boolean {
  return getProviderCapabilities(provider).usesGitHubAPI
}

/**
 * List of all supported providers
 */
export const SupportedProviders: GitProvider[] = [
  'github',
  'github-enterprise',
  'gitcastle',
  'gitlab',
  'gitea',
  'forgejo',
  'other',
]

/**
 * List of enterprise/self-hosted providers
 */
export const EnterpriseProviders: GitProvider[] = [
  'github-enterprise',
  'gitcastle',
  'gitlab',
  'gitea',
  'forgejo',
  'other',
]
