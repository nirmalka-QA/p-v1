import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconPlugConnectedX, IconRocket } from '@tabler/icons-react'
import { projectTypeLabel } from '../../projects/utility/constants/constants'

interface RemoteFallbackProps {
  type: string
  error?: Error | undefined
  onRetry?: (() => void) | undefined
  /** When the project type has no remote yet — a graceful "coming soon" screen. */
  comingSoon?: boolean
}

/**
 * Shown when a remote can't be mounted — not running, failed to load,
 * contract-incompatible, or a type whose workspace isn't built yet (comingSoon).
 * A remote problem must always degrade to this, never take down the host.
 */
export function RemoteFallback({ type, error, onRetry, comingSoon }: RemoteFallbackProps) {
  const label = projectTypeLabel(type)

  if (comingSoon) {
    return (
      <Center mih="60vh">
        <Stack align="center" gap="sm" maw={440}>
          <ThemeIcon size={48} radius="xl" variant="light" color="violet">
            <IconRocket size={26} />
          </ThemeIcon>
          <Title order={3} ta="center">
            {label} is coming soon
          </Title>
          <Text c="dimmed" ta="center" fz="sm">
            This project type isn’t available yet. Its workspace is still being built — check back
            soon. Custom App and Strategy projects are ready to use today.
          </Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Center mih="60vh">
      <Stack align="center" gap="sm" maw={440}>
        <ThemeIcon size={48} radius="xl" variant="light" color="gray">
          <IconPlugConnectedX size={26} />
        </ThemeIcon>
        <Title order={3} ta="center">
          “{label}” isn’t available
        </Title>
        <Text c="dimmed" ta="center" fz="sm">
          This project type’s micro-frontend isn’t running or couldn’t be loaded. Start the
          remote, or check the remote registry.
        </Text>
        {error ? (
          <Text c="dimmed" ta="center" fz="xs">
            {error.message}
          </Text>
        ) : null}
        {onRetry ? (
          <Button variant="light" color="indigo" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </Stack>
    </Center>
  )
}
