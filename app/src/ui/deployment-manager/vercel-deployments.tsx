import * as React from 'react'
import {
  VercelProvider,
  IVercelProject,
  IVercelDeployment,
  VercelDeploymentStatus,
} from '../../lib/providers/vercel-provider'
import { Account } from '../../models/account'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Loading } from '../lib/loading'

interface IVercelDeploymentsProps {
  /** Vercel account */
  readonly account: Account
  /** Access token */
  readonly token: string
  /** Vercel provider instance */
  readonly provider: VercelProvider
}

interface IVercelDeploymentsState {
  readonly projects: ReadonlyArray<IVercelProject>
  readonly selectedProject: IVercelProject | null
  readonly deployments: ReadonlyArray<IVercelDeployment>
  readonly isLoading: boolean
  readonly error: string | null
}

/**
 * Vercel Deployments Manager
 * View and manage Vercel projects and deployments
 */
export class VercelDeployments extends React.Component<
  IVercelDeploymentsProps,
  IVercelDeploymentsState
> {
  public state: IVercelDeploymentsState = {
    projects: [],
    selectedProject: null,
    deployments: [],
    isLoading: false,
    error: null,
  }

  public async componentDidMount() {
    await this.loadProjects()
  }

  private loadProjects = async () => {
    const { provider, token } = this.props

    this.setState({ isLoading: true, error: null })

    try {
      const projects = await provider.getProjects(token)
      this.setState({ projects, isLoading: false })
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        isLoading: false,
      })
    }
  }

  private onSelectProject = async (project: IVercelProject) => {
    const { provider, token } = this.props

    this.setState({ selectedProject: project, isLoading: true, error: null })

    try {
      const deployments = await provider.getDeployments(token, project.id, 10)
      this.setState({ deployments, isLoading: false })
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load deployments',
        isLoading: false,
      })
    }
  }

  private onDeploy = async () => {
    const { provider, token } = this.props
    const { selectedProject } = this.state

    if (!selectedProject) return

    this.setState({ isLoading: true })

    try {
      await provider.deploy(token, selectedProject.id, 'main')
      // Reload deployments
      const deployments = await provider.getDeployments(token, selectedProject.id, 10)
      this.setState({ deployments, isLoading: false })
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Deployment failed',
        isLoading: false,
      })
    }
  }

  private getStatusIcon(status: VercelDeploymentStatus) {
    switch (status) {
      case VercelDeploymentStatus.Ready:
        return octicons.check
      case VercelDeploymentStatus.Building:
        return octicons.sync
      case VercelDeploymentStatus.Error:
        return octicons.x
      case VercelDeploymentStatus.Canceled:
        return octicons.stop
      case VercelDeploymentStatus.Queued:
        return octicons.clock
      default:
        return octicons.question
    }
  }

  private getStatusClass(status: VercelDeploymentStatus) {
    switch (status) {
      case VercelDeploymentStatus.Ready:
        return 'success'
      case VercelDeploymentStatus.Building:
        return 'building'
      case VercelDeploymentStatus.Error:
        return 'error'
      case VercelDeploymentStatus.Canceled:
        return 'canceled'
      case VercelDeploymentStatus.Queued:
        return 'queued'
      default:
        return 'unknown'
    }
  }

  private renderProjectsList() {
    const { projects, selectedProject } = this.state

    if (projects.length === 0) {
      return (
        <div className="empty-state">
          <Octicon symbol={octicons.globe} className="empty-icon" />
          <p>No Vercel projects found</p>
        </div>
      )
    }

    return (
      <div className="projects-list">
        <h3>Projects</h3>
        {projects.map(project => (
          <div
            key={project.id}
            className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
            onClick={() => this.onSelectProject(project)}
          >
            <div className="project-icon">
              <Octicon symbol={octicons.globe} />
            </div>
            <div className="project-info">
              <span className="project-name">{project.name}</span>
              <span className="project-framework">{project.framework || 'Static'}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  private renderDeployments() {
    const { deployments, selectedProject, isLoading } = this.state

    if (!selectedProject) {
      return (
        <div className="empty-state">
          <p>Select a project to view deployments</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="loading-state">
          <Loading />
          <span>Loading deployments...</span>
        </div>
      )
    }

    if (deployments.length === 0) {
      return (
        <div className="empty-state">
          <Octicon symbol={octicons.rocket} className="empty-icon" />
          <p>No deployments yet</p>
          <Button onClick={this.onDeploy}>
            <Octicon symbol={octicons.rocket} />
            Deploy Now
          </Button>
        </div>
      )
    }

    return (
      <div className="deployments-list">
        <div className="deployments-header">
          <h3>Deployments for {selectedProject.name}</h3>
          <Button onClick={this.onDeploy} disabled={isLoading}>
            <Octicon symbol={octicons.rocket} />
            Deploy
          </Button>
        </div>
        {deployments.map(deployment => (
          <div key={deployment.id} className="deployment-item">
            <div className={`deployment-status ${this.getStatusClass(deployment.status)}`}>
              <Octicon symbol={this.getStatusIcon(deployment.status)} />
            </div>
            <div className="deployment-info">
              <a
                href={`https://${deployment.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="deployment-url"
              >
                {deployment.url}
                <Octicon symbol={octicons.linkExternal} />
              </a>
              <div className="deployment-meta">
                <span className="deployment-source">{deployment.source}</span>
                <span className="deployment-date">
                  {new Date(deployment.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  public render() {
    const { error } = this.state

    return (
      <div className="vercel-deployments">
        <div className="deployments-header">
          <h2>
            <Octicon symbol={octicons.globe} />
            Vercel Deployments
          </h2>
        </div>

        {error && (
          <div className="error-banner">
            <Octicon symbol={octicons.alert} />
            {error}
          </div>
        )}

        <div className="deployments-content">
          <div className="projects-panel">{this.renderProjectsList()}</div>
          <div className="deployments-panel">{this.renderDeployments()}</div>
        </div>
      </div>
    )
  }
}
