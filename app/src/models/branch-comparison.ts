import { Commit } from './commit';
import { Branch } from './branch';

/**
 * Branch comparison result
 */
export class BranchComparison {
  /**
   * @param baseBranch The base branch being compared
   * @param compareBranch The branch being compared against
   * @param aheadCommits Commits in compareBranch not in baseBranch
   * @param behindCommits Commits in baseBranch not in compareBranch
   * @param mergeBase The common ancestor commit
   * @param canMergeFastForward Whether a fast-forward merge is possible
   * @param hasConflicts Whether there would be merge conflicts
   * @param fileChanges Number of files changed between branches
   * @param additions Number of lines added
   * @param deletions Number of lines deleted
   */
  public constructor(
    public readonly baseBranch: Branch,
    public readonly compareBranch: Branch,
    public readonly aheadCommits: ReadonlyArray<Commit>,
    public readonly behindCommits: ReadonlyArray<Commit>,
    public readonly mergeBase: string,
    public readonly canMergeFastForward: boolean,
    public readonly hasConflicts: boolean,
    public readonly fileChanges: number = 0,
    public readonly additions: number = 0,
    public readonly deletions: number = 0
  ) {}

  /**
   * Get the ahead/behind counts
   */
  public get aheadBehind(): { ahead: number; behind: number } {
    return {
      ahead: this.aheadCommits.length,
      behind: this.behindCommits.length,
    }
  }

  /**
   * Get a summary of the comparison
   */
  public get summary(): string {
    const { ahead, behind } = this.aheadBehind
    const parts = []

    if (ahead > 0) {
      parts.push(`${ahead} commit${ahead === 1 ? '' : 's'} ahead`)
    }
    if (behind > 0) {
      parts.push(`${behind} commit${behind === 1 ? '' : 's'} behind`)
    }
    if (this.fileChanges > 0) {
      parts.push(`${this.fileChanges} files changed`)
    }

    return parts.join(' • ') || 'Branches are identical'
  }

  /**
   * Get merge status description
   */
  public get mergeStatus(): string {
    if (this.hasConflicts) {
      return 'Has conflicts - manual resolution required'
    }
    if (this.canMergeFastForward) {
      return 'Can fast-forward merge'
    }
    return 'Can merge with merge commit'
  }
}

/**
 * File change in branch comparison
 */
export interface IBranchComparisonFileChange {
  readonly path: string
  readonly status: 'added' | 'modified' | 'deleted' | 'renamed'
  readonly additions: number
  readonly deletions: number
  readonly patch?: string
}

/**
 * Comparison view mode
 */
export enum ComparisonViewMode {
  Commits = 'commits',
  Files = 'files',
  Graph = 'graph',
}

/**
 * Comparison filter options
 */
export interface IComparisonFilter {
  readonly showOnlyMergeConflicts: boolean
  readonly showOnlyMyCommits: boolean
  readonly authorFilter: string | null
  readonly dateRange: { from: Date | null; to: Date | null } | null
}
