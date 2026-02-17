/**
 * Repository template for quick project setup
 */
export class RepositoryTemplate {
  /**
   * @param id Unique identifier for the template
   * @param name Display name of the template
   * @param description Description of what the template creates
   * @param sourceUrl URL to the template repository
   * @param category Template category
   * @param tags Tags for filtering
   * @param variables Template variables that can be customized
   * @param isBuiltIn Whether this is a built-in template
   * @param icon Optional icon identifier
   */
  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly sourceUrl: string,
    public readonly category: TemplateCategory,
    public readonly tags: ReadonlyArray<string> = [],
    public readonly variables: ReadonlyArray<TemplateVariable> = [],
    public readonly isBuiltIn: boolean = false,
    public readonly icon: string | null = null
  ) {}

  /**
   * Create a copy with modified properties
   */
  public with(props: Partial<RepositoryTemplate>): RepositoryTemplate {
    return new RepositoryTemplate(
      props.id ?? this.id,
      props.name ?? this.name,
      props.description ?? this.description,
      props.sourceUrl ?? this.sourceUrl,
      props.category ?? this.category,
      props.tags ?? this.tags,
      props.variables ?? this.variables,
      props.isBuiltIn ?? this.isBuiltIn,
      props.icon ?? this.icon
    )
  }
}

/**
 * Template variable for customization
 */
export interface TemplateVariable {
  readonly name: string
  readonly description: string
  readonly defaultValue: string
  readonly required: boolean
  readonly validation?: RegExp
}

/**
 * Template categories
 */
export enum TemplateCategory {
  Web = 'web',
  Mobile = 'mobile',
  Desktop = 'desktop',
  Library = 'library',
  Documentation = 'documentation',
  DevOps = 'devops',
  Other = 'other',
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: TemplateCategory): string {
  switch (category) {
    case TemplateCategory.Web:
      return 'Web Application'
    case TemplateCategory.Mobile:
      return 'Mobile App'
    case TemplateCategory.Desktop:
      return 'Desktop App'
    case TemplateCategory.Library:
      return 'Library/Package'
    case TemplateCategory.Documentation:
      return 'Documentation'
    case TemplateCategory.DevOps:
      return 'DevOps/Tools'
    case TemplateCategory.Other:
      return 'Other'
    default:
      return category
  }
}

/**
 * Built-in repository templates
 */
export const BuiltInTemplates: ReadonlyArray<RepositoryTemplate> = [
  new RepositoryTemplate(
    'web-react',
    'React Web App',
    'Modern React application with TypeScript, ESLint, and Prettier',
    'https://github.com/facebook/create-react-app',
    TemplateCategory.Web,
    ['react', 'typescript', 'javascript'],
    [
      { name: 'projectName', description: 'Project name', defaultValue: 'my-react-app', required: true },
      { name: 'author', description: 'Author name', defaultValue: '', required: false },
    ],
    true,
    'react'
  ),
  new RepositoryTemplate(
    'web-vue',
    'Vue.js Web App',
    'Vue 3 application with TypeScript and Vite',
    'https://github.com/vuejs/create-vue',
    TemplateCategory.Web,
    ['vue', 'typescript', 'javascript'],
    [
      { name: 'projectName', description: 'Project name', defaultValue: 'my-vue-app', required: true },
    ],
    true,
    'vue'
  ),
  new RepositoryTemplate(
    'node-library',
    'Node.js Library',
    'NPM package with TypeScript, testing, and CI setup',
    'https://github.com/TypeScriptLibraryStarter/TypeScriptLibraryStarter',
    TemplateCategory.Library,
    ['node', 'npm', 'typescript', 'library'],
    [
      { name: 'packageName', description: 'Package name', defaultValue: 'my-library', required: true },
      { name: 'description', description: 'Package description', defaultValue: 'A TypeScript library', required: false },
    ],
    true,
    'node'
  ),
  new RepositoryTemplate(
    'python-package',
    'Python Package',
    'Python package with setuptools, testing, and documentation',
    'https://github.com/pypa/sampleproject',
    TemplateCategory.Library,
    ['python', 'pypi', 'library'],
    [
      { name: 'packageName', description: 'Package name', defaultValue: 'my_package', required: true },
      { name: 'author', description: 'Author name', defaultValue: '', required: false },
    ],
    true,
    'python'
  ),
  new RepositoryTemplate(
    'docs-mkdocs',
    'Documentation Site',
    'Documentation site using MkDocs with Material theme',
    'https://github.com/squidfunk/mkdocs-material',
    TemplateCategory.Documentation,
    ['documentation', 'mkdocs', 'markdown'],
    [
      { name: 'siteName', description: 'Site name', defaultValue: 'My Documentation', required: true },
    ],
    true,
    'book'
  ),
  new RepositoryTemplate(
    'docker-app',
    'Dockerized Application',
    'Application with Docker and docker-compose setup',
    'https://github.com/docker/awesome-compose',
    TemplateCategory.DevOps,
    ['docker', 'devops', 'container'],
    [
      { name: 'appName', description: 'Application name', defaultValue: 'my-app', required: true },
      { name: 'port', description: 'Exposed port', defaultValue: '3000', required: true, validation: /^\d+$/ },
    ],
    true,
    'container'
  ),
]

/**
 * Template usage statistics
 */
export interface ITemplateStats {
  readonly totalUsage: number
  readonly byTemplate: Record<string, number>
  readonly byCategory: Record<string, number>
}
