import type { ProjectType } from '../../../../types'

/**
 * Tech-stack categories shown in the configuration panel. Order is the display
 * order; every category always has a row so the user can override any layer.
 */
export const TECH_STACK_CATEGORIES = [
  'Frontend Framework',
  'Language',
  'UI Library',
  'State Management',
  'Backend',
  'Database',
  'Authentication',
  'Hosting',
  'CI/CD',
] as const

export type TechStackCategory = (typeof TECH_STACK_CATEGORIES)[number]

/**
 * AI-suggested defaults per category. A small per-project-type twist keeps the
 * suggestions domain-appropriate (e.g. fintech leans on a typed, audited stack).
 */
const BASE_STACK: Record<TechStackCategory, string> = {
  'Frontend Framework': 'React 18',
  Language: 'TypeScript',
  'UI Library': 'Mantine',
  'State Management': 'Redux Toolkit',
  Backend: 'Node.js + Express',
  Database: 'PostgreSQL',
  Authentication: 'JWT + refresh tokens',
  Hosting: 'AWS ECS Fargate',
  'CI/CD': 'GitHub Actions',
}

const TYPE_OVERRIDES: Partial<Record<ProjectType, Partial<Record<TechStackCategory, string>>>> = {
  healthcare: { Database: 'PostgreSQL (HIPAA-compliant hosting)', Authentication: 'OAuth 2.0 + MFA' },
  insurance: { Backend: 'Node.js + NestJS', Database: 'PostgreSQL' },
  fintech: { Language: 'TypeScript (strict)', Authentication: 'OAuth 2.0 + MFA', Database: 'PostgreSQL + Redis' },
  retail: { 'UI Library': 'Mantine', Hosting: 'Vercel + AWS' },
}

/** Builds the AI-suggested stack for a project type. */
export function suggestedStackFor(type: ProjectType): Record<TechStackCategory, string> {
  const overrides = TYPE_OVERRIDES[type] ?? {}
  return TECH_STACK_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = overrides[category] ?? BASE_STACK[category]
      return acc
    },
    {} as Record<TechStackCategory, string>,
  )
}

/** Simulated AI code-generation steps (visible progress, requirements §2.3). */
export const CODE_GEN_STEPS: { id: string; label: string; estimatedSeconds: number }[] = [
  { id: 'context', label: 'Reading the story, acceptance criteria, and Knowledge Base', estimatedSeconds: 1.5 },
  { id: 'scaffold', label: 'Scaffolding files for the configured tech stack', estimatedSeconds: 2 },
  { id: 'implement', label: 'Implementing the component and API route', estimatedSeconds: 2 },
  { id: 'tests', label: 'Writing unit test stubs', estimatedSeconds: 1 },
]

/** Simulated AI steps for connecting and indexing the repository. */
export const REPO_CONNECT_STEPS: { id: string; label: string; estimatedSeconds: number }[] = [
  { id: 'auth', label: 'Authorising with the Git provider', estimatedSeconds: 1 },
  { id: 'clone', label: 'Indexing the default branch', estimatedSeconds: 1.5 },
  { id: 'tree', label: 'Building the file tree', estimatedSeconds: 1 },
]

export const CODE_GEN_COMING_SOON = [
  'Figma-to-UI generation',
  'API Swagger / OpenAPI generation',
] as const

// ── Setup wizard ──

/** Tech-stack category keys the setup wizard reads/writes on `TechStackItem[]`. */
export const STACK_CAT = {
  feFramework: 'Frontend Framework',
  feLanguage: 'Frontend Language',
  uiLibrary: 'UI Library',
  stateManagement: 'State Management',
  beFramework: 'Backend',
  beLanguage: 'Backend Language',
  orm: 'ORM',
  database: 'Database',
} as const

export const FRONTEND_FRAMEWORKS = ['React', 'Next.js', 'Angular', 'Vue'] as const
export const BACKEND_FRAMEWORKS = [
  'Node.js / Express',
  'Node.js / NestJS',
  'Python / FastAPI',
  'Python / Django',
  'C# / .NET',
  'Java / Spring',
] as const
export const UI_LIBRARIES = ['Mantine', 'MUI', 'Shadcn', 'Tailwind', 'None']
export const STATE_LIBRARIES = ['Redux Toolkit', 'Zustand', 'None']
export const FRONTEND_LANGUAGES = ['TypeScript', 'JavaScript']
export const BACKEND_LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'C#', 'Java']
export const ORMS = ['Prisma', 'TypeORM', 'Sequelize', 'None']
export const DATABASES = ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'SQL Server']

export const REPO_PROVIDERS: { value: string; label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'bitbucket', label: 'Bitbucket' },
  { value: 'azure-devops', label: 'Azure DevOps' },
  { value: 'gitlab', label: 'GitLab' },
]

/** Industry-default conventions pre-filled in the wizard (editable). */
export const SYSTEM_CONVENTIONS: { label: string; value: string }[] = [
  { label: 'Folder structure', value: 'src/components, src/features, src/hooks, src/services, src/types' },
  { label: 'Component naming', value: 'PascalCase — UserCard.tsx' },
  { label: 'Hook naming', value: 'camelCase prefixed use — useAuth.ts' },
  { label: 'Service naming', value: 'camelCase suffixed .service.ts — auth.service.ts' },
  { label: 'CSS approach', value: 'CSS Modules — UserCard.module.css' },
  { label: 'Test file naming', value: 'ComponentName.test.tsx alongside component' },
]

/** Wizard step titles (scaffolding is the finish output, not a step). */
export const WIZARD_STEPS = ['Tech Stack', 'Repository', 'Design System', 'Technical Requirements'] as const

/** Simulated scaffolding progress steps (visible progress, §2.3). */
export const SCAFFOLD_STEPS: { id: string; label: string; estimatedSeconds: number }[] = [
  { id: 'structure', label: 'Generating project structure', estimatedSeconds: 1 },
  { id: 'instructions', label: 'Creating AI instruction files', estimatedSeconds: 1 },
  { id: 'conventions', label: 'Applying naming conventions', estimatedSeconds: 1 },
  { id: 'tokens', label: 'Preparing design token references', estimatedSeconds: 1 },
  { id: 'repo', label: 'Finalising repository config', estimatedSeconds: 1 },
]
