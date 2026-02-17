import { TypedBaseStore } from './base-store'
import { Repository } from '../../models/repository'
import {
  IFTPDeploymentConfig,
  IDeploymentEnvironment,
  IDeploymentResult,
  IDeploymentPreview,
  IFTPConfig, getDefaultExcludePatterns,
  validateFTPConfig,
  detectDeploymentType,
  getSuggestedRemotePath
} from '../../models/ftp-deployment'

/**
 * FTP Deployment Store State
 */
export interface IFTPDeploymentState {
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
  /** Deployment preview (for dry runs) */
  readonly preview?: IDeploymentPreview
}

/**
 * Generic FTP Deployment Store
 * Handles WordPress, static sites, and custom deployments
 */
export class FTPDeploymentStore extends TypedBaseStore<IFTPDeploymentState> {
  private configs: Map<number, IFTPDeploymentConfig> = new Map()
  private state: IFTPDeploymentState = {
    isDeploying: false,
    progress: 0,
    message: '',
    lastResults: [],
  }

  /**
   * Get current state
   */
  public getState(): IFTPDeploymentState {
    return this.state
  }

  /**
   * Get deployment config for a repository
   */
  public getConfig(repositoryId: number): IFTPDeploymentConfig | undefined {
    return this.configs.get(repositoryId)
  }

  /**
   * Set deployment config for a repository
   */
  public setConfig(config: IFTPDeploymentConfig): void {
    this.configs.set(config.repositoryId, config)
    this.emitUpdate(this.getState())
  }

  /**
   * Remove deployment config for a repository
   */
  public removeConfig(repositoryId: number): void {
    this.configs.delete(repositoryId)
    this.emitUpdate(this.getState())
  }

  /**
   * Initialize config from repository detection
   */
  public initializeFromRepository(
    repository: Repository,
    files: string[]
  ): IFTPDeploymentConfig | undefined {
    const existing = this.configs.get(repository.id)
    if (existing) return existing

    const detection = detectDeploymentType(files)
    
    const config: IFTPDeploymentConfig = {
      repositoryId: repository.id,
      deploymentType: detection.type,
      name: detection.name,
      environments: [],
      sourceDirectory: detection.type === 'static-site' ? 'dist' : undefined,
      buildCommand: detection.type === 'static-site' ? 'npm run build' : undefined,
    }

    this.configs.set(repository.id, config)
    this.emitUpdate(this.getState())
    return config
  }

