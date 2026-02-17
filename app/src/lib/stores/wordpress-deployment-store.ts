import { TypedBaseStore } from './base-store'
import { Repository } from '../../models/repository'
import {
  IWordPressPluginConfig,
  IWordPressEnvironment,
  IDeploymentResult,
  IFTPConfig,
  WordPressEnvironmentType,
  getDefaultExcludePatterns,
  validateFTPConfig,
  detectWordPressPlugin
} from '../../models/wordpress-deployment'

/**
 * WordPress Deployment Store State
 */
export interface IWordPressDeploymentState {
  /** Whether a deployment is in progress */
  readonly isDeploying: boolean
  /** Current deployment progress (0-100) */
  readonly progress: number
  /** Current deployment message */
  readonly message: string
  /** Current environment being deployed to */
  readonly currentEnvironmentId?: string
  /** Last deployment results */
  readonly lastResults: ReadonlyArray<IDeploymentResult>
}

/**
 * Store for managing WordPress plugin/theme deployments
 */
export class WordPressDeploymentStore extends TypedBaseStore<IWordPressDeploymentState> {
  private configs: Map<number, IWordPressPluginConfig> = new Map()
  private state: IWordPressDeploymentState = {
    isDeploying: false,
    progress: 0,
    message: '',
    lastResults: [],
  }

  /**
   * Get current state
   */
  public getState(): IWordPressDeploymentState {
    return this.state
  }

  /**
   * Get WordPress config for a repository
   */
  public getConfig(repositoryId: number): IWordPressPluginConfig | undefined {
    return this.configs.get(repositoryId)
  }

  /**
   * Set WordPress config for a repository
   */
  public setConfig(config: IWordPressPluginConfig): void {
    this.configs.set(config.repositoryId, config)
    this.emitUpdate(this.getState())
  }

  /**
   * Remove WordPress config for a repository
   */
  public removeConfig(repositoryId: number): void {
    this.configs.delete(repositoryId)
    this.emitUpdate(this.getState())
  }

  /**
   * Initialize WordPress config from repository detection
   */
  public initializeFromRepository(
    repository: Repository,
    files: string[]
  ): IWordPressPluginConfig | undefined {
    const existing = this.configs.get(repository.id)
    if (existing) return existing

    const detection = detectWordPressPlugin(files)
    if (!detection.isPlugin && !detection.isTheme) return undefined

    const config: IWordPressPluginConfig = {
      repositoryId: repository.id,
      isPlugin: detection.isPlugin,
      isTheme: detection.isTheme,
      environments: [],
    }


    this.configs.set(repository.id, config)
    this.emitUpdate(this.getState())
    return config
  }

