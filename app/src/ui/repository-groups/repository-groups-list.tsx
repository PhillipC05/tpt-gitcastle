import * as React from 'react'
import { RepositoryGroup } from '../../models/repository-group'
import { Repository } from '../../models/repository'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { TextBox } from '../lib/text-box'

interface IRepositoryGroupsListProps {
  /** All repository groups */
  readonly groups: ReadonlyArray<RepositoryGroup>
  /** All repositories */
  readonly repositories: ReadonlyArray<Repository>
  /** Currently selected repository */
  readonly selectedRepository: Repository | null
  /** Currently selected group (for filtering) */
  readonly selectedGroupId: string | null
  /** Called when a repository is selected */
  readonly onSelectRepository: (repository: Repository) => void
  /** Called when a group is selected (for filtering) */
  readonly onSelectGroup: (groupId: string | null) => void
  /** Called when a new group should be created */
  readonly onCreateGroup: (name: string) => void
  /** Called when a group should be renamed */
  readonly onRenameGroup: (groupId: string, name: string) => void
  /** Called when a group should be deleted */
  readonly onDeleteGroup: (groupId: string) => void
  /** Called when a group should be toggled (collapsed/expanded) */
  readonly onToggleGroup: (groupId: string) => void
  /** Called when a repository should be moved to a group */
  readonly onMoveRepositoryToGroup: (repository: Repository, groupId: string | null) => void
  /** Called when group order should change (drag and drop) */
  readonly onReorderGroup: (groupId: string, newOrder: number) => void
}

interface IRepositoryGroupsListState {
  readonly isCreatingGroup: boolean
  readonly newGroupName: string
  readonly editingGroupId: string | null
  readonly editingGroupName: string
  readonly draggingGroupId: string | null
  readonly dragOverGroupId: string | null
  readonly showContextMenu: boolean
  readonly contextMenuGroupId: string | null
}

/**
 * Sidebar component for repository groups
 */
export class RepositoryGroupsList extends React.Component<
  IRepositoryGroupsListProps,
  IRepositoryGroupsListState
