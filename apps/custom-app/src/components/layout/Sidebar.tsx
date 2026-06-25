import { useMatch } from 'react-router-dom'
import { DiscoverySectionsNav } from '../../features/discovery/components/DiscoverySectionsNav'
import { PlanningFeaturesNav } from '../../features/planning/components/PlanningFeaturesNav'
import { FeaturesNav } from '../../features/features/components/FeaturesNav'
import { ImplementationSidebar } from '../../features/implementation/components/ImplementationSidebar'
import { TestNav } from '../../features/test/components/TestNav'

/**
 * Phase-contextual sidebar. Each phase fills it with its own content — Discovery
 * (Knowledge Base), Planning (feature list), Features (approved feature list),
 * Implementation (section navigation: Stories / Frontend / Backend / …), and Test
 * (implemented stories grouped by feature).
 */
export function Sidebar() {
  const onDiscovery = useMatch('/projects/:projectId/discovery')
  const onPlanning = useMatch('/projects/:projectId/planning')
  const onFeatures = useMatch('/projects/:projectId/features')
  // Implementation has nested section routes, so match the parent and descendants.
  const onImplementation = useMatch({ path: '/projects/:projectId/implementation', end: false })
  const onTest = useMatch('/projects/:projectId/test')

  if (onDiscovery) return <DiscoverySectionsNav />
  if (onPlanning) return <PlanningFeaturesNav />
  if (onFeatures) return <FeaturesNav />
  if (onImplementation) return <ImplementationSidebar />
  if (onTest) return <TestNav />
  return null
}
