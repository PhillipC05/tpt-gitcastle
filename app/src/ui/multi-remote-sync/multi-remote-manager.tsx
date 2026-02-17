import * as React from 'react'
import { Repository } from '../../models/repository'
import { Account } from '../../models/account'
import {
  MultiRemoteSyncStore,
  IRemoteConfig,
  ISyncResult,
  multiRemoteSyncStore,
} from '../../lib/stores/multi-remote-sync-store'
import { Button } from '../lib/button'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { TextBox } from '../lib/text-box'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { List } from '../lib/list'


interface IMultiRemoteManagerProps {
  readonly repository: Repository
  readonly accounts: ReadonlyArray<Account>
  readonly onDismiss: () => void
}

interface IMultiRemoteManagerState {
  readonly remotes: ReadonlyArray<IRemoteConfig>
  readonly primaryRemote: string
  readonly autoSyncAll: boolean
  readonly isSyncing: boolean
  readonly syncProgress: number
  readonly syncMessage: string
  readonly lastResults: ReadonlyArray<ISyncResult>
  readonly showAddRemote: boolean
  readonly newRemoteName: string
  readonly newRemoteUrl: string
  readonly newRemoteAccount: string
}

/**
 * Multi-Remote Sync Manager
 * Allows users to configure and sync multiple remotes for a repository
 */
export class MultiRemoteManager extends React.Component<
  IMultiRemoteManagerProps,
  IMultiRemoteManagerState
