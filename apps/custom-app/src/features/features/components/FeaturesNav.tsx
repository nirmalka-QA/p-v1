import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, TextInput, NavLink, Text, Badge, Tooltip, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useGetPlanQuery } from '../../planning/utility/services/planningApi'
import { useGetStoriesQuery } from '../utility/services/featuresApi'
import { useGetAlertsQuery } from '../../impact/utility/services/impactApi'
import { activeAlerts } from '../../impact/utility/helpers/select'
import { sortByOrder, visibleFeatures } from '../../planning/utility/helpers/helpers'
import { visibleStories } from '../utility/helpers/helpers'
import { PARAM_FEATURE } from '../utility/constants/params'
import nav from '../../../components/layout/SidebarNav.module.css'

/**
 * Features sidebar: the approved feature list, each with a story-count badge
 * (ready / total). Selecting a feature loads its stories in the main panel via
 * the shared `feature` URL param.
 */
export function FeaturesNav() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: plan } = useGetPlanQuery(projectId ?? skipToken)
  const { data: stories = [] } = useGetStoriesQuery(projectId ?? skipToken)
  const { data: alerts = [] } = useGetAlertsQuery(projectId ?? skipToken)
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  if (!plan || !projectId) return null

  const features = sortByOrder(visibleFeatures(plan.features).filter((f) => f.status === 'approved'))
  const selected = searchParams.get(PARAM_FEATURE) ?? features[0]?.id

  const q = query.trim().toLowerCase()
  const filtered = q ? features.filter((f) => f.title.toLowerCase().includes(q)) : features

  function selectFeature(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_FEATURE, id)
    setSearchParams(next)
  }

  return (
    <Box p="sm">
      <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed" px="xs" mb="xs">
        Approved Features
      </Text>

      <TextInput
        size="xs"
        placeholder="Search features…"
        leftSection={<IconSearch size={13} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="xs"
      />

      {filtered.map((feature) => {
        const featureStories = visibleStories(stories).filter((s) => s.featureId === feature.id)
        const total = featureStories.length
        const ready = featureStories.filter((s) => s.status !== 'draft').length
        const storyIds = new Set(featureStories.map((s) => s.id))
        const flagCount = activeAlerts(alerts).filter(
          (a) => a.target.kind === 'story' && storyIds.has(a.target.refId),
        ).length
        return (
          <NavLink
            key={feature.id}
            active={feature.id === selected}
            color="gray"
            classNames={{ root: `${nav.navRoot} ${nav.navRootStacked}`, label: nav.navLabel }}
            label={feature.title}
            description={
              <Text span size="xs" c="dimmed" ff="monospace">
                {feature.id}
              </Text>
            }
            onClick={() => selectFeature(feature.id)}
            rightSection={
              <Group gap={4} wrap="nowrap">
                {flagCount > 0 && (
                  <Badge size="xs" color="red" variant="filled" radius="sm" title="Stories need review">
                    {flagCount}
                  </Badge>
                )}
                <Tooltip label={`${ready} ready · ${total} total`}>
                  <Badge
                    size="xs"
                    variant={total > 0 ? 'light' : 'default'}
                    color={total > 0 && ready === total ? 'teal' : 'gray'}
                    radius="sm"
                    ff="monospace"
                  >
                    {ready}/{total}
                  </Badge>
                </Tooltip>
              </Group>
            }
          />
        )
      })}

      {filtered.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" mt="md">
          No features match “{query}”.
        </Text>
      )}
    </Box>
  )
}
