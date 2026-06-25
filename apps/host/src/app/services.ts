import { notifications } from '@mantine/notifications'
import { api } from '@wispr/services'
import type { Services } from '@wispr/contracts'

const colorByType = { info: 'indigo', success: 'teal', error: 'red' } as const

/**
 * The host-owned services bag handed to every remote through the contract, so
 * there is one instance of each. `api` is the shared RTK Query api; notify maps
 * onto Mantine notifications; flags/telemetry are stubbed with their production
 * injection points (Azure App Configuration / Application Insights) marked.
 */
export const hostServices: Services = {
  api,
  notify: {
    show({ title, message, type = 'info' }) {
      notifications.show({ message, color: colorByType[type], ...(title ? { title } : {}) })
    },
  },
  flags: {
    // TODO: back with Azure App Configuration + Feature Management.
    isEnabled: () => false,
  },
  telemetry: {
    // TODO: back with Application Insights.
    track: (event, props) => {
      if (import.meta.env.DEV) console.debug('[telemetry]', event, props)
    },
  },
}
