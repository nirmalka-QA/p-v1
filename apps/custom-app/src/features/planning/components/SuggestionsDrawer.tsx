import { notifications } from '@mantine/notifications'
import {
  Drawer,
  Group,
  Stack,
  Box,
  Card,
  Text,
  Badge,
  Button,
  Divider,
  ScrollArea,
} from '@mantine/core'
import {
  IconSparkles,
  IconPlus,
  IconX,
  IconBulb,
  IconListCheck,
  IconShieldCheck,
} from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { PriorityBadge, ComplexityBadge } from './PlanningBadges'
import { RequirementList } from './RequirementList'
import {
  useAcceptSuggestionMutation,
  useDismissSuggestionMutation,
} from '../utility/services/planningApi'
import type { SuggestedFeature } from '../utility/models/model'
import styles from '../utility/styles/planning.module.css'

interface SuggestionsDrawerProps {
  opened: boolean
  onClose: () => void
  projectId: string
  suggestions: SuggestedFeature[]
}

/**
 * Dedicated AI space (requirements §6.2): a right-hand tray of AI-proposed
 * candidate features the user reviews and either adds to the plan or dismisses.
 */
export function SuggestionsDrawer({ opened, onClose, projectId, suggestions }: SuggestionsDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={460}
      scrollAreaComponent={ScrollArea.Autosize}
      title={
        <Group gap="xs">
          <Badge color="violet" variant="light" radius="sm" leftSection={<IconSparkles size={10} />}>
            AI
          </Badge>
          <Text fw={600}>Suggested features</Text>
        </Group>
      }
    >
      <Text size="sm" c="dimmed" mb="md" lh={1.6}>
        Additional features the AI spotted in your Knowledge Base. Review each one and add the ones
        that belong in your plan.
      </Text>

      {suggestions.length === 0 ? (
        <EmptyState
          icon={IconBulb}
          title="No suggestions right now"
          description="You’ve reviewed every AI suggestion. Regenerate the plan to surface fresh ideas as your Knowledge Base grows."
        />
      ) : (
        <Stack gap="md">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} projectId={projectId} />
          ))}
        </Stack>
      )}
    </Drawer>
  )
}

function SuggestionCard({ suggestion, projectId }: { suggestion: SuggestedFeature; projectId: string }) {
  const [accept, { isLoading: accepting }] = useAcceptSuggestionMutation()
  const [dismiss, { isLoading: dismissing }] = useDismissSuggestionMutation()

  async function handleAccept() {
    try {
      await accept({ projectId, suggestionId: suggestion.id }).unwrap()
      notifications.show({
        color: 'teal',
        title: 'Added to plan',
        message: `“${suggestion.title}” is now in your feature list.`,
      })
    } catch {
      notifications.show({ color: 'red', title: 'Could not add', message: 'Please try again.' })
    }
  }

  async function handleDismiss() {
    try {
      await dismiss({ projectId, suggestionId: suggestion.id }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Could not dismiss', message: 'Please try again.' })
    }
  }

  const busy = accepting || dismissing

  return (
    <Card withBorder radius="md" padding="md" className={styles.suggestionCard}>
      <Text fw={600} size="sm" mb={6}>
        {suggestion.title}
      </Text>
      <Group gap="xs" mb="sm">
        <PriorityBadge priority={suggestion.priority} size="xs" />
        <ComplexityBadge complexity={suggestion.complexity} size="xs" />
      </Group>
      <Text size="sm" c="dimmed" lh={1.6} mb="sm">
        {suggestion.description}
      </Text>

      <Box bg="var(--mantine-color-violet-light)" p="sm" style={{ borderRadius: 'var(--cl-radius)' }} mb="md">
        <Group gap={6} mb={4}>
          <IconSparkles size={12} color="var(--mantine-color-violet-6)" />
          <Text size="xs" fw={600} c="violet.7" tt="uppercase">
            Why this is suggested
          </Text>
        </Group>
        <Text size="xs" c="dimmed" lh={1.6}>
          {suggestion.rationale}
        </Text>
      </Box>

      <Stack gap="md" mb="md">
        <RequirementList
          title="Functional"
          icon={IconListCheck}
          items={suggestion.functionalRequirements}
          color="indigo"
          emptyText="None drafted."
        />
        <RequirementList
          title="Non-functional"
          icon={IconShieldCheck}
          items={suggestion.nonFunctionalRequirements}
          color="teal"
          emptyText="None drafted."
        />
      </Stack>

      <Divider mb="sm" />
      <Group gap="sm" justify="flex-end">
        <Button
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<IconX size={14} />}
          onClick={handleDismiss}
          loading={dismissing}
          disabled={busy && !dismissing}
        >
          Dismiss
        </Button>
        <Button
          variant="accent"
          size="compact-sm"
          leftSection={<IconPlus size={14} />}
          onClick={handleAccept}
          loading={accepting}
          disabled={busy && !accepting}
        >
          Add to plan
        </Button>
      </Group>
    </Card>
  )
}