> {
  public state: IRepositoryGroupsListState = {
    isCreatingGroup: false,
    newGroupName: '',
    editingGroupId: null,
    editingGroupName: '',
    draggingGroupId: null,
    dragOverGroupId: null,
    showContextMenu: false,
    contextMenuGroupId: null,
  }

  private newGroupInputRef = React.createRef<TextBox>()
  private editGroupInputRef = React.createRef<TextBox>()

  public componentDidUpdate(prevProps: IRepositoryGroupsListProps) {
    if (this.state.isCreatingGroup && !prevProps.groups.length) {
      this.newGroupInputRef.current?.focus()
    }
  }

  private onCreateGroupClick = () => {
    this.setState({ isCreatingGroup: true, newGroupName: '' }, () => {
      this.newGroupInputRef.current?.focus()
    })
  }

  private onNewGroupNameChange = (value: string) => {
    this.setState({ newGroupName: value })
  }

  private onNewGroupSubmit = () => {
    const { newGroupName } = this.state
    if (newGroupName.trim()) {
      this.props.onCreateGroup(newGroupName.trim())
    }
    this.setState({ isCreatingGroup: false, newGroupName: '' })
  }

  private onNewGroupCancel = () => {
    this.setState({ isCreatingGroup: false, newGroupName: '' })
  }

  private onEditGroupNameChange = (value: string) => {
    this.setState({ editingGroupName: value })
  }

  private onEditGroupSubmit = () => {
    const { editingGroupId, editingGroupName } = this.state
    if (editingGroupId && editingGroupName.trim()) {
      this.props.onRenameGroup(editingGroupId, editingGroupName.trim())
    }
    this.setState({ editingGroupId: null, editingGroupName: '' })
  }

  private onEditGroupCancel = () => {
    this.setState({ editingGroupId: null, editingGroupName: '' })
  }

  private onRenameGroupClick = (groupId: string, groupName: string) => {
    this.setState({
      editingGroupId: groupId,
      editingGroupName: groupName,
    })
  }

  private onDeleteGroupClick = (groupId: string) => {
    this.props.onDeleteGroup(groupId)
  }

  private onDragStart = (e: React.DragEvent, groupId: string) => {
    this.setState({ draggingGroupId: groupId })
    e.dataTransfer.effectAllowed = 'move'
  }

  private onDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    if (this.state.draggingGroupId !== groupId) {
      this.setState({ dragOverGroupId: groupId })
    }
  }

  private onDragLeave = () => {
    this.setState({ dragOverGroupId: null })
  }

  private onDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    const { draggingGroupId } = this.state
    if (draggingGroupId && draggingGroupId !== targetGroupId) {
      const targetGroup = this.props.groups.find(g => g.id === targetGroupId)
      if (targetGroup) {
        this.props.onReorderGroup(draggingGroupId, targetGroup.order)
      }
    }
    this.setState({ draggingGroupId: null, dragOverGroupId: null })
  }

  private onDragEnd = () => {
    this.setState({ draggingGroupId: null, dragOverGroupId: null })
  }

  private renderGroupHeader(group: RepositoryGroup) {
    const { editingGroupId, editingGroupName } = this.state

    if (editingGroupId === group.id) {
      return (
        <div className="group-header editing">
          <TextBox
            ref={this.editGroupInputRef}
            value={editingGroupName}
            onValueChanged={this.onEditGroupNameChange}
            onEnterPressed={this.onEditGroupSubmit}
            onBlur={this.onEditGroupCancel}
          />
        </div>
      )
    }

    return (
      <div
        className="group-header"
        draggable
        onDragStart={e => this.onDragStart(e, group.id)}
        onDragOver={e => this.onDragOver(e, group.id)}
        onDragLeave={this.onDragLeave}
        onDrop={e => this.onDrop(e, group.id)}
        onDragEnd={this.onDragEnd}
      >
        <span
          className="group-color-indicator"
          style={{ backgroundColor: group.color }}
        />
        <span className="group-name">{group.name}</span>
        <span className="group-count">({group.repositoryIds.length})</span>
        <div className="group-actions">
          <Button
            className="group-action rename"
            onClick={() => this.onRenameGroupClick(group.id, group.name)}
          >
            <Octicon symbol={octicons.pencil} />
          </Button>
          <Button
            className="group-action delete"
            onClick={() => this.onDeleteGroupClick(group.id)}
          >
            <Octicon symbol={octicons.trash} />
          </Button>
          <Button
            className="group-toggle"
            onClick={() => this.props.onToggleGroup(group.id)}
          >
            <Octicon
              symbol={group.isCollapsed ? octicons.chevronRight : octicons.chevronDown}
            />
          </Button>
        </div>
      </div>
    )
  }

  private renderRepositoriesInGroup(group: RepositoryGroup) {
    if (group.isCollapsed) return null

    const { repositories, selectedRepository, selectedGroupId } = this.props

    const groupRepositories = repositories.filter(r =>
      group.repositoryIds.includes(r.id)
    )

    if (groupRepositories.length === 0) {
      return (
        <div className="group-empty">
          <span>Drag repositories here</span>
        </div>
      )
    }

    return groupRepositories.map(repository => (
      <div
        key={repository.id}
        className={`repository-item ${
          selectedRepository?.id === repository.id ? 'selected' : ''
        } ${selectedGroupId === group.id ? 'filtered' : ''}`}
        onClick={() => this.props.onSelectRepository(repository)}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('repository-id', repository.id.toString())
        }}
      >
        <Octicon symbol={octicons.repo} />
        <span className="repository-name">{repository.name}</span>
      </div>
    ))
  }

  private renderUngroupedRepositories() {
    const { groups, repositories, selectedRepository } = this.props

    const groupedIds = new Set(
      groups.flatMap(g => Array.from(g.repositoryIds))
    )
    const ungrouped = repositories.filter(r => !groupedIds.has(r.id))

    if (ungrouped.length === 0) return null

    return (
      <div className="repository-group ungrouped">
        <div className="group-header">
          <span className="group-name">Ungrouped</span>
          <span className="group-count">({ungrouped.length})</span>
        </div>
        {ungrouped.map(repository => (
          <div
            key={repository.id}
            className={`repository-item ${
              selectedRepository?.id === repository.id ? 'selected' : ''
            }`}
            onClick={() => this.props.onSelectRepository(repository)}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('repository-id', repository.id.toString())
            }}
          >
            <Octicon symbol={octicons.repo} />
            <span className="repository-name">{repository.name}</span>
          </div>
        ))}
      </div>
    )
  }

  private renderNewGroupInput() {
    if (!this.state.isCreatingGroup) {
      return (
        <Button
          className="create-group-button"
          onClick={this.onCreateGroupClick}
        >
          <Octicon symbol={octicons.plus} />
          <span>New Group</span>
        </Button>
      )
    }

    return (
      <div className="new-group-input">
        <TextBox
          ref={this.newGroupInputRef}
          value={this.state.newGroupName}
          placeholder="Group name"
          onValueChanged={this.onNewGroupNameChange}
          onEnterPressed={this.onNewGroupSubmit}
          onBlur={this.onNewGroupCancel}
        />
      </div>
    )
  }

  public render() {
    const { groups } = this.props
    const { dragOverGroupId } = this.state

    return (
      <div className="repository-groups-list">
        <div className="groups-header">
          <h3>Repository Groups</h3>
        </div>

        <div className="groups-list">
          {groups.map(group => (
            <div
              key={group.id}
              className={`repository-group ${
                dragOverGroupId === group.id ? 'drag-over' : ''
              }`}
              onDragOver={e => {
                e.preventDefault()
                const repositoryId = e.dataTransfer.getData('repository-id')
                if (repositoryId) {
                  this.setState({ dragOverGroupId: group.id })
                }
              }}
              onDrop={e => {
                e.preventDefault()
                const repositoryId = parseInt(
                  e.dataTransfer.getData('repository-id'),
                  10
                )
                if (!isNaN(repositoryId)) {
                  this.props.onMoveRepositoryToGroup(
                    { id: repositoryId } as Repository,
                    group.id
                  )
                }
                this.setState({ dragOverGroupId: null })
              }}
            >
              {this.renderGroupHeader(group)}
              <div className="group-repositories">
                {this.renderRepositoriesInGroup(group)}
              </div>
            </div>
          ))}

          {this.renderUngroupedRepositories()}
        </div>

        {this.renderNewGroupInput()}
      </div>
    )
  }
}
