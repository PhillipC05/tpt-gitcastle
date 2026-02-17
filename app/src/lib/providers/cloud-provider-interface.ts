import { Account } from '../../models/account'

/**
 * Authentication method for cloud providers
 */
export type CloudAuthMethod = 'token' | 'oauth' | 'api-key'

/**
 * Credentials for cloud provider authentication
 */
export interface ICloudProviderCredentials {
  /** API token/key */
  readonly token?: string
  /** API key (for providers that use key + secret) */
  readonly apiKey?: string
  /** API secret */
  readonly apiSecret?: string
  /** OAuth access token */
  readonly accessToken?: string
  /** Team/organization ID (if applicable) */
  readonly teamId?: string
  /** Account ID (for Cloudflare-style providers) */
  readonly accountId?: string
}

/**
 * Base interface for cloud service providers
 * (Vercel, Supabase, Cloudflare, Netlify, DigitalOcean, etc.)
 */
export interface ICloudProvider {
  /** Provider name */
  readonly name: string
  
  /** Provider identifier */
  readonly id: string
  
  /** API endpoint base URL */
  readonly endpoint: string
  
  /** Supported authentication methods */
  readonly supportedAuthMethods: CloudAuthMethod[]

  /**
   * Authenticate with the cloud provider
   * @param credentials Authentication credentials
   */
  authenticate(credentials: ICloudProviderCredentials): Promise<Account>

  /**
   * Validate credentials are still valid
   * @param credentials Credentials to validate
   */
  validateCredentials(credentials: ICloudProviderCredentials): Promise<boolean>

  /**
   * Refresh authentication if needed
   * @param account The account to refresh
   * @param credentials Current credentials
   */
  refreshAuthentication?(
    account: Account,
    credentials: ICloudProviderCredentials
  ): Promise<ICloudProviderCredentials>
}

/**
 * Deployment provider interface
 * For providers that deploy applications (Vercel, Netlify, Cloudflare Pages, etc.)
 */
export interface IDeploymentProvider extends ICloudProvider {
  /**
   * Get list of projects/sites
   * @param credentials Authentication credentials
   */
  getProjects(credentials: ICloudProviderCredentials): Promise<ICloudProject[]>

  /**
   * Get deployments for a project
   * @param credentials Authentication credentials
   * @param projectId Project identifier
   * @param limit Maximum number of deployments to return
   */
  getDeployments(
    credentials: ICloudProviderCredentials,
    projectId: string,
    limit?: number
  ): Promise<ICloudDeployment[]>

  /**
   * Trigger a new deployment
   * @param credentials Authentication credentials
   * @param projectId Project identifier
   * @param options Deployment options
   */
  deploy(
    credentials: ICloudProviderCredentials,
    projectId: string,
    options?: IDeployOptions
  ): Promise<ICloudDeployment>

  /**
   * Get deployment logs
   * @param credentials Authentication credentials
   * @param deploymentId Deployment identifier
   */
  getDeploymentLogs?(
    credentials: ICloudProviderCredentials,
    deploymentId: string
  ): Promise<string[]>
}

/**
 * Database provider interface
 * For providers with database services (Supabase, Cloudflare D1, etc.)
 */
export interface IDatabaseProvider extends ICloudProvider {
  /**
   * Get list of databases
   * @param credentials Authentication credentials
   */
  getDatabases(
    credentials: ICloudProviderCredentials
  ): Promise<ICloudDatabase[]>

  /**
   * Execute a query
   * @param credentials Authentication credentials
   * @param databaseId Database identifier
   * @param query SQL query to execute
   */
  executeQuery(
    credentials: ICloudProviderCredentials,
    databaseId: string,
    query: string
  ): Promise<any>

  /**
   * Get database tables
   * @param credentials Authentication credentials
   * @param databaseId Database identifier
   */
  getTables?(
    credentials: ICloudProviderCredentials,
    databaseId: string
  ): Promise<ICloudTable[]>
}

/**
 * Storage provider interface
 * For providers with object storage (S3, R2, Spaces, etc.)
 */
export interface IStorageProvider extends ICloudProvider {
  /**
   * Get list of buckets/containers
   * @param credentials Authentication credentials
   */
  getBuckets(credentials: ICloudProviderCredentials): Promise<ICloudBucket[]>

  /**
   * List objects in a bucket
   * @param credentials Authentication credentials
   * @param bucketId Bucket identifier
   * @param prefix Optional path prefix
   */
  listObjects?(
    credentials: ICloudProviderCredentials,
    bucketId: string,
    prefix?: string
  ): Promise<ICloudObject[]>
}

/**
 * Serverless/Functions provider interface
 * For providers with serverless functions (Workers, Functions, Lambda, etc.)
 */
export interface IFunctionsProvider extends ICloudProvider {
  /**
   * Get list of functions
   * @param credentials Authentication credentials
   */
  getFunctions(credentials: ICloudProviderCredentials): Promise<ICloudFunction[]>

  /**
   * Deploy a function
   * @param credentials Authentication credentials
   * @param functionId Function identifier
   * @param code Function code
   */
  deployFunction?(
    credentials: ICloudProviderCredentials,
    functionId: string,
    code: string
  ): Promise<ICloudFunction>
}

// Common types

export interface ICloudProject {
  id: string
  name: string
  url?: string
  createdAt: string
  updatedAt: string
  status: string
  [key: string]: any
}

export interface ICloudDeployment {
  id: string
  projectId: string
  url: string
  status: 'ready' | 'building' | 'error' | 'canceled' | 'queued' | 'success' | 'failure'
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

export interface IDeployOptions {
  branch?: string
  commit?: string
  env?: Record<string, string>
  [key: string]: any
}

export interface ICloudDatabase {
  id: string
  name: string
  type: string
  status: string
  region?: string
  createdAt: string
}

export interface ICloudTable {
  id: string
  name: string
  schema: string
  rowCount: number
}

export interface ICloudBucket {
  id: string
  name: string
  region?: string
  public: boolean
  createdAt: string
}

export interface ICloudObject {
  id: string
  name: string
  size: number
  lastModified: string
  contentType?: string
}

export interface ICloudFunction {
  id: string
  name: string
  slug?: string
  status: 'active' | 'inactive' | 'error'
  runtime?: string
  createdAt: string
  updatedAt: string
}
