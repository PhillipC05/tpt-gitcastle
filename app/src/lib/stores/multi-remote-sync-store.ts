import { TypedBaseStore } from './base-store'
import { Account } from '../../models/account'
import { Repository } from '../../models/repository'
import { GitError } from '../git/core'

/**
 * Remote configuration for a repository
 */
export interface IRemoteConfig {
  /** Remote name (e.g., 'origin', 'github', 'gitcastle') */
  readonly name: string
  /** Remote URL */
  readonly url: string
  /** Associated account for this remote */
  readonly accountId: string
  /** Provider type */
  readonly provider: string
  /** Whether this remote is enabled for sync */
  readonly enabled: boolean
  /** Remote priority (lower = higher priority) */
  readonly priority: number
}

/**
 * Sync operation result
 */
export interface ISyncResult {
  /** Remote name */
  readonly remote: string
  /** Whether the sync was successful */
  readonly success: boolean
  /** Error message if failed */
  readonly error?: string
  /** Number of commits pushed */
  readonly commitsPushed?: number
  /** Number of commits pulled */
  readonly commitsPulled?: number
  /** Timestamp of the sync */
  readonly timestamp: Date
}

/**
 * Multi-remote sync configuration for a repository
 */
export interface IMultiRemoteConfig {
  /** Repository ID */
  readonly repositoryId: number
  /** List of configured remotes */
  readonly remotes: ReadonlyArray<IRemoteConfig>
  /** Primary remote (used as default) */
  readonly primaryRemote: string
  /** Whether to sync all remotes automatically */
  readonly autoSyncAll: boolean
  /** Last sync timestamp */
  readonly lastSync?: Date
}

/**
 * Multi-remote sync state
 */
export interface IMultiRemoteSyncState {
  /** Whether a sync operation is in progress */
  readonly isSyncing: boolean
  /** Current repository being synced */
  readonly currentRepository?: number
  /** Progress percentage (0-100) */
  readonly progress: number
  /** Current operation message */
  readonly message: string
  /** Results of the last sync operation */
  readonly lastResults: ReadonlyArray<ISyncResult>
}

/**
 * Store for managing multi-remote sync functionality
 */
export class MultiRemoteSyncStore extends TypedBaseStore<IMultiRemoteSyncState> {
  private config: Map<number, IMultiRemoteConfig> = new Map()
  private state: IMultiRemoteSyncState = {
    isSyncing: false,
    progress: 0,
    message: '',
    lastResults: [],
  }

  /**
   * Get the current sync state
   */
  public getState(): IMultiRemoteSyncState {
    return this.state
  }

  /**
   * Get multi-remote configuration for a repository
   */
  public getConfig(repositoryId: number): IMultiRemoteConfig | undefined {
    return this.config.get(repositoryId)
  }

  /**
   * Set multi-remote configuration for a repository
   */
  public setConfig(config: IMultiRemoteConfig): void {
    this.config.set(config.repositoryId, config)
    this.emitUpdate(this.getState())
  }

  /**
   * Add a remote to a repository's configuration
   */
  public addRemote(
    repositoryId: number,
    remote: Omit<IRemoteConfig, 'priority'>
  ): void {
    const existing = this.config.get(repositoryId)
    const priority = existing ? existing.remotes.length : 0

    const newRemote: IRemoteConfig = {
      ...remote,
      priority,
    }

    if (existing) {
      const updated: IMultiRemoteConfig = {
        ...existing,
        remotes: [...existing.remotes, newRemote],
      }
      this.config.set(repositoryId, updated)
    } else {
      const newConfig: IMultiRemoteConfig = {
        repositoryId,
        remotes: [newRemote],
        primaryRemote: remote.name,
        autoSyncAll: false,
      }
      this.config.set(repositoryId, newConfig)
    }

    this.emitUpdate(this.getState())
  }

