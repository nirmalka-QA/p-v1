import { Link } from 'react-router-dom'
import { Button, Stack, Text, Title } from '@mantine/core'

/** A relative-route screen inside the remote, rendered into the host's router. */
export function Settings() {
  return (
    <Stack gap="md">
      <Title order={3}>Settings</Title>
      <Text c="dimmed">
        Rendered by a RELATIVE route inside the remote, into the host&rsquo;s router.
      </Text>
      <Button component={Link} to=".." variant="subtle">
        Back
      </Button>
    </Stack>
  )
}
