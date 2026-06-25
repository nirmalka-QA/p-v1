import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import {
  Box,
  Button,
  TextInput,
  NavLink,
  Text,
  Group,
  Divider,
  ColorSwatch,
  Badge,
} from '@mantine/core'
import {
  IconSearch,
  IconPlus,
  IconSparkles,
  IconArrowsSort,
  IconCheck,
  IconGripVertical,
} from '@tabler/icons-react'
import { useGetPlanQuery, useSetFeatureOrderMutation } from '../utility/services/planningApi'
import { useGetAlertsQuery } from '../../impact/utility/services/impactApi'
import { sortByOrder, moveFeatureOrder, visibleFeatures } from '../utility/helpers/helpers'
import { PRIORITY_META, COMPLEXITY_META } from '../utility/constants/constants'
import { FeatureStatusBadge } from './PlanningBadges'
import { FeatureFormModal } from './FeatureFormModal'
import { SuggestionsDrawer } from './SuggestionsDrawer'
import { PARAM_FEATURE } from '../utility/constants/params'
import styles from '../utility/styles/planning.module.css'
import nav from '../../../components/layout/SidebarNav.module.css'

/**
 * Planning sidebar: the list of primary features/modules (selectable, searchable),
 * an opt-in Reorder mode with drag-and-drop, plus entry points to add a feature
 * and review AI suggestions. Self-contained — it owns its overlays and shares only
 * the selected feature via the URL (mirrors Discovery's sections nav).
 */
export function PlanningFeaturesNav() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: plan } = useGetPlanQuery(projectId ?? skipToken)
  const { data: alerts = [] } = useGetAlertsQuery(projectId ?? skipToken)
  const [setFeatureOrder] = useSetFeatureOrderMutation()
  // Open/acknowledged change-impact alerts targeting a given feature.
  const featureAlertCount = (id: string) =>
    alerts.filter(
      (a) =>
        a.target.kind === 'feature' &&
        a.target.refId === id &&
        (a.status === 'open' || a.status === 'acknowledged'),
    ).length
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  if (!plan || !projectId) return null

  const ordered = sortByOrder(visibleFeatures(plan.features))
  const selected = searchParams.get(PARAM_FEATURE) ?? ordered[0]?.id

  const q = query.trim().toLowerCase()
  const filtered = q ? ordered.filter((f) => f.title.toLowerCase().includes(q)) : ordered

  function selectFeature(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_FEATURE, id)
    setSearchParams(next)
  }

  async function handleDrop(targetId: string) {
    const fromId = draggingId
    setDraggingId(null)
    setOverId(null)
    if (!fromId || fromId === targetId) return
    const orderedIds = moveFeatureOrder(
      ordered.map((f) => f.id),
      fromId,
      targetId
    )
    try {
      await setFeatureOrder({ projectId: projectId!, orderedIds }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Could not reorder', message: 'Please try again.' })
    }
  }

  return (
    <Box p="sm">
      <Button
        fullWidth
        variant="accent"
        mb="sm"
        leftSection={<IconPlus size={14} />}
        onClick={() => setAddOpen(true)}
      >
        Add feature
      </Button>

      <TextInput
        size="xs"
        placeholder="Search features…"
        leftSection={<IconSearch size={13} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="xs"
        disabled={reorderMode}
      />

      <Group justify="space-between" px="xs" mb={6}>
        <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed">
          Features
        </Text>
        <Button
          size="compact-xs"
          variant={reorderMode ? 'light' : 'subtle'}
          color={reorderMode ? 'indigo' : 'gray'}
          leftSection={reorderMode ? <IconCheck size={12} /> : <IconArrowsSort size={12} />}
          onClick={() => setReorderMode((m) => !m)}
        >
          {reorderMode ? 'Done' : 'Reorder'}
        </Button>
      </Group>

      {/* Reorder mode → draggable rows; otherwise the normal selectable nav. */}
      {reorderMode ? (
        <Box>
          {ordered.map((feature) => (
            <Box
              key={feature.id}
              draggable
              onDragStart={(e) => {
                setDraggingId(feature.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', feature.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (overId !== feature.id) setOverId(feature.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                void handleDrop(feature.id)
              }}
              onDragEnd={() => {
                setDraggingId(null)
                setOverId(null)
              }}
              className={[
                styles.dragRow,
                draggingId === feature.id && styles.dragRowActive,
                overId === feature.id && draggingId !== feature.id && styles.dragRowOver,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <IconGripVertical size={14} className={styles.dragHandle} />
              <ColorSwatch
                size={8}
                withShadow={false}
                color={`var(--mantine-color-${PRIORITY_META[feature.priority].color}-6)`}
              />
              <Box flex={1} miw={0}>
                <Text size="sm" truncate c="var(--cl-text-2)">
                  {feature.title}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {feature.id}
                </Text>
              </Box>
              <FeatureStatusBadge status={feature.status} size="xs" />
            </Box>
          ))}
        </Box>
      ) : (
        <>
          {filtered.map((feature) => (
            <NavLink
              key={feature.id}
              active={feature.id === selected}
              color="gray"
              classNames={{ root: `${nav.navRoot} ${nav.navRootStacked}`, label: nav.navLabel }}
              label={feature.title}
              description={
                <Text span className={styles.navId}>
                  {feature.id} · {COMPLEXITY_META[feature.complexity].label}
                </Text>
              }
              onClick={() => selectFeature(feature.id)}
              leftSection={
                <ColorSwatch
                  size={8}
                  withShadow={false}
                  color={`var(--mantine-color-${PRIORITY_META[feature.priority].color}-6)`}
                />
              }
              rightSection={
                <Group gap={4} wrap="nowrap">
                  {featureAlertCount(feature.id) > 0 && (
                    <Badge size="xs" color="red" variant="filled" radius="sm" title="Needs review">
                      {featureAlertCount(feature.id)}
                    </Badge>
                  )}
                  <FeatureStatusBadge status={feature.status} size="xs" />
                </Group>
              }
            />
          ))}

          {filtered.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" mt="md">
              No features match “{query}”.
            </Text>
          )}
        </>
      )}

      {/* ── AI suggestions tray entry ── */}
      <Divider my="sm" />
      <Group justify="space-between" px="xs" mb={6}>
        <Group gap={6}>
          <IconSparkles size={12} color="var(--mantine-color-violet-6)" />
          <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed">
            AI Suggestions
          </Text>
        </Group>
        <Text size="xs" c="dimmed" ff="monospace">
          {plan.suggestions.length}
        </Text>
      </Group>
      <Button
        fullWidth
        variant="light"
        color="violet"
        leftSection={<IconSparkles size={14} />}
        onClick={() => setSuggestionsOpen(true)}
      >
        Review suggestions
      </Button>

      <FeatureFormModal opened={addOpen} onClose={() => setAddOpen(false)} projectId={projectId} />
      <SuggestionsDrawer
        opened={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        projectId={projectId}
        suggestions={plan.suggestions}
      />
    </Box>
  )
}
