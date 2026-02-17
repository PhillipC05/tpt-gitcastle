import {
  RepositoryGroup,
  getDefaultGroupColor,
  getDefaultGroupName,
} from '../../models/repository-group'
import { TypedBaseStore } from './base-store'

const GroupsKey = 'repository-groups'
const LastSelectedGroupKey = 'last-selected-group'

/**
 * Store for managing repository groups
 */
export class RepositoryGroupsStore extends TypedBaseStore<ReadonlyArray<RepositoryGroup>> {
  private groups: Map<string, RepositoryGroup> = new Map()
  private lastSelectedGroupId: string | null = null


  public constructor() {
    super()
    this.loadFromStorage()
  }

  /**
   * Get all groups sorted by order
   */
  public getAll(): ReadonlyArray<RepositoryGroup> {
    return Array.from(this.groups.values()).sort((a, b) => a.order - b.order)
  }

  /**
   * Get a group by ID
   */
  public getById(id: string): RepositoryGroup | undefined {
    return this.groups.get(id)
  }

  /**
   * Get the last selected group
   */
  public getLastSelected(): RepositoryGroup | undefined {
    if (!this.lastSelectedGroupId) return undefined
    return this.groups.get(this.lastSelectedGroupId)
  }

  /**
   * Create a new group
   */
  public createGroup(name?: string, color?: string): RepositoryGroup {
    const existingGroups = this.getAll()
    const order = existingGroups.length
    
    const groupName = name ?? getDefaultGroupName(order)
    const groupColor = color ?? getDefaultGroupColor(order)

    const group = new RepositoryGroup(groupName, groupColor, order)
    this.groups.set(group.id, group)
    this.save()
    this.emitUpdate()
    
    return group
  }

  /**
   * Update an existing group
   */
  public updateGroup(group: RepositoryGroup): void {
    this.groups.set(group.id, group)
    this.save()
    this.emitUpdate()
  }

  /**
   * Delete a group
   */
  public deleteGroup(id: string): void {
    this.groups.delete(id)
    this.save()
    this.emitUpdate()
  }

  /**
   * Add a repository to a group
   */
  public addRepositoryToGroup(groupId: string, repositoryId: number): void {
    const group = this.groups.get(groupId)
    if (!group) return

    // Remove from other groups first
    this.removeRepositoryFromAllGroups(repositoryId)

    const updated = group.addRepository(repositoryId)
    this.groups.set(groupId, updated)
    this.save()
    this.emitUpdate()
  }

  /**
   * Remove a repository from a group
   */
  public removeRepositoryFromGroup(groupId: string, repositoryId: number): void {
    const group = this.groups.get(groupId)
    if (!group) return

    const updated = group.removeRepository(repositoryId)
    this.groups.set(groupId, updated)
    this.save()
    this.emitUpdate()
  }

  /**
   * Remove a repository from all groups
   */
  public removeRepositoryFromAllGroups(repositoryId: number): void {
    let updated = false
    for (const [id, group] of this.groups) {
      if (group.hasRepository(repositoryId)) {
        const updatedGroup = group.removeRepository(repositoryId)
        this.groups.set(id, updatedGroup)
        updated = true
      }
    }
    
    if (updated) {
      this.save()
      this.emitUpdate()
    }
  }

  /**
   * Get the group containing a repository
   */
  public getGroupForRepository(repositoryId: number): RepositoryGroup | undefined {
    for (const group of this.groups.values()) {
      if (group.hasRepository(repositoryId)) {
        return group
      }
    }
    return undefined
  }

  /**
   * Move a group to a new position
   */
  public moveGroup(groupId: string, newOrder: number): void {
    const group = this.groups.get(groupId)
    if (!group) return

    const allGroups = this.getAll()
    const otherGroups = allGroups.filter(g => g.id !== groupId)

    // Reorder other groups
    otherGroups.forEach((g, index) => {
      let order = index
      if (index >= newOrder) order++
      this.groups.set(g.id, g.with({ order }))
    })

    // Set the moved group's order
    this.groups.set(groupId, group.with({ order: newOrder }))
    
    this.save()
    this.emitUpdate()
  }

  /**
   * Set the last selected group
   */
  public setLastSelected(groupId: string | null): void {
    this.lastSelectedGroupId = groupId
    localStorage.setItem(LastSelectedGroupKey, groupId ?? '')
  }

  /**
   * Toggle group collapsed state
   */
  public toggleCollapsed(groupId: string): void {
    const group = this.groups.get(groupId)
    if (!group) return

    this.groups.set(groupId, group.toggleCollapsed())
    this.save()
    this.emitUpdate()
  }

  /**
   * Create default groups if none exist
   */
  public createDefaultGroups(): void {
    if (this.groups.size === 0) {
      this.createGroup('Work')
      this.createGroup('Personal')
      this.createGroup('Open Source')
    }
  }

  /**
   * Save groups to local storage
   */
  private save(): void {
    const data = Array.from(this.groups.values())
    localStorage.setItem(GroupsKey, JSON.stringify(data))
  }

  /**
   * Load groups from local storage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(GroupsKey)
      if (data) {
        const parsed: Array<{
          id: string
          name: string
          color: string
          order: number
          repositoryIds: number[]
          isCollapsed: boolean
        }> = JSON.parse(data)
        
        parsed.forEach(g => {
          this.groups.set(
            g.id,
            new RepositoryGroup(
              g.name,
              g.color,
              g.order,
              g.repositoryIds,
              g.isCollapsed,
              g.id
            )
          )
        })
      }

      const lastSelected = localStorage.getItem(LastSelectedGroupKey)
      if (lastSelected) {
        this.lastSelectedGroupId = lastSelected
      }
    } catch (e) {
      console.error('Failed to load repository groups:', e)
    }
  }

  /**
   * Emit update event
   */
  protected emitUpdate(): void {
    super.emitUpdate(this.getAll())
  }
}
