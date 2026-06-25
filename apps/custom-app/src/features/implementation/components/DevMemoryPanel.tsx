import { notifications } from '@mantine/notifications'
import { Box, Group, Text, Badge, Timeline, Loader, Center, Button } from '@mantine/core'
import { IconBulb, IconDatabaseCog, IconNote, IconClockPause, IconHistory, IconPlus, IconCircleCheck, IconGitCommit } from '@tabler/icons-react'
import { useCreateStoryFromDeferredMutation } from '../utility/services/implementationApi'
import type { DevMemoryItem } from '../utility/models/model'

interface DevMemoryPanelProps {
  projectId: string
  /** The (already-fetched, possibly paginated) log items to render. */
  items: DevMemoryItem[]
  loading?: boolean
}

const KIND_META: Record<DevMemoryItem['kind'], { label: string; color: string; icon: typeof IconNote }> = {
  decision: { label: 'Decision', color: 'violet', icon: IconBulb },
  migration: { label: 'Built', color: 'teal', icon: IconDatabaseCog },
  memory: { label: 'Summary', color: 'blue', icon: IconNote },
  deferred: { label: 'Deferred', color: 'orange', icon: IconClockPause },
  commit: { label: 'Commit', color: 'gray', icon: IconGitCommit },
}

/**
 * Implementation log (ADR-0027/0028): the development memory captured as stories are built —
 * decisions, migrations, per-story summaries, deferred work, and commit ids. Presentational: the
 * parent supplies the (paginated) items. Deferred items can be promoted into a new story.
 */
export function DevMemoryPanel({ projectId, items, loading = false }: DevMemoryPanelProps) {
  const [createStory, { isLoading: creating }] = useCreateStoryFromDeferredMutation()

  async function promote(devMemoryId: string) {
    try {
      const slug = await createStory({ projectId, devMemoryId }).unwrap()
      notifications.show({ color: 'teal', title: 'Story created', message: slug ? `Created ${slug} from the deferred work.` : 'Created a story from the deferred work.' })
    } catch {
      notifications.show({ color: 'red', title: 'Could not create story', message: 'Please try again.' })
    }
  }

  if (loading) {
    return (
      <Center mih={120}>
        <Loader size="sm" />
      </Center>
    )
  }

  if (items.length === 0) {
    return (
      <Group gap="xs" c="dimmed">
        <IconHistory size={16} />
        <Text size="sm">No development memory yet — it's recorded as stories are implemented.</Text>
      </Group>
    )
  }

  return (
    <Timeline active={items.length} bulletSize={22} lineWidth={2}>
      {items.map((m) => {
        const meta = KIND_META[m.kind]
        const Icon = meta.icon
        return (
          <Timeline.Item key={m.id} bullet={<Icon size={12} />} color={meta.color}>
            <Group gap={6} mb={2} wrap="wrap">
              <Badge size="xs" color={meta.color} variant="light" radius="sm">
                {meta.label}
              </Badge>
              {m.story && (
                <Badge size="xs" variant="default" radius="sm" ff="monospace">
                  {m.story}
                </Badge>
              )}
              {m.title && (
                <Text size="sm" fw={500} ff={m.kind === 'commit' ? 'monospace' : undefined}>
                  {m.title}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                {new Date(m.createdAt).toLocaleString()}
              </Text>
            </Group>
            {m.content && (
              <Text size="xs" c="dimmed" lh={1.5} ff={m.kind === 'commit' ? 'monospace' : undefined}>
                {m.content}
              </Text>
            )}
            {m.kind === 'deferred' && m.relatedSlugs.length > 0 && (
              <Group gap={4} mt={4}>
                <Text size="xs" c="dimmed">
                  depends on:
                </Text>
                {m.relatedSlugs.map((s) => (
                  <Badge key={s} size="xs" variant="outline" color="gray" radius="sm" ff="monospace">
                    {s}
                  </Badge>
                ))}
              </Group>
            )}
            {m.kind === 'deferred' && (
              <Box mt={6}>
                {m.promotedStorySlug ? (
                  <Badge size="xs" color="teal" variant="light" radius="sm" leftSection={<IconCircleCheck size={11} />}>
                    Story {m.promotedStorySlug} created
                  </Badge>
                ) : (
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="orange"
                    leftSection={<IconPlus size={12} />}
                    loading={creating}
                    onClick={() => void promote(m.id)}
                  >
                    Create story
                  </Button>
                )}
              </Box>
            )}
          </Timeline.Item>
        )
      })}
    </Timeline>
  )
}
