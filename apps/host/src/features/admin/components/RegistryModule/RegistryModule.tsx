import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SimpleGrid, Card, Group, Text, Badge, Stack, ThemeIcon, Skeleton, UnstyledButton } from '@mantine/core'
import { IconChevronRight, IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { useGetProjectTypeCatalogQuery } from '@wispr/projects'
import { PROJECT_TYPE_META } from '../../../projects/utility/constants/constants'
import { REGISTRY_TYPE_PARAM } from '../../utility/constants/constants'
import { StrategyTemplatesManager } from '../StrategyTemplates/StrategyTemplatesManager'

/** Project types that have a configuration surface in the registry today. */
const CONFIGURABLE = new Set<string>(['strategy'])

/**
 * Project-type registry — the landing surface of the registry tab. Lists every
 * federation project type; the ones with a configuration surface (Strategy today)
 * drill into their manager via the `?ptype=` URL param. The rest read as
 * "configuration coming soon" until their surface ships.
 */
export function RegistryModule() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeType = searchParams.get(REGISTRY_TYPE_PARAM)

  const { data: catalog, isLoading, isError, refetch } = useGetProjectTypeCatalogQuery()

  const types = useMemo(() => catalog ?? [], [catalog])

  function openType(key: string) {
    const next = new URLSearchParams(searchParams)
    next.set(REGISTRY_TYPE_PARAM, key)
    setSearchParams(next, { replace: false })
  }

  function closeType() {
    const next = new URLSearchParams(searchParams)
    next.delete(REGISTRY_TYPE_PARAM)
    setSearchParams(next, { replace: false })
  }

  // Drilled into Strategy → render its template manager.
  if (activeType === 'strategy') {
    return <StrategyTemplatesManager onBack={closeType} />
  }

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={104} radius="md" />
        ))}
      </SimpleGrid>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load project types"
        description="Something went wrong while fetching the project-type catalogue. Please try again."
        action={{ label: 'Retry', onClick: () => refetch() }}
      />
    )
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {types.map((type) => {
        const meta = PROJECT_TYPE_META[type.key]
        const Icon = meta?.icon
        const configurable = CONFIGURABLE.has(type.key)
        const color = meta?.colorSeed ?? 'gray'

        const inner = (
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Group wrap="nowrap" align="flex-start" gap="sm">
              {Icon && (
                <ThemeIcon size={40} radius="md" variant="light" color={color}>
                  <Icon size={20} />
                </ThemeIcon>
              )}
              <Stack gap={4} miw={0}>
                <Group gap="xs">
                  <Text fw={600}>{type.name}</Text>
                  {!configurable && (
                    <Badge size="xs" color="gray" variant="light" radius="sm">
                      Configuration coming soon
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed" lh={1.5}>
                  {type.description}
                </Text>
              </Stack>
            </Group>
            {configurable && <IconChevronRight size={18} style={{ flexShrink: 0, opacity: 0.5 }} />}
          </Group>
        )

        if (!configurable) {
          return (
            <Card key={type.key} withBorder radius="md" padding="md" opacity={0.7}>
              {inner}
            </Card>
          )
        }

        return (
          <UnstyledButton key={type.key} onClick={() => openType(type.key)}>
            <Card withBorder radius="md" padding="md" style={{ cursor: 'pointer' }}>
              {inner}
            </Card>
          </UnstyledButton>
        )
      })}
    </SimpleGrid>
  )
}
