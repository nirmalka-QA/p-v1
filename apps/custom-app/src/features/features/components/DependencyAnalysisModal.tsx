import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Alert,
  Loader,
  Center,
  Divider,
  Box,
  ScrollArea,
  Tooltip,
} from '@mantine/core'
import { IconSparkles, IconAlertTriangle, IconCircleCheck, IconArrowRight, IconRoute, IconX } from '@tabler/icons-react'
import type { DependencyAnalysis } from '../../../types'
import type { Story } from '../utility/models/model'

interface DependencyAnalysisModalProps {
  opened: boolean
  onClose: () => void
  loading: boolean
  analysis: DependencyAnalysis | null
  stories: Story[]
  /** Set of suggestion keys (`story→dependsOn`) already accepted this session. */
  acceptedKeys: Set<string>
  /** Set of suggestion keys (`story→dependsOn`) rejected this session. */
  rejectedKeys: Set<string>
  /** Key of a suggestion currently being saved (accept or reject) — disables its buttons. */
  savingKey: string | null
  onAccept: (storyId: string, dependsOnId: string) => void
  /** Reject a suggested edge so it is never suggested again (persisted). */
  onReject: (storyId: string, dependsOnId: string) => void
}

/**
 * AI dependency-analysis review (ADR-0026). Advisory only — the user accepts each
 * suggested edge individually (which persists onto the story's dependencies); detected
 * cycles and the recommended build order are shown for context. Deterministic guards
 * (mark-ready / start) are unaffected by what's shown here.
 */
export function DependencyAnalysisModal({
  opened,
  onClose,
  loading,
  analysis,
  stories,
  acceptedKeys,
  rejectedKeys,
  savingKey,
  onAccept,
  onReject,
}: DependencyAnalysisModalProps) {
  const titleOf = (id: string) => stories.find((s) => s.id === id)?.title ?? id
  const suggestions = analysis?.suggestions ?? []
  const cycles = analysis?.cycles ?? []
  const order = analysis?.order ?? []

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <IconSparkles size={18} color="var(--mantine-color-violet-6)" />
          <Text fw={600}>AI dependency analysis</Text>
        </Group>
      }
    >
      {loading ? (
        <Center mih={180}>
          <Stack align="center" gap="xs">
            <Loader color="violet" />
            <Text size="sm" c="dimmed">
              Analyzing story dependencies…
            </Text>
          </Stack>
        </Center>
      ) : !analysis ? (
        <Text size="sm" c="dimmed">
          No analysis available — try again once stories are generated.
        </Text>
      ) : (
        <Stack gap="lg">
          {cycles.length > 0 && (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Circular dependencies detected">
              <Text size="sm" c="dimmed" mb="xs">
                These stories depend on each other in a loop — they can never be ordered. Resolve by
                removing one of the edges.
              </Text>
              <Stack gap={4}>
                {cycles.map((cycle, i) => (
                  <Text key={i} size="sm" ff="monospace">
                    {cycle.join(' → ')} → {cycle[0]}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Suggested dependencies ({suggestions.length})
            </Text>
            {suggestions.length === 0 ? (
              <Group gap="xs">
                <IconCircleCheck size={16} color="var(--mantine-color-teal-6)" />
                <Text size="sm" c="dimmed">
                  No missing dependencies found — the current graph looks complete.
                </Text>
              </Group>
            ) : (
              <Stack gap="sm">
                {suggestions.map((s) => {
                  const key = `${s.story}->${s.dependsOn}`
                  const accepted = acceptedKeys.has(key)
                  const rejected = rejectedKeys.has(key)
                  return (
                    <Box key={key} p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                        <Box miw={0}>
                          <Group gap={6} wrap="nowrap" mb={2}>
                            <Badge size="sm" variant="default" radius="sm" ff="monospace">
                              {s.story}
                            </Badge>
                            <IconArrowRight size={13} />
                            <Badge size="sm" variant="light" color="blue" radius="sm" ff="monospace">
                              {s.dependsOn}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" lh={1.5}>
                            {titleOf(s.story)} should depend on {titleOf(s.dependsOn)}.
                          </Text>
                          {s.reason && (
                            <Text size="xs" c="dimmed" lh={1.5} mt={4} fs="italic">
                              {s.reason}
                            </Text>
                          )}
                        </Box>
                        {accepted ? (
                          <Badge color="teal" variant="light" radius="sm" leftSection={<IconCircleCheck size={12} />}>
                            Added
                          </Badge>
                        ) : rejected ? (
                          <Badge color="gray" variant="light" radius="sm" leftSection={<IconX size={12} />}>
                            Rejected
                          </Badge>
                        ) : (
                          <Group gap={6} wrap="nowrap">
                            <Button
                              size="compact-sm"
                              variant="light"
                              color="teal"
                              loading={savingKey === key}
                              onClick={() => onAccept(s.story, s.dependsOn)}
                            >
                              Accept
                            </Button>
                            <Tooltip label="Reject — don't suggest this again" withArrow>
                              <Button
                                size="compact-sm"
                                variant="subtle"
                                color="gray"
                                loading={savingKey === key}
                                onClick={() => onReject(s.story, s.dependsOn)}
                              >
                                Reject
                              </Button>
                            </Tooltip>
                          </Group>
                        )}
                      </Group>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>

          {order.length > 0 && (
            <>
              <Divider />
              <Box>
                <Group gap={6} mb={6}>
                  <IconRoute size={14} />
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" ff="monospace">
                    Recommended build order
                  </Text>
                </Group>
                <ScrollArea.Autosize mah={160}>
                  <Group gap={4} wrap="wrap">
                    {order.map((id, i) => (
                      <Group key={id} gap={4} wrap="nowrap">
                        <Badge size="sm" variant="default" radius="sm" ff="monospace">
                          {id}
                        </Badge>
                        {i < order.length - 1 && <IconArrowRight size={12} color="var(--mantine-color-dimmed)" />}
                      </Group>
                    ))}
                  </Group>
                </ScrollArea.Autosize>
              </Box>
            </>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Done
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
