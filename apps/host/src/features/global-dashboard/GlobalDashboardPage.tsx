import { Navigate } from 'react-router-dom'
import { Box, Stack, Group, SimpleGrid, Paper, Title, Text, Badge, Skeleton } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { useAppSelector } from '@wispr/store'
import { ROUTES } from '@wispr/contracts'
import { isPlatformAdmin } from '../auth/utility/helpers/helpers'
import { useGetDashboardStatsQuery } from './utility/services/services'
import { KpiRow } from './components/KpiRow/KpiRow'
import { TypeBars } from './components/TypeBars/TypeBars'
import { HealthCells } from './components/HealthCells/HealthCells'
import { RecentActivity } from './components/RecentActivity/RecentActivity'

/**
 * The platform (admin) dashboard (`/dashboard`) — org-wide aggregates across every
 * workspace and project. Admin-gated: non-admins are redirected to the workspace
 * list and never see the nav entry.
 */
export function GlobalDashboardPage() {
  const user = useAppSelector((s) => s.session.user)
  const isAdmin = isPlatformAdmin(user)

  const { data, isFetching, isError, refetch } = useGetDashboardStatsQuery(undefined, {
    skip: !isAdmin,
  })

  if (!isAdmin) return <Navigate to={ROUTES.workspaces} replace />

  return (
    <Box maw={1080} mx="auto" w="100%" px={28} pt={44} pb={80}>
      <Stack gap={4} mb="lg">
        <Group gap="sm" align="center">
          <Title order={2} size="h2">
            Platform Dashboard
          </Title>
          <Badge color="violet" variant="light">
            Admin
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Organisation-wide view across every workspace and project. Visible to platform
          administrators.
        </Text>
      </Stack>

      {isFetching && (
        <Stack gap="md">
          <Skeleton height={92} radius="md" />
          <Skeleton height={220} radius="md" />
        </Stack>
      )}

      {!isFetching && isError && (
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load the dashboard"
          description="Something went wrong while fetching platform metrics. Please try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      )}

      {!isFetching && !isError && data && (
        <Stack gap="lg">
          <KpiRow
            items={[
              { label: 'Workspaces', value: data.workspaceCount },
              { label: 'Projects', value: data.projectCount },
              { label: 'People', value: data.peopleCount },
              { label: 'Artifacts', value: data.artifactCount },
            ]}
          />
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder radius="md" p="lg" h="100%">
              <Text fw={700} size="sm" mb="md">
                Projects by type
              </Text>
              <TypeBars rows={data.projectsByType} />
            </Paper>
            <Paper withBorder radius="md" p="lg" h="100%">
              <Text fw={700} size="sm" mb="md">
                Delivery health
              </Text>
              <HealthCells health={data.health} />
              <Text fw={700} size="sm" mt="lg" mb="xs">
                Recent activity
              </Text>
              <RecentActivity items={data.recentActivity} />
            </Paper>
          </SimpleGrid>
        </Stack>
      )}
    </Box>
  )
}
