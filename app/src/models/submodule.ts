/**
 * Extended submodule information with status
 */
export class Submodule {
  /**
   * @param path The path to the submodule within the parent repository
   * @param url The URL of the submodule repository
   * @param name The name of the submodule
   * @param sha The current SHA of the submodule
   * @param branch The current branch of the submodule (if available)
   * @param status The status of the submodule
   * @param hasChanges Whether the submodule has uncommitted changes
   * @param isInitialized Whether the submodule is initialized
   * @param isSynced Whether the submodule is synced with its remote
   * @param lastUpdated When the submodule was last updated
   */
  public constructor(
    public readonly path: string,
    public readonly url: string,
    public readonly name: string,
    public readonly sha: string,
    public readonly branch: string | null = null,
    public readonly status: SubmoduleStatus = SubmoduleStatus.Clean,
    public readonly hasChanges: boolean = false,
    public readonly isInitialized: boolean = true,
    public readonly isSynced: boolean = true,
    public readonly lastUpdated: Date | null = null
  ) {}

  /**
   * Get a display name for the submodule
   */
  public get displayName(): string {
    return this.name || this.path.split('/').pop() || this.path
  }

  /**
   * Get a short SHA for display
   */
  public get shortSha(): string {
    return this.sha.substring(0, 7)
  }

  /**
   * Create a copy with modified properties
   */
  public with(props: Partial<Submodule>): Submodule {
    return new Submodule(
      props.path ?? this.path,
      props.url ?? this.url,
      props.name ?? this.name,
      props.sha ?? this.sha,
      props.branch ?? this.branch,
      props.status ?? this.status,
      props.hasChanges ?? this.hasChanges,
      props.isInitialized ?? this.isInitialized,
      props.isSynced ?? this.isSynced,
      props.lastUpdated ?? this.lastUpdated
    )
  }
}

/**
 * Submodule status types
 */
export enum SubmoduleStatus {
  Clean = 'clean',
  Modified = 'modified',
  Untracked = 'untracked',
  Conflicted = 'conflicted',
  OutOfSync = 'out-of-sync',
  NotInitialized = 'not-initialized',
}

/**
 * Submodule statistics
 */
export interface ISubmoduleStats {
  readonly totalCount: number
  readonly initializedCount: number
  readonly uninitializedCount: number
  readonly modifiedCount: number
  readonly outOfSyncCount: number
  readonly cleanCount: number
}

/**
 * Submodule operation types
 */
export enum SubmoduleOperation {
  Update = 'update',
  Init = 'init',
  Deinit = 'deinit',
  Sync = 'sync',
  UpdateRecursive = 'update-recursive',
}

/**
 * Get a human-readable status description
 */
export function getSubmoduleStatusDescription(status: SubmoduleStatus): string {
  switch (status) {
    case SubmoduleStatus.Clean:
      return 'Up to date'
    case SubmoduleStatus.Modified:
      return 'Modified'
    case SubmoduleStatus.Untracked:
      return 'Untracked'
    case SubmoduleStatus.Conflicted:
      return 'Conflicted'
    case SubmoduleStatus.OutOfSync:
      return 'Out of sync with remote'
    case SubmoduleStatus.NotInitialized:
      return 'Not initialized'
    default:
      return 'Unknown'
  }
}

/**
 * Get an icon for the submodule status
 */
export function getSubmoduleStatusIcon(status: SubmoduleStatus): string {
  switch (status) {
    case SubmoduleStatus.Clean:
      return 'check'
    case SubmoduleStatus.Modified:
      return 'diff-modified'
    case SubmoduleStatus.Untracked:
      return 'plus'
    case SubmoduleStatus.Conflicted:
      return 'alert'
    case SubmoduleStatus.OutOfSync:
      return 'arrow-down'
    case SubmoduleStatus.NotInitialized:
      return 'circle-slash'
    default:
      return 'question'
  }
}
