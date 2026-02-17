import {
  IDeploymentProvider,
  IDatabaseProvider,
  IStorageProvider,
  IFunctionsProvider,
  ICloudProviderCredentials,
  ICloudProject,
  ICloudDeployment,
  ICloudDatabase,
  ICloudTable,
  ICloudBucket,
  ICloudFunction,
  IDeployOptions,
  CloudAuthMethod
} from './cloud-provider-interface'
import { Account } from '../../models/account'
import { IAPIEmail } from '../api'


// Cloudflare-specific types
export interface ICloudflareAccount {
  id: string
  name: string
  email: string
}

export interface ICloudflarePage extends ICloudProject {
  subdomain: string
  domains: string[]
  source: {
    type: string
    config: {
      owner: string
      repo_name: string
      production_branch: string
    }
  }
  build_config: {
    build_command: string
    destination_dir: string
  }
  latest_deployment?: ICloudflareDeployment
}

export interface ICloudflareDeployment extends ICloudDeployment {
  environment: 'preview' | 'production'
  short_id: string
  stages: ICloudflareStage[]
  latest_stage: {
    name: string
    status: ICloudflareDeploymentStatus
    text: string
  }
}

export interface ICloudflareStage {
  name: string
  started_on: string | null
  ended_on: string | null
  status: ICloudflareDeploymentStatus
  text: string
}

export type ICloudflareDeploymentStatus = 
  | 'success' 
  | 'failure' 
  | 'idle' 
  | 'active' 
  | 'canceled' 
  | 'pending'

export interface ICloudflareWorker extends ICloudFunction {
  script: string
  etag: string
  size: number
  usage_model: string
}

export interface ICloudflareR2Bucket extends ICloudBucket {
  creation_date: string
}

export interface ICloudflareD1Database extends ICloudDatabase {
  uuid: string
  version: string
  num_tables: number
  file_size: number
}

/**
 * Cloudflare Provider
 * Supports Pages (deployments), Workers (functions), R2 (storage), and D1 (database)
 */
export class CloudflareProvider 
  implements IDeploymentProvider, IDatabaseProvider, IStorageProvider, IFunctionsProvider 
{
  public readonly name = 'Cloudflare'
  public readonly id = 'cloudflare'
  public readonly endpoint = 'https://api.cloudflare.com'
  public readonly supportedAuthMethods: CloudAuthMethod[] = ['token', 'oauth']


  private apiBaseUrl = 'https://api.cloudflare.com/client/v4'

  /**
   * Authenticate with Cloudflare using API token
   */
  public async authenticate(credentials: ICloudProviderCredentials): Promise<Account> {
    const { token, accountId } = credentials

    if (!token) {
      throw new Error('Cloudflare API token is required')
    }

    // If accountId is provided, use it directly
    if (accountId) {
      const account = await this.fetchAccount(token, accountId)
      return this.createAccount(account, token)
    }

    // Otherwise, fetch accounts and use the first one
    const accounts = await this.fetchAccounts(token)
    if (accounts.length === 0) {
      throw new Error('No Cloudflare accounts found')
    }

    return this.createAccount(accounts[0], token)
  }

  private async fetchAccounts(token: string): Promise<ICloudflareAccount[]> {
    const response = await fetch(`${this.apiBaseUrl}/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.result : []
  }

  private async fetchAccount(token: string, accountId: string): Promise<ICloudflareAccount> {
    const response = await fetch(`${this.apiBaseUrl}/accounts/${accountId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error('Account not found')
    }

    return data.result
  }

  private createAccount(cfAccount: ICloudflareAccount, token: string): Account {
    const emails: IAPIEmail[] = cfAccount.email ? [{
      email: cfAccount.email,
      primary: true,
      verified: true,
      visibility: 'public',
    }] : []

    return new Account(
      cfAccount.id,
      token,
      'cloudflare',
      cfAccount.name,
      cfAccount.email || '',
      '',
      emails,
      cfAccount.id,
      this.endpoint,
      'cloudflare'
    )


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

  // IDeploymentProvider implementation

  public async getProjects(credentials: ICloudProviderCredentials): Promise<ICloudflarePage[]> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/pages/projects`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.result : []
  }

  public async getDeployments(
    credentials: ICloudProviderCredentials,
    projectId: string,
    limit: number = 10
  ): Promise<ICloudflareDeployment[]> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/pages/projects/${projectId}/deployments?per_page=${limit}`,
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
    return data.success ? data.result : []
  }

  public async deploy(
    credentials: ICloudProviderCredentials,
    projectId: string,
    options?: IDeployOptions
  ): Promise<ICloudflareDeployment> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/pages/projects/${projectId}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: options?.branch || 'main',
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create deployment: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Deployment failed')
    }

    return data.result
  }

  // IFunctionsProvider implementation

  public async getFunctions(credentials: ICloudProviderCredentials): Promise<ICloudflareWorker[]> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/workers/scripts`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch workers: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.result : []
  }

  // IStorageProvider implementation

  public async getBuckets(credentials: ICloudProviderCredentials): Promise<ICloudflareR2Bucket[]> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/r2/buckets`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch R2 buckets: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.result.buckets : []
  }

  // IDatabaseProvider implementation

  public async getDatabases(credentials: ICloudProviderCredentials): Promise<ICloudflareD1Database[]> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/d1/database`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch D1 databases: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.result : []
  }

  public async executeQuery(
    credentials: ICloudProviderCredentials,
    databaseId: string,
    query: string
  ): Promise<any> {
    const { token, accountId } = credentials
    if (!token || !accountId) throw new Error('Token and accountId required')

    const response = await fetch(
      `${this.apiBaseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: query }),
      }
    )

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.result : []
  }

  public async getTables(
    credentials: ICloudProviderCredentials,
    databaseId: string
  ): Promise<ICloudTable[]> {
    // D1 doesn't have a direct tables endpoint, so we query sqlite_master
    const result = await this.executeQuery(
      credentials,
      databaseId,
      "SELECT name FROM sqlite_master WHERE type='table'"
    )
    
    return result[0]?.results?.map((row: any) => ({
      id: row.name,
      name: row.name,
      schema: 'public',
      rowCount: 0, // Would need to query each table for count
    })) || []
  }
}

export const cloudflareProvider = new CloudflareProvider()
