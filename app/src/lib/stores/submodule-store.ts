import { Submodule, ISubmoduleStats } from '../../models/submodule'
import { TypedBaseStore } from './base-store'

/**
 * Store for managing submodules
 */
export class SubmoduleStore extends TypedBaseStore<ReadonlyArray<Submodule>> {
  private submodules: ReadonlyArray<Submodule> = []
  private repositoryId: number | null = null

  public constructor() {
    super()
  }

  /**
   * Set the current repository and load its submodules
   */
  public setRepository(repositoryId: number, submodules: ReadonlyArray<Submodule>): void {
    this.repositoryId = repositoryId
    this.submodules = submodules
    this.emitUpdate(this.submodules)
  }

  /**
   * Get all submodules
   */
  public getAllSubmodules(): ReadonlyArray<Submodule> {
    return this.submodules
  }

  /**
   * Get submodule statistics
   */
  public getStats(): ISubmoduleStats {
    const totalCount = this.submodules.length
    const initializedCount = this.submodules.filter(s => s.isInitialized).length
    const modifiedCount = this.submodules.filter(s => s.hasChanges).length
    const outOfSyncCount = this.submodules.filter(s => !s.isSynced).length

    return {
      totalCount,
      initializedCount,
      uninitializedCount: totalCount - initializedCount,
      modifiedCount,
      outOfSyncCount,
      cleanCount: totalCount - modifiedCount - outOfSyncCount,
    }
  }

  /**
   * Get a submodule by path
   */
  public getSubmodule(path: string): Submodule | null {
    return this.submodules.find(s => s.path === path) || null
  }

  /**
   * Update a submodule
   */
  public updateSubmodule(submodule: Submodule): void {
    const index = this.submodules.findIndex(s => s.path === submodule.path)
    if (index >= 0) {
      const newSubmodules = [...this.submodules]
      newSubmodules[index] = submodule
      this.submodules = newSubmodules
      this.emitUpdate(this.submodules)
    }
  }

  /**
   * Check if any submodules need attention
   */
  public hasSubmodulesNeedingAttention(): boolean {
    return this.submodules.some(
      s => !s.isInitialized || s.hasChanges || !s.isSynced
    )
  }

  /**
   * Get submodules needing attention
   */
  public getSubmodulesNeedingAttention(): ReadonlyArray<Submodule> {
    return this.submodules.filter(
      s => !s.isInitialized || s.hasChanges || !s.isSynced
    )
  }
}
