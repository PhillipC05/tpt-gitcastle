import * as React from 'react'
import { Repository } from '../../models/repository'
import {
  IWordPressPluginConfig, WordPressEnvironmentType,
  FTPProtocol,
  getDefaultExcludePatterns,
  validateFTPConfig
} from '../../models/wordpress-deployment'
import {
  WordPressDeploymentStore,
  wordPressDeploymentStore,
} from '../../lib/stores/wordpress-deployment-store'
import { Button } from '../lib/button'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { TextBox } from '../lib/text-box'
import { Checkbox, CheckboxValue } from '../lib/checkbox'

interface IWordPressDeploymentManagerProps {
  readonly repository: Repository
  readonly onDismiss: () => void
}

interface IWordPressDeploymentManagerState {
  readonly config: IWordPressPluginConfig | undefined
  readonly isDeploying: boolean
  readonly progress: number
  readonly message: string
  readonly showAddEnvironment: boolean
  readonly newEnvironmentName: string
  readonly newEnvironmentType: WordPressEnvironmentType
  readonly newEnvironmentSiteUrl: string
  readonly newFtpHost: string
  readonly newFtpPort: number
  readonly newFtpUsername: string
  readonly newFtpPassword: string
  readonly newFtpProtocol: FTPProtocol
  readonly newFtpRemotePath: string
  readonly selectedEnvironmentId: string | null
}

/**
 * WordPress Deployment Manager
 * Configure and deploy WordPress plugins/themes to staging/production via FTP
 */
export class WordPressDeploymentManager extends React.Component<
  IWordPressDeploymentManagerProps,
  IWordPressDeploymentManagerState
