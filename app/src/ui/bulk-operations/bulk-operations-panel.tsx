import * as React from 'react'
import { Repository } from '../../models/repository'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Checkbox, CheckboxValue } from '../lib/checkbox'


interface IBulkOperationsPanelProps {
  /** All repositories */
  readonly repositories: ReadonlyArray<Repository>
  /** Currently selected repositories */
  readonly selectedRepositories: ReadonlySet<number>
  /** Called when selection changes */
  readonly onSelectionChange: (selected: ReadonlySet<number>) => void
  /** Called when bulk fetch is requested */
  readonly onBulkFetch: (repositories: ReadonlyArray<Repository>) => void
  /** Called when bulk pull is requested */
  readonly onBulkPull: (repositories: ReadonlyArray<Repository>) => void
  /** Called when bulk push is requested */
  readonly onBulkPush: (repositories: ReadonlyArray<Repository>) => void
  /** Called when bulk discard is requested */
  readonly onBulkDiscard: (repositories: ReadonlyArray<Repository>) => void
  /** Whether operations are in progress */
  readonly isProcessing: boolean
  /** Progress information */
  readonly progress: IBulkOperationProgress | null
}

export interface IBulkOperationProgress {
  readonly total: number
  readonly completed: number
  readonly currentRepository: string | null
  readonly operation: string
}

interface IBulkOperationsPanelState {
  readonly showConfirmDialog: boolean
  readonly pendingOperation: (() => void) | null
  readonly confirmTitle: string
  readonly confirmMessage: string
}

/**
 * Panel for performing bulk operations on multiple repositories
 */
export class BulkOperationsPanel extends React.Component<
  IBulkOperationsPanelProps,
  IBulkOperationsPanelState
> {
  public state: IBulkOperationsPanelState = {
    showConfirmDialog: false,
    pendingOperation: null,
    confirmTitle: '',
    confirmMessage: '',
  }

  private onSelectAll = () => {
    const allIds = new Set(this.props.repositories.map(r => r.id))
    this.props.onSelectionChange(allIds)
  }

  private onDeselectAll = () => {
    this.props.onSelectionChange(new Set())
  }

  private onToggleRepository = (repository: Repository) => {
    const newSelection = new Set(this.props.selectedRepositories)
    if (newSelection.has(repository.id)) {
      newSelection.delete(repository.id)
    } else {
      newSelection.add(repository.id)
    }
    this.props.onSelectionChange(newSelection)
  }

  private getSelectedRepositories(): ReadonlyArray<Repository> {
    return this.props.repositories.filter(r =>
      this.props.selectedRepositories.has(r.id)
    )
  }

  private onBulkFetch = () => {
    const selected = this.getSelectedRepositories()
    if (selected.length === 0) return

    this.props.onBulkFetch(selected)
  }

  private onBulkPull = () => {
    const selected = this.getSelectedRepositories()
    if (selected.length === 0) return

    this.showConfirmDialog(
      'Pull Changes',
      `Pull changes for ${selected.length} repositories? This will merge remote changes into your local branches.`,
      () => this.props.onBulkPull(selected)
    )
  }

  private onBulkPush = () => {
    const selected = this.getSelectedRepositories()
    if (selected.length === 0) return

    this.showConfirmDialog(
      'Push Changes',
      `Push changes for ${selected.length} repositories? This will upload your local commits to the remote.`,
      () => this.props.onBulkPush(selected)
    )
  }

  private onBulkDiscard = () => {
    const selected = this.getSelectedRepositories()
    if (selected.length === 0) return

    this.showConfirmDialog(
      'Discard Changes',
      `Discard all uncommitted changes in ${selected.length} repositories? This action cannot be undone.`,
      () => this.props.onBulkDiscard(selected)
    )
  }

  private showConfirmDialog = (
    title: string,
    message: string,
    operation: () => void
  ) => {
    this.setState({
      showConfirmDialog: true,
      confirmTitle: title,
      confirmMessage: message,
      pendingOperation: operation,
    })
  }

  private onConfirm = () => {
    if (this.state.pendingOperation) {
      this.state.pendingOperation()
    }
    this.onCancelConfirm()
  }

  private onCancelConfirm = () => {
    this.setState({
      showConfirmDialog: false,
      pendingOperation: null,
      confirmTitle: '',
      confirmMessage: '',
    })
  }

  private renderConfirmDialog() {
    const { showConfirmDialog, confirmTitle, confirmMessage } = this.state
    if (!showConfirmDialog) return null

    return (
      <div className="bulk-confirm-dialog">
        <h3>{confirmTitle}</h3>
        <p>{confirmMessage}</p>
        <div className="confirm-actions">
          <Button onClick={this.onCancelConfirm}>Cancel</Button>
          <Button className="confirm-button" onClick={this.onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    )
  }


  private renderProgress() {
    const { progress, isProcessing } = this.props
    if (!isProcessing || !progress) return null

    const percentage = Math.round((progress.completed / progress.total) * 100)

    return (
      <div className="bulk-progress">
        <div className="progress-header">
          <span className="operation-name">{progress.operation}</span>
          <span className="progress-count">
            {progress.completed} / {progress.total}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {progress.currentRepository && (
          <span className="current-repo">{progress.currentRepository}</span>
        )}
      </div>
    )
  }

  private renderToolbar() {
    const { selectedRepositories, isProcessing } = this.props
    const selectedCount = selectedRepositories.size
    const hasSelection = selectedCount > 0

    return (
      <div className="bulk-toolbar">
        <div className="selection-controls">
          <Button onClick={this.onSelectAll} disabled={isProcessing}>
            Select All
          </Button>
          <Button onClick={this.onDeselectAll} disabled={isProcessing}>
            Deselect All
          </Button>
          <span className="selection-count">
            {selectedCount} selected
          </span>
        </div>

        <div className="operation-buttons">
          <Button
            onClick={this.onBulkFetch}
            disabled={!hasSelection || isProcessing}
          >
            <Octicon symbol={octicons.download} />
            Fetch
          </Button>
          <Button
            onClick={this.onBulkPull}
            disabled={!hasSelection || isProcessing}
          >
            <Octicon symbol={octicons.arrowDown} />
            Pull
          </Button>
          <Button
            onClick={this.onBulkPush}
            disabled={!hasSelection || isProcessing}
          >
            <Octicon symbol={octicons.arrowUp} />
            Push
          </Button>
          <Button
            className="danger"
            onClick={this.onBulkDiscard}
            disabled={!hasSelection || isProcessing}
          >
            <Octicon symbol={octicons.trash} />
            Discard
          </Button>
        </div>
      </div>
    )
  }

  private renderRepositoryList() {
    const { repositories, selectedRepositories, isProcessing } = this.props

    return (
      <div className="bulk-repository-list">
        {repositories.map(repository => (
          <div
            key={repository.id}
            className={`repository-row ${
              selectedRepositories.has(repository.id) ? 'selected' : ''
            }`}
          >
          <Checkbox
            value={selectedRepositories.has(repository.id) ? CheckboxValue.On : CheckboxValue.Off}
            onChange={() => this.onToggleRepository(repository)}
            disabled={isProcessing}
          />

            <Octicon symbol={octicons.repo} />
            <span className="repo-name">{repository.name}</span>
            <span className="repo-path" title={repository.path}>
              {repository.path}
            </span>
          </div>
        ))}
      </div>
    )
  }

  public render() {
    return (
      <div className="bulk-operations-panel">
        {this.renderToolbar()}
        {this.renderProgress()}
        {this.renderRepositoryList()}
        {this.renderConfirmDialog()}
      </div>
    )
  }
}
