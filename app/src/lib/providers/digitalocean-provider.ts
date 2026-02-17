import {
  IDeploymentProvider,
  ICloudProviderCredentials,
  ICloudProject,
  ICloudDeployment,
  IDeployOptions,
  CloudAuthMethod,
} from './cloud-provider-interface'
import { Account } from '../../models/account'
import { IAPIEmail } from '../api'

// DigitalOcean-specific types
export interface IDigitalOceanApp extends ICloudProject {
  spec: {
    name: string
    services: IDigitalOceanService[]
    static_sites: IDigitalOceanStaticSite[]
    databases: IDigitalOceanDatabase[]
  }
  default_ingress: string
  live_url: string
  tier_slug: string
  region_slug: string
}

export interface IDigitalOceanService {
  name: string
  source_dir: string
  run_command: string
  build_command: string
  github?: {
    repo: string
    branch: string
  }
  gitlab?: {
    repo: string
    branch: string
  }
}

export interface IDigitalOceanStaticSite {
  name: string
  source_dir: string
  build_command: string
  output_dir: string
  github?: {
    repo: string
    branch: string
  }
}

export interface IDigitalOceanDatabase {
  name: string
  engine: 'pg' | 'mysql' | 'redis' | 'mongodb'
  version: string
  size: string
  num_nodes: number
}

export interface IDigitalOceanDeployment extends ICloudDeployment {
  spec: any
  phase: 'PENDING_BUILD' | 'BUILDING' | 'PENDING_DEPLOY' | 'DEPLOYING' | 'ACTIVE' | 'SUPERSEDED' | 'ERROR' | 'CANCELED'
  progress: {
    pending_steps: number
    total_steps: number
    completed_steps: number
  }
  cause: string
  triggered_by: string
  created_at: string
  updated_at: string
}

export interface IDigitalOceanSpace {
  name: string
  region: string
  created_at: string
  bucket_url: string
}

/**
 * DigitalOcean Provider
 * Supports App Platform (deployments) and Spaces (storage)
 */
export class DigitalOceanProvider implements IDeploymentProvider {
  public readonly name = 'DigitalOcean'
  public readonly id = 'digitalocean'
  public readonly endpoint = 'https://api.digitalocean.com'
  public readonly supportedAuthMethods: CloudAuthMethod[] = ['token']

  private apiBaseUrl = 'https://api.digitalocean.com/v2'

  /**
   * Authenticate with DigitalOcean using personal access token
   */
  public async authenticate(credentials: ICloudProviderCredentials): Promise<Account> {
    const { token } = credentials

    if (!token) {
      throw new Error('DigitalOcean access token is required')
    }

    // Fetch account info to verify token
    const account = await this.fetchAccount(token)

    const emails: ReadonlyArray<IAPIEmail> = account.email ? [{
      email: account.email,
      primary: true,
      verified: true,
      visibility: 'public',
    }] : []

    return new Account(
      account.uuid,
      account.email || '',
      this.endpoint,
      token,
      emails,
      '',
      account.uuid ? parseInt(account.uuid.replace(/-/g, '').substring(0, 8), 16) : 0,
      `DigitalOcean (${account.email})`,
      'digitalocean' as any
    )
  }

  private async fetchAccount(token: string): Promise<{
    uuid: string
    email: string
    status: string
  }> {
    const response = await fetch(`${this.apiBaseUrl}/account`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.account
  }

  /**
   * Validate token
   */
  public async validateCredentials(credentials: ICloudProviderCredentials): Promise<boolean> {
    try {
      await this.authenticate(credentials)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all apps (projects)
   */
  public async getProjects(credentials: ICloudProviderCredentials): Promise<IDigitalOceanApp[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(`${this.apiBaseUrl}/apps`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch apps: ${response.statusText}`)
    }

    const data = await response.json()
    return data.apps || []
  }

  /**
   * Get deployments for an app
   */
  public async getDeployments(
    credentials: ICloudProviderCredentials,
    appId: string,
    limit: number = 10
  ): Promise<IDigitalOceanDeployment[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/apps/${appId}/deployments?per_page=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch deployments: ${response.statusText}`)
    }

    const data = await response.json()
    return data.deployments || []
  }

  /**
   * Create a new deployment
   */
  public async deploy(
    credentials: ICloudProviderCredentials,
    appId: string,
    options?: IDeployOptions
  ): Promise<IDigitalOceanDeployment> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/apps/${appId}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force_build: true,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create deployment: ${response.statusText}`)
    }

    const data = await response.json()
    return data.deployment
  }

  /**
   * Get Spaces (object storage buckets)
   */
  public async getSpaces(credentials: ICloudProviderCredentials): Promise<IDigitalOceanSpace[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(`${this.apiBaseUrl}/spaces`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch spaces: ${response.statusText}`)
    }

    const data = await response.json()
    return data.spaces || []
  }
}

export const digitalOceanProvider = new DigitalOceanProvider()
