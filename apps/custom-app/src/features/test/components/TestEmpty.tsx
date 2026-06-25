import { useNavigate } from 'react-router-dom'
import { Box, Title, Text, Alert, Button } from '@mantine/core'
import { IconInfoCircle, IconArrowRight } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'

interface TestEmptyProps {
  projectId: string
}

/**
 * Shown when the Test phase is opened before any story has been implemented. Test
 * cases track implemented stories, so we point back to Implementation
 * (requirements §9 input + gate).
 */
export function TestEmpty({ projectId }: TestEmptyProps) {
  const navigate = useNavigate()

  return (
    <Box maw={640}>
      <Title order={2} size="h2" mb="xs">
        Test
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Author test cases and scenarios for any story that's ready for development; record pass / fail
        results once its code is implemented.
      </Text>

      <Alert
        color="indigo"
        variant="light"
        icon={<IconInfoCircle size={18} />}
        title="Mark a story ready first"
      >
        <Text size="sm" mb="md" lh={1.6}>
          Test cases are built for stories that are ready for development onward. Head to Features,
          mark a story ready — then come back here to draft and track its test cases. Pass / fail
          results unlock once the story is implemented.
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
