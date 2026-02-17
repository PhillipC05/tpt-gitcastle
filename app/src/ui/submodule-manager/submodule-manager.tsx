import * as React from 'react'
import {
  Submodule,
  SubmoduleStatus,
  SubmoduleOperation,
  ISubmoduleStats,
  getSubmoduleStatusDescription,
} from '../../models/submodule'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Loading } from '../lib/loading'

interface ISubmoduleManagerProps {
  /** All submodules */
  readonly submodules: ReadonlyArray<Submodule>
  /** Submodule statistics */
  readonly stats: ISubmoduleStats
  /** Currently selected submodule */
  readonly selectedSubmodule: Submodule | null
  /** Operation in progress */
  readonly operationInProgress: SubmoduleOperation | null
  /** Called when a submodule is selected */
  readonly onSelectSubmodule: (submodule: Submodule) => void
  /** Called when an operation should be performed */
  readonly onOperation: (submodule: Submodule, operation: SubmoduleOperation) => void
  /** Called when all submodules should be updated */
  readonly onUpdateAll: () => void
  /** Called when all submodules should be initialized */
  readonly onInitAll: () => void
  /** Called when all submodules should be synced */
  readonly onSyncAll: () => void
}

/**
 * Submodule manager component
 */
export class SubmoduleManager extends React.Component<ISubmoduleManagerProps, {}> {
  private onSubmoduleClick = (submodule: Submodule) => {
    this.props.onSelectSubmodule(submodule)
  }

  private onOperation = (
    submodule: Submodule,
    operation: SubmoduleOperation,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    this.props.onOperation(submodule, operation)
  }

  private renderHeader() {
    const { stats, submodules } = this.props

    return (
      <div className="submodule-manager-header">
        <div className="submodule-stats">
          <span className="stat-item">
            <Octicon symbol={octicons.fileSubmodule} />
            {stats.totalCount} submodules
          </span>
          {stats.uninitializedCount > 0 && (
            <span className="stat-item warning">
              <Octicon symbol={octicons.alert} />
              {stats.uninitializedCount} uninitialized
            </span>
          )}
          {stats.modifiedCount > 0 && (
            <span className="stat-item warning">
              <Octicon symbol={octicons.diffModified} />
              {stats.modifiedCount} modified
            </span>
          )}
          {stats.outOfSyncCount > 0 && (
            <span className="stat-item info">
              <Octicon symbol={octicons.arrowDown} />
              {stats.outOfSyncCount} out of sync
            </span>
          )}
        </div>
        {submodules.length > 0 && (
          <div className="submodule-bulk-actions">
            <Button onClick={this.props.onUpdateAll}>
              <Octicon symbol={octicons.sync} />
              Update All
            </Button>
            <Button onClick={this.props.onInitAll}>
              <Octicon symbol={octicons.play} />
              Init All
            </Button>
            <Button onClick={this.props.onSyncAll}>
              <Octicon symbol={octicons.arrowBoth} />
              Sync All
            </Button>
          </div>
        )}
      </div>
    )
  }

  private getStatusIcon(status: SubmoduleStatus) {

    switch (status) {
      case SubmoduleStatus.Clean:
        return octicons.check
      case SubmoduleStatus.Modified:
        return octicons.diffModified
      case SubmoduleStatus.Untracked:
        return octicons.plus
      case SubmoduleStatus.Conflicted:
        return octicons.alert
      case SubmoduleStatus.OutOfSync:
        return octicons.arrowDown
      case SubmoduleStatus.NotInitialized:
        return octicons.circleSlash
      default:
        return octicons.question
    }
  }

  private getStatusClass(status: SubmoduleStatus): string {
    switch (status) {
      case SubmoduleStatus.Clean:
        return 'status-clean'
      case SubmoduleStatus.Modified:
      case SubmoduleStatus.Conflicted:
        return 'status-warning'
      case SubmoduleStatus.OutOfSync:
      case SubmoduleStatus.NotInitialized:
        return 'status-info'
      default:
        return ''
    }
  }