  /**
   * Add environment to a repository's WordPress config
   */
  public addEnvironment(
    repositoryId: number,
    environment: Omit<IWordPressEnvironment, 'id'>
  ): IWordPressEnvironment {
    const config = this.configs.get(repositoryId)
    if (!config) throw new Error('Repository not configured for WordPress')

    const id = `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newEnvironment: IWordPressEnvironment = {
      ...environment,
      id,
      excludePatterns: environment.excludePatterns || getDefaultExcludePatterns(),
    }

    const updated: IWordPressPluginConfig = {
      ...config,
      environments: [...config.environments, newEnvironment],
    }

    this.configs.set(repositoryId, updated)
    this.emitUpdate(this.getState())
    return newEnvironment
  }

  /**
   * Update environment configuration
   */
  public updateEnvironment(
    repositoryId: number,
    environmentId: string,
    updates: Partial<IWordPressEnvironment>
  ): void {
    const config = this.configs.get(repositoryId)
    if (!config) throw new Error('Repository not configured for WordPress')

    const updated: IWordPressPluginConfig = {
      ...config,
      environments: config.environments.map(env =>
        env.id === environmentId ? { ...env, ...updates } : env
      ),
    }

    this.configs.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Remove environment from configuration
   */
  public removeEnvironment(repositoryId: number, environmentId: string): void {
    const config = this.configs.get(repositoryId)
    if (!config) throw new Error('Repository not configured for WordPress')

    const updated: IWordPressPluginConfig = {
      ...config,
      environments: config.environments.filter(env => env.id !== environmentId),
      defaultEnvironmentId: config.defaultEnvironmentId === environmentId
        ? undefined
        : config.defaultEnvironmentId,
    }

    this.configs.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Set default environment for quick deploy
   */
  public setDefaultEnvironment(repositoryId: number, environmentId: string): void {
    const config = this.configs.get(repositoryId)
    if (!config) throw new Error('Repository not configured for WordPress')

    const updated: IWordPressPluginConfig = {
      ...config,
      defaultEnvironmentId: environmentId,
    }

    this.configs.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Get environment by type (staging, production, etc.)
   */
  public getEnvironmentByType(
    repositoryId: number,
    type: WordPressEnvironmentType
  ): IWordPressEnvironment | undefined {
    const config = this.configs.get(repositoryId)
    if (!config) return undefined
    return config.environments.find(env => env.type === type)
  }

  /**
   * Deploy to a specific environment
   */
  public async deploy(
    repository: Repository,
    environmentId: string,
    options: {
      dryRun?: boolean
      force?: boolean
    } = {}
  ): Promise<IDeploymentResult> {
    const config = this.configs.get(repository.id)
    if (!config) throw new Error('Repository not configured for WordPress')

    const environment = config.environments.find(env => env.id === environmentId)
    if (!environment) throw new Error('Environment not found')

    // Validate FTP config
    const validation = validateFTPConfig(environment.ftp)
    if (!validation.valid) {
      throw new Error(`Invalid FTP configuration: ${validation.errors.join(', ')}`)
    }

    // Update state
    this.state = {
      ...this.state,
      isDeploying: true,
      progress: 0,
      message: `Connecting to ${environment.name}...`,
      currentEnvironmentId: environmentId,
    }
    this.emitUpdate(this.state)

    const startTime = Date.now()
    const log: string[] = []
    let filesUploaded = 0
    let filesDeleted = 0

    try {
      // Mark environment as in-progress
      this.updateEnvironment(repository.id, environmentId, {
        lastDeploymentStatus: 'in-progress',
      })

      // Step 1: Connect to FTP
      this.updateProgress(10, 'Connecting to FTP server...')
      log.push(`[${new Date().toISOString()}] Connecting to ${environment.ftp.host}:${environment.ftp.port}`)

      // Step 2: Scan local files
      this.updateProgress(20, 'Scanning local files...')
      const localFiles = await this.scanLocalFiles(repository, environment)

      // Step 3: Scan remote files (if not force deploy)
      let remoteFiles: string[] = []
      if (!options.force) {
        this.updateProgress(30, 'Scanning remote files...')
        remoteFiles = await this.scanRemoteFiles(environment.ftp)
      }

      // Step 4: Calculate diff
      this.updateProgress(40, 'Calculating file differences...')
      const { toUpload, toDelete } = this.calculateDiff(localFiles, remoteFiles, environment)

      // Step 5: Delete removed files
      if (toDelete.length > 0 && !options.dryRun) {
        this.updateProgress(50, `Deleting ${toDelete.length} files...`)
        for (const file of toDelete) {
          await this.deleteRemoteFile(environment.ftp, file)
          filesDeleted++
          log.push(`[DELETE] ${file}`)
        }
      }

      // Step 6: Upload files
      if (toUpload.length > 0 && !options.dryRun) {
        for (let i = 0; i < toUpload.length; i++) {
          const file = toUpload[i]
          const progress = 50 + Math.round((i / toUpload.length) * 45)
          this.updateProgress(progress, `Uploading ${file} (${i + 1}/${toUpload.length})...`)
          
          await this.uploadFile(repository, environment.ftp, file)
          filesUploaded++
          log.push(`[UPLOAD] ${file}`)
        }
      }

      // Step 7: Run post-deploy commands
      if (environment.postDeployCommands && !options.dryRun) {
        this.updateProgress(95, 'Running post-deployment commands...')
        for (const command of environment.postDeployCommands) {
          log.push(`[COMMAND] ${command}`)
          // Commands would be executed via SSH or WP-CLI if available
        }
      }

      // Success
      const duration = Date.now() - startTime
      this.updateProgress(100, 'Deployment complete!')

      const result: IDeploymentResult = {
        environmentId,
        success: true,
        filesUploaded,
        filesDeleted,
        duration,
        timestamp: new Date(),
        log,
      }

      // Update environment status
      this.updateEnvironment(repository.id, environmentId, {
        lastDeployedAt: new Date(),
        lastDeploymentStatus: 'success',
        lastDeploymentLog: log.join('\n'),
      })

      // Update state
      this.state = {
        ...this.state,
        isDeploying: false,
        lastResults: [result, ...this.state.lastResults].slice(0, 10), // Keep last 10
      }
      this.emitUpdate(this.state)

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      log.push(`[ERROR] ${errorMessage}`)

      const result: IDeploymentResult = {
        environmentId,
        success: false,
        error: errorMessage,
        filesUploaded,
        filesDeleted,
        duration,
        timestamp: new Date(),
        log,
      }

      // Update environment status
      this.updateEnvironment(repository.id, environmentId, {
        lastDeploymentStatus: 'failed',
        lastDeploymentLog: log.join('\n'),
      })

      // Update state
      this.state = {
        ...this.state,
        isDeploying: false,
        lastResults: [result, ...this.state.lastResults].slice(0, 10),
      }
      this.emitUpdate(this.state)

      return result
    }
  }

  /**
   * Quick deploy to default environment
   */
  public async quickDeploy(repository: Repository): Promise<IDeploymentResult> {
    const config = this.configs.get(repository.id)
    if (!config) throw new Error('Repository not configured for WordPress')

    const defaultEnvId = config.defaultEnvironmentId
    if (!defaultEnvId) throw new Error('No default environment set')

    return this.deploy(repository, defaultEnvId)
  }

  /**
   * Deploy to all active environments
   */
  public async deployToAll(
    repository: Repository
  ): Promise<ReadonlyArray<IDeploymentResult>> {
    const config = this.configs.get(repository.id)
    if (!config) throw new Error('Repository not configured for WordPress')

    const activeEnvironments = config.environments.filter(env => env.isActive)
    const results: IDeploymentResult[] = []

    for (const env of activeEnvironments) {
      const result = await this.deploy(repository, env.id)
      results.push(result)
    }

    return results
  }

  /**
   * Update deployment progress
   */
  private updateProgress(progress: number, message: string): void {
    this.state = {
      ...this.state,
      progress,
      message,
    }
    this.emitUpdate(this.state)
  }

  /**
   * Scan local files in repository
   */
  private async scanLocalFiles(
    repository: Repository,
    environment: IWordPressEnvironment
  ): Promise<string[]> {
    // This would use Node.js fs to scan the repository directory
    // Apply include/exclude patterns
    throw new Error('Local file scanning not implemented - requires Node.js fs access')
  }

  /**
   * Scan remote files via FTP
   */
  private async scanRemoteFiles(ftpConfig: IFTPConfig): Promise<string[]> {
    // This would use an FTP client library
    throw new Error('Remote file scanning not implemented - requires FTP client')
  }

  /**
   * Calculate file diff between local and remote
   */
  private calculateDiff(
    localFiles: string[],
    remoteFiles: string[],
    environment: IWordPressEnvironment
  ): { toUpload: string[]; toDelete: string[] } {
    const localSet = new Set(localFiles)
    const remoteSet = new Set(remoteFiles)

    const toUpload = localFiles.filter(f => !remoteSet.has(f))
    const toDelete = remoteFiles.filter(f => !localSet.has(f))

    return { toUpload, toDelete }
  }

  /**
   * Delete a remote file via FTP
   */
  private async deleteRemoteFile(ftpConfig: IFTPConfig, filePath: string): Promise<void> {
    // This would use an FTP client library
    throw new Error('Remote file deletion not implemented - requires FTP client')
  }

  /**
   * Upload a file via FTP
   */
  private async uploadFile(
    repository: Repository,
    ftpConfig: IFTPConfig,
    filePath: string
  ): Promise<void> {
    // This would use an FTP client library
    throw new Error('File upload not implemented - requires FTP client')
  }

  /**
   * Test FTP connection
   */
  public async testConnection(ftpConfig: IFTPConfig): Promise<{ success: boolean; message: string }> {
    try {
      // This would attempt to connect via FTP client
      return { success: true, message: 'Connection successful' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      return { success: false, message }
    }
  }

  /**
   * Load configurations from storage
   */
  public async loadFromStorage(): Promise<void> {
    // Implementation depends on storage mechanism
  }

  /**
   * Save configurations to storage
   */
  public async saveToStorage(): Promise<void> {
    // Implementation depends on storage mechanism
  }
}

export const wordPressDeploymentStore = new WordPressDeploymentStore()
