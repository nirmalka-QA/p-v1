import { useNavigate } from 'react-router-dom'
import { Box, Title, Text, Alert, Button } from '@mantine/core'
import { IconInfoCircle, IconArrowRight } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'

interface FeaturesEmptyProps {
  projectId: string
}

/**
 * Shown when the Features phase is opened before a plan has been approved. The
 * story breakdown needs an approved feature list, so we point back to Planning
 * (requirements §7 input + gate).
 */
export function FeaturesEmpty({ projectId }: FeaturesEmptyProps) {
  const navigate = useNavigate()

  return (
    <Box maw={640}>
      <Title order={2} size="h2" mb="xs">
        Features
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Break approved features into user stories ready for development.
      </Text>

      <Alert
        color="indigo"
        variant="light"
        icon={<IconInfoCircle size={18} />}
        title="Approve a plan first"
      >
        <Text size="sm" mb="md" lh={1.6}>
          User stories are generated from your approved feature list. Head to Planning, review the
          features, and click “Approve Plan” — then come back here to break them into stories.
        </Text>
        <Button
          variant="accent"
          rightSection={<IconArrowRight size={14} />}
          onClick={() => navigate(ROUTES.planning(projectId))}
        >
          Go to Planning
        </Button>
      </Alert>
    </Box>
  )
}
