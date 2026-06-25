import { Workbench, type WorkbenchConfig } from './components/Workbench'

const FRONTEND_CONFIG: WorkbenchConfig = {
  area: 'frontend',
  title: 'Frontend',
  description: 'Set up your frontend stack, then generate code or hand off prompts for ready stories.',
  configuredDescription: 'Generate frontend components and hooks, or hand off ready stories to your AI tool.',
  setupDescription:
    'Choose your frontend framework and libraries. This is saved per project and reused by code generation. You can also configure it in Setup.',
  codeScope: 'Frontend component + hook',
  showDesignRef: true,
}

/** Implementation › Frontend — setup fallback, then Develop / Code / Preview modes. */
export function FrontendPage() {
  return <Workbench config={FRONTEND_CONFIG} />
}
