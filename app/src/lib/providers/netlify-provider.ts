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

// Netlify-specific types
export interface INetlifySite extends ICloudProject {
  url: string
  admin_url: string
  deploy_url: string
  screenshot_url: string | null
  created_at: string
  updated_at: string
  build_settings?: {
    repo_url: string
    repo_branch: string
    dir: string
    cmd: string
  }
  published_deploy?: INetlifyDeploy
}

export interface INetlifyDeploy extends ICloudDeployment {
  deploy_id: string
  deploy_url: string
  branch: string
  commit_ref: string
  commit_url: string
  error_message?: string
  state: 'error' | 'building' | 'ready' | 'enqueued' | 'processing' | 'skipped'
  review_id: number | null
  review_url: string | null
  screenshot_url: string | null
  site_id: string
  skipped: boolean | null
  title: string
}

export interface INetlifyForm {
  id: string
  site_id: string
  name: string
  paths: string[]
  submission_count: number
  fields: {
    name: string
    type: string
    required: boolean
  }[]
}

export interface INetlifyEnvVar {
  key: string
  values: {
    id: string
    value: string
    context: 'all' | 'production' | 'deploy-preview' | 'branch-deploy'
  }[]
}

/**
 * Netlify Provider
 * Supports site deployments, forms, and environment variables
 */
export class NetlifyProvider implements IDeploymentProvider {
  public readonly name = 'Netlify'
  public readonly id = 'netlify'
  public readonly endpoint = 'https://api.netlify.com'
  public readonly supportedAuthMethods: CloudAuthMethod[] = ['token', 'oauth']

  private apiBaseUrl = 'https://api.netlify.com/api/v1'

  /**
   * Authenticate with Netlify using personal access token
   */
  public async authenticate(credentials: ICloudProviderCredentials): Promise<Account> {
    const { token } = credentials

    if (!token) {
      throw new Error('Netlify access token is required')
    }

    // Fetch user info to verify token
    const user = await this.fetchUser(token)

    const emails: ReadonlyArray<IAPIEmail> = user.email ? [{
      email: user.email,
      primary: true,
      verified: true,
      visibility: 'public',
    }] : []

    return new Account(
      user.id,
      user.email || '',
      this.endpoint,
      token,
      emails,
      user.avatar_url || '',
      parseInt(user.id) || 0,
      user.full_name || user.email || 'Netlify User',
      'netlify' as any
    )


  }

  private async fetchUser(token: string): Promise<{
    id: string
    email: string
    full_name: string
    avatar_url: string
  }> {
    const response = await fetch(`${this.apiBaseUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`)
    }

    return response.json()
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
   * Get all sites
   */
  public async getProjects(credentials: ICloudProviderCredentials): Promise<INetlifySite[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(`${this.apiBaseUrl}/sites`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sites: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get deployments for a site
   */
  public async getDeployments(
    credentials: ICloudProviderCredentials,
    siteId: string,
    limit: number = 10
  ): Promise<INetlifyDeploy[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/sites/${siteId}/deploys?per_page=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch deploys: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Trigger a new deployment
   */
  public async deploy(
    credentials: ICloudProviderCredentials,
    siteId: string,
    options?: IDeployOptions
  ): Promise<INetlifyDeploy> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    // Netlify doesn't have a direct "deploy" endpoint for git-based sites
    // Instead, we trigger a build by creating a new deploy
    const response = await fetch(
      `${this.apiBaseUrl}/sites/${siteId}/deploys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: options?.branch || 'main',
          title: options?.commit ? `Deploy: ${options.commit}` : 'Manual deploy',
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create deploy: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get deployment logs
   */
  public async getDeploymentLogs(
    credentials: ICloudProviderCredentials,
    deployId: string
  ): Promise<string[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/deploys/${deployId}/log`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`)
    }

    const logs = await response.json()
    return logs.map((log: any) => log.message)
  }

  /**
   * Get forms for a site
   */
  public async getForms(
    credentials: ICloudProviderCredentials,
    siteId: string
  ): Promise<INetlifyForm[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/sites/${siteId}/forms`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch forms: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get environment variables for a site
   */
  public async getEnvVars(
    credentials: ICloudProviderCredentials,
    siteId: string
  ): Promise<INetlifyEnvVar[]> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/sites/${siteId}/env`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch env vars: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Set environment variable
   */
  public async setEnvVar(
    credentials: ICloudProviderCredentials,
    siteId: string,
    key: string,
    value: string,
    context: 'all' | 'production' | 'deploy-preview' | 'branch-deploy' = 'all'
  ): Promise<void> {
    const { token } = credentials
    if (!token) throw new Error('Token required')

    const response = await fetch(
      `${this.apiBaseUrl}/sites/${siteId}/env`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          values: [{ value, context }],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to set env var: ${response.statusText}`)
    }
  }
}

export const netlifyProvider = new NetlifyProvider()
