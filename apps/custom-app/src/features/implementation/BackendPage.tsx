import { Workbench, type WorkbenchConfig } from './components/Workbench'

const BACKEND_CONFIG: WorkbenchConfig = {
  area: 'backend',
  title: 'Backend',
  description: 'Set up your backend stack, then generate API and service code for ready stories.',
  configuredDescription: 'Generate API and service code, or hand off ready stories to your AI tool.',
  setupDescription:
    'Choose your backend framework, language, and ORM. This is saved per project and reused by code generation. You can also configure it in Setup.',
  codeScope: 'API route + service layer + unit test stub',
  showDesignRef: false,
}

/** Implementation › Backend — setup fallback, then Develop / Code / Preview modes. */
export function BackendPage() {
  return <Workbench config={BACKEND_CONFIG} />
}