  private renderSubmoduleItem(submodule: Submodule) {
    const { selectedSubmodule, operationInProgress } = this.props
    const isSelected = selectedSubmodule?.path === submodule.path
    const isOperationInProgress = operationInProgress !== null

    return (
      <div
        key={submodule.path}
        className={`submodule-item ${isSelected ? 'selected' : ''}`}
        onClick={() => this.onSubmoduleClick(submodule)}
      >
        <div className="submodule-header">
          <div className="submodule-icon">
            <Octicon symbol={octicons.fileSubmodule} />
          </div>
          <div className="submodule-info">
            <span className="submodule-name">{submodule.displayName}</span>
            <span className="submodule-path" title={submodule.path}>
              {submodule.path}
            </span>
          </div>
          <div className={`submodule-status ${this.getStatusClass(submodule.status)}`}>
            <Octicon symbol={this.getStatusIcon(submodule.status)} />
            <span>{getSubmoduleStatusDescription(submodule.status)}</span>
          </div>
        </div>

        <div className="submodule-details">
          <div className="submodule-meta">
            <span className="submodule-sha" title={submodule.sha}>
              {submodule.shortSha}
            </span>
            {submodule.branch && (
              <span className="submodule-branch">
                <Octicon symbol={octicons.gitBranch} />
                {submodule.branch}
              </span>
            )}
            {submodule.lastUpdated && (
              <span className="submodule-updated">
                Updated {this.formatDate(submodule.lastUpdated)}
              </span>
            )}
          </div>

          <div className="submodule-url" title={submodule.url}>
            {submodule.url}
          </div>
        </div>

        {isSelected && (
          <div className="submodule-actions">
            {!submodule.isInitialized && (
              <Button
                onClick={e => this.onOperation(submodule, SubmoduleOperation.Init, e)}
                disabled={isOperationInProgress}
              >
                {operationInProgress === SubmoduleOperation.Init ? (
                  <Loading />
                ) : (
                  <Octicon symbol={octicons.play} />
                )}
                Initialize
              </Button>
            )}

            {submodule.isInitialized && (
              <>
                <Button
                  onClick={e => this.onOperation(submodule, SubmoduleOperation.Update, e)}
                  disabled={isOperationInProgress}
                >
                  {operationInProgress === SubmoduleOperation.Update ? (
                    <Loading />
                  ) : (
                    <Octicon symbol={octicons.sync} />
                  )}
                  Update
                </Button>

                <Button
                  onClick={e => this.onOperation(submodule, SubmoduleOperation.Sync, e)}
                  disabled={isOperationInProgress}
                >
                  {operationInProgress === SubmoduleOperation.Sync ? (
                    <Loading />
                  ) : (
                    <Octicon symbol={octicons.arrowBoth} />
                  )}
                  Sync
                </Button>

                <Button
                  className="danger"
                  onClick={e => this.onOperation(submodule, SubmoduleOperation.Deinit, e)}
                  disabled={isOperationInProgress}
                >
                  {operationInProgress === SubmoduleOperation.Deinit ? (
                    <Loading />
                  ) : (
                    <Octicon symbol={octicons.stop} />
                  )}
                  Deinitialize
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  private formatDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)

    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  private renderSubmoduleList() {
    const { submodules } = this.props

    if (submodules.length === 0) {
      return (
        <div className="submodule-empty">
          <Octicon symbol={octicons.fileSubmodule} className="empty-icon" />
          <p>No submodules</p>
          <span>This repository doesn't have any submodules configured</span>
        </div>
      )
    }

    return (
      <div className="submodule-list">
        {submodules.map(submodule => this.renderSubmoduleItem(submodule))}
      </div>
    )
  }

  public render() {
    return (
      <div className="submodule-manager">
        {this.renderHeader()}
        {this.renderSubmoduleList()}
      </div>
    )
  }
}
