import { useState } from 'react'
import { Paper, Group, Stack, Text, Badge, Button, Textarea, Box } from '@mantine/core'
import { IconCircleCheck, IconRefresh, IconX, IconEye, IconSparkles } from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import markdown from '../../discovery/utility/styles/markdown.module.css'
import { SEVERITY_COLOR, SEVERITY_LABEL, ACTION_LABEL } from '../utility/constants/constants'
import type { ChangeImpactAlert, ImpactSeverity, ReviewAction } from '../utility/models/model'
import styles from '../utility/styles/impact.module.css'

interface AlertCardProps {
  alert: ChangeImpactAlert
  onAction: (action: ReviewAction, note?: string) => void
  busy: boolean
}

const SEVERITY_CLASS: Record<ImpactSeverity, string> = {
  critical: styles.alertCritical,
  warning: styles.alertWarning,
  info: styles.alertInfo,
}

/**
 * Presentational card for a single change-impact alert: severity, what changed,
 * the AI rationale, and the SDLC review actions. Rejecting requires a note
 * (captured inline). The parent owns the resolve mutation.
 */
export function AlertCard({ alert, onAction, busy }: AlertCardProps) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  const resolved = alert.status === 'approved' || alert.status === 'rejected'

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      className={`${styles.alertCard} ${SEVERITY_CLASS[alert.severity]} ${resolved ? styles.alertResolved : ''}`}
    >
      <Group justify="space-between" wrap="nowrap" mb={6}>
        <Group gap="xs" wrap="nowrap">
          <Badge color={SEVERITY_COLOR[alert.severity]} variant="light" radius="sm">
            {SEVERITY_LABEL[alert.severity]}
          </Badge>
          <Text size="xs" ff="monospace" c="dimmed">
            {alert.id}
          </Text>
        </Group>
        {alert.status === 'acknowledged' && (
          <Badge color="gray" variant="outline" radius="sm" size="sm">
            Acknowledged
          </Badge>
        )}
      </Group>

      <Text size="sm" fw={600} lh={1.4}>
        {alert.target.label}
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        affected by a change to {alert.source.label}
      </Text>

      <Box className={markdown.markdown}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{alert.rationale}</ReactMarkdown>
      </Box>

      {resolved ? (
        <Text size="xs" c="dimmed" mt="xs">
          {alert.resolution?.action === 'reject' ? 'Rejected' : 'Approved'}
          {alert.resolution?.note ? ` — “${alert.resolution.note}”` : ''}
        </Text>
      ) : (
        <Stack gap="xs" mt="sm">
          <Text size="xs" c="dimmed">
            AI suggests: <Text span fw={600}>{ACTION_LABEL[alert.suggestedAction]}</Text>
          </Text>
          <Group gap="xs">
            <Button
              size="compact-sm"
              color="teal"
              leftSection={<IconCircleCheck size={14} />}
              loading={busy}
              onClick={() => onAction('approve')}
            >
              Approve
            </Button>
            <Button
              size="compact-sm"
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={14} />}
              loading={busy}
              onClick={() => onAction('regenerate')}
            >
              Regenerate
            </Button>
            <Button
              size="compact-sm"
              variant="subtle"
              color="red"
              leftSection={<IconX size={14} />}
              onClick={() => setRejecting((v) => !v)}
            >
              Reject
            </Button>
            <Button
              size="compact-sm"
              variant="subtle"
              color="gray"
              leftSection={<IconEye size={14} />}
              loading={busy}
              onClick={() => onAction('acknowledge')}
            >
              Acknowledge
            </Button>
          </Group>

          {rejecting && (
            <Stack gap="xs" mt={4}>
              <Textarea
                placeholder="Why is this change not actioned? (recorded for traceability)"
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                autosize
                minRows={2}
              />
              <Group justify="flex-end">
                <Button
                  size="compact-sm"
                  color="red"
                  leftSection={<IconRefresh size={14} />}
                  loading={busy}
                  disabled={!note.trim()}
                  onClick={() => onAction('reject', note)}
                >
                  Confirm reject
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  )
}