  /**
   * Remove a remote from a repository's configuration
   */
  public removeRemote(repositoryId: number, remoteName: string): void {
    const existing = this.config.get(repositoryId)
    if (!existing) return

    const updated: IMultiRemoteConfig = {
      ...existing,
      remotes: existing.remotes.filter(r => r.name !== remoteName),
      primaryRemote: existing.primaryRemote === remoteName
        ? existing.remotes.find(r => r.name !== remoteName)?.name || ''
        : existing.primaryRemote,
    }

    this.config.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Update remote configuration
   */
  public updateRemote(
    repositoryId: number,
    remoteName: string,
    updates: Partial<IRemoteConfig>
  ): void {
    const existing = this.config.get(repositoryId)
    if (!existing) return

    const updated: IMultiRemoteConfig = {
      ...existing,
      remotes: existing.remotes.map(r =>
        r.name === remoteName ? { ...r, ...updates } : r
      ),
    }

    this.config.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Set the primary remote for a repository
   */
  public setPrimaryRemote(repositoryId: number, remoteName: string): void {
    const existing = this.config.get(repositoryId)
    if (!existing) return

    const updated: IMultiRemoteConfig = {
      ...existing,
      primaryRemote: remoteName,
    }

    this.config.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Enable or disable auto-sync for all remotes
   */
  public setAutoSyncAll(repositoryId: number, enabled: boolean): void {
    const existing = this.config.get(repositoryId)
    if (!existing) return

    const updated: IMultiRemoteConfig = {
      ...existing,
      autoSyncAll: enabled,
    }

    this.config.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Reorder remotes by priority
   */
  public reorderRemotes(repositoryId: number, remoteNames: string[]): void {
    const existing = this.config.get(repositoryId)
    if (!existing) return

    const reordered = remoteNames.map((name, index) => {
      const remote = existing.remotes.find(r => r.name === name)
      if (!remote) throw new Error(`Remote ${name} not found`)
      return { ...remote, priority: index }
    })

    const updated: IMultiRemoteConfig = {
      ...existing,
      remotes: reordered,
    }

    this.config.set(repositoryId, updated)
    this.emitUpdate(this.getState())
  }

  /**
   * Get enabled remotes for a repository
   */
  public getEnabledRemotes(repositoryId: number): ReadonlyArray<IRemoteConfig> {
    const config = this.config.get(repositoryId)
    if (!config) return []
    return config.remotes.filter(r => r.enabled)
  }

  /**
   * Get primary remote for a repository
   */
  public getPrimaryRemote(repositoryId: number): IRemoteConfig | undefined {
    const config = this.config.get(repositoryId)
    if (!config) return undefined
    return config.remotes.find(r => r.name === config.primaryRemote)
  }

  /**
   * Initialize default configuration from a repository's existing remotes
   */
  public initializeFromRepository(
    repository: Repository,
    accounts: ReadonlyArray<Account>
  ): void {
    const existing = this.config.get(repository.id)
    if (existing) return // Already configured

    // Get remotes from repository
    const gitStore = this.getGitStore(repository)
    const remotes = gitStore.getRemotes()

    const remoteConfigs: IRemoteConfig[] = remotes.map((remote: { name: string; url: string }, index: number) => {

      // Try to match remote URL to an account
      const matchingAccount = accounts.find(acc => {
        const endpoint = acc.endpoint.toLowerCase()
        const url = remote.url.toLowerCase()
        return url.includes(endpoint) || endpoint.includes(url)
      })

      return {
        name: remote.name,
        url: remote.url,
        accountId: matchingAccount?.accountId || '',
        provider: matchingAccount?.provider || 'other',
        enabled: remote.name === 'origin', // Enable origin by default
        priority: index,
      }
    })

    const config: IMultiRemoteConfig = {
      repositoryId: repository.id,
      remotes: remoteConfigs,
      primaryRemote: remoteConfigs.find(r => r.name === 'origin')?.name ||
        remoteConfigs[0]?.name || '',
      autoSyncAll: false,
    }

    this.config.set(repository.id, config)
    this.emitUpdate(this.getState())
  }

  /**
   * Start a sync operation
   */
  public async syncRepository(
    repository: Repository,
    options: {
      remotes?: string[]
      push?: boolean
      pull?: boolean
      force?: boolean
    } = {}
  ): Promise<ReadonlyArray<ISyncResult>> {
    const config = this.config.get(repository.id)
    if (!config) {
      throw new Error('Repository not configured for multi-remote sync')
    }

    this.state = {
      ...this.state,
      isSyncing: true,
      currentRepository: repository.id,
      progress: 0,
      message: 'Starting sync...',
      lastResults: [],
    }
    this.emitUpdate(this.state)

    const remotesToSync = options.remotes
      ? config.remotes.filter(r => options.remotes?.includes(r.name) && r.enabled)
      : config.remotes.filter(r => r.enabled)

    const results: ISyncResult[] = []

    for (let i = 0; i < remotesToSync.length; i++) {
      const remote = remotesToSync[i]
      const progress = Math.round((i / remotesToSync.length) * 100)

      this.state = {
        ...this.state,
        progress,
        message: `Syncing with ${remote.name}...`,
      }
      this.emitUpdate(this.state)

      try {
        const result = await this.syncWithRemote(repository, remote, options)
        results.push(result)
      } catch (error) {
        results.push({
          remote: remote.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        })
      }
    }

    // Update last sync timestamp
    const updatedConfig: IMultiRemoteConfig = {
      ...config,
      lastSync: new Date(),
    }
    this.config.set(repository.id, updatedConfig)

    this.state = {
      ...this.state,
      isSyncing: false,
      progress: 100,
      message: 'Sync complete',
      lastResults: results,
    }
    this.emitUpdate(this.state)

    return results
  }

  /**
   * Sync with a specific remote
   */
  private async syncWithRemote(
    repository: Repository,
    remote: IRemoteConfig,
    options: { push?: boolean; pull?: boolean; force?: boolean }
  ): Promise<ISyncResult> {
    const gitStore = this.getGitStore(repository)
    let commitsPushed = 0
    let commitsPulled = 0

    try {
      if (options.pull !== false) {
        // Pull from remote
        const pullResult = await gitStore.pull(remote.name)
        commitsPulled = pullResult.commits?.length || 0
      }

      if (options.push !== false) {
        // Push to remote
        const pushResult = await gitStore.push(remote.name, undefined, options.force)
        commitsPushed = pushResult.commits?.length || 0
      }

      return {
        remote: remote.name,
        success: true,
        commitsPushed,
        commitsPulled,
        timestamp: new Date(),
      }
    } catch (error) {
      if (error instanceof GitError) {
        throw new Error(`Git error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get the git store for a repository
   * Note: This is a placeholder - actual implementation would need to access the git store
   */
  private getGitStore(repository: Repository): any {
    // This would need to be implemented to access the actual git store
    // For now, returning a mock that would be replaced with real implementation
    throw new Error('Git store access not implemented - requires integration with existing git infrastructure')
  }

  /**
   * Load configuration from storage
   */
  public async loadFromStorage(): Promise<void> {
    // This would load from localStorage or a config file
    // Implementation depends on the storage mechanism used
  }

  /**
   * Save configuration to storage
   */
  public async saveToStorage(): Promise<void> {
    // This would save to localStorage or a config file
    // Implementation depends on the storage mechanism used
  }
}

export const multiRemoteSyncStore = new MultiRemoteSyncStore()
