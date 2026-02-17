import { v4 as uuid } from 'uuid'

/**
 * Represents a group of repositories for organization
 */
export class RepositoryGroup {
  /**
   * Unique identifier for the group
   */
  public readonly id: string

  /**
   * Display name for the group
   */
  public readonly name: string

  /**
   * Color identifier for the group (hex color)
   */
  public readonly color: string

  /**
   * Order/index for sorting groups
   */
  public readonly order: number

  /**
   * IDs of repositories in this group
   */
  public readonly repositoryIds: ReadonlyArray<number>

  /**
   * Whether the group is collapsed in the UI
   */
  public readonly isCollapsed: boolean

  public constructor(
    name: string,
    color: string = '#4a90d9',
    order: number = 0,
    repositoryIds: ReadonlyArray<number> = [],
    isCollapsed: boolean = false,
    id?: string
  ) {
    this.id = id ?? uuid()
    this.name = name
    this.color = color
    this.order = order
    this.repositoryIds = repositoryIds
    this.isCollapsed = isCollapsed
  }

  /**
   * Create a copy of this group with modified properties
   */
  public with(props: Partial<Omit<RepositoryGroup, 'id'>>): RepositoryGroup {
    return new RepositoryGroup(
      props.name ?? this.name,
      props.color ?? this.color,
      props.order ?? this.order,
      props.repositoryIds ?? this.repositoryIds,
      props.isCollapsed ?? this.isCollapsed,
      this.id
    )
  }

  /**
   * Add a repository to this group
   */
  public addRepository(repositoryId: number): RepositoryGroup {
    if (this.repositoryIds.includes(repositoryId)) {
      return this
    }
    return this.with({
      repositoryIds: [...this.repositoryIds, repositoryId],
    })
  }

  /**
   * Remove a repository from this group
   */
  public removeRepository(repositoryId: number): RepositoryGroup {
    return this.with({
      repositoryIds: this.repositoryIds.filter(id => id !== repositoryId),
    })
  }

  /**
   * Check if a repository is in this group
   */
  public hasRepository(repositoryId: number): boolean {
    return this.repositoryIds.includes(repositoryId)
  }

  /**
   * Toggle collapsed state
   */
  public toggleCollapsed(): RepositoryGroup {
    return this.with({ isCollapsed: !this.isCollapsed })
  }
}

/**
 * Default group names and colors
 */
export const DefaultGroupColors = [
  { name: 'Work', color: '#4a90d9' },      // Blue
  { name: 'Personal', color: '#7ed321' },   // Green
  { name: 'Open Source', color: '#f5a623' }, // Orange
  { name: 'Archive', color: '#9b9b9b' },    // Gray
] as const

/**
 * Get a default group color by index
 */
export function getDefaultGroupColor(index: number): string {
  return DefaultGroupColors[index % DefaultGroupColors.length].color
}

/**
 * Get a default group name by index
 */
export function getDefaultGroupName(index: number): string {
  return DefaultGroupColors[index % DefaultGroupColors.length].name
}
