/**
 * WordPress Deployment Configuration
 * For linking repositories to staging and production WordPress sites
 */

export type WordPressEnvironmentType = 'staging' | 'production' | 'development'

export type FTPProtocol = 'ftp' | 'sftp' | 'ftps'

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
  /** Remote path on server (e.g., /public_html/wp-content/plugins/my-plugin) */
  readonly remotePath: string
  /** Whether to use passive mode (FTP only) */
  readonly passiveMode?: boolean
  /** Connection timeout in milliseconds */
  readonly timeout?: number
}

export interface IWordPressEnvironment {
  /** Environment identifier */
  readonly id: string
  /** Environment name (e.g., "Staging", "Production") */
  readonly name: string
  /** Environment type */
  readonly type: WordPressEnvironmentType
  /** FTP configuration */
  readonly ftp: IFTPConfig
  /** WordPress site URL */
  readonly siteUrl: string
  /** WordPress admin URL */
  readonly adminUrl?: string
  /** Whether this environment is active for deployment */
  readonly isActive: boolean
  /** Files/folders to exclude from deployment */
  readonly excludePatterns: ReadonlyArray<string>
  /** Files/folders to include (if empty, deploy all) */
  readonly includePatterns?: ReadonlyArray<string>
  /** Post-deployment commands (e.g., clear cache) */
  readonly postDeployCommands?: ReadonlyArray<string>
  /** Last deployment timestamp */
  readonly lastDeployedAt?: Date
  /** Last deployment status */
  readonly lastDeploymentStatus?: 'success' | 'failed' | 'in-progress'
  /** Last deployment log */
  readonly lastDeploymentLog?: string
}

export interface IWordPressPluginConfig {
  /** Repository ID */
  readonly repositoryId: number
  /** Plugin name (from plugin header) */
  readonly pluginName?: string
  /** Plugin slug (folder name) */
  readonly pluginSlug?: string
  /** Plugin version */
  readonly version?: string
  /** WordPress environments */
  readonly environments: ReadonlyArray<IWordPressEnvironment>
  /** Default environment for quick deploy */
  readonly defaultEnvironmentId?: string
  /** Whether to auto-deploy on push to specific branch */
  readonly autoDeploy?: {
    readonly enabled: boolean
    readonly branchPattern: string
    readonly targetEnvironmentId: string
  }
  /** Whether this is a WordPress plugin */
  readonly isPlugin: boolean
  /** Whether this is a WordPress theme */
  readonly isTheme: boolean
  /** WordPress minimum version requirement */
  readonly requiresWordPress?: string
  /** PHP minimum version requirement */
  readonly requiresPHP?: string
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
  /** Deployment duration in milliseconds */
  readonly duration: number
  /** Timestamp */
  readonly timestamp: Date
  /** Detailed log */
  readonly log: ReadonlyArray<string>
}

export interface IWordPressPluginHeader {
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
export function parsePluginHeader(content: string): IWordPressPluginHeader {
  const header: Partial<IWordPressPluginHeader> = {}
  
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
  
  return header as IWordPressPluginHeader
}

/**
 * Detect if a repository contains a WordPress plugin
 */
export function detectWordPressPlugin(files: string[]): { isPlugin: boolean; isTheme: boolean; mainFile?: string } {
  // Check for plugin header in PHP files
  const phpFiles = files.filter(f => f.endsWith('.php'))
  
  for (const file of phpFiles) {
    if (file.includes('style.css') && !file.includes('vendor')) {
      // Could be a theme - check for style.css with theme header
      return { isPlugin: false, isTheme: true, mainFile: file }
    }
  }
  
  // Look for main plugin file (usually in root or directly in plugin folder)
  const mainFile = phpFiles.find(f => {
    const isRootLevel = !f.includes('/') || f.split('/').length <= 2
    return isRootLevel && !f.includes('vendor') && !f.includes('node_modules')
  })
  
  return { 
    isPlugin: !!mainFile, 
    isTheme: false,
    mainFile 
  }
}

/**
 * Get default exclude patterns for WordPress deployments
 */
export function getDefaultExcludePatterns(): string[] {
  return [
    '.git',
    '.github',
    '.gitignore',
    'node_modules',
    'vendor',
    '.env',
    '.env.*',
    '*.log',
    'wp-config.php',
    'phpunit.xml',
    'tests',
    '__tests__',
    '*.test.js',
    '*.spec.js',
    '.vscode',
    '.idea',
    '*.map',
    'README.md',
    'CHANGELOG.md',
    'composer.lock',
    'package-lock.json',
    'yarn.lock',
    '.DS_Store',
    'Thumbs.db',
  ]
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
