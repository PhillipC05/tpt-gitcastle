import * as React from 'react'
import {
  BranchComparison,
  ComparisonViewMode,
  IBranchComparisonFileChange,
} from '../../models/branch-comparison'
import { Commit } from '../../models/commit'
import { Branch } from '../../models/branch'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Select } from '../lib/select'
import { Loading } from '../lib/loading'

interface IBranchComparisonProps {
  /** The comparison result */
  readonly comparison: BranchComparison | null
  /** Available branches */
  readonly branches: ReadonlyArray<Branch>
  /** Current view mode */
  readonly viewMode: ComparisonViewMode
  /** Whether a comparison is loading */
  readonly isLoading: boolean
  /** Selected commit */
  readonly selectedCommit: Commit | null
  /** File changes */
  readonly fileChanges: ReadonlyArray<IBranchComparisonFileChange>
  /** Called when branches should be compared */
  readonly onCompare: (baseBranch: Branch, compareBranch: Branch) => void
  /** Called when view mode changes */
  readonly onViewModeChange: (mode: ComparisonViewMode) => void
  /** Called when a commit is selected */
  readonly onSelectCommit: (commit: Commit) => void
  /** Called when branches should be swapped */
  readonly onSwapBranches: () => void
  /** Called to merge branches */
  readonly onMerge: () => void
  /** Called to rebase */
  readonly onRebase: () => void
}

interface IBranchComparisonState {
  readonly baseBranchName: string
  readonly compareBranchName: string
}

/**
 * Branch comparison component
 */
export class BranchComparisonView extends React.Component<
  IBranchComparisonProps,
  IBranchComparisonState
