import * as React from 'react'
import {
  SupabaseProvider,
  ISupabaseProject,
  ISupabaseTable,
  ISupabaseBucket,
  ISupabaseFunction,
} from '../../lib/providers/supabase-provider'
import { Account } from '../../models/account'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'
import { Loading } from '../lib/loading'

interface ISupabaseManagerProps {
  readonly account: Account
  readonly token: string
  readonly provider: SupabaseProvider
}

interface ISupabaseManagerState {
  readonly projects: ReadonlyArray<ISupabaseProject>
  readonly selectedProject: ISupabaseProject | null
  readonly tables: ReadonlyArray<ISupabaseTable>
  readonly buckets: ReadonlyArray<ISupabaseBucket>
  readonly functions: ReadonlyArray<ISupabaseFunction>
  readonly isLoading: boolean
  readonly error: string | null
  readonly activeTab: 'database' | 'storage' | 'functions' | 'auth'
  readonly sqlQuery: string
  readonly queryResult: any | null
}

export class SupabaseManager extends React.Component<
  ISupabaseManagerProps,
  ISupabaseManagerState
> {
  public state: ISupabaseManagerState = {
    projects: [],
    selectedProject: null,
    tables: [],
    buckets: [],
    functions: [],
    isLoading: false,
    error: null,
    activeTab: 'database',
    sqlQuery: '',
    queryResult: null,
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

  private onSelectProject = async (project: ISupabaseProject) => {
    this.setState({ selectedProject: project, isLoading: true, error: null })
    await this.loadProjectData(project)
  }

  private loadProjectData = async (project: ISupabaseProject) => {
    const { provider, token } = this.props
    const { activeTab } = this.state

    try {
      let tables: ReadonlyArray<ISupabaseTable> = []
      let buckets: ReadonlyArray<ISupabaseBucket> = []
      let functions: ReadonlyArray<ISupabaseFunction> = []

      if (activeTab === 'database') {
        tables = await provider.getTables(token, project.ref)
      } else if (activeTab === 'storage') {
        buckets = await provider.getBuckets(token, project.ref)
      } else if (activeTab === 'functions') {
        functions = await provider.getFunctions(token, project.ref)
      }

      this.setState({ tables, buckets, functions, isLoading: false })
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load project data',
        isLoading: false,
      })
    }
  }

  private onTabChange = (tab: 'database' | 'storage' | 'functions' | 'auth') => {
    this.setState({ activeTab: tab }, () => {
      const { selectedProject } = this.state
      if (selectedProject) {
        this.loadProjectData(selectedProject)
      }
    })
  }

  private onExecuteQuery = async () => {
    const { provider, token } = this.props
    const { selectedProject, sqlQuery } = this.state

    if (!selectedProject || !sqlQuery.trim()) return

    this.setState({ isLoading: true, error: null })

    try {
      const result = await provider.executeQuery(token, selectedProject.ref, sqlQuery)
      this.setState({ queryResult: result, isLoading: false })
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Query execution failed',
        isLoading: false,
      })
    }
  }

  private renderProjectsList() {
    const { projects, selectedProject } = this.state

    if (projects.length === 0) {
      return (
        <div className="empty-state">
          <Octicon symbol={octicons.database} className="empty-icon" />
          <p>No Supabase projects found</p>
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
              <Octicon symbol={octicons.database} />
            </div>
            <div className="project-info">
              <span className="project-name">{project.name}</span>
              <span className="project-region">{project.region}</span>
              <span className={`project-status ${project.status.toLowerCase()}`}>
                {project.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  private renderDatabaseTab() {
    const { tables, selectedProject, sqlQuery, queryResult, isLoading } = this.state

    if (!selectedProject) {
      return (
        <div className="empty-state">
          <p>Select a project to view database</p>
        </div>
      )
    }

    return (
      <div className="database-panel">
        <div className="tables-section">
          <h4>Tables</h4>
          {tables.length === 0 ? (
            <p>No tables found</p>
          ) : (
            <div className="tables-list">
              {tables.map(table => (
                <div key={table.id} className="table-item">
                  <Octicon symbol={octicons.table} />
                  <span className="table-name">{table.name}</span>
                  <span className="table-schema">{table.schema}</span>
                  <span className="table-rows">{table.rowCount.toLocaleString()} rows</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sql-section">
          <h4>SQL Editor</h4>
          <textarea
            value={sqlQuery}
            onChange={e => this.setState({ sqlQuery: e.target.value })}
            placeholder="Enter SQL query..."
            rows={5}
            className="sql-textarea"
          />
          <Button onClick={this.onExecuteQuery} disabled={isLoading || !sqlQuery.trim()}>
            {isLoading ? <Loading /> : <Octicon symbol={octicons.play} />}
            Execute Query
          </Button>

          {queryResult && (
            <div className="query-result">
              <h5>Result</h5>
              <pre>{JSON.stringify(queryResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  private renderStorageTab() {
    const { buckets, selectedProject } = this.state

    if (!selectedProject) {
      return (
        <div className="empty-state">
          <p>Select a project to view storage</p>
        </div>
      )
    }

    if (buckets.length === 0) {
      return (
        <div className="empty-state">
          <Octicon symbol={octicons.fileDirectory} className="empty-icon" />
          <p>No storage buckets found</p>
        </div>
      )
    }

    return (
      <div className="storage-panel">
        <h4>Storage Buckets</h4>
        <div className="buckets-list">
          {buckets.map(bucket => (
            <div key={bucket.id} className="bucket-item">
              <div className="bucket-icon">
                <Octicon symbol={octicons.fileDirectory} />
              </div>
              <div className="bucket-info">
                <span className="bucket-name">{bucket.name}</span>
                <span className={`bucket-visibility ${bucket.public ? 'public' : 'private'}`}>
                  {bucket.public ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  private renderFunctionsTab() {
    const { functions, selectedProject } = this.state

    if (!selectedProject) {
      return (
        <div className="empty-state">
          <p>Select a project to view functions</p>
        </div>
      )
    }

    if (functions.length === 0) {
      return (
        <div className="empty-state">
          <Octicon symbol={octicons.code} className="empty-icon" />
          <p>No edge functions found</p>
        </div>
      )
    }

    return (
      <div className="functions-panel">
        <h4>Edge Functions</h4>
        <div className="functions-list">
          {functions.map(func => (
            <div key={func.id} className="function-item">
              <div className="function-icon">
                <Octicon symbol={octicons.code} />
              </div>
              <div className="function-info">
                <span className="function-name">{func.name}</span>
                <span className="function-slug">{func.slug}</span>
                <span className={`function-status ${func.status.toLowerCase()}`}>
                  {func.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  private renderAuthTab() {
    const { selectedProject } = this.state

    if (!selectedProject) {
      return (
        <div className="empty-state">
          <p>Select a project to view auth</p>
        </div>
      )
    }

    return (
      <div className="auth-panel">
        <h4>Authentication</h4>
        <div className="auth-info">
          <p>Manage users and authentication settings in the Supabase dashboard</p>
          <a
            href={`https://app.supabase.com/project/${selectedProject.ref}/auth/users`}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-link"
          >
            <Octicon symbol={octicons.linkExternal} />
            Open Supabase Dashboard
          </a>
        </div>
      </div>
    )
  }

  public render() {
    const { error, activeTab, isLoading } = this.state

    return (
      <div className="supabase-manager">
        <div className="manager-header">
          <h2>
            <Octicon symbol={octicons.database} />
            Supabase Manager
          </h2>
        </div>

        {error && (
          <div className="error-banner">
            <Octicon symbol={octicons.alert} />
            {error}
          </div>
        )}

        <div className="manager-content">
          <div className="projects-panel">{this.renderProjectsList()}</div>
          <div className="data-panel">
            <div className="tabs">
              <button
                className={activeTab === 'database' ? 'active' : ''}
                onClick={() => this.onTabChange('database')}
              >
                <Octicon symbol={octicons.table} />
                Database
              </button>
              <button
                className={activeTab === 'storage' ? 'active' : ''}
                onClick={() => this.onTabChange('storage')}
              >
                <Octicon symbol={octicons.fileDirectory} />
                Storage
              </button>
              <button
                className={activeTab === 'functions' ? 'active' : ''}
                onClick={() => this.onTabChange('functions')}
              >
                <Octicon symbol={octicons.code} />
                Functions
              </button>
              <button
                className={activeTab === 'auth' ? 'active' : ''}
                onClick={() => this.onTabChange('auth')}
              >
                <Octicon symbol={octicons.person} />
                Auth
              </button>
            </div>

            <div className="tab-content">
              {isLoading ? (
                <div className="loading-state">
                  <Loading />
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  {activeTab === 'database' && this.renderDatabaseTab()}
                  {activeTab === 'storage' && this.renderStorageTab()}
                  {activeTab === 'functions' && this.renderFunctionsTab()}
                  {activeTab === 'auth' && this.renderAuthTab()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
