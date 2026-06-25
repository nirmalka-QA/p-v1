import { Modal, Stack, Group, Box, Text, Button, ScrollArea, Alert } from '@mantine/core'
import { IconCheck, IconInfoCircle } from '@tabler/icons-react'
import { PriorityBadge, ComplexityBadge, FeatureStatusBadge } from './PlanningBadges'
import type { Feature } from '../utility/models/model'

interface ApprovePlanModalProps {
  opened: boolean
  onClose: () => void
  /** Features that will be promoted to Approved (status proposed / in-progress). */
  toApprove: Feature[]
  /** Features left untouched because they are deferred or rejected. */
  excluded: Feature[]
  onConfirm: () => void
  loading: boolean
}

/**
 * Approval confirmation that clearly lists the features being approved (rather
 * than just a count), and notes any deferred/rejected features being skipped
 * (requirements §6.3).
 */
export function ApprovePlanModal({
  opened,
  onClose,
  toApprove,
  excluded,
  onConfirm,
  loading,
}: ApprovePlanModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Approve plan"
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600 } }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" lh={1.6}>
          You are approving the {toApprove.length} feature{toApprove.length !== 1 ? 's' : ''} below.
          Approved features advance to the Features phase and can still be edited, but not deleted.
        </Text>

        <Stack gap="xs">
          {toApprove.map((f) => (
            <Box key={f.id} p="sm" style={{ border: '1px solid var(--cl-border)', borderRadius: 'var(--cl-radius)' }}>
              <Group gap="xs" mb={4} wrap="wrap">
                <Text size="xs" ff="monospace" c="dimmed">
                  {f.id}
                </Text>
                <FeatureStatusBadge status={f.status} size="xs" />
                <PriorityBadge priority={f.priority} size="xs" />
                <ComplexityBadge complexity={f.complexity} size="xs" />
              </Group>
              <Text size="sm" fw={600}>
                {f.title}
              </Text>
            </Box>
          ))}
        </Stack>

        {excluded.length > 0 && (
          <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
            {excluded.length} deferred/rejected feature{excluded.length !== 1 ? 's' : ''} will be left
            as-is and won’t advance to Features.
          </Alert>
        )}

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="accent" leftSection={<IconCheck size={15} />} loading={loading} onClick={onConfirm}>
            Approve {toApprove.length} feature{toApprove.length !== 1 ? 's' : ''}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
