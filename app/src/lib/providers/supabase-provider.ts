import { IGitProvider, IProviderCapabilities, AuthenticationMethod } from './provider-interface'
import { Account } from '../../models/account'

/**
 * Supabase API configuration
 */
export const SupabaseAPI = {
  endpoint: 'https://api.supabase.com',
  webEndpoint: 'https://supabase.com',
  managementEndpoint: 'https://api.supabase.com/v1',
}

/**
 * Supabase project
 */
export interface ISupabaseProject {
  readonly id: string
  readonly ref: string
  readonly name: string
  readonly status: 'ACTIVE' | 'INACTIVE' | 'COMING_UP' | 'GOING_DOWN'
  readonly createdAt: string
  readonly region: string
  readonly organizationId: string
  readonly database: {
    readonly host: string
    readonly version: string
  }
}

/**
 * Supabase database table
 */
export interface ISupabaseTable {
  readonly id: number
  readonly name: string
  readonly schema: string
  readonly rowCount: number
  readonly size: number
  readonly columns: ReadonlyArray<{
    readonly name: string
    readonly type: string
    readonly isNullable: boolean
    readonly defaultValue: string | null
  }>
}

/**
 * Supabase storage bucket
 */
export interface ISupabaseBucket {
  readonly id: string
  readonly name: string
  readonly public: boolean
  readonly fileSizeLimit: number | null
  readonly allowedMimeTypes: ReadonlyArray<string> | null
  readonly createdAt: string
  readonly updatedAt: string
}

/**
 * Supabase edge function
 */
export interface ISupabaseFunction {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly status: 'ACTIVE' | 'INACTIVE'
  readonly createdAt: string
  readonly updatedAt: string
  readonly verifyJwt: boolean
}

/**
 * Supabase auth user
 */
export interface ISupabaseAuthUser {
  readonly id: string
  readonly email: string
  readonly phone: string | null
  readonly createdAt: string
  readonly lastSignInAt: string | null
  readonly emailConfirmed: boolean
  readonly phoneConfirmed: boolean
}

/**
 * Supabase realtime channel
 */
export interface ISupabaseRealtimeChannel {
  readonly id: string
  readonly name: string
  readonly topic: string
  readonly createdAt: string
}

/**
 * Supabase provider implementation
 */
export class SupabaseProvider implements IGitProvider {
  public readonly name = 'supabase'
  public readonly displayName = 'Supabase'
  public readonly brandColor = '#3ECF8E'
  public readonly icon = 'supabase'

  public readonly capabilities: IProviderCapabilities = {
    supportsOAuth: true,
    supportsTokenAuth: true,
    supportsSSHAuth: false,
    supportsRepositories: false,
    supportsIssues: false,
    supportsPullRequests: false,
    supportsDeployments: false,
    supportsServerless: true,
    supportsDatabase: true,
    supportsStorage: true,
    supportsRealtime: true,
    supportsAuth: true,
    defaultAuthenticationMethod: AuthenticationMethod.Token,
  }

  public getAPIEndpoint(): string {
    return SupabaseAPI.endpoint
  }

  public getWebEndpoint(): string {
    return SupabaseAPI.webEndpoint
  }

  public async authenticateWithToken(token: string): Promise<Account> {
    // Supabase uses personal access tokens
    const response = await fetch(`${SupabaseAPI.managementEndpoint}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Supabase authentication failed: ${response.statusText}`)
    }

    const user = await response.json()

    return new Account(
      user.id,
      user.email,
      '', // Token stored separately
      SupabaseAPI.endpoint,
      [],
      user.avatar_url,
      'supabase',
      user.name || user.email
    )
  }

  /**
   * Get Supabase projects
   */
  public async getProjects(token: string): Promise<ReadonlyArray<ISupabaseProject>> {
    const response = await fetch(`${SupabaseAPI.managementEndpoint}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Supabase projects: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get project details
   */
  public async getProject(token: string, projectRef: string): Promise<ISupabaseProject> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get database tables
   */
  public async getTables(
    token: string,
    projectRef: string
  ): Promise<ReadonlyArray<ISupabaseTable>> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}/database/tables`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get storage buckets
   */
  public async getBuckets(
    token: string,
    projectRef: string
  ): Promise<ReadonlyArray<ISupabaseBucket>> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}/storage/buckets`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch buckets: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get edge functions
   */
  public async getFunctions(
    token: string,
    projectRef: string
  ): Promise<ReadonlyArray<ISupabaseFunction>> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}/functions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch functions: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get auth users
   */
  public async getAuthUsers(
    token: string,
    projectRef: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<{
    users: ReadonlyArray<ISupabaseAuthUser>
    total: number
  }> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}/auth/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch auth users: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Execute SQL query
   */
  public async executeQuery(
    token: string,
    projectRef: string,
    query: string
  ): Promise<{ result: any }> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!response.ok) {
      throw new Error(`Query execution failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get project API keys
   */
  public async getProjectApiKeys(
    token: string,
    projectRef: string
  ): Promise<{
    anonKey: string
    serviceRoleKey: string
  }> {
    const response = await fetch(
      `${SupabaseAPI.managementEndpoint}/projects/${projectRef}/api-keys`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch API keys: ${response.statusText}`)
    }

    const keys = await response.json()
    return {
      anonKey: keys.find((k: any) => k.name === 'anon')?.api_key || '',
      serviceRoleKey: keys.find((k: any) => k.name === 'service_role')?.api_key || '',
    }
  }
}
