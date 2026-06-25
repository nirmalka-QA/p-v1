import { useState } from 'react'
import { Modal, Group, Text, Stack } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { AlertCard } from './AlertCard'
import { useResolveAlertMutation } from '../utility/services/impactApi'
import { ACTION_LABEL } from '../utility/constants/constants'
import type { ChangeImpactAlert, ReviewAction } from '../utility/models/model'

interface ReviewAlertModalProps {
  projectId: string
  /** All change-impact alerts for the artifact being reviewed. */
  alerts: ChangeImpactAlert[]
  opened: boolean
  onClose: () => void
}

/**
 * Reviews the change-impact alerts for a single artifact (a feature or story),
 * opened from its "Needs review" badge or banner. Shows what changed and the
 * SDLC actions for each alert; resolving one updates it in place.
 */
export function ReviewAlertModal({ projectId, alerts, opened, onClose }: ReviewAlertModalProps) {
  const [resolveAlert] = useResolveAlertMutation()
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  async function handleAction(alertId: string, action: ReviewAction, note?: string) {
    setResolvingId(alertId)
    try {
      await resolveAlert({ projectId, alertId, action, note }).unwrap()
      notifications.show({ color: 'teal', title: ACTION_LABEL[action], message: `${alertId} resolved.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not resolve', message: 'Please try again.' })
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      title={
        <Group gap="xs">
          <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
          <Text fw={600}>Review change impact</Text>
        </Group>
      }
    >
      {alerts.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nothing left to review here.
        </Text>
      ) : (
        <Stack gap="md">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              busy={resolvingId === alert.id}
              onAction={(action, note) => handleAction(alert.id, action, note)}
            />
          ))}
        </Stack>
      )}
    </Modal>
  )
}
