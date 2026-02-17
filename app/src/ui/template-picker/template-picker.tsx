import * as React from 'react'
import {
  RepositoryTemplate,
  TemplateCategory,
  getCategoryDisplayName,
  TemplateVariable,
} from '../../models/repository-template'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { TextBox } from '../lib/text-box'
import { Loading } from '../lib/loading'

interface ITemplatePickerProps {
  /** All available templates */
  readonly templates: ReadonlyArray<RepositoryTemplate>
  /** Most used templates */
  readonly mostUsedTemplates: ReadonlyArray<RepositoryTemplate>
  /** All available categories */
  readonly categories: ReadonlyArray<TemplateCategory>
  /** All available tags */
  readonly allTags: ReadonlyArray<string>
  /** Currently selected template */
  readonly selectedTemplate: RepositoryTemplate | null
  /** Search query */
  readonly searchQuery: string
  /** Active category filter */
  readonly activeCategory: TemplateCategory | null
  /** Template variable values */
  readonly variableValues: Map<string, string>
  /** Whether a template is being created */
  readonly isCreating: boolean
  /** Called when a template is selected */
  readonly onSelectTemplate: (template: RepositoryTemplate) => void
  /** Called when search query changes */
  readonly onSearch: (query: string) => void
  /** Called when category filter changes */
  readonly onCategoryChange: (category: TemplateCategory | null) => void
  /** Called when a template variable changes */
  readonly onVariableChange: (name: string, value: string) => void
  /** Called when create is confirmed */
  readonly onCreate: (template: RepositoryTemplate, variables: Map<string, string>) => void
  /** Called to cancel */
  readonly onCancel: () => void
}

interface ITemplatePickerState {
  readonly showCustomForm: boolean
  readonly customTemplateName: string
  readonly customTemplateUrl: string
}

/**
 * Template picker component for creating new repositories from templates
 */
export class TemplatePicker extends React.Component<
  ITemplatePickerProps,
  ITemplatePickerState
