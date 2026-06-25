/**
 * @wispr/projects — the shared project domain: the Project entity + API DTOs,
 * the projectsApi (injected into the shared @wispr/services api), project
 * constants, mappers, and the active-project hooks. Used by the host (list /
 * creation / resolution) and by the custom-app workspace.
 */
export * from './model'
export * from './constants'
export {
  mapProject,
  toCreateProjectBody,
  toUpdateProjectBody,
  projectColor,
  projectInitials,
  sortByUpdatedDesc,
  orderPhaseIds,
  buildProjectPhases,
} from './helpers'
export { strategyApi, useGetStrategyTypesQuery, useGetStrategyPhasesQuery, useInstantiateStrategyMutation } from './strategyApi'
export type { InstantiateStrategyArgs } from './strategyApi'
export { registerStrategyMockRoutes, readMockStrategyPhases } from './strategyMock'
export {
  projectsApi,
  useGetProjectsQuery,
  useGetProjectTypesQuery,
  useGetProjectTypeCatalogQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from './projectsApi'
export { useCurrentProject } from './useCurrentProject'
export { useProject } from './useProject'
export { ProjectFields } from './components/ProjectFields/ProjectFields'
export { ProjectSettingsModal } from './components/settings/ProjectSettingsModal'
export { projectSchema, projectWizardSchema } from './validation'
export {
  registerProjectsMockRoutes,
  readMockProjects,
  deleteMockProjectsByWorkspace,
} from './projectsMock'
