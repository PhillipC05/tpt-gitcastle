import * as React from 'react'
import { StashEntry, IStashStats, PredefinedStashTags } from '../../models/stash-entry'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { TextBox } from '../lib/text-box'
import { TextArea } from '../lib/text-area'
import { Popover, PopoverAnchorPosition } from '../lib/popover'

interface IStashManagerProps {
  /** All stashes */
  readonly stashes: ReadonlyArray<StashEntry>
  /** Stash statistics */
  readonly stats: IStashStats
  /** Currently selected stash */
  readonly selectedStash: StashEntry | null
  /** Search query */
  readonly searchQuery: string
  /** Active filter (tag or 'all', 'favorites') */
  readonly activeFilter: string
  /** Called when a stash is selected */
  readonly onSelectStash: (stash: StashEntry) => void
  /** Called when search query changes */
  readonly onSearch: (query: string) => void
  /** Called when filter changes */
  readonly onFilterChange: (filter: string) => void
  /** Called when a stash should be applied */
  readonly onApplyStash: (stash: StashEntry) => void
  /** Called when a stash should be dropped */
  readonly onDropStash: (stash: StashEntry) => void
  /** Called when a stash should be popped */
  readonly onPopStash: (stash: StashEntry) => void
  /** Called when stash description is updated */
  readonly onUpdateDescription: (stashName: string, description: string) => void
  /** Called when tag is added */
  readonly onAddTag: (stashName: string, tag: string) => void
  /** Called when tag is removed */
  readonly onRemoveTag: (stashName: string, tag: string) => void
  /** Called when favorite is toggled */
  readonly onToggleFavorite: (stashName: string) => void
  /** All available tags */
  readonly availableTags: ReadonlyArray<string>
}

interface IStashManagerState {
  readonly editingStash: string | null
  readonly editDescription: string
  readonly showTagPopover: boolean
  readonly tagPopoverStash: string | null
}

/**
 * Advanced stash management component
 */
export class StashManager extends React.Component<
  IStashManagerProps,
  IStashManagerState
