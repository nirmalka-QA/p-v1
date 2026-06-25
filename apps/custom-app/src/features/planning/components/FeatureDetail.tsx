import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import { Box, Group, Title, Text, Button, Menu, Divider, Stack, Badge, Tooltip, ActionIcon, Select } from '@mantine/core'
import {
  IconTrash,
  IconChevronDown,
  IconListCheck,
  IconShieldCheck,
  IconEye,
  IconBinaryTree2,
  IconX,
  IconPlus,
} from '@tabler/icons-react'
import { ConfirmModal } from '@wispr/ui'
import { EditMenu } from '@wispr/ui'
import { AiEditModal } from '../../../components/ui/AiEditModal'
import { PriorityBadge, ComplexityBadge, AIBadge, FeatureStatusBadge } from './PlanningBadges'
import { RequirementList } from './RequirementList'
import { FeatureFormModal } from './FeatureFormModal'
import { ReviewAlertBanner } from '../../impact/components/ReviewAlertBanner'
import { FEATURE_STATUS_OPTIONS } from '../utility/constants/constants'
import { sortByOrder, visibleFeatures } from '../utility/helpers/helpers'
import {
  useDeleteFeatureMutation,
  useSetFeatureStatusMutation,
  useEnhanceFeatureMutation,
  useGetPlanQuery,
  useAddFeatureDependencyMutation,
} from '../utility/services/planningApi'
import { useGetStoriesQuery, useRejectDependencyMutation } from '../../features/utility/services/featuresApi'
import { visibleStories } from '../../features/utility/helpers/helpers'
import { PARAM_FEATURE } from '../utility/constants/params'
import { DependencyGraph } from '../../../components/ui/DependencyGraph'
import { buildFeatureNodes, focusSubgraph } from '../../../components/ui/dependencyGraph.helpers'
import type { Feature, FeatureStatus } from '../utility/models/model'

interface FeatureDetailProps {
  feature: Feature
  projectId: string
}

/**
 * Main Planning panel: full detail for the selected feature — meta, description,
 * and its functional / non-functional requirements — plus a status control,
 * edit, and delete (reordering lives in the sidebar). Requirements §6.2 / §6.3.
 */
