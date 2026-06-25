import { useState, useEffect, useRef } from 'react'
import { notifications } from '@mantine/notifications'
import {
  Box,
  Group,
  Stack,
  Title,
  Text,
  Paper,
  Badge,
  TextInput,
  Button,
  Skeleton,
  ThemeIcon,
} from '@mantine/core'
import { IconSparkles, IconStack2, IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import {
  useGetTechStackQuery,
  useSuggestTechStackMutation,
  useUpdateTechStackMutation,
} from '../utility/services/implementationApi'
import type { ProjectType, TechStackItem } from '../utility/models/model'

interface TechStackPanelProps {
  projectId: string
  projectType: ProjectType
}

/**
 * Tech-stack configuration (§8.1). On first open the stack is AI-suggested from
 * the project; the user can override any layer, and edited items lose their
 * "AI suggested" flag. Saved per project and reused by code generation.
 */
export function TechStackPanel({ projectId, projectType }: TechStackPanelProps) {
  const { data: stack, isLoading, isError, refetch } = useGetTechStackQuery(projectId)
  const [suggest, { isLoading: suggesting }] = useSuggestTechStackMutation()
  const [update, { isLoading: saving }] = useUpdateTechStackMutation()

  const [items, setItems] = useState<TechStackItem[]>([])
  const autoSuggested = useRef(false)

  // Seed editable rows from the saved stack whenever it loads/changes.
  useEffect(() => {
    if (stack) setItems(stack.items)
  }, [stack])

  // First open with no saved stack → auto-suggest one (shown immediately, §8.1).
  useEffect(() => {
    if (!isLoading && !isError && stack === null && !autoSuggested.current && !suggesting) {
      autoSuggested.current = true
      void suggest({ projectId, type: projectType })
    }
  }, [isLoading, isError, stack, suggesting, suggest, projectId, projectType])

  function editItem(category: string, value: string) {
    setItems((prev) => prev.map((i) => (i.category === category ? { ...i, value } : i)))
  }

  async function handleSave() {
    try {
      await update({ projectId, items, type: projectType }).unwrap()
      notifications.show({ color: 'teal', title: 'Tech stack saved', message: 'Reused across all stories in this project.' })
    } catch {
      notifications.show({ color: 'red', title: 'Could not save tech stack', message: 'Please try again.' })
    }
  }

  async function handleResuggest() {
    try {
      await suggest({ projectId, type: projectType }).unwrap()
      notifications.show({ color: 'teal', title: 'Tech stack re-suggested', message: 'AI suggestions refreshed from the Knowledge Base.' })
    } catch {
      notifications.show({ color: 'red', title: 'Could not suggest a tech stack', message: 'Please try again.' })
    }
  }

  const dirty = stack ? JSON.stringify(items) !== JSON.stringify(stack.items) : false

  if (isLoading || suggesting) {
    return (
      <Stack gap="sm" maw={640}>
        <Skeleton height={24} width={200} radius="sm" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={48} radius="md" />
        ))}
      </Stack>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load the tech stack"
        description="Something went wrong fetching the configured tech stack."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }

  return (
    <Box maw={720}>
      <Group justify="space-between" align="flex-start" mb="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={36} radius="md" variant="light" color="indigo">
            <IconStack2 size={20} />
          </ThemeIcon>
          <Box>
            <Title order={3} size="h4">
              Tech Stack
            </Title>
            <Text size="sm" c="dimmed" lh={1.5}>
              AI-suggested from your Knowledge Base. Override any layer — code generation uses this.
            </Text>
          </Box>
        </Group>
        <Button
          variant="light"
          color="violet"
          leftSection={<IconSparkles size={15} />}
          onClick={handleResuggest}
          loading={suggesting}
        >
          Re-suggest
        </Button>
      </Group>

      <Stack gap="xs">
        {items.map((item) => (
          <Paper key={item.category} withBorder radius="md" p="sm">
            <Group justify="space-between" wrap="nowrap" gap="md">
              <Box w={180} miw={180}>
                <Text size="sm" fw={500}>
                  {item.category}
                </Text>
                {item.aiSuggested && (
                  <Badge size="xs" color="violet" variant="light" leftSection={<IconSparkles size={9} />} mt={2}>
                    AI suggested
                  </Badge>
                )}
              </Box>
              <TextInput
                value={item.value}
                onChange={(e) => editItem(item.category, e.currentTarget.value)}
                placeholder={`e.g. ${item.category}`}
                flex={1}
              />
            </Group>
          </Paper>
        ))}
      </Stack>

      <Group justify="flex-end" mt="md">
        <Button
          variant="accent"
          leftSection={<IconDeviceFloppy size={15} />}
          onClick={handleSave}
          loading={saving}
          disabled={!dirty}
        >
          Save tech stack
        </Button>
      </Group>

    </Box>
  )
}
