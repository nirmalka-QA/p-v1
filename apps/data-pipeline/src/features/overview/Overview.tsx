import { Link } from 'react-router-dom'
import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useAppSelector } from '@wispr/store'
import type { ProjectAppProps } from '@wispr/mfe-runtime'

interface OverviewProps {
  ctx: ProjectAppProps
}

/**
 * Overview screen — doubles as the federation smoke test: useAppSelector reads
 * the HOST's store via the shared react-redux context, so `user (shared store)`
 * should equal `user (prop)`. Mantine proves the shared theme; the relative
 * <Link> proves the shared router; services/eventBus/onNavigate come from props.
 */
export function Overview({ ctx }: OverviewProps) {
  const userFromStore = useAppSelector((s) => s.session.user)
  const colorSchemeFromStore = useAppSelector((s) => s.theme.colorScheme)
  return (
    <Stack gap="md" data-testid="remote-data-pipeline">
      <Group>
        <Title order={2}>Data Pipeline</Title>
        <Badge variant="light" color="indigo">
          remote: data-pipeline
        </Badge>
      </Group>
      <Card withBorder>
        <Stack gap="xs">
          <Text fz="sm">
            contractVersion (prop): <b>{ctx.contractVersion}</b>
          </Text>
          <Text fz="sm">
            projectId (prop): <b>{ctx.projectId}</b>
          </Text>
          <Text fz="sm">
            theme (prop): <b>{ctx.theme}</b> · colorScheme (shared store):{' '}
            <b>{colorSchemeFromStore}</b>
          </Text>
          <Text fz="sm">
            user (prop): <b>{ctx.user.name}</b> · user (shared store):{' '}
            <b data-testid="store-user">{userFromStore?.name ?? '—'}</b>
          </Text>
        </Stack>
      </Card>
      <Group>
        <Button
          variant="light"
          color="violet"
          onClick={() =>
            ctx.services.notify.show({ message: 'Hello from the data-pipeline remote', type: 'success' })
          }
        >
          Notify via host services
        </Button>
        <Button variant="subtle" onClick={() => ctx.eventBus.emit('demo:ping', { from: 'data-pipeline' })}>
          Emit on shared event bus
        </Button>
        <Button component={Link} to="settings" variant="default">
          Settings (relative route)
        </Button>
        <Button variant="default" onClick={() => ctx.onNavigate('/')}>
          Back to dashboard (onNavigate)
        </Button>
      </Group>
    </Stack>
  )
}