> {
  public state: ITemplatePickerState = {
    showCustomForm: false,
    customTemplateName: '',
    customTemplateUrl: '',
  }

  private onSearchChange = (value: string) => {
    this.props.onSearch(value)
  }

  private onCategoryClick = (category: TemplateCategory | null) => {
    this.props.onCategoryChange(category)
  }

  private onTemplateClick = (template: RepositoryTemplate) => {
    this.props.onSelectTemplate(template)
  }

  private onVariableChange = (name: string, value: string) => {
    this.props.onVariableChange(name, value)
  }

  private getCategoryIcon(category: TemplateCategory) {
    switch (category) {
      case TemplateCategory.Web:
        return octicons.globe
      case TemplateCategory.Mobile:
        return octicons.deviceMobile
      case TemplateCategory.Desktop:
        return octicons.deviceDesktop
      case TemplateCategory.Library:
        return octicons.package_

      case TemplateCategory.Documentation:
        return octicons.book
      case TemplateCategory.DevOps:
        return octicons.container
      default:
        return octicons.repo
    }
  }

  private renderHeader() {
    const { searchQuery, categories, activeCategory } = this.props

    return (
      <div className="template-picker-header">
        <div className="template-search">
          <TextBox
            value={searchQuery}
            onValueChanged={this.onSearchChange}
            placeholder="Search templates..."
            prefixedIcon={octicons.search}
          />
        </div>
        <div className="template-categories">
          <Button
            className={activeCategory === null ? 'active' : ''}
            onClick={() => this.onCategoryClick(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              className={activeCategory === category ? 'active' : ''}
              onClick={() => this.onCategoryClick(category)}
            >
              <Octicon symbol={this.getCategoryIcon(category)} />
              {getCategoryDisplayName(category)}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  private renderTemplateCard(template: RepositoryTemplate, isCompact: boolean = false) {
    const { selectedTemplate } = this.props
    const isSelected = selectedTemplate?.id === template.id

    return (
      <div
        key={template.id}
        className={`template-card ${isSelected ? 'selected' : ''} ${isCompact ? 'compact' : ''}`}
        onClick={() => this.onTemplateClick(template)}
      >
        <div className="template-icon">
          <Octicon symbol={this.getCategoryIcon(template.category)} />
        </div>
        <div className="template-info">
          <span className="template-name">{template.name}</span>
          {!isCompact && (
            <span className="template-description">{template.description}</span>
          )}
          <div className="template-tags">
            {template.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="tag more">+{template.tags.length - 3}</span>
            )}
          </div>
        </div>
        {template.isBuiltIn && <span className="built-in-badge">Built-in</span>}
      </div>
    )
  }

  private renderMostUsed() {
    const { mostUsedTemplates } = this.props

    if (mostUsedTemplates.length === 0) return null

    return (
      <div className="template-section">
        <h3>Most Used</h3>
        <div className="template-grid compact">
          {mostUsedTemplates.map(t => this.renderTemplateCard(t, true))}
        </div>
      </div>
    )
  }

  private renderTemplateList() {
    const { templates } = this.props

    if (templates.length === 0) {
      return (
        <div className="template-empty">
          <Octicon symbol={octicons.repo} className="empty-icon" />
          <p>No templates found</p>
          <span>Try adjusting your search or category filter</span>
        </div>
      )
    }

    // Group by category
    const byCategory = templates.reduce((groups, template) => {
      const cat = template.category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(template)
      return groups
    }, {} as Record<string, RepositoryTemplate[]>)

    return (
      <div className="template-list">
        {Object.entries(byCategory).map(([category, categoryTemplates]) => (
          <div key={category} className="template-section">
            <h3>{getCategoryDisplayName(category as TemplateCategory)}</h3>
            <div className="template-grid">
              {categoryTemplates.map(t => this.renderTemplateCard(t))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  private renderVariableInput(variable: TemplateVariable) {
    const { variableValues } = this.props
    const value = variableValues.get(variable.name) || variable.defaultValue

    if (variable.validation && variable.validation.test(value) === false) {
      // Invalid value
    }

    return (
      <div key={variable.name} className="template-variable">
        <label>
          {variable.name}
          {variable.required && <span className="required">*</span>}
        </label>
        <TextBox
          value={value}
          onValueChanged={v => this.onVariableChange(variable.name, v)}
          placeholder={variable.description}
        />
        {variable.defaultValue && !value && (
          <span className="default-value">Default: {variable.defaultValue}</span>
        )}
      </div>
    )
  }

  private renderTemplateDetails() {
    const { selectedTemplate, variableValues, isCreating, onCreate, onCancel } = this.props

    if (!selectedTemplate) return null

    return (
      <div className="template-details">
        <div className="template-details-header">
          <h2>{selectedTemplate.name}</h2>
          <p>{selectedTemplate.description}</p>
        </div>

        {selectedTemplate.variables.length > 0 && (
          <div className="template-variables">
            <h4>Configure Template</h4>
            {selectedTemplate.variables.map(v => this.renderVariableInput(v))}
          </div>
        )}

        <div className="template-source">
          <h4>Source</h4>
          <a href={selectedTemplate.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Octicon symbol={octicons.linkExternal} />
            {selectedTemplate.sourceUrl}
          </a>
        </div>

        <div className="template-actions">
          <Button className="primary" onClick={() => onCreate(selectedTemplate, variableValues)} disabled={isCreating}>
            {isCreating ? <Loading /> : <Octicon symbol={octicons.plus} />}
            Create Repository
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    )
  }

  public render() {
    const { selectedTemplate } = this.props

    return (
      <div className="template-picker">
        <div className="template-picker-sidebar">
          {this.renderHeader()}
          {this.renderMostUsed()}
          {this.renderTemplateList()}
        </div>
        {selectedTemplate && (
          <div className="template-picker-details">
            {this.renderTemplateDetails()}
          </div>
        )}
      </div>
    )
  }
}
