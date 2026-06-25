import { Box, Group, Stack, Title, Text, Badge, List, Paper } from '@mantine/core'
import { IconListCheck, IconLink } from '@tabler/icons-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Story } from '../utility/models/model'
import { criterionText } from '../../../utility/story'

interface StoryImplDetailProps {
  story: Story
  /** Resolves dependency ids to titles for display. */
  storyTitleById: Map<string, string>
}

/** A labelled bullet list for one of a story's analysis sections; renders nothing when empty. */
function DetailList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <Box>
      <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
        {label}
      </Text>
      <List size="sm" spacing={4} c="dimmed" withPadding>
        {items.map((item, i) => (
          <List.Item key={i}>{item}</List.Item>
        ))}
      </List>
    </Box>
  )
}

/** Read-only summary of the story a developer is implementing (§8.2). */
export function StoryImplDetail({ story, storyTitleById }: StoryImplDetailProps) {
  return (
    <Box>
      <Group gap="sm" mb={6} wrap="wrap">
        <Text size="xs" ff="monospace" c="dimmed">
          {story.id}
        </Text>
        <Title order={3} size="h4">
          {story.title}
        </Title>
        <StatusBadge status={story.status} />
        <Badge color="gray" variant="default" radius="sm">
          {story.effort} pt{story.effort === 1 ? '' : 's'}
        </Badge>
      </Group>

      <Paper withBorder radius="md" p="md" mb="md">
        <Stack gap={4}>
          <Text size="sm">
            <Text span fw={600}>
              As a
            </Text>{' '}
            {story.asA || '—'}
          </Text>
          <Text size="sm">
            <Text span fw={600}>
              I want
            </Text>{' '}
            {story.iWant || '—'}
          </Text>
          <Text size="sm">
            <Text span fw={600}>
              So that
            </Text>{' '}
            {story.soThat || '—'}
          </Text>
        </Stack>
      </Paper>

      {story.description && (
        <Text size="sm" c="dimmed" lh={1.6} mb="md">
          {story.description}
        </Text>
      )}

      <Stack gap="md">
        {story.acceptanceCriteria.length > 0 && (
          <Box>
            <Group gap={6} mb={6}>
              <IconListCheck size={15} />
              <Text size="sm" fw={600}>
                Acceptance criteria
              </Text>
            </Group>
            <List size="sm" spacing={4}>
              {story.acceptanceCriteria.map((c, i) => (
                <List.Item key={i}>{criterionText(c)}</List.Item>
              ))}
            </List>
          </Box>
        )}

        {/* Rich analysis carried over from the Features phase (AI-generated; ADR-0017).
            Each section renders only when it has content. */}
        <DetailList label="Business requirements" items={story.businessRequirements} />
        <DetailList label="Functional requirements" items={story.functionalRequirements} />
        <DetailList label="Non-functional requirements" items={story.nonFunctionalRequirements} />
        <DetailList label="Out of scope" items={story.outOfScope} />
        <DetailList label="Data requirements" items={story.dataRequirements} />

        {story.dependencies.length > 0 && (
          <Box>
            <Group gap={6} mb={6}>
              <IconLink size={15} />
              <Text size="sm" fw={600}>
                Depends on
              </Text>
            </Group>
            <Group gap="xs">
              {story.dependencies.map((id) => (
                <Badge key={id} variant="outline" color="gray" radius="sm">
                  {storyTitleById.get(id) ?? id}
                </Badge>
              ))}
            </Group>
          </Box>
        )}

        <DetailList label="Blockers" items={story.blockers} />
        <DetailList label="Risks" items={story.risks} />
      </Stack>
    </Box>
  )
}
