/**
 * Commit message template for standardized commit messages
 */
export class CommitMessageTemplate {
  /**
   * @param id Unique identifier for the template
   * @param name Display name for the template
   * @param description Optional description of when to use this template
   * @param type The type of template (conventional, custom, etc.)
   * @param pattern The template pattern with placeholders
   * @param variables Available variables for this template
   * @param isDefault Whether this is the default template
   * @param isBuiltIn Whether this is a built-in template
   */
  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly type: CommitMessageTemplateType,
    public readonly pattern: string,
    public readonly variables: ReadonlyArray<TemplateVariable>,
    public readonly isDefault: boolean = false,
    public readonly isBuiltIn: boolean = false
  ) {}

  /**
   * Apply this template with the given variable values
   */
  public apply(values: Record<string, string>): string {
    let result = this.pattern

    for (const variable of this.variables) {
      const placeholder = `{{${variable.name}}}`
      const value = values[variable.name] || variable.defaultValue || ''
      result = result.replace(new RegExp(placeholder, 'g'), value)
    }

    return result
  }

  /**
   * Get a copy of this template with modified properties
   */
  public with(props: Partial<CommitMessageTemplate>): CommitMessageTemplate {
    return new CommitMessageTemplate(
      props.id ?? this.id,
      props.name ?? this.name,
      props.description ?? this.description,
      props.type ?? this.type,
      props.pattern ?? this.pattern,
      props.variables ?? this.variables,
      props.isDefault ?? this.isDefault,
      props.isBuiltIn ?? this.isBuiltIn
    )
  }

  /**
   * Create a built-in conventional commit template
   */
  public static createConventionalTemplate(): CommitMessageTemplate {
    return new CommitMessageTemplate(
      'conventional',
      'Conventional Commits',
      'Standard conventional commit format',
      CommitMessageTemplateType.Conventional,
      '{{type}}{{scope}}: {{description}}\n\n{{body}}\n\n{{footer}}',
      [
        {
          name: 'type',
          description: 'Commit type (feat, fix, docs, style, refactor, test, chore)',
          required: true,
          options: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
        },
        {
          name: 'scope',
          description: 'Scope of changes (optional)',
          required: false,
          defaultValue: '',
          transform: (v) => (v ? `(${v})` : ''),
        },
        {
          name: 'description',
          description: 'Short description of the change',
          required: true,
        },
        {
          name: 'body',
          description: 'Longer description (optional)',
          required: false,
          defaultValue: '',
        },
        {
          name: 'footer',
          description: 'Footer (breaking changes, issues, etc.)',
          required: false,
          defaultValue: '',
        },
      ],
      false,
      true
    )
  }

  /**
   * Create a built-in simple template
   */
  public static createSimpleTemplate(): CommitMessageTemplate {
    return new CommitMessageTemplate(
      'simple',
      'Simple',
      'Simple one-line commit message',
      CommitMessageTemplateType.Simple,
      '{{message}}',
      [
        {
          name: 'message',
          description: 'Commit message',
          required: true,
        },
      ],
      true,
      true
    )
  }

  /**
   * Create a built-in Jira template
   */
  public static createJiraTemplate(): CommitMessageTemplate {
    return new CommitMessageTemplate(
      'jira',
      'Jira Issue',
      'Commit message linked to Jira issue',
      CommitMessageTemplateType.Jira,
      '[{{issue}}] {{description}}\n\n{{body}}',
      [
        {
          name: 'issue',
          description: 'Jira issue key (e.g., PROJ-123)',
          required: true,
          pattern: '^[A-Z]+-\\d+$',
        },
        {
          name: 'description',
          description: 'Short description',
          required: true,
        },
        {
          name: 'body',
          description: 'Additional details',
          required: false,
          defaultValue: '',
        },
      ],
      false,
      true
    )
  }
}

/**
 * Types of commit message templates
 */
export enum CommitMessageTemplateType {
  Simple = 'simple',
  Conventional = 'conventional',
  Jira = 'jira',
  GitHub = 'github',
  Custom = 'custom',
}

/**
 * Variable definition for templates
 */
export interface TemplateVariable {
  /** Variable name (used as {{name}} in template) */
  readonly name: string
  /** Human-readable description */
  readonly description: string
  /** Whether this variable is required */
  readonly required: boolean
  /** Default value if not provided */
  readonly defaultValue?: string
  /** Validation pattern (regex string) */
  readonly pattern?: string
  /** Predefined options for this variable */
  readonly options?: ReadonlyArray<string>
  /** Transform function for the value */
  readonly transform?: (value: string) => string
}

/**
 * Built-in templates
 */
export const BuiltInTemplates: ReadonlyArray<CommitMessageTemplate> = [
  CommitMessageTemplate.createSimpleTemplate(),
  CommitMessageTemplate.createConventionalTemplate(),
  CommitMessageTemplate.createJiraTemplate(),
]
