import * as React from 'react'
import {
  CommitMessageTemplate, TemplateVariable
} from '../../models/commit-message-template'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Select } from '../lib/select'
import { TextBox } from '../lib/text-box'
import { TextArea } from '../lib/text-area'

interface ICommitTemplatePickerProps {
  /** Available templates */
  readonly templates: ReadonlyArray<CommitMessageTemplate>
  /** Currently selected template */
  readonly selectedTemplate: CommitMessageTemplate | null
  /** Current variable values */
  readonly variableValues: Record<string, string>
  /** Called when template is selected */
  readonly onSelectTemplate: (template: CommitMessageTemplate) => void
  /** Called when variable value changes */
  readonly onVariableChange: (name: string, value: string) => void
  /** Called when commit message should be generated */
  readonly onGenerateMessage: (message: string) => void
  /** Called to open template manager */
  readonly onManageTemplates: () => void
}

interface ICommitTemplatePickerState {
  readonly preview: string
  readonly showPreview: boolean
}

/**
 * Component for picking and filling commit message templates
 */
export class CommitTemplatePicker extends React.Component<
  ICommitTemplatePickerProps,
  ICommitTemplatePickerState
> {
  public state: ICommitTemplatePickerState = {
    preview: '',
    showPreview: false,
  }

  private onTemplateChange = (event: React.FormEvent<HTMLSelectElement>) => {
    const templateId = event.currentTarget.value
    const template =
      this.props.templates.find(t => t.id === templateId) || null
    if (template) {
      this.props.onSelectTemplate(template)
    }
  }

  private onVariableChange = (name: string, value: string) => {
    this.props.onVariableChange(name, value)
  }

  private generatePreview(): string {
    const { selectedTemplate, variableValues } = this.props
    if (!selectedTemplate) return ''

    return selectedTemplate.apply(variableValues)
  }

  private onGenerate = () => {
    const preview = this.generatePreview()
    this.props.onGenerateMessage(preview)
    this.setState({ preview, showPreview: true })
  }

  private renderTemplateSelector() {
    const { templates, selectedTemplate } = this.props

    return (
      <div className="template-selector">
        <label>Template:</label>
        <Select
          value={selectedTemplate?.id || ''}
          onChange={this.onTemplateChange}
        >
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.isBuiltIn ? '🔒 ' : '✏️ '}
              {template.name}
              {template.isDefault ? ' (Default)' : ''}
            </option>
          ))}
        </Select>
        <Button
          className="manage-templates-button"
          onClick={this.props.onManageTemplates}
        >
          <Octicon symbol={octicons.gear} />
        </Button>
      </div>
    )
  }

  private renderVariableInput(variable: TemplateVariable) {
    const { variableValues } = this.props
    const value = variableValues[variable.name] || ''

    if (variable.options && variable.options.length > 0) {
      return (
        <Select
          value={value}
          onChange={e => this.onVariableChange(variable.name, e.currentTarget.value)}
        >
          <option value="">-- Select --</option>
          {variable.options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      )
    }

    if (variable.name === 'body' || variable.name === 'description') {
      return (
        <TextArea
          value={value}
          onValueChanged={v => this.onVariableChange(variable.name, v)}
          placeholder={variable.description}
          rows={3}
        />
      )
    }

    return (
      <TextBox
        value={value}
        onValueChanged={v => this.onVariableChange(variable.name, v)}
        placeholder={variable.description}
      />
    )
  }

  private renderVariables() {
    const { selectedTemplate } = this.props
    if (!selectedTemplate || selectedTemplate.variables.length === 0) {
      return null
    }

    return (
      <div className="template-variables">
        {selectedTemplate.variables.map(variable => (
          <div key={variable.name} className="variable-row">
            <label className={variable.required ? 'required' : ''}>
              {variable.name}
              {variable.required && <span className="required-mark">*</span>}
            </label>
            {this.renderVariableInput(variable)}
            {variable.pattern && (
              <span className="pattern-hint">
                Pattern: {variable.pattern}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  private renderPreview() {
    const { showPreview } = this.state
    const preview = this.generatePreview()

    if (!showPreview || !preview) return null

    return (
      <div className="template-preview">
        <h4>Preview:</h4>
        <pre>{preview}</pre>
      </div>
    )
  }

  private renderActions() {
    const { selectedTemplate, variableValues } = this.props

    const canGenerate =
      selectedTemplate &&
      selectedTemplate.variables
        .filter(v => v.required)
        .every(v => variableValues[v.name])

    return (
      <div className="template-actions">
        <Button
          className="generate-button"
          onClick={this.onGenerate}
          disabled={!canGenerate}
        >
          <Octicon symbol={octicons.fileCode} />
          Generate Message
        </Button>
        <Button
          className="preview-toggle"
          onClick={() => this.setState({ showPreview: !this.state.showPreview })}
        >
          {this.state.showPreview ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </div>
    )
  }

  public render() {
    return (
      <div className="commit-template-picker">
        {this.renderTemplateSelector()}
        {this.renderVariables()}
        {this.renderActions()}
        {this.renderPreview()}
      </div>
    )
  }
}
