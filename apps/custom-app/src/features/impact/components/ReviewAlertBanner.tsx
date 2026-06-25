import { useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { Alert, Button, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ReviewAlertModal } from './ReviewAlertModal'
import { useGetAlertsQuery } from '../utility/services/impactApi'
import { activeAlertsFor } from '../utility/helpers/select'
import type { ImpactKind } from '../utility/models/model'

interface ReviewAlertBannerProps {
  projectId: string | undefined
  kind: ImpactKind
  refId: string
}

/**
 * Drop-in danger banner for an opened artifact (feature / story) that has
 * unreviewed change-impact alerts. Renders nothing when there's nothing to
 * review; otherwise shows the count with a "Review & take action" button that
 * opens the alerts (what changed + SDLC actions). Self-contained so any phase's
 * detail view can surface flags consistently.
 */
export function ReviewAlertBanner({ projectId, kind, refId }: ReviewAlertBannerProps) {
  const { data: alerts = [] } = useGetAlertsQuery(projectId ?? skipToken)
  const [opened, setOpened] = useState(false)

  const active = activeAlertsFor(alerts, kind, refId)
  if (active.length === 0 || !projectId) return null

  const hasCritical = active.some((a) => a.severity === 'critical' && a.status === 'open')
  const color = hasCritical ? 'red' : 'orange'

  return (
    <>
      <Alert
        color={color}
        variant="light"
        icon={<IconAlertTriangle size={18} />}
        title={`${active.length} upstream change${active.length === 1 ? '' : 's'} to review`}
        mb="md"
      >
        <Text size="sm" mb="sm" lh={1.5}>
          Something this item was built from has changed. Review what changed and decide whether to
          approve the rework, reject it, or regenerate — nothing is deleted.
        </Text>
        <Button size="compact-sm" color={color} variant="filled" onClick={() => setOpened(true)}>
          Review &amp; take action
        </Button>
      </Alert>
      <ReviewAlertModal
        projectId={projectId}
        alerts={active}
        opened={opened}
        onClose={() => setOpened(false)}
      />
    </>
  )
}