> {
  public state: IStashManagerState = {
    editingStash: null,
    editDescription: '',
    showTagPopover: false,
    tagPopoverStash: null,
  }

  private onSearchChange = (value: string) => {
    this.props.onSearch(value)
  }

  private onFilterClick = (filter: string) => {
    this.props.onFilterChange(filter)
  }

  private onStashClick = (stash: StashEntry) => {
    this.props.onSelectStash(stash)
  }

  private onEditDescription = (stash: StashEntry) => {
    this.setState({
      editingStash: stash.name,
      editDescription: stash.description || '',
    })
  }

  private onSaveDescription = () => {
    const { editingStash, editDescription } = this.state
    if (editingStash) {
      this.props.onUpdateDescription(editingStash, editDescription)
    }
    this.setState({ editingStash: null, editDescription: '' })
  }

  private onCancelEdit = () => {
    this.setState({ editingStash: null, editDescription: '' })
  }

  private onToggleFavorite = (stash: StashEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    this.props.onToggleFavorite(stash.name)
  }

  private onShowTagPopover = (stash: StashEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    this.setState({
      showTagPopover: true,
      tagPopoverStash: stash.name,
    })
  }

  private onCloseTagPopover = () => {
    this.setState({
      showTagPopover: false,
      tagPopoverStash: null,
    })
  }

  private onAddTag = (tag: string) => {
    const { tagPopoverStash } = this.state
    if (tagPopoverStash) {
      this.props.onAddTag(tagPopoverStash, tag)
    }
  }

  private onRemoveTag = (stash: StashEntry, tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    this.props.onRemoveTag(stash.name, tag)
  }

  private renderHeader() {
    const { stats, searchQuery, activeFilter } = this.props

    return (
      <div className="stash-manager-header">
        <div className="stash-stats">
          <span className="stat-item">
            <Octicon symbol={octicons.inbox} />
            {stats.totalCount} stashes
          </span>
          {stats.favoriteCount > 0 && (
            <span className="stat-item favorite">
              <Octicon symbol={octicons.star} />
              {stats.favoriteCount}
            </span>
          )}
        </div>
        <div className="stash-search">
          <TextBox
            value={searchQuery}
            onValueChanged={this.onSearchChange}
            placeholder="Search stashes..."
            prefixedIcon={octicons.search}
          />
        </div>
        <div className="stash-filters">
          <Button
            className={activeFilter === 'all' ? 'active' : ''}
            onClick={() => this.onFilterClick('all')}
          >
            All
          </Button>
          <Button
            className={activeFilter === 'favorites' ? 'active' : ''}
            onClick={() => this.onFilterClick('favorites')}
          >
            <Octicon symbol={octicons.star} />
            Favorites
          </Button>
          {PredefinedStashTags.map(tag => (
            <Button
              key={tag}
              className={activeFilter === tag ? 'active' : ''}
              onClick={() => this.onFilterClick(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  private renderTagPopover() {
    const { showTagPopover, tagPopoverStash } = this.state
    const { availableTags, stashes } = this.props

    if (!showTagPopover || !tagPopoverStash) return null

    const stash = stashes.find(s => s.name === tagPopoverStash)
    if (!stash) return null

    const unusedTags = availableTags.filter(t => !stash.tags.includes(t))

    return (
      <Popover
        anchorPosition={PopoverAnchorPosition.Bottom}
        onClickOutside={this.onCloseTagPopover}
      >
        <div className="tag-popover">
          <h4>Tags for {stash.name}</h4>
          <div className="current-tags">
            {stash.tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button onClick={() => this.props.onRemoveTag(stash.name, tag)}>
                  <Octicon symbol={octicons.x} />
                </button>
              </span>
            ))}
          </div>
          {unusedTags.length > 0 && (
            <div className="add-tags">
              <h5>Add tag:</h5>
              {unusedTags.map(tag => (
                <button key={tag} onClick={() => this.onAddTag(tag)}>
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </Popover>
    )
  }

  private renderStashItem(stash: StashEntry) {
    const { selectedStash } = this.props
    const { editingStash, editDescription } = this.state
    const isSelected = selectedStash?.name === stash.name
    const isEditing = editingStash === stash.name

    return (
      <div
        key={stash.name}
        className={`stash-item ${isSelected ? 'selected' : ''}`}
        onClick={() => this.onStashClick(stash)}
      >
        <div className="stash-header">
          <div className="stash-info">
            <span className="stash-name">{stash.name}</span>
            <span className="stash-branch">{stash.branchName}</span>
            <span className="stash-date">
              {this.formatDate(stash.createdAt)}
            </span>
          </div>
          <div className="stash-actions">
            <button
              className={`favorite-btn ${stash.isFavorite ? 'active' : ''}`}
              onClick={e => this.onToggleFavorite(stash, e)}
              title={stash.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Octicon symbol={stash.isFavorite ? octicons.starFill : octicons.star} />
            </button>
            <button
              className="tag-btn"
              onClick={e => this.onShowTagPopover(stash, e)}
              title="Manage tags"
            >
              <Octicon symbol={octicons.tag} />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="stash-edit">
            <TextArea
              value={editDescription}
              onValueChanged={v => this.setState({ editDescription: v })}
              rows={2}
            />
            <div className="edit-actions">
              <Button onClick={this.onSaveDescription}>Save</Button>
              <Button onClick={this.onCancelEdit}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="stash-description" onClick={() => this.onEditDescription(stash)}>
            {stash.description || <span className="no-description">Click to add description...</span>}
          </div>
        )}

        <div className="stash-meta">
          <span className="stash-files">{stash.filesChanged} files changed</span>
          <div className="stash-tags">
            {stash.tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button onClick={e => this.onRemoveTag(stash, tag, e)}>
                  <Octicon symbol={octicons.x} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {isSelected && (
          <div className="stash-actions-bar">
            <Button onClick={() => this.props.onApplyStash(stash)}>
              <Octicon symbol={octicons.inbox} />
              Apply
            </Button>
            <Button onClick={() => this.props.onPopStash(stash)}>
              <Octicon symbol={octicons.archive} />
              Pop
            </Button>
            <Button className="danger" onClick={() => this.props.onDropStash(stash)}>
              <Octicon symbol={octicons.trash} />
              Drop
            </Button>
          </div>
        )}
      </div>
    )
  }

  private formatDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor(diff / 60000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  private renderStashList() {
    const { stashes } = this.props

    if (stashes.length === 0) {
      return (
        <div className="stash-empty">
          <Octicon symbol={octicons.inbox} className="empty-icon" />
          <p>No stashes found</p>
          <span>Stash changes to save them for later</span>
        </div>
      )
    }

    return (
      <div className="stash-list">
        {stashes.map(stash => this.renderStashItem(stash))}
      </div>
    )
  }

  public render() {
    return (
      <div className="stash-manager">
        {this.renderHeader()}
        {this.renderStashList()}
        {this.renderTagPopover()}
      </div>
    )
  }
}
