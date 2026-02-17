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
  | 'vercel'
  | 'supabase'
  | 'cloudflare'
  | 'netlify'
  | 'digitalocean'
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
  /** Supports serverless/edge functions */
  readonly supportsServerless?: boolean
  /** Supports database */
  readonly supportsDatabase?: boolean
  /** Supports storage */
  readonly supportsStorage?: boolean
  /** Supports realtime */
  readonly supportsRealtime?: boolean
  /** Supports auth */
  readonly supportsAuth?: boolean
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
        supportsCopilot: false,
      }
    case 'gitcastle':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: true,
        supportsPullRequests: true,
        supportsIssues: true,
        usesGitHubAPI: true,
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
        supportsPullRequests: true,
        supportsIssues: true,
        usesGitHubAPI: false,
        supportsStarring: true,
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
        usesGitHubAPI: true,
        supportsStarring: true,
        supportsReleases: true,
        supportsCI: true,
        supportsCopilot: false,
      }
    case 'vercel':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: false,
        supportsPullRequests: false,
        supportsIssues: false,
        usesGitHubAPI: false,
        supportsStarring: false,
        supportsReleases: false,
        supportsCI: false,
        supportsCopilot: false,
        supportsServerless: true,
        supportsDatabase: false,
        supportsStorage: false,
        supportsRealtime: false,
        supportsAuth: false,
      }
    case 'supabase':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: false,
        supportsPullRequests: false,
        supportsIssues: false,
        usesGitHubAPI: false,
        supportsStarring: false,
        supportsReleases: false,
        supportsCI: false,
        supportsCopilot: false,
        supportsServerless: true,
        supportsDatabase: true,
        supportsStorage: true,
        supportsRealtime: true,
        supportsAuth: true,
      }
    case 'cloudflare':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: false,
        supportsPullRequests: false,
        supportsIssues: false,
        usesGitHubAPI: false,
        supportsStarring: false,
        supportsReleases: false,
        supportsCI: false,
        supportsCopilot: false,
        supportsServerless: true,
        supportsDatabase: true,
        supportsStorage: true,
        supportsRealtime: false,
        supportsAuth: false,
      }
    case 'netlify':
      return {
        supportsOAuth: true,
        supportsTokenAuth: true,
        supportsForking: false,
        supportsPullRequests: false,
        supportsIssues: false,
        usesGitHubAPI: false,
        supportsStarring: false,
        supportsReleases: false,
        supportsCI: false,
        supportsCopilot: false,
        supportsServerless: false,
        supportsDatabase: false,
        supportsStorage: false,
        supportsRealtime: false,
        supportsAuth: false,
      }
    case 'digitalocean':
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
        supportsServerless: true,
        supportsDatabase: true,
        supportsStorage: true,
        supportsRealtime: false,
        supportsAuth: false,
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
        isEnterprise: true,
        capabilities,
        icon: 'gitea',
        brandColor: '#609926',
      }
    case 'forgejo':
      return {
        id: 'forgejo',
        displayName: 'Forgejo',
        isEnterprise: true,
        capabilities,
        icon: 'forgejo',
        brandColor: '#fb923c',
      }
    case 'vercel':
      return {
        id: 'vercel',
        displayName: 'Vercel',
        defaultEndpoint: 'https://api.vercel.com',
        isEnterprise: false,
        capabilities,
        icon: 'vercel',
        brandColor: '#000000',
      }
    case 'supabase':
      return {
        id: 'supabase',
        displayName: 'Supabase',
        defaultEndpoint: 'https://api.supabase.com',
        isEnterprise: false,
        capabilities,
        icon: 'supabase',
        brandColor: '#3ECF8E',
      }
    case 'cloudflare':
      return {
        id: 'cloudflare',
        displayName: 'Cloudflare',
        defaultEndpoint: 'https://api.cloudflare.com',
        isEnterprise: false,
        capabilities,
        icon: 'cloudflare',
        brandColor: '#F38020',
      }
    case 'netlify':
      return {
        id: 'netlify',
        displayName: 'Netlify',
        defaultEndpoint: 'https://api.netlify.com',
        isEnterprise: false,
        capabilities,
        icon: 'netlify',
        brandColor: '#00C7B7',
      }
    case 'digitalocean':
      return {
        id: 'digitalocean',
        displayName: 'DigitalOcean',
        defaultEndpoint: 'https://api.digitalocean.com',
        isEnterprise: false,
        capabilities,
        icon: 'digitalocean',
        brandColor: '#0080FF',
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

  if (url.includes('github') && (url.includes('/api/v3') || url.includes('api.github'))) {
    return 'github-enterprise'
  }

  if (url.includes('gitea')) {
    return 'gitea'
  }

  if (url.includes('forgejo')) {
    return 'forgejo'
  }

  if (url.includes('vercel.com') || url.includes('vercel')) {
    return 'vercel'
  }

  if (url.includes('supabase.com') || url.includes('supabase')) {
    return 'supabase'
  }

  if (url.includes('cloudflare.com') || url.includes('cloudflare')) {
    return 'cloudflare'
  }

  if (url.includes('netlify.com') || url.includes('netlify')) {
    return 'netlify'
  }

  if (url.includes('digitalocean.com') || url.includes('digitalocean')) {
    return 'digitalocean'
  }

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
  'vercel',
  'supabase',
  'cloudflare',
  'netlify',
  'digitalocean',
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
