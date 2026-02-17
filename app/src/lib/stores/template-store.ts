import {
  RepositoryTemplate,
  BuiltInTemplates,
  TemplateCategory,
  ITemplateStats,
} from '../../models/repository-template'
import { TypedBaseStore } from './base-store'

/**
 * Store for managing repository templates
 */
export class TemplateStore extends TypedBaseStore<ReadonlyArray<RepositoryTemplate>> {
  private customTemplates: ReadonlyArray<RepositoryTemplate> = []
  private usageStats: ITemplateStats = {
    totalUsage: 0,
    byTemplate: {},
    byCategory: {},
  }

  public constructor() {
    super()
    this.loadFromStorage()
  }

  /**
   * Get all templates (built-in + custom)
   */
  public getAllTemplates(): ReadonlyArray<RepositoryTemplate> {
    return [...BuiltInTemplates, ...this.customTemplates]
  }

  /**
   * Get templates by category
   */
  public getTemplatesByCategory(category: TemplateCategory): ReadonlyArray<RepositoryTemplate> {
    return this.getAllTemplates().filter(t => t.category === category)
  }

  /**
   * Get templates by tag
   */
  public getTemplatesByTag(tag: string): ReadonlyArray<RepositoryTemplate> {
    return this.getAllTemplates().filter(t => t.tags.includes(tag))
  }

  /**
   * Search templates
   */
  public searchTemplates(query: string): ReadonlyArray<RepositoryTemplate> {
    const lowerQuery = query.toLowerCase()
    return this.getAllTemplates().filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Get a template by ID
   */
  public getTemplate(id: string): RepositoryTemplate | null {
    return this.getAllTemplates().find(t => t.id === id) || null
  }

  /**
   * Add a custom template
   */
  public addCustomTemplate(template: RepositoryTemplate): void {
    this.customTemplates = [...this.customTemplates, template]
    this.saveToStorage()
    this.emitUpdate(this.getAllTemplates())
  }

  /**
   * Remove a custom template
   */
  public removeCustomTemplate(id: string): void {
    this.customTemplates = this.customTemplates.filter(t => t.id !== id)
    this.saveToStorage()
    this.emitUpdate(this.getAllTemplates())
  }

  /**
   * Record template usage
   */
  public recordUsage(templateId: string, category: TemplateCategory): void {
    this.usageStats = {
      totalUsage: this.usageStats.totalUsage + 1,
      byTemplate: {
        ...this.usageStats.byTemplate,
        [templateId]: (this.usageStats.byTemplate[templateId] || 0) + 1,
      },
      byCategory: {
        ...this.usageStats.byCategory,
        [category]: (this.usageStats.byCategory[category] || 0) + 1,
      },
    }
    this.saveToStorage()
  }

  /**
   * Get usage statistics
   */
  public getStats(): ITemplateStats {
    return this.usageStats
  }

  /**
   * Get most used templates
   */
  public getMostUsedTemplates(limit: number = 5): ReadonlyArray<RepositoryTemplate> {
    const allTemplates = this.getAllTemplates()
    const sorted = [...allTemplates].sort((a, b) => {
      const aUsage = this.usageStats.byTemplate[a.id] || 0
      const bUsage = this.usageStats.byTemplate[b.id] || 0
      return bUsage - aUsage
    })
    return sorted.slice(0, limit)
  }

  /**
   * Get all available categories
   */
  public getCategories(): ReadonlyArray<TemplateCategory> {
    const categories = new Set<TemplateCategory>()
    for (const template of this.getAllTemplates()) {
      categories.add(template.category)
    }
    return Array.from(categories)
  }

  /**
   * Get all available tags
   */
  public getAllTags(): ReadonlyArray<string> {
    const tags = new Set<string>()
    for (const template of this.getAllTemplates()) {
      for (const tag of template.tags) {
        tags.add(tag)
      }
    }
    return Array.from(tags).sort()
  }

  /**
   * Load from local storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('repository-templates')
      if (stored) {
        const data = JSON.parse(stored)
        this.customTemplates = data.customTemplates.map(
          (t: any) =>
            new RepositoryTemplate(
              t.id,
              t.name,
              t.description,
              t.sourceUrl,
              t.category,
              t.tags,
              t.variables,
              false, // Custom templates are never built-in
              t.icon
            )
        )
        this.usageStats = data.usageStats || { totalUsage: 0, byTemplate: {}, byCategory: {} }
      }
    } catch (e) {
      console.error('Failed to load templates:', e)
      this.customTemplates = []
      this.usageStats = { totalUsage: 0, byTemplate: {}, byCategory: {} }
    }
  }

  /**
   * Save to local storage
   */
  private saveToStorage(): void {
    try {
      const data = {
        customTemplates: this.customTemplates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          sourceUrl: t.sourceUrl,
          category: t.category,
          tags: t.tags,
          variables: t.variables,
          icon: t.icon,
        })),
        usageStats: this.usageStats,
      }
      localStorage.setItem('repository-templates', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save templates:', e)
    }
  }
}
