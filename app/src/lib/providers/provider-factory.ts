import { GitProvider } from '../../models/git-provider'
import { IGitProvider } from './provider-interface'
import { gitHubProvider } from './github-provider'
import { gitCastleProvider } from './gitcastle-provider'
import { VercelProvider } from './vercel-provider'
import { SupabaseProvider } from './supabase-provider'
import { CloudflareProvider } from './cloudflare-provider'
import { NetlifyProvider } from './netlify-provider'
import { DigitalOceanProvider } from './digitalocean-provider'

// Create singleton instances
const vercelProvider = new VercelProvider()
const supabaseProvider = new SupabaseProvider()
const cloudflareProvider = new CloudflareProvider()
const netlifyProvider = new NetlifyProvider()
const digitalOceanProvider = new DigitalOceanProvider()


/**
 * Provider factory - creates and manages provider instances
 */
export class ProviderFactory {
  private static providers = new Map<GitProvider, IGitProvider>([
    ['github', gitHubProvider],
    ['github-enterprise', gitHubProvider], // GHE uses same provider as GitHub.com
    ['gitcastle', gitCastleProvider],
    ['vercel', vercelProvider],
    ['supabase', supabaseProvider],
    ['cloudflare', cloudflareProvider as any],
    ['netlify', netlifyProvider as any],
    ['digitalocean', digitalOceanProvider as any],
  ])



  /**
   * Get a provider instance for the given provider type
   */
  static getProvider(provider: GitProvider): IGitProvider {
    const instance = this.providers.get(provider)
    if (!instance) {
      throw new Error(`Provider not found: ${provider}`)
    }
    return instance
  }

  /**
   * Register a custom provider
   */
  static registerProvider(provider: GitProvider, instance: IGitProvider): void {
    this.providers.set(provider, instance)
  }

  /**
   * Check if a provider is registered
   */
  static hasProvider(provider: GitProvider): boolean {
    return this.providers.has(provider)
  }

  /**
   * Get all registered providers
   */
  static getRegisteredProviders(): GitProvider[] {
    return Array.from(this.providers.keys())
  }
}

/**
 * Get provider instance for a provider type
 */
export function getProvider(provider: GitProvider): IGitProvider {
  return ProviderFactory.getProvider(provider)
}

/**
 * Check if provider is available
 */
export function isProviderAvailable(provider: GitProvider): boolean {
  return ProviderFactory.hasProvider(provider)
}