> {
  public state: IBranchComparisonState = {
    baseBranchName: '',
    compareBranchName: '',
  }

  private onBaseBranchChange = (event: React.FormEvent<HTMLSelectElement>) => {
    this.setState({ baseBranchName: event.currentTarget.value })
  }

  private onCompareBranchChange = (event: React.FormEvent<HTMLSelectElement>) => {
    this.setState({ compareBranchName: event.currentTarget.value })
  }

  private onCompare = () => {
    const { branches, onCompare } = this.props
    const { baseBranchName, compareBranchName } = this.state

    const baseBranch = branches.find(b => b.name === baseBranchName)
    const compareBranch = branches.find(b => b.name === compareBranchName)

    if (baseBranch && compareBranch) {
      onCompare(baseBranch, compareBranch)
    }
  }

  private onViewModeChange = (event: React.FormEvent<HTMLSelectElement>) => {
    this.props.onViewModeChange(event.currentTarget.value as ComparisonViewMode)
  }

  private onCommitClick = (commit: Commit) => {
    this.props.onSelectCommit(commit)
  }

  private renderBranchSelector() {
    const { branches, comparison, onSwapBranches } = this.props
    const { baseBranchName, compareBranchName } = this.state

    return (
      <div className="branch-selector">
        <div className="branch-inputs">
          <div className="branch-input">
            <label>Base branch</label>
            <Select
              value={comparison ? comparison.baseBranch.name : baseBranchName}
              onChange={this.onBaseBranchChange}
            >
              <option value="">Select base branch...</option>
              {branches.map(b => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          <button className="swap-branches" onClick={onSwapBranches} title="Swap branches">
            <Octicon symbol={octicons.arrowSwitch} />
          </button>

          <div className="branch-input">
            <label>Compare branch</label>
            <Select
              value={comparison ? comparison.compareBranch.name : compareBranchName}
              onChange={this.onCompareBranchChange}
            >
              <option value="">Select compare branch...</option>
              {branches.map(b => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button
          className="compare-button"
          onClick={this.onCompare}
          disabled={!baseBranchName || !compareBranchName || baseBranchName === compareBranchName}
        >
          <Octicon symbol={octicons.gitCompare} />
          Compare
        </Button>
      </div>
    )
  }

  private renderComparisonHeader() {
    const { comparison, onMerge, onRebase } = this.props

    if (!comparison) return null

    const { ahead, behind } = comparison.aheadBehind

    return (
      <div className="comparison-header">
        <div className="comparison-stats">
          <div className="stat ahead">
            <span className="count">{ahead}</span>
            <span className="label">ahead</span>
          </div>
          <div className="stat behind">
            <span className="count">{behind}</span>
            <span className="label">behind</span>
          </div>
          <div className="stat files">
            <span className="count">{comparison.fileChanges}</span>
            <span className="label">files changed</span>
          </div>
          <div className="stat additions">
            <span className="count">+{comparison.additions}</span>
            <span className="label">additions</span>
          </div>
          <div className="stat deletions">
            <span className="count">-{comparison.deletions}</span>
            <span className="label">deletions</span>
          </div>
        </div>

        <div className="merge-status">
          <Octicon
            symbol={comparison.hasConflicts ? octicons.alert : octicons.check}
            className={comparison.hasConflicts ? 'warning' : 'success'}
          />
          <span>{comparison.mergeStatus}</span>
        </div>

        <div className="comparison-actions">
          <Button onClick={onMerge} disabled={comparison.hasConflicts}>
            <Octicon symbol={octicons.gitMerge} />
            Merge
          </Button>
          <Button onClick={onRebase} disabled={comparison.hasConflicts || behind === 0}>
            <Octicon symbol={octicons.gitBranch} />
            Rebase
          </Button>
        </div>
      </div>
    )
  }

  private renderCommitList(commits: ReadonlyArray<Commit>, title: string) {
    const { selectedCommit } = this.props

    if (commits.length === 0) {
      return (
        <div className="commit-list empty">
          <p>No commits</p>
        </div>
      )
    }

    return (
      <div className="commit-list">
        <h4>{title}</h4>
        {commits.map(commit => (
          <div
            key={commit.sha}
            className={`commit-item ${selectedCommit?.sha === commit.sha ? 'selected' : ''}`}
            onClick={() => this.onCommitClick(commit)}
          >
            <div className="commit-message" title={commit.summary}>
              {commit.summary}
            </div>
            <div className="commit-meta">
              <span className="commit-author">{commit.author.name}</span>
              <span className="commit-date">
                {new Date(commit.author.date).toLocaleDateString()}
              </span>
              <span className="commit-sha">{commit.sha.substring(0, 7)}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  private renderCommitsView() {
    const { comparison } = this.props

    if (!comparison) return null

    return (
      <div className="commits-view">
        <div className="commits-column">
          {this.renderCommitList(comparison.aheadCommits, `Ahead (${comparison.aheadCommits.length})`)}
        </div>
        <div className="commits-column">
          {this.renderCommitList(comparison.behindCommits, `Behind (${comparison.behindCommits.length})`)}
        </div>
      </div>
    )
  }

  private renderFilesView() {
    const { fileChanges } = this.props

    if (fileChanges.length === 0) {
      return (
        <div className="files-view empty">
          <Octicon symbol={octicons.fileCode} className="empty-icon" />
          <p>No file changes</p>
        </div>
      )
    }

    return (
      <div className="files-view">
        {fileChanges.map(file => (
          <div key={file.path} className={`file-item ${file.status}`}>
            <div className="file-status">
              {file.status === 'added' && <Octicon symbol={octicons.diffAdded} />}
              {file.status === 'modified' && <Octicon symbol={octicons.diffModified} />}
              {file.status === 'deleted' && <Octicon symbol={octicons.diffRemoved} />}
              {file.status === 'renamed' && <Octicon symbol={octicons.diffRenamed} />}
            </div>
            <div className="file-path">{file.path}</div>
            <div className="file-stats">
              {file.additions > 0 && <span className="additions">+{file.additions}</span>}
              {file.deletions > 0 && <span className="deletions">-{file.deletions}</span>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  private renderGraphView() {
    const { comparison } = this.props

    if (!comparison) return null

    return (
      <div className="graph-view">
        <div className="graph-branches">
          <div className="branch-line base">
            <span className="branch-name">{comparison.baseBranch.name}</span>
            <span className="branch-sha">{comparison.baseBranch.tip.sha.substring(0, 7)}</span>
          </div>
          <div className="merge-base">
            <Octicon symbol={octicons.gitCommit} />
            <span>Merge base: {comparison.mergeBase.substring(0, 7)}</span>
          </div>
          <div className="branch-line compare">
            <span className="branch-name">{comparison.compareBranch.name}</span>
            <span className="branch-sha">{comparison.compareBranch.tip.sha.substring(0, 7)}</span>
          </div>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span className="dot ahead" />
            <span>{comparison.aheadCommits.length} commits ahead</span>
          </div>
          <div className="legend-item">
            <span className="dot behind" />
            <span>{comparison.behindCommits.length} commits behind</span>
          </div>
        </div>
      </div>
    )
  }

  private renderContent() {
    const { viewMode, isLoading } = this.props

    if (isLoading) {
      return (
        <div className="comparison-loading">
          <Loading />
          <span>Comparing branches...</span>
        </div>
      )
    }

    switch (viewMode) {
      case ComparisonViewMode.Commits:
        return this.renderCommitsView()
      case ComparisonViewMode.Files:
        return this.renderFilesView()
      case ComparisonViewMode.Graph:
        return this.renderGraphView()
      default:
        return null
    }
  }

  public render() {
    const { comparison, viewMode } = this.props

    return (
      <div className="branch-comparison">
        {this.renderBranchSelector()}
        {comparison && this.renderComparisonHeader()}
        {comparison && (
          <div className="view-mode-selector">
            <Select value={viewMode} onChange={this.onViewModeChange}>
              <option value={ComparisonViewMode.Commits}>Commits</option>
              <option value={ComparisonViewMode.Files}>Files</option>
              <option value={ComparisonViewMode.Graph}>Graph</option>
            </Select>
          </div>
        )}
        <div className="comparison-content">{this.renderContent()}</div>
      </div>
    )
  }
}
