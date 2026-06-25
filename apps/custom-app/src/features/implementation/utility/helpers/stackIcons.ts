import type { ComponentType } from 'react'
import {
  IconBrandReact,
  IconBrandNextjs,
  IconBrandVue,
  IconBrandAngular,
  IconBrandTypescript,
  IconBrandJavascript,
  IconBrandPython,
  IconBrandCSharp,
  IconBrandNodejs,
  IconBrandDjango,
  IconBrandMysql,
  IconBrandMongodb,
  IconBrandTailwind,
  IconBrandMantine,
  IconBrandRedux,
  IconBrandPrisma,
  IconCoffee,
  IconDatabase,
  IconCube,
  IconCircleMinus,
} from '@tabler/icons-react'

export type StackIcon = ComponentType<{ size?: number; stroke?: number }>

/** Exact-match icons for known tech-stack options. */
const EXACT: Record<string, StackIcon> = {
  React: IconBrandReact,
  'Next.js': IconBrandNextjs,
  Angular: IconBrandAngular,
  Vue: IconBrandVue,
  TypeScript: IconBrandTypescript,
  JavaScript: IconBrandJavascript,
  Python: IconBrandPython,
  'C#': IconBrandCSharp,
  Java: IconCoffee,
  Mantine: IconBrandMantine,
  Tailwind: IconBrandTailwind,
  MUI: IconCube,
  Shadcn: IconCube,
  'Redux Toolkit': IconBrandRedux,
  Zustand: IconCube,
  Prisma: IconBrandPrisma,
  TypeORM: IconDatabase,
  Sequelize: IconDatabase,
  PostgreSQL: IconDatabase,
  MySQL: IconBrandMysql,
  MongoDB: IconBrandMongodb,
  SQLite: IconDatabase,
  'SQL Server': IconDatabase,
  None: IconCircleMinus,
}

/**
 * Mantine theme color per option, evoking each brand's identity without
 * hardcoding brand hex values (kept on-theme per project styling rules).
 */
const EXACT_COLOR: Record<string, string> = {
  React: 'cyan',
  'Next.js': 'gray',
  Angular: 'red',
  Vue: 'green',
  TypeScript: 'blue',
  JavaScript: 'yellow',
  Python: 'blue',
  'C#': 'grape',
  Java: 'orange',
  Mantine: 'blue',
  Tailwind: 'cyan',
  MUI: 'blue',
  Shadcn: 'gray',
  'Redux Toolkit': 'grape',
  Zustand: 'gray',
  Prisma: 'indigo',
  TypeORM: 'teal',
  Sequelize: 'teal',
  PostgreSQL: 'blue',
  MySQL: 'blue',
  MongoDB: 'green',
  SQLite: 'blue',
  'SQL Server': 'red',
  None: 'gray',
}

/** Resolves a Mantine theme color for an option label (mirrors `stackIcon`). */
export function stackColor(name: string): string {
  if (EXACT_COLOR[name]) return EXACT_COLOR[name]
  const n = name.toLowerCase()
  if (n.includes('next')) return 'gray'
  if (n.includes('react')) return 'cyan'
  if (n.includes('vue')) return 'green'
  if (n.includes('angular')) return 'red'
  if (n.includes('django')) return 'teal'
  if (n.includes('python') || n.includes('fastapi')) return 'blue'
  if (n.includes('node') || n.includes('express') || n.includes('nest')) return 'green'
  if (n.includes('.net') || n.includes('c#')) return 'grape'
  if (n.includes('java') || n.includes('spring')) return 'orange'
  if (n.includes('mongo')) return 'green'
  if (n.includes('mysql')) return 'blue'
  if (n.includes('sql') || n.includes('postgres') || n.includes('sqlite')) return 'blue'
  return 'gray'
}

/**
 * Resolves an icon for any tech-stack option label. Exact matches win; otherwise
 * we sniff the label (handles compound names like "Node.js / NestJS"); anything
 * unrecognised — including a user's "Other" entry — falls back to a generic cube.
 */
export function stackIcon(name: string): StackIcon {
  if (EXACT[name]) return EXACT[name]
  const n = name.toLowerCase()
  if (n.includes('next')) return IconBrandNextjs
  if (n.includes('react')) return IconBrandReact
  if (n.includes('vue')) return IconBrandVue
  if (n.includes('angular')) return IconBrandAngular
  if (n.includes('django')) return IconBrandDjango
  if (n.includes('python') || n.includes('fastapi')) return IconBrandPython
  if (n.includes('node') || n.includes('express') || n.includes('nest')) return IconBrandNodejs
  if (n.includes('.net') || n.includes('c#')) return IconBrandCSharp
  if (n.includes('java') || n.includes('spring')) return IconCoffee
  if (n.includes('mongo')) return IconBrandMongodb
  if (n.includes('mysql')) return IconBrandMysql
  if (n.includes('sql') || n.includes('postgres') || n.includes('sqlite')) return IconDatabase
  return IconCube
}
