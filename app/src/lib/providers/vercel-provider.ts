import { IGitProvider, IProviderCapabilities, AuthenticationMethod } from './provider-interface'
import { Account } from '../../models/account'

/**
 * Vercel API endpoints and configuration
 */
export const VercelAPI = {
  endpoint: 'https://api.vercel.com',
  webEndpoint: 'https://vercel.com',
  scopes: ['read', 'write'],
}

/**
 * Vercel deployment status
 */
export enum VercelDeploymentStatus {
  Ready = 'READY',
  Building = 'BUILDING',
  Error = 'ERROR',
  Canceled = 'CANCELED',
  Queued = 'QUEUED',
}

/**
 * Vercel project
 */
export interface IVercelProject {
  readonly id: string
  readonly name: string
  readonly framework: string | null
  readonly latestDeployments: ReadonlyArray<IVercelDeployment>
  readonly createdAt: number
  readonly updatedAt: number
}

/**
 * Vercel deployment
 */
export interface IVercelDeployment {
  readonly id: string
  readonly url: string
  readonly name: string
  readonly status: VercelDeploymentStatus
  readonly createdAt: number
  readonly readyStateAt: number | null
  readonly source: 'git' | 'cli' | 'api'
  readonly gitSource?: {
    readonly type: 'github' | 'gitlab' | 'bitbucket'
    readonly ref: string
    readonly sha: string
    readonly repoId: string
  }
}

/**
 * Vercel environment variable
 */
export interface IVercelEnvVar {
  readonly id: string
  readonly key: string
  readonly value: string
  readonly type: 'plain' | 'secret' | 'encrypted'
  readonly target: ReadonlyArray<'production' | 'preview' | 'development'>
}

/**
 * Vercel provider implementation
 */
export class VercelProvider implements IGitProvider {
  public readonly name = 'vercel'
  public readonly displayName = 'Vercel'
  public readonly brandColor = '#000000'
  public readonly icon = 'vercel'

  public readonly capabilities: IProviderCapabilities = {
    supportsOAuth: true,
    supportsTokenAuth: true,
    supportsSSHAuth: false,
    supportsRepositories: false,
    supportsIssues: false,
    supportsPullRequests: false,
    supportsDeployments: true,
    supportsServerless: true,
    supportsDatabase: false,
    supportsStorage: false,
    supportsRealtime: false,
    supportsAuth: false,
    defaultAuthenticationMethod: AuthenticationMethod.OAuth,
  }

  public getAPIEndpoint(): string {
    return VercelAPI.endpoint
  }

  public getWebEndpoint(): string {
    return VercelAPI.webEndpoint
  }

  public async authenticateWithToken(token: string): Promise<Account> {
    const response = await fetch(`${VercelAPI.endpoint}/v2/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Vercel authentication failed: ${response.statusText}`)
    }

    const data = await response.json()
    const user = data.user

    return new Account(
      user.id,
      user.username || user.email,
      '', // No token in Account, stored separately
      VercelAPI.endpoint,
      [],
      user.avatar,
      'vercel',
      user.name || user.username
    )
  }

  /**
   * Get Vercel projects
   */
  public async getProjects(token: string): Promise<ReadonlyArray<IVercelProject>> {
    const response = await fetch(`${VercelAPI.endpoint}/v9/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Vercel projects: ${response.statusText}`)
    }

    const data = await response.json()
    return data.projects
  }

  /**
   * Get deployments for a project
   */
  public async getDeployments(
    token: string,
    projectId: string,
    limit: number = 10
  ): Promise<ReadonlyArray<IVercelDeployment>> {
    const response = await fetch(
      `${VercelAPI.endpoint}/v6/deployments?projectId=${projectId}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch Vercel deployments: ${response.statusText}`)
    }

    const data = await response.json()
    return data.deployments
  }

  /**
   * Deploy a project
   */
  public async deploy(
    token: string,
    projectId: string,
    ref: string
  ): Promise<IVercelDeployment> {
    const response = await fetch(`${VercelAPI.endpoint}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        ref,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to deploy to Vercel: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get environment variables for a project
   */
  public async getEnvironmentVariables(
    token: string,
    projectId: string
  ): Promise<ReadonlyArray<IVercelEnvVar>> {
    const response = await fetch(
      `${VercelAPI.endpoint}/v9/projects/${projectId}/env`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch env vars: ${response.statusText}`)
    }

    const data = await response.json()
    return data.envs
  }

  /**
   * Add environment variable
   */
  public async addEnvironmentVariable(
    token: string,
    projectId: string,
    key: string,
    value: string,
    target: ReadonlyArray<'production' | 'preview' | 'development'>
  ): Promise<IVercelEnvVar> {
    const response = await fetch(
      `${VercelAPI.endpoint}/v9/projects/${projectId}/env`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          target,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to add env var: ${response.statusText}`)
    }

    return response.json()
  }
}
