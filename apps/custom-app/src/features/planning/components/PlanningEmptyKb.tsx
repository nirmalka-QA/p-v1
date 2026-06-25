import { useNavigate } from 'react-router-dom'
import { Box, Title, Text, Alert, Button } from '@mantine/core'
import { IconInfoCircle, IconArrowRight } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'

interface PlanningEmptyKbProps {
  projectId: string
}

/**
 * Shown when Planning is opened before a Knowledge Base exists. Planning draws
 * entirely from the KB, so we direct the user to Discovery first (requirements §6.1).
 */
export function PlanningEmptyKb({ projectId }: PlanningEmptyKbProps) {
  const navigate = useNavigate()

  return (
    <Box maw={640}>
      <Title order={2} size="h2" mb="xs">
        Planning
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Planning turns your Knowledge Base into a structured feature list.
      </Text>

      <Alert
        color="indigo"
        variant="light"
        icon={<IconInfoCircle size={18} />}
        title="A Knowledge Base is required first"
      >
        <Text size="sm" mb="md" lh={1.6}>
          The AI builds your feature list from the context captured in Discovery. Add some context
          there first, then come back to plan — everything will be pre-generated for you.
        </Text>
        <Button
          variant="accent"
          rightSection={<IconArrowRight size={14} />}
          onClick={() => navigate(ROUTES.discovery(projectId))}
        >
          Go to Discovery
        </Button>
      </Alert>
    </Box>
  )
}
