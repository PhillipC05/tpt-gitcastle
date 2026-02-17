/**
 * Generic FTP Deployment System
 * Supports WordPress, static sites, and custom deployments
 */

export type FTPProtocol = 'ftp' | 'sftp' | 'ftps'

export type DeploymentType = 'wordpress-plugin' | 'wordpress-theme' | 'static-site' | 'custom'

export interface IFTPConfig {
  /** FTP server hostname */
  readonly host: string
  /** FTP server port (default: 21 for FTP, 22 for SFTP) */
  readonly port: number
  /** FTP username */
  readonly username: string
  /** FTP password or private key for SFTP */
  readonly password?: string
  /** Private key path for SFTP key-based auth */
  readonly privateKeyPath?: string
  /** Protocol to use */
  readonly protocol: FTPProtocol
  /** Remote path on server */
  readonly remotePath: string
  /** Whether to use passive mode (FTP only) */
  readonly passiveMode?: boolean
  /** Connection timeout in milliseconds */
  readonly timeout?: number
}

export interface IDeploymentEnvironment {
  /** Environment identifier */
  readonly id: string
  /** Environment name (e.g., "Staging", "Production") */
  readonly name: string
  /** Environment type */
  readonly type: 'development' | 'staging' | 'production' | 'testing'
  /** FTP configuration */
  readonly ftp: IFTPConfig
  /** Site URL for this environment */
  readonly siteUrl?: string
  /** Whether this environment is active for deployment */
  readonly isActive: boolean
  /** Files/folders to exclude from deployment */
  readonly excludePatterns: ReadonlyArray<string>
  /** Files/folders to include (if empty, deploy all) */
  readonly includePatterns?: ReadonlyArray<string>
  /** Post-deployment commands */
  readonly postDeployCommands?: ReadonlyArray<string>
  /** Pre-deployment commands */
  readonly preDeployCommands?: ReadonlyArray<string>
  /** Environment variables to set on remote */
  readonly envVars?: Record<string, string>
  /** Last deployment timestamp */
  readonly lastDeployedAt?: Date
  /** Last deployment status */
  readonly lastDeploymentStatus?: 'success' | 'failed' | 'in-progress'
  /** Last deployment log */
  readonly lastDeploymentLog?: string
  /** Deployment history */
  readonly deploymentHistory?: ReadonlyArray<IDeploymentResult>
}

export interface IFTPDeploymentConfig {
  /** Repository ID */
  readonly repositoryId: number
  /** Type of deployment */
  readonly deploymentType: DeploymentType
  /** Deployment name (e.g., plugin name, site name) */
  readonly name?: string
  /** Environments */
  readonly environments: ReadonlyArray<IDeploymentEnvironment>
  /** Default environment for quick deploy */
  readonly defaultEnvironmentId?: string
  /** Whether to auto-deploy on push to specific branch */
  readonly autoDeploy?: {
    readonly enabled: boolean
    readonly branchPattern: string
    readonly targetEnvironmentId: string
  }
  /** Build command to run before deployment (e.g., npm run build) */
  readonly buildCommand?: string
  /** Source directory to deploy (relative to repo root, e.g., 'dist', 'build') */
  readonly sourceDirectory?: string
  /** Whether to preserve remote files not in local (dangerous if false) */
  readonly preserveRemoteFiles?: boolean
  /** Backup remote before deployment */
  readonly backupBeforeDeploy?: boolean
  /** Backup retention count */
  readonly backupRetentionCount?: number
}

export interface IDeploymentResult {
  /** Environment ID */
  readonly environmentId: string
  /** Whether deployment was successful */
  readonly success: boolean
  /** Error message if failed */
  readonly error?: string
  /** Number of files uploaded */
  readonly filesUploaded: number
  /** Number of files deleted */
  readonly filesDeleted: number
  /** Number of files unchanged */
  readonly filesUnchanged: number
  /** Number of directories created */
  readonly directoriesCreated: number
  /** Deployment duration in milliseconds */
  readonly duration: number
  /** Timestamp */
  readonly timestamp: Date
  /** Detailed log */
  readonly log: ReadonlyArray<string>
  /** Backup path if backup was created */
  readonly backupPath?: string
  /** Build output if build command was run */
  readonly buildOutput?: string
}

export interface IDeploymentPreview {
  /** Files to upload */
  readonly toUpload: string[]
  /** Files to delete */
  readonly toDelete: string[]
  /** Files that will be unchanged */
  readonly unchanged: string[]
  /** Total size to upload (bytes) */
  readonly totalUploadSize: number
  /** Estimated time (seconds) */
  readonly estimatedTime: number
}

// WordPress-specific types (extend the generic system)
export interface IWordPressPluginInfo {
  /** Plugin Name */
  readonly name?: string
  /** Plugin URI */
  readonly pluginUri?: string
  /** Description */
  readonly description?: string
  /** Version */
  readonly version?: string
  /** Requires at least (WP version) */
  readonly requiresAtLeast?: string
  /** Requires PHP */
  readonly requiresPHP?: string
  /** Author */
  readonly author?: string
  /** Author URI */
  readonly authorUri?: string
  /** License */
  readonly license?: string
  /** Text Domain */
  readonly textDomain?: string
  /** Domain Path */
  readonly domainPath?: string
  /** Network */
  readonly network?: boolean
}

