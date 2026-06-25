import { useState, useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import {
  Modal,
  Stack,
  Group,
  Box,
  Text,
  Title,
  Badge,
  Button,
  List,
  Divider,
  Textarea,
  Paper,
  ScrollArea,
  Anchor,
} from '@mantine/core'
import { Fragment } from 'react'
import { IconSparkles, IconPencil, IconLink } from '@tabler/icons-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { ReviewAlertBanner } from '../../impact/components/ReviewAlertBanner'
import { DictationButton } from '../../../components/ui/DictationButton'
import { appendTranscript } from '../../../hooks/useDictation'
import { useEnhanceStoryMutation } from '../utility/services/featuresApi'
import { DependencyGraph } from '../../../components/ui/DependencyGraph'
import { buildStoryNodes, focusSubgraph } from '../../../components/ui/dependencyGraph.helpers'
import type { Story } from '../utility/models/model'

interface StoryDetailModalProps {
  story: Story | null
  /** All active project stories, for the direct-dependency neighbourhood graph. */
  allStories?: Story[]
  opened: boolean
  onClose: () => void
  projectId: string
  onEdit: (story: Story) => void
  /** Project-wide id (slug) → title map, for naming dependencies. */
  storyTitleById: Map<string, string>
  /** Open another story by its slug (used by clickable dependency / blocker links). */
  onOpenStory?: (storyId: string) => void
}

/** Renders text, turning any story slug (US-001) that exists in the project into a clickable link. */
function renderWithStoryLinks(
  text: string,
  storyTitleById: Map<string, string>,
  onOpenStory?: (id: string) => void,
) {
  const parts = text.split(/(US-\d+)/g)
  return parts.map((part, i) => {
    if (/^US-\d+$/.test(part) && storyTitleById.has(part) && onOpenStory) {
      return (
        <Anchor key={i} component="button" type="button" inherit onClick={() => onOpenStory(part)}>
          {part}
        </Anchor>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

/** A labelled bullet list for one of a story's analysis sections; renders nothing when empty. */
function DetailList({
  label,
  items,
  storyTitleById,
  onOpenStory,
}: {
  label: string
  items?: string[]
  storyTitleById: Map<string, string>
  onOpenStory?: (id: string) => void
}) {
  if (!items || items.length === 0) return null
  return (
    <Box>
      <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
        {label}
      </Text>
      <List size="sm" spacing={4} c="dimmed" withPadding>
        {items.map((item, i) => (
          <List.Item key={i}>{renderWithStoryLinks(item, storyTitleById, onOpenStory)}</List.Item>
        ))}
      </List>
    </Box>
  )
}

/**
 * Read view for a single user story with the option to enhance it — manually
 * (Edit) or with AI (enriches the description + acceptance criteria, optionally
 * steered by free-text instructions).
 */
export function StoryDetailModal({
  story,
  allStories = [],
  opened,
  onClose,
  projectId,
  onEdit,
  storyTitleById,
  onOpenStory,
}: StoryDetailModalProps) {
  const [enhanceStory, { isLoading: enhancing }] = useEnhanceStoryMutation()
  const [instructions, setInstructions] = useState('')

  // Clear the guidance box whenever a different story is opened.
  useEffect(() => {
    if (opened) setInstructions('')
  }, [opened, story?.id])

  if (!story) return null

  async function handleEnhance() {
    if (!story) return
    try {
      await enhanceStory({ projectId, storyId: story.id, instructions: instructions.trim() || undefined }).unwrap()
      setInstructions('')
      notifications.show({
        color: 'teal',
        title: 'Story enhanced',
        message: 'The AI expanded the description and acceptance criteria.',
      })
    } catch {
      notifications.show({ color: 'red', title: 'Enhancement failed', message: 'Please try again.' })
    }
  }

  // Focused dependency neighbourhood: this story plus the stories it depends on and
  // the stories that depend on it (one hop). Empty when the story has no direct links.
  const dependencyNeighbourhood = focusSubgraph(buildStoryNodes(allStories), story.id)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      title={
        <Group gap="xs">
          <Text size="xs" ff="monospace" c="dimmed">
            {story.id}
          </Text>
          <StatusBadge status={story.status} size="xs" />
        </Group>
      }
    >
      <Stack gap="md">
        <ReviewAlertBanner projectId={projectId} kind="story" refId={story.id} />

        <Box>
          <Title order={4} size="h4">
            {story.title}
          </Title>
          <Group gap="xs" mt={6} wrap="wrap">
            <Badge size="xs" variant="default" radius="sm" ff="monospace">
              {story.effort} pts
            </Badge>
            {story.version && (
              <Badge size="xs" variant="default" radius="sm" ff="monospace">
                v{story.version}
              </Badge>
            )}
            {story.epic && (
              <Badge size="xs" variant="light" color="grape" radius="sm">
                {story.epic}
              </Badge>
            )}
            {story.assignee && (
              <Badge size="xs" variant="light" color="indigo" radius="sm">
                {story.assignee}
              </Badge>
            )}
            {story.dependencies.length > 0 && (
              <Badge size="xs" variant="default" radius="sm" leftSection={<IconLink size={10} />}>
                {story.dependencies.length} dependenc{story.dependencies.length === 1 ? 'y' : 'ies'}
              </Badge>
            )}
          </Group>
        </Box>

        {/* Statement */}
        <Text size="sm" c="dimmed" lh={1.6}>
          <Text span fw={600} c="dimmed">As a</Text> {story.asA},{' '}
          <Text span fw={600} c="dimmed">I want</Text> {story.iWant},{' '}
          <Text span fw={600} c="dimmed">so that</Text> {story.soThat}.
        </Text>

        <Divider />

        {/* Description */}
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
            Description
          </Text>
          {story.description.trim() ? (
            story.description.split('\n\n').map((para, i) => (
              <Text key={i} size="sm" lh={1.6} mb="xs">
                {para}
              </Text>
            ))
          ) : (
            <Text size="sm" c="dimmed">
              No description yet — add one with Edit, or let the AI draft one below.
            </Text>
          )}
        </Box>

        {/* Background (ADR-0033) */}
        {story.background?.trim() && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Background
            </Text>
            <Text size="sm" c="dimmed" lh={1.6}>{story.background}</Text>
          </Box>
        )}

        {/* Acceptance criteria */}
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
            Acceptance criteria
          </Text>
          {story.acceptanceCriteria.length > 0 ? (
            <Stack gap="xs">
              {story.acceptanceCriteria.map((ac, i) => (
                <Paper key={i} withBorder p="xs" radius="sm">
                  <Group gap="xs" mb={ac.given || ac.when || ac.then ? 4 : 0} wrap="nowrap">
                    <Badge size="xs" variant="light" radius="sm">{ac.type || 'scenario'}</Badge>
                    {ac.title && <Text size="sm" fw={600}>{ac.title}</Text>}
                  </Group>
                  {(ac.given || ac.when || ac.then) && (
                    <Text size="xs" c="dimmed" lh={1.6}>
                      {ac.given && <><Text span fw={600} c="dimmed">Given</Text> {ac.given}{' '}</>}
                      {ac.when && <><Text span fw={600} c="dimmed">When</Text> {ac.when}{' '}</>}
                      {ac.then && <><Text span fw={600} c="dimmed">Then</Text> {ac.then}</>}
                    </Text>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              None captured yet.
            </Text>
          )}
        </Box>

        {/* Rich analysis (AI-generated; ADR-0017) — render only the sections that have content. */}
        <DetailList label="Business requirements" items={story.businessRequirements} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
        <DetailList label="Functional requirements" items={story.functionalRequirements} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
        <DetailList label="Non-functional requirements" items={story.nonFunctionalRequirements} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
        <DetailList label="Out of scope" items={story.outOfScope} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
        <DetailList label="Data requirements" items={story.dataRequirements} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
        <DetailList label="Assumptions" items={story.assumptions} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />

        {/* Navigation flow (ADR-0033) */}
        {story.navigationFlow && (story.navigationFlow.entryPoint || story.navigationFlow.happyPath.length > 0
          || story.navigationFlow.alternatePaths.length > 0 || story.navigationFlow.exceptionPaths.length > 0) && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Navigation flow
            </Text>
            {story.navigationFlow.entryPoint && (
              <Text size="sm" c="dimmed" mb={4}>
                <Text span fw={600} c="dimmed">Entry point:</Text> {story.navigationFlow.entryPoint}
              </Text>
            )}
            <DetailList label="Happy path" items={story.navigationFlow.happyPath} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
            <DetailList label="Alternate paths" items={story.navigationFlow.alternatePaths} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
            <DetailList label="Exception paths" items={story.navigationFlow.exceptionPaths} storyTitleById={storyTitleById} onOpenStory={onOpenStory} />
          </Box>
        )}

        {/* UI components (ADR-0033) */}
        {(story.components?.length ?? 0) > 0 && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              UI components
            </Text>
            <Stack gap="xs">
              {story.components!.map((c, i) => (
                <Paper key={i} withBorder p="xs" radius="sm">
                  <Group gap="xs" wrap="wrap">
                    <Text size="sm" fw={600}>{c.name}</Text>
                    {c.type && <Badge size="xs" variant="default" radius="sm">{c.type}</Badge>}
                    {!c.editable && <Badge size="xs" variant="light" color="gray" radius="sm">read-only</Badge>}
                  </Group>
                  {c.defaultState && <Text size="xs" c="dimmed">Default: {c.defaultState}</Text>}
                  {c.notes && <Text size="xs" c="dimmed">{c.notes}</Text>}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {/* Validation rules (ADR-0033) */}
        {(story.validationRules?.length ?? 0) > 0 && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Validation rules
            </Text>
            <Stack gap="xs">
              {story.validationRules!.map((r, i) => (
                <Paper key={i} withBorder p="xs" radius="sm">
                  <Group gap="xs" wrap="wrap">
                    <Text size="sm" fw={600} ff="monospace">{r.field}</Text>
                    {r.dataType && <Badge size="xs" variant="default" radius="sm">{r.dataType}</Badge>}
                    {r.required && <Badge size="xs" variant="light" color="red" radius="sm">required</Badge>}
                    {r.validationTiming && <Badge size="xs" variant="light" radius="sm">{r.validationTiming}</Badge>}
                  </Group>
                  {(r.min || r.max || r.format) && (
                    <Text size="xs" c="dimmed">
                      {r.min && `min ${r.min} `}{r.max && `max ${r.max} `}{r.format && `format: ${r.format}`}
                    </Text>
                  )}
                  {r.errorMessage && <Text size="xs" c="dimmed">Error: {r.errorMessage}</Text>}
                  {r.serverSideRule && <Text size="xs" c="dimmed">Server: {r.serverSideRule}</Text>}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {/* Dependencies */}
        {story.dependencies.length > 0 && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Depends on
            </Text>
            <List size="sm" spacing={4} c="dimmed" withPadding>
              {story.dependencies.map((id) => (
                <List.Item key={id}>
                  <Anchor
                    component="button"
                    type="button"
                    ff="monospace"
                    size="xs"
                    onClick={() => onOpenStory?.(id)}
                  >
                    {id}
                  </Anchor>{' '}
                  {storyTitleById.get(id) ?? ''}
                </List.Item>
              ))}
            </List>
          </Box>
        )}

        {/* Direct dependency graph — this story (highlighted) and its immediate
            dependencies / dependents. Click a node to open that story. */}
        {dependencyNeighbourhood.length > 0 && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Direct dependencies
            </Text>
            <DependencyGraph nodes={dependencyNeighbourhood} onSelect={(id) => onOpenStory?.(id)} />
          </Box>
        )}

        {/* Blockers (AI-generated; ADR-0017) */}
        {(story.blockers?.length ?? 0) > 0 && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Blockers
            </Text>
            <List size="sm" spacing={4} c="dimmed" withPadding>
              {story.blockers!.map((b, i) => (
                <List.Item key={i}>{renderWithStoryLinks(b, storyTitleById, onOpenStory)}</List.Item>
              ))}
            </List>
          </Box>
        )}

        {/* Risks (AI-generated; ADR-0017) */}
        {(story.risks?.length ?? 0) > 0 && (
          <Box>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6} ff="monospace">
              Risks
            </Text>
            <List size="sm" spacing={4} c="dimmed" withPadding>
              {story.risks!.map((r, i) => (
                <List.Item key={i}>{renderWithStoryLinks(r, storyTitleById, onOpenStory)}</List.Item>
              ))}
            </List>
          </Box>
        )}

        {/* AI enhance */}
        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-violet-light)">
          <Group gap="xs" mb="xs">
            <IconSparkles size={14} color="var(--mantine-color-violet-6)" />
            <Text size="sm" fw={600}>
              Enhance with AI
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mb="sm" lh={1.5}>
            Expands the description and adds acceptance criteria. Add optional guidance to steer it.
          </Text>
          <Textarea
            placeholder="e.g. focus on accessibility, or add security acceptance criteria"
            autosize
            minRows={1}
            value={instructions}
            onChange={(e) => setInstructions(e.currentTarget.value)}
            mb="sm"
          />
          <Group gap="sm">
            <DictationButton onTranscript={(t) => setInstructions((c) => appendTranscript(c, t))} />
            <Button
              variant="light"
              color="violet"
              leftSection={<IconSparkles size={15} />}
              loading={enhancing}
              onClick={handleEnhance}
            >
              Enhance with AI
            </Button>
          </Group>
        </Paper>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Close
          </Button>
          <Button variant="default" leftSection={<IconPencil size={14} />} onClick={() => onEdit(story)}>
            Edit story
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
