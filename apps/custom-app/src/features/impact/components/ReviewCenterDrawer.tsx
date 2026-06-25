import { useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { Drawer, Stack, Group, Text, Badge, ScrollArea, Divider, ThemeIcon, Box } from '@mantine/core'
import { IconShieldCheck, IconHistory } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { EmptyState } from '@wispr/ui'
import { AlertCard } from './AlertCard'
import { useImpactAlerts } from '../utility/hooks/useImpactAlerts'
import { useGetAuditQuery, useResolveAlertMutation } from '../utility/services/impactApi'
import { ACTION_LABEL } from '../utility/constants/constants'
import { PHASE_LABEL } from '../../../constants/phases'
import type { ImpactPhase, ReviewAction } from '../utility/models/model'

dayjs.extend(relativeTime)

interface ReviewCenterDrawerProps {
  projectId: string | undefined
  opened: boolean
  onClose: () => void
}

const PHASE_ORDER: ImpactPhase[] = ['discovery', 'planning', 'features']

/**
 * The cross-phase "Attention Required" center. Lists open + acknowledged alerts
 * grouped by the impacted phase, each reviewable with an SDLC action, plus a
 * recent activity (audit) trail. Orchestrates the resolve mutation.
 */
export function ReviewCenterDrawer({ projectId, opened, onClose }: ReviewCenterDrawerProps) {
  const { active, openCount } = useImpactAlerts(projectId)
  const { data: audit = [] } = useGetAuditQuery(projectId ?? skipToken)
  const [resolveAlert] = useResolveAlertMutation()
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  async function handleAction(alertId: string, action: ReviewAction, note?: string) {
    if (!projectId) return
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

  const groups = PHASE_ORDER.map((phase) => ({
    phase,
    alerts: active.filter((a) => a.target.phase === phase),
  })).filter((g) => g.alerts.length > 0)

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group gap="xs">
          <Text fw={600}>Attention Required</Text>
          {openCount > 0 && (
            <Badge color="red" variant="filled" radius="sm">
              {openCount}
            </Badge>
          )}
        </Group>
      }
    >
      <ScrollArea h="calc(100vh - 120px)" type="auto">
        {active.length === 0 ? (
          <EmptyState
            icon={IconShieldCheck}
            title="You're all caught up"
            description="No upstream changes need review right now. When you edit the Knowledge Base or features, anything they affect downstream will appear here."
          />
        ) : (
          <Stack gap="lg" pb="xl">
            {groups.map((group) => (
              <Stack key={group.phase} gap="xs">
                <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed">
                  {PHASE_LABEL[group.phase]} · {group.alerts.length}
                </Text>
                {group.alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    busy={resolvingId === alert.id}
                    onAction={(action, note) => handleAction(alert.id, action, note)}
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        )}

        {audit.length > 0 && (
          <>
            <Divider my="md" />
            <Group gap={6} mb="xs">
              <ThemeIcon size={18} variant="transparent" color="gray">
                <IconHistory size={14} />
              </ThemeIcon>
              <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed">
                Activity
              </Text>
            </Group>
            <Stack gap={6} pb="xl">
              {audit.slice(0, 12).map((entry) => (
                <Box key={entry.id}>
                  <Text size="xs">{entry.summary}</Text>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {dayjs(entry.at).fromNow()}
                  </Text>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </ScrollArea>
    </Drawer>
  )
}
