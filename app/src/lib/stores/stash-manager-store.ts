import { StashEntry, IStashStats, PredefinedStashTags } from '../../models/stash-entry'
import { TypedBaseStore } from './base-store'

/**
 * Store for managing stash entries with metadata
 */
export class StashManagerStore extends TypedBaseStore<ReadonlyArray<StashEntry>> {
  private stashes: ReadonlyArray<StashEntry> = []
  private repositoryId: number | null = null

  public constructor() {
    super()
    this.loadFromStorage()
  }

  /**
   * Set the current repository and load its stashes
   */
  public setRepository(repositoryId: number): void {
    this.repositoryId = repositoryId
    this.loadFromStorage()
    this.emitUpdate(this.stashes)
  }

  /**
   * Get all stashes for the current repository
   */
  public getAllStashes(): ReadonlyArray<StashEntry> {
    return this.stashes
  }

  /**
   * Get favorite stashes
   */
  public getFavoriteStashes(): ReadonlyArray<StashEntry> {
    return this.stashes.filter(s => s.isFavorite)
  }

  /**
   * Get stashes by tag
   */
  public getStashesByTag(tag: string): ReadonlyArray<StashEntry> {
    return this.stashes.filter(s => s.tags.includes(tag))
  }

  /**
   * Get stashes for a specific branch
   */
  public getStashesForBranch(branchName: string): ReadonlyArray<StashEntry> {
    return this.stashes.filter(s => s.branchName === branchName)
  }

  /**
   * Search stashes by name or description
   */
  public searchStashes(query: string): ReadonlyArray<StashEntry> {
    const lowerQuery = query.toLowerCase()
    return this.stashes.filter(
      s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        (s.description && s.description.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Get stash statistics
   */
  public getStats(): IStashStats {
    const totalCount = this.stashes.length
    const favoriteCount = this.stashes.filter(s => s.isFavorite).length
    const taggedCount = this.stashes.filter(s => s.tags.length > 0).length

    const byTag: Record<string, number> = {}
    for (const stash of this.stashes) {
      for (const tag of stash.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1
      }
    }

    return {
      totalCount,
      favoriteCount,
      taggedCount,
      untaggedCount: totalCount - taggedCount,
      byTag,
    }
  }

  /**
   * Add or update a stash entry
   */
  public setStash(stash: StashEntry): void {
    const existingIndex = this.stashes.findIndex(s => s.name === stash.name)
    
    if (existingIndex >= 0) {
      // Update existing
      const newStashes = [...this.stashes]
      newStashes[existingIndex] = stash
      this.stashes = newStashes
    } else {
      // Add new
      this.stashes = [...this.stashes, stash]
    }

    this.saveToStorage()
    this.emitUpdate(this.stashes)
  }

  /**
   * Remove a stash entry
   */
  public removeStash(stashName: string): void {
    this.stashes = this.stashes.filter(s => s.name !== stashName)
    this.saveToStorage()
    this.emitUpdate(this.stashes)
  }

  /**
   * Toggle favorite status for a stash
   */
  public toggleFavorite(stashName: string): void {
    const stash = this.stashes.find(s => s.name === stashName)
    if (stash) {
      this.setStash(stash.toggleFavorite())
    }
  }

  /**
   * Add a tag to a stash
   */
  public addTag(stashName: string, tag: string): void {
    const stash = this.stashes.find(s => s.name === stashName)
    if (stash) {
      this.setStash(stash.addTag(tag))
    }
  }

  /**
   * Remove a tag from a stash
   */
  public removeTag(stashName: string, tag: string): void {
    const stash = this.stashes.find(s => s.name === stashName)
    if (stash) {
      this.setStash(stash.removeTag(tag))
    }
  }

  /**
   * Update stash description
   */
  public updateDescription(stashName: string, description: string): void {
    const stash = this.stashes.find(s => s.name === stashName)
    if (stash) {
      this.setStash(stash.with({ description }))
    }
  }

  /**
   * Get all available tags (predefined + custom)
   */
  public getAllTags(): ReadonlyArray<string> {
    const customTags = new Set<string>()
    for (const stash of this.stashes) {
      for (const tag of stash.tags) {
        if (!PredefinedStashTags.includes(tag as any)) {
          customTags.add(tag)
        }
      }
    }
    return [...PredefinedStashTags, ...customTags]
  }

  /**
   * Load stashes from local storage
   */
  private loadFromStorage(): void {
    if (this.repositoryId === null) {
      this.stashes = []
      return
    }

    try {
      const key = `stash-manager-${this.repositoryId}`
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        this.stashes = data.stashes.map(
          (s: any) =>
            new StashEntry(
              s.name,
              s.index,
              s.commit,
              s.description,
              s.branchName,
              new Date(s.createdAt),
              s.filesChanged,
              s.tags,
              s.isFavorite
            )
        )
      } else {
        this.stashes = []
      }
    } catch (e) {
      console.error('Failed to load stash manager data:', e)
      this.stashes = []
    }
  }

  /**
   * Save stashes to local storage
   */
  private saveToStorage(): void {
    if (this.repositoryId === null) return

    try {
      const key = `stash-manager-${this.repositoryId}`
      const data = {
        stashes: this.stashes.map(s => ({
          name: s.name,
          index: s.index,
          commit: s.commit,
          description: s.description,
          branchName: s.branchName,
          createdAt: s.createdAt.toISOString(),
          filesChanged: s.filesChanged,
          tags: s.tags,
          isFavorite: s.isFavorite,
        })),
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save stash manager data:', e)
    }
  }
}
