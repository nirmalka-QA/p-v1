// Module declarations for federated remotes consumed via static MF imports.
// @module-federation/vite can generate these (dts), but we keep dts off and
// declare them by hand for the sandbox.
declare module 'custom_app/ProjectApp' {
  import type { ComponentType } from 'react'
  import type { ProjectAppProps } from '@wispr/contracts'
  const ProjectApp: ComponentType<ProjectAppProps>
  export default ProjectApp
}

declare module 'data_pipeline/ProjectApp' {
  import type { ComponentType } from 'react'
  import type { ProjectAppProps } from '@wispr/contracts'
  const ProjectApp: ComponentType<ProjectAppProps>
  export default ProjectApp
}

declare module 'strategy/ProjectApp' {
  import type { ComponentType } from 'react'
  import type { ProjectAppProps } from '@wispr/contracts'
  const ProjectApp: ComponentType<ProjectAppProps>
  export default ProjectApp
}