/**
 * Parse WordPress plugin header from file content
 */
export function parseWordPressPluginHeader(content: string): IWordPressPluginInfo {
  const header: Partial<IWordPressPluginInfo> = {}
  
  const patterns: Record<string, RegExp> = {
    name: /Plugin Name:\s*(.+)/i,
    pluginUri: /Plugin URI:\s*(.+)/i,
    description: /Description:\s*(.+)/i,
    version: /Version:\s*(.+)/i,
    requiresAtLeast: /Requires at least:\s*(.+)/i,
    requiresPHP: /Requires PHP:\s*(.+)/i,
    author: /Author:\s*(.+)/i,
    authorUri: /Author URI:\s*(.+)/i,
    license: /License:\s*(.+)/i,
    textDomain: /Text Domain:\s*(.+)/i,
    domainPath: /Domain Path:\s*(.+)/i,
    network: /Network:\s*(true|false)/i,
  }
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern)
    if (match) {
      const value = match[1].trim()
      if (key === 'network') {
        (header as any)[key] = value.toLowerCase() === 'true'
      } else {
        (header as any)[key] = value
      }
    }
  }
  
  return header as IWordPressPluginInfo
}

/**
 * Detect deployment type from repository files
 */
export function detectDeploymentType(files: string[]): { 
  type: DeploymentType
  name?: string
  mainFile?: string 
} {
  // Check for WordPress plugin
  const phpFiles = files.filter(f => f.endsWith('.php') && !f.includes('vendor'))
  for (const file of phpFiles) {
    if (!file.includes('/') || file.split('/').length <= 2) {
      // Could be main plugin file
      return { type: 'wordpress-plugin', mainFile: file }
    }
  }
  
  // Check for WordPress theme
  if (files.includes('style.css') && files.some(f => f.includes('template'))) {
    return { type: 'wordpress-theme', name: 'WordPress Theme' }
  }
  
  // Check for static site generators
  if (files.includes('index.html') || files.includes('dist/index.html')) {
    return { type: 'static-site', name: 'Static Site' }
  }
  
  // Default to custom
  return { type: 'custom' }
}

/**
 * Get default exclude patterns based on deployment type
 */
export function getDefaultExcludePatterns(type: DeploymentType): string[] {
  const common = [
    '.git',
    '.github',
    '.gitignore',
    '.gitattributes',
    '.env',
    '.env.*',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '.vscode',
    '.idea',
    '*.map',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
  ]
  
  const typeSpecific: Record<DeploymentType, string[]> = {
    'wordpress-plugin': [
      'node_modules',
      'vendor',
      'composer.lock',
      'package-lock.json',
      'yarn.lock',
      'phpunit.xml',
      'tests',
      '__tests__',
      '*.test.js',
      '*.spec.js',
      'wp-config.php',
      '.wordpress-org',
    ],
    'wordpress-theme': [
      'node_modules',
      'vendor',
      'composer.lock',
      'package-lock.json',
      'yarn.lock',
      'phpunit.xml',
      'tests',
      '__tests__',
      '*.test.js',
      '*.spec.js',
    ],
    'static-site': [
      'node_modules',
      'src',
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'webpack.config.js',
      'rollup.config.js',
      'vite.config.js',
      'tsconfig.json',
    ],
    'custom': [
      'node_modules',
      'vendor',
    ],
  }
  
  return [...common, ...typeSpecific[type]]
}

/**
 * Get suggested remote path based on deployment type
 */
export function getSuggestedRemotePath(type: DeploymentType, name?: string): string {
  switch (type) {
    case 'wordpress-plugin':
      return `/public_html/wp-content/plugins/${name || 'my-plugin'}`
    case 'wordpress-theme':
      return `/public_html/wp-content/themes/${name || 'my-theme'}`
    case 'static-site':
      return `/public_html`
    case 'custom':
      return `/home/user/deployments/${name || 'project'}`
    default:
      return '/'
  }
}

/**
 * Validate FTP configuration
 */
export function validateFTPConfig(config: IFTPConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!config.host) {
    errors.push('FTP host is required')
  }
  
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('Valid FTP port is required (1-65535)')
  }
  
  if (!config.username) {
    errors.push('FTP username is required')
  }
  
  if (!config.password && !config.privateKeyPath) {
    errors.push('FTP password or private key is required')
  }
  
  if (!config.remotePath) {
    errors.push('Remote path is required')
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Get environment color for UI
 */
export function getEnvironmentColor(type: string): string {
  switch (type) {
    case 'production':
      return '#dc3545' // Red
    case 'staging':
      return '#ffc107' // Yellow
    case 'development':
      return '#28a745' // Green
    case 'testing':
      return '#17a2b8' // Blue
    default:
      return '#6c757d' // Gray
  }
}

/**
 * Get environment icon name
 */
export function getEnvironmentIcon(type: string): string {
  switch (type) {
    case 'production':
      return 'server'
    case 'staging':
      return 'beaker'
    case 'development':
      return 'code'
    case 'testing':
      return 'checklist'
    default:
      return 'globe'
  }
}
