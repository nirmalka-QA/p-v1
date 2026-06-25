import { Alert } from '@mantine/core'
import { IconFlask } from '@tabler/icons-react'
import { getServicesConfig } from '@wispr/services'

interface MockDataBannerProps {
  /** What the surface shows — folded into the message (e.g. "users", "your profile"). */
  surface: string
}

/**
 * Demo-mode notice: when the data layer is serving mock routes (VITE_USE_MOCKS),
 * the surface is populated from in-browser fixtures — no live backend is queried.
 * Renders nothing when mocks are off, so it can be dropped onto any page safely.
 * Exists so stakeholders never mistake seeded fixtures for real, persisted data.
 */
export function MockDataBanner({ surface }: MockDataBannerProps) {
  if (!getServicesConfig().useMocks) return null

  return (
    <Alert
      variant="light"
      color="yellow"
      radius="md"
      icon={<IconFlask size={18} />}
      title="Mock data — not connected to a live backend"
    >
      {`This is sample ${surface} served from in-browser fixtures. Changes persist only in this browser and no real data is fetched or saved.`}
    </Alert>
  )
}