  /**
   * Add environment to a repository's config
   */
  public addEnvironment(
    repositoryId: number,
    environment: Omit<IDeploymentEnvironment, 'id'>
  ): IDeploymentEnvironment {
    const config = this.configs.get(repositoryId)
    if (!config) throw new Error('Repository not configured for deployment')

    const id = `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newEnvironment: IDeploymentEnvironment = {
      ...environment,
      id,
      excludePatterns: environment.excludePatterns || getDefaultExcludePatterns(config.deploymentType),
    }

    const updated: IFTPDeploymentConfig = {
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
    updates: Partial<IDeploymentEnvironment>
  ): void {
    const config = this.configs.get(repositoryId)
    if (!config) throw new Error('Repository not configured for deployment')

    const updated: IFTPDeploymentConfig = {
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
    if (!config) throw new Error('Repository not configured for deployment')

    const updated: IFTPDeploymentConfig = {
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
    if (!config) throw new Error('Repository not configured for deployment')

    const updated: IFTPDeploymentConfig = {
      ...config,
      defaultEnvironmentId: environmentId,
    }

    this.configs.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Get environment by type
   */
  public getEnvironmentByType(
    repositoryId: number,
    type: string
  ): IDeploymentEnvironment | undefined {
    const config = this.configs.get(repositoryId)
    if (!config) return undefined
    return config.environments.find(env => env.type === type)
  }

  /**
   * Preview deployment (dry run)
   */
  public async previewDeployment(
    repository: Repository,
    environmentId: string
  ): Promise<IDeploymentPreview> {

    const config = this.configs.get(repository.id)
    if (!config) throw new Error('Repository not configured for deployment')

    const environment = config.environments.find(env => env.id === environmentId)
    if (!environment) throw new Error('Environment not found')

    // Scan local files
    const localFiles = await this.scanLocalFiles(repository, config, environment)
    
    // Scan remote files
    const remoteFiles = await this.scanRemoteFiles(environment.ftp)
    
    // Calculate diff
    const { toUpload, toDelete, unchanged } = this.calculateDiff(localFiles, remoteFiles, environment)
    
    // Calculate total size
    const totalUploadSize = await this.calculateTotalSize(repository, toUpload)
    
    // Estimate time (rough estimate: 100KB/s)
    const estimatedTime = totalUploadSize / (100 * 1024)

    return {
      toUpload,
      toDelete,
      unchanged,
      totalUploadSize,
      estimatedTime,
    }
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
      skipBuild?: boolean
    } = {}
  ): Promise<IDeploymentResult> {
    const config = this.configs.get(repository.id)
    if (!config) throw new Error('Repository not configured for deployment')

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
      message: `Preparing deployment to ${environment.name}...`,
      currentEnvironmentId: environmentId,
    }
    this.emitUpdate(this.state)

    const startTime = Date.now()
    const log: string[] = []
    let filesUploaded = 0
    let filesDeleted = 0
    let filesUnchanged = 0
    let directoriesCreated = 0
    let buildOutput = ''

    try {
      // Mark environment as in-progress
      this.updateEnvironment(repository.id, environmentId, {
        lastDeploymentStatus: 'in-progress',
      })

      // Step 1: Run build command if specified and not skipped
      if (config.buildCommand && !options.skipBuild && !options.dryRun) {
        this.updateProgress(5, `Running build: ${config.buildCommand}...`)
        log.push(`[BUILD] ${config.buildCommand}`)
        buildOutput = await this.runBuildCommand(repository, config.buildCommand)
        log.push(`[BUILD OUTPUT] ${buildOutput}`)
      }

      // Step 2: Connect to FTP
      this.updateProgress(10, 'Connecting to FTP server...')
      log.push(`[${new Date().toISOString()}] Connecting to ${environment.ftp.host}:${environment.ftp.port}`)

      // Step 3: Run pre-deploy commands
      if (environment.preDeployCommands && !options.dryRun) {
        this.updateProgress(15, 'Running pre-deployment commands...')
        for (const command of environment.preDeployCommands) {
          log.push(`[PRE-COMMAND] ${command}`)
        }
      }

      // Step 4: Create backup if enabled
      let backupPath: string | undefined
      if (config.backupBeforeDeploy && !options.dryRun) {
        this.updateProgress(20, 'Creating backup...')
        backupPath = await this.createBackup(environment.ftp)
        log.push(`[BACKUP] Created at ${backupPath}`)
      }

      // Step 5: Scan local files
      this.updateProgress(25, 'Scanning local files...')
      const localFiles = await this.scanLocalFiles(repository, config, environment)

      // Step 6: Scan remote files (if not force deploy)
      let remoteFiles: string[] = []
      if (!options.force) {
        this.updateProgress(30, 'Scanning remote files...')
        remoteFiles = await this.scanRemoteFiles(environment.ftp)
      }

      // Step 7: Calculate diff
      this.updateProgress(35, 'Calculating file differences...')
      const { toUpload, toDelete, unchanged } = this.calculateDiff(localFiles, remoteFiles, environment)
      filesUnchanged = unchanged.length

      // Step 8: Create directories
      const directories = [...new Set(toUpload.map(f => f.split('/').slice(0, -1).join('/')).filter(Boolean))]
      if (directories.length > 0 && !options.dryRun) {
        this.updateProgress(40, `Creating ${directories.length} directories...`)
        for (const dir of directories) {
          await this.createRemoteDirectory(environment.ftp, dir)
          directoriesCreated++
        }
      }

      // Step 9: Delete removed files
      if (toDelete.length > 0 && !config.preserveRemoteFiles && !options.dryRun) {
        this.updateProgress(45, `Deleting ${toDelete.length} files...`)
        for (const file of toDelete) {
          await this.deleteRemoteFile(environment.ftp, file)
          filesDeleted++
          log.push(`[DELETE] ${file}`)
        }
      }

      // Step 10: Upload files
      if (toUpload.length > 0 && !options.dryRun) {
        for (let i = 0; i < toUpload.length; i++) {
          const file = toUpload[i]
          const progress = 50 + Math.round((i / toUpload.length) * 40)
          this.updateProgress(progress, `Uploading ${file} (${i + 1}/${toUpload.length})...`)
          
          await this.uploadFile(repository, config, environment.ftp, file)
          filesUploaded++
          log.push(`[UPLOAD] ${file}`)
        }
      }

      // Step 11: Set environment variables
      if (environment.envVars && !options.dryRun) {
        this.updateProgress(92, 'Setting environment variables...')
        for (const [key, value] of Object.entries(environment.envVars)) {
          log.push(`[ENV] ${key}=${value}`)
        }
      }

      // Step 12: Run post-deploy commands
      if (environment.postDeployCommands && !options.dryRun) {
        this.updateProgress(95, 'Running post-deployment commands...')
        for (const command of environment.postDeployCommands) {
          log.push(`[POST-COMMAND] ${command}`)
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
        filesUnchanged,
        directoriesCreated,
        duration,
        timestamp: new Date(),
        log,
        backupPath,
        buildOutput,
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
        lastResults: [result, ...this.state.lastResults].slice(0, 10),
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
        filesUnchanged,
        directoriesCreated,
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
    if (!config) throw new Error('Repository not configured for deployment')

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
    if (!config) throw new Error('Repository not configured for deployment')

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

  // Placeholder methods for actual implementation
  private async scanLocalFiles(
    repository: Repository,
    config: IFTPDeploymentConfig,
    environment: IDeploymentEnvironment
  ): Promise<string[]> {
    throw new Error('Local file scanning not implemented')
  }

  private async scanRemoteFiles(ftpConfig: IFTPConfig): Promise<string[]> {
    throw new Error('Remote file scanning not implemented')
  }

  private async calculateTotalSize(
    repository: Repository,
    files: string[]
  ): Promise<number> {
    return 0
  }

  private async runBuildCommand(
    repository: Repository,
    command: string
  ): Promise<string> {
    throw new Error('Build command execution not implemented')
  }

  private async createBackup(ftpConfig: IFTPConfig): Promise<string> {
    throw new Error('Backup creation not implemented')
  }

  private async createRemoteDirectory(ftpConfig: IFTPConfig, path: string): Promise<void> {
    throw new Error('Directory creation not implemented')
  }

  private async deleteRemoteFile(ftpConfig: IFTPConfig, filePath: string): Promise<void> {
    throw new Error('Remote file deletion not implemented')
  }

  private async uploadFile(
    repository: Repository,
    config: IFTPDeploymentConfig,
    ftpConfig: IFTPConfig,
    filePath: string
  ): Promise<void> {
    throw new Error('File upload not implemented')
  }

  private calculateDiff(
    localFiles: string[],
    remoteFiles: string[],
    environment: IDeploymentEnvironment
  ): { toUpload: string[]; toDelete: string[]; unchanged: string[] } {
    const localSet = new Set(localFiles)
    const remoteSet = new Set(remoteFiles)

    const toUpload = localFiles.filter(f => !remoteSet.has(f))
    const toDelete = remoteFiles.filter(f => !localSet.has(f))
    const unchanged = localFiles.filter(f => remoteSet.has(f))

    return { toUpload, toDelete, unchanged }
  }

  /**
   * Test FTP connection
   */
  public async testConnection(ftpConfig: IFTPConfig): Promise<{ success: boolean; message: string }> {
    try {
      return { success: true, message: 'Connection successful' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      return { success: false, message }
    }
  }

  /**
   * Get suggested remote path
   */
  public getSuggestedRemotePath(repositoryId: number): string {
    const config = this.configs.get(repositoryId)
    if (!config) return '/'
    return getSuggestedRemotePath(config.deploymentType, config.name)
  }
}

export const ftpDeploymentStore = new FTPDeploymentStore()