> {
  private store: WordPressDeploymentStore = wordPressDeploymentStore

  public constructor(props: IWordPressDeploymentManagerProps) {
    super(props)

    // Initialize config (would need actual file list in real implementation)
    const config = this.store.getConfig(props.repository.id)

    this.state = {
      config,
      isDeploying: this.store.getState().isDeploying,
      progress: this.store.getState().progress,
      message: this.store.getState().message,
      showAddEnvironment: false,
      newEnvironmentName: '',
      newEnvironmentType: 'staging',
      newEnvironmentSiteUrl: '',
      newFtpHost: '',
      newFtpPort: 21,
      newFtpUsername: '',
      newFtpPassword: '',
      newFtpProtocol: 'ftp',
      newFtpRemotePath: '/public_html/wp-content/plugins/',
      selectedEnvironmentId: config?.defaultEnvironmentId || null,
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
      isDeploying: state.isDeploying,
      progress: state.progress,
      message: state.message,
      config,
    })
  }

  private onShowAddEnvironment = () => {
    this.setState({ showAddEnvironment: true })
  }

  private onCancelAddEnvironment = () => {
    this.setState({
      showAddEnvironment: false,
      newEnvironmentName: '',
      newEnvironmentType: 'staging',
      newEnvironmentSiteUrl: '',
      newFtpHost: '',
      newFtpPort: 21,
      newFtpUsername: '',
      newFtpPassword: '',
      newFtpProtocol: 'ftp',
      newFtpRemotePath: '/public_html/wp-content/plugins/',
    })
  }

  private onAddEnvironment = async () => {
    const {
      newEnvironmentName,
      newEnvironmentType,
      newEnvironmentSiteUrl,
      newFtpHost,
      newFtpPort,
      newFtpUsername,
      newFtpPassword,
      newFtpProtocol,
      newFtpRemotePath,
    } = this.state

    if (!newEnvironmentName || !newFtpHost || !newFtpUsername) return

    const ftpConfig = {
      host: newFtpHost,
      port: newFtpPort,
      username: newFtpUsername,
      password: newFtpPassword,
      protocol: newFtpProtocol,
      remotePath: newFtpRemotePath,
    }

    // Validate FTP config
    const validation = validateFTPConfig(ftpConfig)
    if (!validation.valid) {
      alert(`Invalid FTP configuration:\n${validation.errors.join('\n')}`)
      return
    }

    // Test connection first
    const testResult = await this.store.testConnection(ftpConfig)
    if (!testResult.success) {
      alert(`FTP connection failed: ${testResult.message}`)
      return
    }

    this.store.addEnvironment(this.props.repository.id, {
      name: newEnvironmentName,
      type: newEnvironmentType,
      siteUrl: newEnvironmentSiteUrl,
      ftp: ftpConfig,
      isActive: true,
      excludePatterns: getDefaultExcludePatterns(),
    })

    this.onCancelAddEnvironment()
  }

  private onRemoveEnvironment = (environmentId: string) => {
    if (confirm('Are you sure you want to remove this environment?')) {
      this.store.removeEnvironment(this.props.repository.id, environmentId)
    }
  }

  private onSetDefaultEnvironment = (environmentId: string) => {
    this.store.setDefaultEnvironment(this.props.repository.id, environmentId)
    this.setState({ selectedEnvironmentId: environmentId })
  }

  private onToggleEnvironmentActive = (environmentId: string, active: boolean) => {
    this.store.updateEnvironment(this.props.repository.id, environmentId, {
      isActive: active,
    })
  }

  private onDeploy = async (environmentId: string) => {
    try {
      await this.store.deploy(this.props.repository, environmentId)
    } catch (error) {
      console.error('Deployment failed:', error)
      alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private onQuickDeploy = async () => {
    try {
      await this.store.quickDeploy(this.props.repository)
    } catch (error) {
      console.error('Quick deploy failed:', error)
      alert(`Quick deploy failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private onDeployToAll = async () => {
    try {
      await this.store.deployToAll(this.props.repository)
    } catch (error) {
      console.error('Deploy to all failed:', error)
      alert(`Deploy to all failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getEnvironmentIcon(type: WordPressEnvironmentType) {
    switch (type) {
      case 'production':
        return octicons.server
      case 'staging':
        return octicons.beaker
      case 'development':
        return octicons.code
      default:
        return octicons.globe
    }
  }

  private getEnvironmentColor(type: WordPressEnvironmentType): string {
    switch (type) {
      case 'production':
        return '#dc3545' // Red
      case 'staging':
        return '#ffc107' // Yellow
      case 'development':
        return '#28a745' // Green
      default:
        return '#6c757d' // Gray
    }
  }

  public render() {
    const {
      config,
      isDeploying,
      progress,
      message,
      showAddEnvironment,
      newEnvironmentName,
      newEnvironmentType,
      newEnvironmentSiteUrl,
      newFtpHost,
      newFtpPort,
      newFtpUsername,
      newFtpPassword,
      newFtpProtocol,
      newFtpRemotePath,
      selectedEnvironmentId,
    } = this.state

    const environments = config?.environments || []
    const hasDefaultEnvironment = config?.defaultEnvironmentId !== undefined
    const activeEnvironments = environments.filter(e => e.isActive)

    return (
      <Dialog
        title="WordPress Deployment"
        onDismissed={this.props.onDismiss}
        onSubmit={this.props.onDismiss}
      >
        <DialogContent>
          <div className="wordpress-deployment-manager">
            {/* Deployment Progress */}
            {isDeploying && (
              <div className="deployment-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-message">{message}</span>
              </div>
            )}

            {/* Quick Deploy Section */}
            {hasDefaultEnvironment && !isDeploying && (
              <div className="quick-deploy-section">
                <Button
                  className="quick-deploy-button"
                  onClick={this.onQuickDeploy}
                  disabled={isDeploying}
                >
                  <Octicon symbol={octicons.rocket} />
                  Quick Deploy to {environments.find(e => e.id === config?.defaultEnvironmentId)?.name}
                </Button>
              </div>
            )}

            {/* Environments List */}
            <div className="environments-section">
              <div className="section-header">
                <h3>Environments</h3>
                <Button onClick={this.onShowAddEnvironment}>
                  <Octicon symbol={octicons.plus} /> Add Environment
                </Button>
              </div>

              {/* Add Environment Form */}
              {showAddEnvironment && (
                <div className="add-environment-form">
                  <h4>New Environment</h4>
                  
                  <TextBox
                    label="Environment Name"
                    placeholder="e.g., Staging, Production"
                    value={newEnvironmentName}
                    onValueChanged={value => this.setState({ newEnvironmentName: value })}
                  />

                  <div className="form-row">
                    <label>Environment Type</label>
                    <select
                      value={newEnvironmentType}
                      onChange={e => this.setState({ newEnvironmentType: e.target.value as WordPressEnvironmentType })}
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <TextBox
                    label="Site URL"
                    placeholder="https://staging.example.com"
                    value={newEnvironmentSiteUrl}
                    onValueChanged={value => this.setState({ newEnvironmentSiteUrl: value })}
                  />

                  <h4>FTP Configuration</h4>

                  <div className="form-row">
                    <label>Protocol</label>
                    <select
                      value={newFtpProtocol}
                      onChange={e => this.setState({ newFtpProtocol: e.target.value as FTPProtocol })}
                    >
                      <option value="ftp">FTP</option>
                      <option value="sftp">SFTP</option>
                      <option value="ftps">FTPS</option>
                    </select>
                  </div>

                  <div className="form-row two-columns">
                    <TextBox
                      label="Host"
                      placeholder="ftp.example.com"
                      value={newFtpHost}
                      onValueChanged={value => this.setState({ newFtpHost: value })}
                    />
                    <TextBox
                      label="Port"
                      value={newFtpPort.toString()}
                      onValueChanged={value => this.setState({ newFtpPort: parseInt(value) || 21 })}
                    />

                  </div>

                  <TextBox
                    label="Username"
                    value={newFtpUsername}
                    onValueChanged={value => this.setState({ newFtpUsername: value })}
                  />

                  <TextBox
                    label="Password"
                    type="password"
                    value={newFtpPassword}
                    onValueChanged={value => this.setState({ newFtpPassword: value })}
                  />

                  <TextBox
                    label="Remote Path"
                    placeholder="/public_html/wp-content/plugins/my-plugin"
                    value={newFtpRemotePath}
                    onValueChanged={value => this.setState({ newFtpRemotePath: value })}
                  />

                  <div className="form-actions">
                    <Button onClick={this.onCancelAddEnvironment}>Cancel</Button>
                    <Button
                      onClick={this.onAddEnvironment}
                      disabled={!newEnvironmentName || !newFtpHost || !newFtpUsername}
                    >
                      Add Environment
                    </Button>
                  </div>
                </div>
              )}

              {/* Environments List */}
              {environments.length === 0 ? (
                <div className="no-environments">
                  No environments configured. Add a staging or production environment to get started.
                </div>
              ) : (
                <div className="environments-list">
                  {environments.map(env => {
                    const isDefault = env.id === config?.defaultEnvironmentId
                    const isSelected = env.id === selectedEnvironmentId

                    return (
                      <div
                        key={env.id}
                        className={`environment-card ${isSelected ? 'selected' : ''} ${env.type}`}
                        onClick={() => this.setState({ selectedEnvironmentId: env.id })}
                      >
                        <div className="environment-header">
                          <span className={`environment-icon ${env.type}`}>
                            <Octicon symbol={this.getEnvironmentIcon(env.type)} />
                          </span>

                          <div className="environment-info">
                            <div className="environment-name">
                              {env.name}
                              {isDefault && <span className="default-badge">Default</span>}
                            </div>
                            <div className="environment-type">{env.type}</div>
                            {env.siteUrl && (
                              <div className="environment-url">{env.siteUrl}</div>
                            )}
                          </div>
                          <Checkbox
                            label="Active"
                            value={env.isActive ? CheckboxValue.On : CheckboxValue.Off}
                            onChange={(e) => this.onToggleEnvironmentActive(env.id, (e.target as HTMLInputElement).checked)}
                          />
                        </div>

                        {isSelected && (
                          <div className="environment-details">
                            <div className="ftp-info">
                              <div className="info-row">
                                <span className="label">Host:</span>
                                <span className="value">{env.ftp.host}:{env.ftp.port}</span>
                              </div>
                              <div className="info-row">
                                <span className="label">Protocol:</span>
                                <span className="value">{env.ftp.protocol.toUpperCase()}</span>
                              </div>
                              <div className="info-row">
                                <span className="label">Remote Path:</span>
                                <span className="value">{env.ftp.remotePath}</span>
                              </div>
                            </div>

                            {env.lastDeployedAt && (
                              <div className="last-deployment">
                                <div className="info-row">
                                  <span className="label">Last Deployed:</span>
                                  <span className="value">
                                    {env.lastDeployedAt.toLocaleString()}
                                  </span>
                                </div>
                                <div className={`status-badge ${env.lastDeploymentStatus}`}>
                                  {env.lastDeploymentStatus}
                                </div>
                              </div>
                            )}

                            <div className="environment-actions">
                              {!isDefault && (
                                <Button onClick={() => this.onSetDefaultEnvironment(env.id)}>
                                  Set as Default
                                </Button>
                              )}
                              <Button
                                onClick={() => this.onDeploy(env.id)}
                                disabled={isDeploying || !env.isActive}
                              >
                                {isDeploying ? 'Deploying...' : 'Deploy Now'}
                              </Button>
                              <Button onClick={() => this.onRemoveEnvironment(env.id)}>
                                <Octicon symbol={octicons.x} />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button onClick={this.props.onDismiss}>Close</Button>
          {activeEnvironments.length > 1 && (
            <Button
              onClick={this.onDeployToAll}
              disabled={isDeploying}
            >
              Deploy to All Active
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    )
  }
}
