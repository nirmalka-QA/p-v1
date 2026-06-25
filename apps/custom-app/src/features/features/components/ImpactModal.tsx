import { Modal, Box, Text, Group, Badge, Button, Divider, Stack, Anchor, ThemeIcon } from '@mantine/core'
import { IconAlertTriangle, IconSparkles, IconArrowRight, IconTag } from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import markdown from '../../discovery/utility/styles/markdown.module.css'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Story } from '../utility/models/model'

interface ImpactModalProps {
  story: Story | null
  /** Project-wide stories, to resolve the affected stories' title / status / tags. */
  allStories: Story[]
  opened: boolean
  onClose: () => void
  onDismiss: (story: Story) => void
  /** Open one of the affected stories. */
  onOpenStory?: (storyId: string) => void
  dismissing: boolean
}

/**
 * AI impact report for a story: which other stories it may affect (shared scope) and WHY
 * (shared scope/tags), with the option to dismiss the flag if it isn't relevant. The affected
 * stories are listed with their status and the shared tags that triggered the flag, and each is
 * clickable so the user can review the impact directly.
 */
export function ImpactModal({ story, allStories, opened, onClose, onDismiss, onOpenStory, dismissing }: ImpactModalProps) {
  if (!story) return null

  const byId = new Map(allStories.map((s) => [s.id, s]))
  const ownTags = new Set(story.tags ?? [])

  // Resolve each impacted story id to the live story + the shared tags that triggered the flag.
  const affected = story.impactedStories
    .map((id) => {
      const target = byId.get(id)
      if (!target) return null
      const sharedTags = (target.tags ?? []).filter((t) => ownTags.has(t))
      return { id, target, sharedTags }
    })
    .filter((x): x is { id: string; target: Story; sharedTags: string[] } => x !== null)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      title={
        <Group gap="xs">
          <Badge color="violet" variant="light" radius="sm" leftSection={<IconSparkles size={10} />}>
            AI
          </Badge>
          <Text fw={600}>Impact analysis</Text>
        </Group>
      }
    >
      <Group gap="xs" mb="sm">
        <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
        <Text size="sm" fw={600}>
          {story.id} · {story.title}
        </Text>
      </Group>
      <Divider mb="md" />

      {/* The "why" — the stored analysis summary. */}
      <Box className={markdown.markdown} mb="md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {story.impactSummary ?? 'No impact details available.'}
        </ReactMarkdown>
      </Box>

      {/* The "what" — the affected stories, with status + the shared scope that triggered it. */}
      {affected.length > 0 && (
        <Box mb="md">
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={8} ff="monospace">
            Potentially affected {affected.length === 1 ? 'story' : 'stories'} ({affected.length})
          </Text>
          <Stack gap="xs">
            {affected.map(({ id, target, sharedTags }) => (
              <Box
                key={id}
                p="xs"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-md)',
                }}
              >
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                  <Box flex={1} miw={0}>
                    <Group gap={6} mb={2} wrap="wrap">
                      <Anchor
                        component="button"
                        type="button"
                        ff="monospace"
                        size="xs"
                        onClick={() => onOpenStory?.(id)}
                      >
                        {id}
                      </Anchor>
                      <StatusBadge status={target.status} size="xs" />
                      <Badge size="xs" variant="default" radius="sm" ff="monospace">
                        {target.effort} pts
                      </Badge>
                    </Group>
                    <Text size="sm" fw={500} lineClamp={1}>
                      {target.title}
                    </Text>
                    {sharedTags.length > 0 && (
                      <Group gap={6} mt={4} wrap="wrap" align="center">
                        <Text size="xs" c="dimmed">
                          Shared scope:
                        </Text>
                        {sharedTags.map((t) => (
                          <Badge key={t} size="xs" variant="light" color="orange" radius="sm" leftSection={<IconTag size={9} />}>
                            {t}
                          </Badge>
                        ))}
                      </Group>
                    )}
                  </Box>
                  <ThemeIcon variant="subtle" color="gray" size="sm" style={{ cursor: 'pointer' }} onClick={() => onOpenStory?.(id)}>
                    <IconArrowRight size={14} />
                  </ThemeIcon>
                </Group>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="subtle" color="gray" onClick={onClose}>
          Keep flag
        </Button>
        <Button color="orange" variant="light" loading={dismissing} onClick={() => onDismiss(story)}>
          Dismiss flag
        </Button>
      </Group>
    </Modal>
  )
}