export function FeatureDetail({ feature, projectId }: FeatureDetailProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteFeature, { isLoading: deleting }] = useDeleteFeatureMutation()
  const [setFeatureStatus] = useSetFeatureStatusMutation()
  const [enhanceFeature, { isLoading: enhancing }] = useEnhanceFeatureMutation()
  const [addFeatureDependency, { isLoading: addingDep }] = useAddFeatureDependencyMutation()
  const [rejectDependency] = useRejectDependencyMutation()
  const [newDep, setNewDep] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Direct feature-dependency neighbourhood (derived from story links): this feature
  // plus the features it depends on and those that depend on it.
  const { data: plan } = useGetPlanQuery(projectId ?? skipToken)
  const { data: stories = [] } = useGetStoriesQuery(projectId ?? skipToken)
  const planFeatures = visibleFeatures(plan?.features ?? [])
  const featureNeighbourhood = focusSubgraph(
    buildFeatureNodes(sortByOrder(planFeatures), visibleStories(stories)),
    feature.id,
  )

  // Explicit AI-generated/manual prerequisite features (ADR-0026), shown inline as clickable chips.
  const featureTitleById = new Map(planFeatures.map((f) => [f.id, f.title]))
  const dependsOn = (feature.dependencies ?? []).filter((id) => featureTitleById.has(id))
  // Candidate prerequisites: any other feature not already a dependency (cycles rejected server-side).
  const depCandidates = planFeatures
    .filter((f) => f.id !== feature.id && !dependsOn.includes(f.id))
    .map((f) => ({ value: f.id, label: `${f.id} · ${f.title}` }))

  async function addDependency() {
    if (!newDep) return
    try {
      await addFeatureDependency({ projectId, featureId: feature.id, dependsOn: newDep }).unwrap()
      setNewDep(null)
    } catch (err) {
      const status = (err as { status?: number })?.status
      notifications.show({
        color: 'red',
        title: status === 409 ? 'Would create a cycle' : 'Could not add dependency',
        message: status === 409 ? 'That prerequisite depends (directly or indirectly) on this feature.' : 'Please try again.',
      })
    }
  }

  // Removing a dependency rejects it (persisted) so AI regeneration won't re-add the same edge.
  async function removeDependency(dependsOnId: string) {
    try {
      await rejectDependency({ projectId, kind: 'feature', source: feature.id, dependsOn: dependsOnId }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Could not remove dependency', message: 'Please try again.' })
    }
  }

  const isApproved = feature.status === 'approved'
  const isUnderReview = feature.status === 'under-review'
  // Quick review toggle is offered for pre-approval, non-discarded features.
  const canToggleReview = ['proposed', 'under-review', 'in-progress'].includes(feature.status)

  async function handleEnhance(instructions?: string) {
    try {
      await enhanceFeature({ projectId, featureId: feature.id, instructions }).unwrap()
      setAiOpen(false)
      notifications.show({
        color: 'teal',
        title: 'Feature enhanced',
        message: 'The AI expanded the description and requirements.',
      })
    } catch {
      notifications.show({ color: 'red', title: 'Enhancement failed', message: 'Please try again.' })
    }
  }

  async function changeStatus(status: FeatureStatus) {
    if (status === feature.status) return
    try {
      await setFeatureStatus({ projectId, featureId: feature.id, status }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Could not update status', message: 'Please try again.' })
    }
  }

  async function handleDelete() {
    try {
      await deleteFeature({ projectId, featureId: feature.id }).unwrap()
      notifications.show({
        color: 'teal',
        title: 'Feature removed',
        message: `“${feature.title}” has been removed from your plan.`,
      })
      setConfirmDelete(false)
    } catch {
      notifications.show({
        color: 'red',
        title: 'Could not remove feature',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Box>
      <ReviewAlertBanner projectId={projectId} kind="feature" refId={feature.id} />

      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
        <Box>
          <Group gap="sm" mb={6} wrap="wrap">
            <Text size="xs" ff="monospace" c="dimmed">
              {feature.id}
            </Text>
            {feature.aiGenerated && <AIBadge />}
            <FeatureStatusBadge status={feature.status} size="xs" />
          </Group>
          <Title order={3} size="h3">
            {feature.title}
          </Title>
          <Group gap="xs" mt="sm">
            <PriorityBadge priority={feature.priority} />
            <ComplexityBadge complexity={feature.complexity} />
          </Group>
          <Group gap={6} mt="sm" wrap="wrap" align="center">
            <Group gap={4} align="center" wrap="nowrap">
              <IconBinaryTree2 size={13} />
              <Text size="xs" c="dimmed">
                Depends on:
              </Text>
            </Group>
            {dependsOn.length === 0 && (
              <Text size="xs" c="dimmed" fs="italic">
                none
              </Text>
            )}
            {dependsOn.map((id) => (
              <Badge
                key={id}
                size="sm"
                variant="default"
                radius="sm"
                ff="monospace"
                rightSection={
                  <ActionIcon
                    size={14}
                    variant="transparent"
                    color="gray"
                    aria-label={`Remove dependency ${id}`}
                    onClick={() => void removeDependency(id)}
                  >
                    <IconX size={11} />
                  </ActionIcon>
                }
              >
                <Tooltip label={featureTitleById.get(id) ?? id} withinPortal>
                  <Text
                    span
                    size="xs"
                    ff="monospace"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams)
                      next.set(PARAM_FEATURE, id)
                      setSearchParams(next)
                    }}
                  >
                    {id}
                  </Text>
                </Tooltip>
              </Badge>
            ))}
            {depCandidates.length > 0 && (
              <Group gap={4} align="center" wrap="nowrap">
                <Select
                  size="xs"
                  w={220}
                  placeholder="Add a prerequisite…"
                  data={depCandidates}
                  value={newDep}
                  onChange={setNewDep}
                  searchable
                  comboboxProps={{ withinPortal: true }}
                />
                <Tooltip label="Add dependency" withArrow>
                  <ActionIcon
                    variant="light"
                    color="indigo"
                    loading={addingDep}
                    disabled={!newDep}
                    aria-label="Add dependency"
                    onClick={() => void addDependency()}
                  >
                    <IconPlus size={15} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>
        </Box>

        <Group gap="xs" wrap="nowrap">
          {canToggleReview && (
            <Button
              variant={isUnderReview ? 'light' : 'subtle'}
              color="yellow"
              leftSection={<IconEye size={15} />}
              onClick={() => changeStatus(isUnderReview ? 'proposed' : 'under-review')}
              title={isUnderReview ? 'Reviewing — click to move back to Proposed' : 'Flag this feature as being finalized'}
            >
              {isUnderReview ? 'Under review' : 'Mark under review'}
            </Button>
          )}
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <Button variant="default" rightSection={<IconChevronDown size={14} />}>
                Status
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Set status</Menu.Label>
              {FEATURE_STATUS_OPTIONS.map((opt) => (
                <Menu.Item
                  key={opt.value}
                  disabled={opt.value === feature.status}
                  onClick={() => changeStatus(opt.value)}
                >
                  {opt.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <EditMenu onManual={() => setEditOpen(true)} onAI={() => setAiOpen(true)} />
          {!isApproved && (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={15} />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </Group>
      </Group>

      <Text size="sm" c="dimmed" lh={1.6} mb="lg">
        {feature.description}
      </Text>

      <Divider mb="lg" />

      <Stack gap="xl">
        <RequirementList
          title="Functional requirements"
          icon={IconListCheck}
          items={feature.functionalRequirements}
          color="indigo"
          emptyText="No functional requirements captured yet. Use Edit to add what this feature must do."
        />
        <RequirementList
          title="Non-functional requirements"
          icon={IconShieldCheck}
          items={feature.nonFunctionalRequirements}
          color="teal"
          emptyText="No non-functional requirements yet. Use Edit to add performance, security, or accessibility constraints."
        />

        {/* Direct feature dependencies (this feature highlighted). Click a node to open it. */}
        {featureNeighbourhood.length > 0 && (
          <Box>
            <Group gap="xs" mb={6}>
              <IconBinaryTree2 size={16} />
              <Text size="sm" fw={600}>
                Direct dependencies
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb={6}>
              AI-identified prerequisites and story links — an arrow points from a dependency to the feature that needs it.
            </Text>
            <DependencyGraph
              nodes={featureNeighbourhood}
              onSelect={(id) => {
                const next = new URLSearchParams(searchParams)
                next.set(PARAM_FEATURE, id)
                setSearchParams(next)
              }}
            />
          </Box>
        )}
      </Stack>

      <FeatureFormModal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        feature={feature}
      />
      <AiEditModal
        opened={aiOpen}
        onClose={() => setAiOpen(false)}
        title={`Edit ${feature.id} with AI`}
        description="Expands this feature’s description and adds functional / non-functional requirements."
        loading={enhancing}
        onEnhance={handleEnhance}
      />
      <ConfirmModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete feature"
        message={`Remove “${feature.title}” from your plan? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
        danger
      />
    </Box>
  )
}
