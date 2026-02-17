import { CommitMessageTemplate, BuiltInTemplates } from '../../models/commit-message-template'
import { TypedBaseStore } from './base-store'

/**
 * Store for managing commit message templates
 */
export class CommitTemplateStore extends TypedBaseStore<ReadonlyArray<CommitMessageTemplate>> {
  private templates: ReadonlyArray<CommitMessageTemplate> = BuiltInTemplates
  private defaultTemplateId: string = 'simple'

  public constructor() {
    super()
    this.loadFromStorage()
  }

  /**
   * Get all templates including built-in and custom
   */
  public getAllTemplates(): ReadonlyArray<CommitMessageTemplate> {
    return this.templates
  }

  /**
   * Get only custom templates
   */
  public getCustomTemplates(): ReadonlyArray<CommitMessageTemplate> {
    return this.templates.filter(t => !t.isBuiltIn)
  }

  /**
   * Get the default template
   */
  public getDefaultTemplate(): CommitMessageTemplate {
    return (
      this.templates.find(t => t.id === this.defaultTemplateId) ||
      this.templates[0]
    )
  }

  /**
   * Get a template by ID
   */
  public getTemplate(id: string): CommitMessageTemplate | null {
    return this.templates.find(t => t.id === id) || null
  }

  /**
   * Add a custom template
   */
  public addTemplate(template: CommitMessageTemplate): void {
    if (this.templates.some(t => t.id === template.id)) {
      throw new Error(`Template with id ${template.id} already exists`)
    }

    this.templates = [...this.templates, template]
    this.saveToStorage()
    this.emitUpdate(this.templates)
  }

  /**
   * Update an existing custom template
   */
  public updateTemplate(template: CommitMessageTemplate): void {
    if (template.isBuiltIn) {
      throw new Error('Cannot modify built-in templates')
    }

    const index = this.templates.findIndex(t => t.id === template.id)
    if (index === -1) {
      throw new Error(`Template with id ${template.id} not found`)
    }

    const newTemplates = [...this.templates]
    newTemplates[index] = template
    this.templates = newTemplates

    this.saveToStorage()
    this.emitUpdate(this.templates)
  }

  /**
   * Delete a custom template
   */
  public deleteTemplate(id: string): void {
    const template = this.templates.find(t => t.id === id)
    if (template?.isBuiltIn) {
      throw new Error('Cannot delete built-in templates')
    }

    this.templates = this.templates.filter(t => t.id !== id)

    // If we deleted the default, reset to first available
    if (this.defaultTemplateId === id) {
      this.defaultTemplateId = this.templates[0]?.id || 'simple'
    }

    this.saveToStorage()
    this.emitUpdate(this.templates)
  }

  /**
   * Set the default template
   */
  public setDefaultTemplate(id: string): void {
    if (!this.templates.some(t => t.id === id)) {
      throw new Error(`Template with id ${id} not found`)
    }

    this.defaultTemplateId = id
    this.saveToStorage()
    this.emitUpdate(this.templates)
  }

  /**
   * Load templates from local storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('commit-templates')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.templates) {
          // Merge built-in with custom templates
          const customTemplates = data.templates.map(
            (t: any) =>
              new CommitMessageTemplate(
                t.id,
                t.name,
                t.description,
                t.type,
                t.pattern,
                t.variables,
                t.isDefault,
                false // loaded templates are never built-in
              )
          )
          this.templates = [...BuiltInTemplates, ...customTemplates]
        }
        if (data.defaultTemplateId) {
          this.defaultTemplateId = data.defaultTemplateId
        }
      }
    } catch (e) {
      console.error('Failed to load commit templates:', e)
    }
  }

  /**
   * Save templates to local storage
   */
  private saveToStorage(): void {
    try {
      const customTemplates = this.templates
        .filter(t => !t.isBuiltIn)
        .map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          type: t.type,
          pattern: t.pattern,
          variables: t.variables,
          isDefault: t.isDefault,
        }))

      const data = {
        templates: customTemplates,
        defaultTemplateId: this.defaultTemplateId,
      }

      localStorage.setItem('commit-templates', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save commit templates:', e)
    }
  }
}
