import * as React from 'react'
import { Repository } from '../../models/repository'
import { Account } from '../../models/account'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Loading } from '../lib/loading'


interface IRepositoryStatus {
  readonly repository: Repository
  readonly hasUncommittedChanges: boolean
  readonly hasUnpushedCommits: boolean
  readonly isBehindUpstream: boolean
  readonly aheadCount: number
  readonly behindCount: number
  readonly lastFetched: Date | null
  readonly isLoading: boolean
}

interface IRepositoryHealthDashboardProps {
  /** All repositories */
  readonly repositories: ReadonlyArray<Repository>
  /** Currently selected account */
  readonly selectedAccount: Account | null
  /** Called when a repository is selected */
  readonly onSelectRepository: (repository: Repository) => void
  /** Called when sync all is requested */
  readonly onSyncAll: () => void
  /** Called when fetch all is requested */
  readonly onFetchAll: () => void
  /** Called when a single repo should be synced */
  readonly onSyncRepository: (repository: Repository) => void
  /** Repository statuses */
  readonly repositoryStatuses: ReadonlyMap<number, IRepositoryStatus>
  /** Whether data is loading */
  readonly isLoading: boolean
}

/**
 * Dashboard showing health status of all repositories
 */
export class RepositoryHealthDashboard extends React.Component<
  IRepositoryHealthDashboardProps,
  {}
> {
  private onSyncAll = () => {
    this.props.onSyncAll()
  }

  private onFetchAll = () => {
    this.props.onFetchAll()
  }

  private onSyncRepository = (repository: Repository) => {
    this.props.onSyncRepository(repository)
  }

  private getStatusSummary() {
    const { repositoryStatuses } = this.props
    const statuses = Array.from(repositoryStatuses.values())

    const needsAttention = statuses.filter(
      s => s.hasUncommittedChanges || s.hasUnpushedCommits || s.isBehindUpstream
    ).length

    const clean = statuses.length - needsAttention

    return { total: statuses.length, needsAttention, clean }
  }

  private renderHeader() {
    const { isLoading } = this.props
    const summary = this.getStatusSummary()

    return (
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Repository Health</h2>
          <span className="dashboard-subtitle">
            {summary.needsAttention} need attention • {summary.clean} clean
          </span>
        </div>
        <div className="dashboard-actions">
          <Button
            className="fetch-all-button"
            onClick={this.onFetchAll}
            disabled={isLoading}
          >
            <Octicon symbol={octicons.download} />
            <span>Fetch All</span>
          </Button>
          <Button
            className="sync-all-button"
            onClick={this.onSyncAll}
            disabled={isLoading}
          >
            <Octicon symbol={octicons.sync} />
            <span>Sync All</span>
          </Button>
        </div>
      </div>
    )
  }

  private renderRepositoryCard(status: IRepositoryStatus) {
    const { repository, isLoading } = status

    const indicators = []

    if (status.hasUncommittedChanges) {
      indicators.push({
        icon: octicons.diffModified,
        label: 'Uncommitted changes',
        type: 'warning',
      })
    }

    if (status.hasUnpushedCommits) {
      indicators.push({
        icon: octicons.arrowUp,
        label: `${status.aheadCount} unpushed`,
        type: 'info',
      })
    }

    if (status.isBehindUpstream) {
      indicators.push({
        icon: octicons.arrowDown,
        label: `${status.behindCount} behind`,
        type: 'warning',
      })
    }

    if (indicators.length === 0) {
      indicators.push({
        icon: octicons.check,
        label: 'Up to date',
        type: 'success',
      })
    }

    return (
      <div
        key={repository.id}
        className={`repository-card ${
          indicators.some(i => i.type === 'warning') ? 'needs-attention' : ''
        }`}
        onClick={() => this.props.onSelectRepository(repository)}
      >
        <div className="card-header">
          <Octicon symbol={octicons.repo} className="repo-icon" />
          <span className="repo-name">{repository.name}</span>
          {isLoading && <Loading />}
        </div>


        <div className="card-indicators">
          {indicators.map((indicator, index) => (
            <div
              key={index}
              className={`indicator ${indicator.type}`}
              title={indicator.label}
            >
              <Octicon symbol={indicator.icon} />
              <span>{indicator.label}</span>
            </div>
          ))}
        </div>

        <div className="card-footer">
          {status.lastFetched && (
            <span className="last-fetched">
              Last fetched: {this.formatLastFetched(status.lastFetched)}
            </span>
          )}
          <Button
            className="sync-repo-button"
            onClick={e => {
              e.stopPropagation()
              this.onSyncRepository(repository)
            }}
            disabled={isLoading}
          >
            <Octicon symbol={octicons.sync} />
            Sync
          </Button>
        </div>
      </div>
    )
  }

  private formatLastFetched(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  private renderGrid() {
    const { repositoryStatuses, isLoading } = this.props
    const statuses = Array.from(repositoryStatuses.values())

    if (statuses.length === 0 && isLoading) {
      return (
        <div className="dashboard-loading">
          <Loading />
          <span>Loading repository status...</span>
        </div>
      )
    }

    if (statuses.length === 0) {
      return (
        <div className="dashboard-empty">
          <Octicon symbol={octicons.inbox} className="empty-icon" />
          <h3>No repositories</h3>
          <p>Add repositories to see their health status</p>
        </div>
      )
    }

    // Sort: needs attention first, then by name
    const sorted = statuses.sort((a, b) => {
      const aNeedsAttention =
        a.hasUncommittedChanges || a.hasUnpushedCommits || a.isBehindUpstream
      const bNeedsAttention =
        b.hasUncommittedChanges || b.hasUnpushedCommits || b.isBehindUpstream

      if (aNeedsAttention && !bNeedsAttention) return -1
      if (!aNeedsAttention && bNeedsAttention) return 1
      return a.repository.name.localeCompare(b.repository.name)
    })

    return (
      <div className="repository-grid">
        {sorted.map(status => this.renderRepositoryCard(status))}
      </div>
    )
  }

  public render() {
    return (
      <div className="repository-health-dashboard">
        {this.renderHeader()}
        {this.renderGrid()}
      </div>
    )
  }
}
