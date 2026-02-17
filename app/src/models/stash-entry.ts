import { Commit } from './commit'

/**
 * Extended stash entry with metadata for advanced stash management
 */
export class StashEntry {
  /**
   * @param name The name of the stash entry (user-friendly)
   * @param index The index of the stash entry (stash@{n})
   * @param commit The commit associated with this stash entry
   * @param description Optional description of the stash
   * @param branchName The branch name when the stash was created
   * @param createdAt When the stash was created
   * @param filesChanged Number of files changed in the stash
   * @param tags Optional tags for categorizing stashes
   * @param isFavorite Whether this stash is marked as favorite
   */
  public constructor(
    public readonly name: string,
    public readonly index: number,
    public readonly commit: Commit,
    public readonly description: string | null = null,
    public readonly branchName: string | null = null,
    public readonly createdAt: Date = new Date(),
    public readonly filesChanged: number = 0,
    public readonly tags: ReadonlyArray<string> = [],
    public readonly isFavorite: boolean = false
  ) {}

  /**
   * Get a display name for the stash
   */
  public get displayName(): string {
    return this.description || this.name
  }

  /**
   * Get a summary of the stash
   */
  public get summary(): string {
    const parts = []
    if (this.branchName) {
      parts.push(`on ${this.branchName}`)
    }
    if (this.filesChanged > 0) {
      parts.push(`${this.filesChanged} files`)
    }
    return parts.join(' • ')
  }

  /**
   * Create a copy with modified properties
   */
  public with(props: Partial<StashEntry>): StashEntry {
    return new StashEntry(
      props.name ?? this.name,
      props.index ?? this.index,
      props.commit ?? this.commit,
      props.description ?? this.description,
      props.branchName ?? this.branchName,
      props.createdAt ?? this.createdAt,
      props.filesChanged ?? this.filesChanged,
      props.tags ?? this.tags,
      props.isFavorite ?? this.isFavorite
    )
  }

  /**
   * Add a tag to the stash
   */
  public addTag(tag: string): StashEntry {
    if (this.tags.includes(tag)) return this
    return this.with({ tags: [...this.tags, tag] })
  }

  /**
   * Remove a tag from the stash
   */
  public removeTag(tag: string): StashEntry {
    return this.with({ tags: this.tags.filter(t => t !== tag) })
  }

  /**
   * Toggle favorite status
   */
  public toggleFavorite(): StashEntry {
    return this.with({ isFavorite: !this.isFavorite })
  }
}

/**
 * Stash statistics for a repository
 */
export interface IStashStats {
  readonly totalCount: number
  readonly favoriteCount: number
  readonly taggedCount: number
  readonly untaggedCount: number
  readonly byTag: Record<string, number>
}

/**
 * Predefined stash tags
 */
export const PredefinedStashTags = [
  'work-in-progress',
  'experiment',
  'bugfix',
  'feature',
  'refactor',
  'hotfix',
  'review',
  'backup',
] as const

export type StashTag = typeof PredefinedStashTags[number]

// Export the class as IStashEntry for compatibility with existing code
export { StashEntry as IStashEntry }
