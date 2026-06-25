import { useNavigate } from 'react-router-dom'
import { Box, Title, Text, Alert, Button } from '@mantine/core'
import { IconInfoCircle, IconArrowRight } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'

interface ImplementationEmptyProps {
  projectId: string
}

/**
 * Shown when Implementation is opened with no stories ready for development.
 * Code generation needs ready-for-dev stories, so we point back to Features
 * (requirements §8 input + gate).
 */
export function ImplementationEmpty({ projectId }: ImplementationEmptyProps) {
  const navigate = useNavigate()

  return (
    <Box maw={640}>
      <Title order={2} size="h2" mb="xs">
        Implementation
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Generate code for ready stories and browse the connected repository.
      </Text>

      <Alert color="indigo" variant="light" icon={<IconInfoCircle size={18} />} title="Mark a story Ready for Dev first">
        <Text size="sm" mb="md" lh={1.6}>
          Implementation works from stories marked “Ready for Dev.” Head to Features, mark at least one
          story ready, then come back here to generate its code.
        </Text>
        <Button
          variant="accent"
          rightSection={<IconArrowRight size={14} />}
          onClick={() => navigate(ROUTES.features(projectId))}
        >
          Go to Features
        </Button>
      </Alert>
    </Box>
  )
}