> {
  private store: MultiRemoteSyncStore = multiRemoteSyncStore

  public constructor(props: IMultiRemoteManagerProps) {
    super(props)

    // Initialize config if needed
    this.store.initializeFromRepository(props.repository, props.accounts)

    const config = this.store.getConfig(props.repository.id)
    const state = this.store.getState()

    this.state = {
      remotes: config?.remotes || [],
      primaryRemote: config?.primaryRemote || '',
      autoSyncAll: config?.autoSyncAll || false,
      isSyncing: state.isSyncing,
      syncProgress: state.progress,
      syncMessage: state.message,
      lastResults: state.lastResults,
      showAddRemote: false,
      newRemoteName: '',
      newRemoteUrl: '',
      newRemoteAccount: '',
    }
  }

  public componentDidMount(): void {
    this.store.onDidUpdate(this.onStoreUpdate)
  }

  public componentWillUnmount(): void {
    // Store unsubscribe handled by TypedBaseStore
  }


  private onStoreUpdate = (state: ReturnType<typeof this.store.getState>) => {
    const config = this.store.getConfig(this.props.repository.id)
    this.setState({
      isSyncing: state.isSyncing,
      syncProgress: state.progress,
      syncMessage: state.message,
      lastResults: state.lastResults,
      remotes: config?.remotes || this.state.remotes,
      primaryRemote: config?.primaryRemote || this.state.primaryRemote,
      autoSyncAll: config?.autoSyncAll || this.state.autoSyncAll,
    })
  }

  private onToggleRemote = (remoteName: string, enabled: boolean) => {
    this.store.updateRemote(this.props.repository.id, remoteName, { enabled })
  }

  private onSetPrimary = (remoteName: string) => {
    this.store.setPrimaryRemote(this.props.repository.id, remoteName)
  }

  private onToggleAutoSync = (value: CheckboxValue) => {
    this.store.setAutoSyncAll(
      this.props.repository.id,
      value === CheckboxValue.On
    )
  }

  private onSyncAll = async () => {
    try {
      await this.store.syncRepository(this.props.repository, {
        push: true,
        pull: true,
      })
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  private onSyncPushOnly = async () => {
    try {
      await this.store.syncRepository(this.props.repository, {
        push: true,
        pull: false,
      })
    } catch (error) {
      console.error('Push failed:', error)
    }
  }

  private onShowAddRemote = () => {
    this.setState({ showAddRemote: true })
  }

  private onCancelAddRemote = () => {
    this.setState({
      showAddRemote: false,
      newRemoteName: '',
      newRemoteUrl: '',
      newRemoteAccount: '',
    })
  }

  private onAddRemote = () => {
    const { newRemoteName, newRemoteUrl, newRemoteAccount } = this.state

    if (!newRemoteName || !newRemoteUrl) return

    const account = this.props.accounts.find(a => a.accountId === newRemoteAccount)
    const provider = account?.provider || 'other'

    this.store.addRemote(this.props.repository.id, {
      name: newRemoteName,
      url: newRemoteUrl,
      accountId: newRemoteAccount,
      provider,
      enabled: true,
    })

    this.onCancelAddRemote()
  }

  private onRemoveRemote = (remoteName: string) => {
    this.store.removeRemote(this.props.repository.id, remoteName)
  }

  private renderRemoteRow = (row: number): JSX.Element => {
    const remote = this.state.remotes[row]
    const isPrimary = remote.name === this.state.primaryRemote
    const account = this.props.accounts.find(a => a.accountId === remote.accountId)

    return (
      <div key={remote.name} className="remote-list-item">

        <div className="remote-info">
          <Checkbox
            label=""
            value={remote.enabled ? CheckboxValue.On : CheckboxValue.Off}
            onChange={(event) => this.onToggleRemote(remote.name, (event.target as HTMLInputElement).checked)}
          />

          <div className="remote-details">
            <div className="remote-name-row">
              <span className="remote-name">{remote.name}</span>
              {isPrimary && (
                <span className="primary-badge">Primary</span>
              )}
            </div>
            <div className="remote-url" title={remote.url}>
              {remote.url}
            </div>
            {account && (
              <div className="remote-account">
                Account: {account.displayName} ({account.provider})
              </div>
            )}
          </div>
        </div>
        <div className="remote-actions">
          {!isPrimary && (
            <Button onClick={() => this.onSetPrimary(remote.name)}>
              Set Primary
            </Button>
          )}
          <Button onClick={() => this.onRemoveRemote(remote.name)}>
            <Octicon symbol={octicons.x} />
          </Button>

        </div>
      </div>
    )
  }


  public render() {
    const {
      remotes,
      primaryRemote,
      autoSyncAll,
      isSyncing,
      syncProgress,
      syncMessage,
      lastResults,
      showAddRemote,
      newRemoteName,
      newRemoteUrl,
    } = this.state

    return (
      <Dialog
        title="Multi-Remote Sync"
        onDismissed={this.props.onDismiss}
        onSubmit={this.props.onDismiss}
      >
        <DialogContent>
          <div className="multi-remote-manager">
            <div className="sync-status">
              {isSyncing ? (
                <div className="sync-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                  <span className="progress-message">{syncMessage}</span>
                </div>
              ) : lastResults.length > 0 ? (
                <div className="last-sync-results">
                  <h3>Last Sync Results</h3>
                  {lastResults.map(result => (
                    <div
                      key={result.remote}
                      className={`sync-result ${result.success ? 'success' : 'error'}`}
                    >
                      <Octicon
                        symbol={result.success ? octicons.check : octicons.x}
                      />
                      <span className="result-remote">{result.remote}</span>
                      {result.success ? (
                        <span className="result-details">
                          {result.commitsPushed || 0} pushed,{' '}
                          {result.commitsPulled || 0} pulled
                        </span>
                      ) : (
                        <span className="result-error">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="remotes-section">
              <div className="section-header">
                <h3>Configured Remotes</h3>
                <Button onClick={this.onShowAddRemote}>
                  <Octicon symbol={octicons.plus} /> Add Remote
                </Button>
              </div>

              {showAddRemote && (
                <div className="add-remote-form">
                  <TextBox
                    label="Remote Name"
                    placeholder="e.g., github, gitcastle"
                    value={newRemoteName}
                    onValueChanged={value => this.setState({ newRemoteName: value })}
                  />
                  <TextBox
                    label="Remote URL"
                    placeholder="https://..."
                    value={newRemoteUrl}
                    onValueChanged={value => this.setState({ newRemoteUrl: value })}
                  />
                  <div className="account-selector">
                    <label>Associated Account (optional)</label>
                    <select
                      value={this.state.newRemoteAccount}
                      onChange={e => this.setState({ newRemoteAccount: e.target.value })}
                    >
                      <option value="">-- Select Account --</option>
                      {this.props.accounts.map(account => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.displayName} ({account.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-actions">
                    <Button onClick={this.onCancelAddRemote}>Cancel</Button>
                    <Button onClick={this.onAddRemote} disabled={!newRemoteName || !newRemoteUrl}>
                      Add Remote
                    </Button>
                  </div>
                </div>
              )}

              {remotes.length === 0 ? (
                <div className="no-remotes">
                  No remotes configured. Add a remote to get started.
                </div>
              ) : (
                <List
                  rowCount={remotes.length}
                  rowRenderer={this.renderRemoteRow}
                  rowHeight={80}
                  selectedRows={[]}
                />
              )}
            </div>

            <div className="sync-options">
              <Checkbox
                label="Automatically sync all enabled remotes"
                value={autoSyncAll ? CheckboxValue.On : CheckboxValue.Off}
                onChange={(event) => this.onToggleAutoSync((event.target as HTMLInputElement).checked ? CheckboxValue.On : CheckboxValue.Off)}
              />
            </div>

          </div>
        </DialogContent>

        <DialogFooter>
          <Button onClick={this.props.onDismiss}>Close</Button>
          <Button
            onClick={this.onSyncPushOnly}
            disabled={isSyncing || remotes.filter(r => r.enabled).length === 0}
          >
            Push Only
          </Button>
          <Button
            onClick={this.onSyncAll}
            disabled={isSyncing || remotes.filter(r => r.enabled).length === 0}
          >
            {isSyncing ? 'Syncing...' : 'Sync All Remotes'}
          </Button>
        </DialogFooter>
      </Dialog>
    )
  }
}
