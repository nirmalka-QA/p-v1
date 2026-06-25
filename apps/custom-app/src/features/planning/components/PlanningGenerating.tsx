import { Box, Title, Text, Card, Group, Badge, SimpleGrid, List } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { AIProgressSteps } from '../../../components/ui/AIProgressSteps'
import type { AnalysisStep } from '../../../types'

interface PlanningGeneratingProps {
  steps: AnalysisStep[]
}

/**
 * Focused screen shown while the AI generates the initial feature list from the
 * Knowledge Base. Mirrors Discovery's analysis-progress experience (requirements §2.3).
 */
export function PlanningGenerating({ steps }: PlanningGeneratingProps) {
  return (
    <Box>
      <Group gap="xs" mb="xs">
        <Badge color="violet" variant="light" radius="sm" leftSection={<IconSparkles size={10} />}>
          AI
        </Badge>
        <Title order={2} size="h2">
          Planning your features
        </Title>
      </Group>
      <Text size="sm" c="dimmed" mb="lg">
        Reading your Knowledge Base and drafting a structured feature list. This only happens once —
        you can refine and regenerate it afterwards.
      </Text>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Card withBorder radius="md" padding="lg">
          <AIProgressSteps steps={steps} />
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="sm" fw={600} mb="xs">
            What you’ll get
          </Text>
          <List size="sm" spacing="xs" c="dimmed">
            <List.Item>A prioritised list of primary features and modules.</List.Item>
            <List.Item>Functional & non-functional requirements drafted for each one.</List.Item>
            <List.Item>Extra AI suggestions you can review and add to the plan.</List.Item>
          </List>
        </Card>
      </SimpleGrid>
    </Box>
  )
}
