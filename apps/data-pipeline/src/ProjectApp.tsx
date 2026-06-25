import { Routes, Route } from 'react-router-dom'
import type { ProjectAppProps } from '@wispr/mfe-runtime'
import { Overview } from './features/overview/Overview'
import { Settings } from './features/settings/Settings'

/**
 * data-pipeline remote — the federated entry. Renders RELATIVE routes into the
 * host's router (no router/store/theme of its own in composed mode). Per the
 * architecture, this is the one allowed default export.
 */
export default function ProjectApp(props: ProjectAppProps) {
  return (
    <Routes>
      <Route index element={<Overview ctx={props} />} />
      <Route path="settings" element={<Settings />} />
    </Routes>
  )
}
