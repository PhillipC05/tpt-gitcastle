import {
  BranchComparison,
  ComparisonViewMode,
  IComparisonFilter,
  IBranchComparisonFileChange,
} from '../../models/branch-comparison'
import { Commit } from '../../models/commit'
import { TypedBaseStore } from './base-store'

/**
 * Store for managing branch comparisons
 */
export class BranchComparisonStore extends TypedBaseStore<BranchComparison | null> {
  private currentComparison: BranchComparison | null = null
  private viewMode: ComparisonViewMode = ComparisonViewMode.Commits
  private filter: IComparisonFilter = {
    showOnlyMergeConflicts: false,
    showOnlyMyCommits: false,
    authorFilter: null,
    dateRange: null,
  }
  private fileChanges: ReadonlyArray<IBranchComparisonFileChange> = []
  private selectedCommit: Commit | null = null

  public constructor() {
    super()
  }

  /**
   * Get the current comparison
   */
  public getComparison(): BranchComparison | null {
    return this.currentComparison
  }

  /**
   * Set a new comparison
   */
  public setComparison(comparison: BranchComparison): void {
    this.currentComparison = comparison
    this.selectedCommit = null
    this.emitUpdate(this.currentComparison)
  }

  /**
   * Clear the current comparison
   */
  public clearComparison(): void {
    this.currentComparison = null
    this.selectedCommit = null
    this.emitUpdate(null)
  }

  /**
   * Get the current view mode
   */
  public getViewMode(): ComparisonViewMode {
    return this.viewMode
  }

  /**
   * Set the view mode
   */
  public setViewMode(mode: ComparisonViewMode): void {
    this.viewMode = mode
    this.emitUpdate(this.currentComparison)
  }

  /**
   * Get the current filter
   */
  public getFilter(): IComparisonFilter {
    return this.filter
  }

  /**
   * Update the filter
   */
  public setFilter(filter: Partial<IComparisonFilter>): void {
    this.filter = { ...this.filter, ...filter }
    this.emitUpdate(this.currentComparison)
  }

  /**
   * Get file changes
   */
  public getFileChanges(): ReadonlyArray<IBranchComparisonFileChange> {
    return this.fileChanges
  }

  /**
   * Set file changes
   */
  public setFileChanges(changes: ReadonlyArray<IBranchComparisonFileChange>): void {
    this.fileChanges = changes
    this.emitUpdate(this.currentComparison)
  }

  /**
   * Get the selected commit
   */
  public getSelectedCommit(): Commit | null {
    return this.selectedCommit
  }

  /**
   * Select a commit
   */
  public selectCommit(commit: Commit | null): void {
    this.selectedCommit = commit
    this.emitUpdate(this.currentComparison)
  }

  /**
   * Get filtered commits based on current filter
   */
  public getFilteredCommits(): { ahead: ReadonlyArray<Commit>; behind: ReadonlyArray<Commit> } {
    if (!this.currentComparison) {
      return { ahead: [], behind: [] }
    }

    let ahead = this.currentComparison.aheadCommits
    let behind = this.currentComparison.behindCommits

    if (this.filter.showOnlyMyCommits) {
      // This would need the current user's email
      // For now, return all
    }

    if (this.filter.authorFilter) {
      ahead = ahead.filter(c => c.author.name === this.filter.authorFilter)
      behind = behind.filter(c => c.author.name === this.filter.authorFilter)
    }

    if (this.filter.dateRange) {
      const { from, to } = this.filter.dateRange
      if (from) {
        ahead = ahead.filter(c => new Date(c.author.date) >= from)
        behind = behind.filter(c => new Date(c.author.date) >= from)
      }
      if (to) {
        ahead = ahead.filter(c => new Date(c.author.date) <= to)
        behind = behind.filter(c => new Date(c.author.date) <= to)
      }
    }

    return { ahead, behind }
  }

  /**
   * Swap the base and compare branches
   */
  public swapBranches(): void {
    if (!this.currentComparison) return

    // In a real implementation, this would re-fetch the comparison
    // For now, we just swap the references
    const { baseBranch, compareBranch, aheadCommits, behindCommits } = this.currentComparison

    this.currentComparison = new BranchComparison(
      compareBranch,
      baseBranch,
      behindCommits,
      aheadCommits,
      this.currentComparison.mergeBase,
      this.currentComparison.canMergeFastForward,
      this.currentComparison.hasConflicts,
      this.currentComparison.fileChanges,
      this.currentComparison.additions,
      this.currentComparison.deletions
    )

    this.emitUpdate(this.currentComparison)
  }
}
