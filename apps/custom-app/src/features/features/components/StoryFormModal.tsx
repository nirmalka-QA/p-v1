import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { yupResolver } from 'mantine-form-yup-resolver'
import { notifications } from '@mantine/notifications'
import {
  Modal,
  Stack,
  Group,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Button,
  ScrollArea,
  ActionIcon,
  Checkbox,
  Divider,
  Paper,
  Text,
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { ListEditor } from '@wispr/ui'
import { storySchema } from '../utility/validations/validation'
import {
  STORY_FORM_INITIAL,
  EFFORT_OPTIONS,
  STORY_STATUS_OPTIONS,
  MOCK_ASSIGNEES,
  GHERKIN_TYPE_OPTIONS,
  VALIDATION_TIMING_OPTIONS,
} from '../utility/constants/constants'
import { useAddStoryMutation, useUpdateStoryMutation } from '../utility/services/featuresApi'
import type { Story, StoryFormValues } from '../utility/models/model'

interface StoryFormModalProps {
  opened: boolean
  onClose: () => void
  projectId: string
  featureId: string
  /** When provided, edits this story; otherwise adds a new one to the feature. */
  story?: Story | null
  /** All project stories — the dependency options (the story itself is excluded). */
  allStories: Story[]
}

function toFormValues(story: Story): StoryFormValues {
  return {
    title: story.title,
    description: story.description,
    asA: story.asA,
    iWant: story.iWant,
    soThat: story.soThat,
    acceptanceCriteria: story.acceptanceCriteria?.length
      ? story.acceptanceCriteria
      : [{ type: 'happy-path', title: '', given: '', when: '', then: '' }],
    background: story.background ?? '',
    epic: story.epic ?? '',
    version: story.version ?? '1.0',
    assumptions: story.assumptions ?? [],
    navigationFlow: story.navigationFlow ?? { entryPoint: '', happyPath: [], alternatePaths: [], exceptionPaths: [] },
    components: story.components ?? [],
    validationRules: story.validationRules ?? [],
    effort: String(story.effort),
    status: story.status,
    assignee: story.assignee ?? '',
    dependencies: story.dependencies,
  }
}

export function StoryFormModal({
  opened,
  onClose,
  projectId,
  featureId,
  story,
  allStories,
}: StoryFormModalProps) {
  const [addStory, { isLoading: adding }] = useAddStoryMutation()
  const [updateStory, { isLoading: updating }] = useUpdateStoryMutation()
  const isEdit = Boolean(story)
  const saving = adding || updating

  const form = useForm<StoryFormValues>({
    initialValues: STORY_FORM_INITIAL,
    validate: yupResolver(storySchema),
  })

  useEffect(() => {
    if (opened) form.setValues(story ? toFormValues(story) : STORY_FORM_INITIAL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, story])

  const dependencyOptions = allStories
    .filter((s) => s.id !== story?.id)
    .map((s) => ({ value: s.id, label: `${s.id} · ${s.title}` }))

  async function handleSubmit(values: StoryFormValues) {
    try {
      if (story) {
        await updateStory({ projectId, storyId: story.id, values }).unwrap()
      } else {
        await addStory({ projectId, featureId, values }).unwrap()
      }
      notifications.show({
        color: 'teal',
        title: isEdit ? 'Story updated' : 'Story added',
        message: `“${values.title.trim()}” has been ${isEdit ? 'updated' : 'added'}.`,
      })
      onClose()
    } catch (err) {
      const data = (err as { data?: unknown })?.data
      notifications.show({
        color: 'red',
        title: isEdit ? 'Could not update story' : 'Could not add story',
        message: typeof data === 'string' ? data : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit ${story?.id}` : 'Add a story'}
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600 } }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="Short summary of the story"
            withAsterisk
            data-autofocus
            {...form.getInputProps('title')}
          />
          <Textarea
            label="Description"
            placeholder="Optional — elaborate on context, scope, and intent beyond the one-line statement."
            autosize
            minRows={2}
            {...form.getInputProps('description')}
          />
          <Group grow>
            <TextInput label="As a" placeholder="user / administrator" withAsterisk {...form.getInputProps('asA')} />
            <Select
              label="Effort"
              data={EFFORT_OPTIONS}
              allowDeselect={false}
              {...form.getInputProps('effort')}
            />
          </Group>
          <Textarea label="I want" placeholder="the goal the user is trying to achieve" withAsterisk autosize minRows={1} {...form.getInputProps('iWant')} />
          <Textarea label="So that" placeholder="the benefit or outcome" withAsterisk autosize minRows={1} {...form.getInputProps('soThat')} />

          <Textarea
            label="Background"
            placeholder="Business problem, persona need, and upstream/downstream dependencies"
            autosize
            minRows={2}
            {...form.getInputProps('background')}
          />
          <Group grow>
            <TextInput label="Epic" placeholder="Parent epic / capability" {...form.getInputProps('epic')} />
            <TextInput label="Version" placeholder="1.0" {...form.getInputProps('version')} />
          </Group>

          <Divider label="Acceptance criteria (Gherkin)" labelPosition="left" />
          {form.getValues().acceptanceCriteria.map((_, i) => (
            <Paper key={i} withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Select w={210} size="xs" data={GHERKIN_TYPE_OPTIONS} allowDeselect={false} {...form.getInputProps(`acceptanceCriteria.${i}.type`)} />
                <ActionIcon variant="subtle" color="red" aria-label="Remove scenario" onClick={() => form.removeListItem('acceptanceCriteria', i)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              <Stack gap="xs">
                <TextInput size="xs" placeholder="Scenario title" {...form.getInputProps(`acceptanceCriteria.${i}.title`)} />
                <TextInput size="xs" placeholder="Given …" {...form.getInputProps(`acceptanceCriteria.${i}.given`)} />
                <TextInput size="xs" placeholder="When …" {...form.getInputProps(`acceptanceCriteria.${i}.when`)} />
                <TextInput size="xs" placeholder="Then …" {...form.getInputProps(`acceptanceCriteria.${i}.then`)} />
              </Stack>
            </Paper>
          ))}
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => form.insertListItem('acceptanceCriteria', { type: 'happy-path', title: '', given: '', when: '', then: '' })}
          >
            Add scenario
          </Button>

          <ListEditor
            label="Assumptions"
            optional
            addLabel="Add assumption"
            placeholder="An assumption this story relies on"
            value={form.getValues().assumptions}
            onChange={(v) => form.setFieldValue('assumptions', v)}
          />

          <Divider label="Navigation flow" labelPosition="left" />
          <TextInput label="Entry point" placeholder="Where the user starts" {...form.getInputProps('navigationFlow.entryPoint')} />
          <ListEditor label="Happy path" optional addLabel="Add step" placeholder="Ordered step" value={form.getValues().navigationFlow.happyPath} onChange={(v) => form.setFieldValue('navigationFlow.happyPath', v)} />
          <ListEditor label="Alternate paths" optional addLabel="Add step" placeholder="Alternate step / flow" value={form.getValues().navigationFlow.alternatePaths} onChange={(v) => form.setFieldValue('navigationFlow.alternatePaths', v)} />
          <ListEditor label="Exception paths" optional addLabel="Add step" placeholder="Error / exception step" value={form.getValues().navigationFlow.exceptionPaths} onChange={(v) => form.setFieldValue('navigationFlow.exceptionPaths', v)} />

          <Divider label="UI components" labelPosition="left" />
          {form.getValues().components.map((_, i) => (
            <Paper key={i} withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed">Component {i + 1}</Text>
                <ActionIcon variant="subtle" color="red" aria-label="Remove component" onClick={() => form.removeListItem('components', i)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              <Group grow>
                <TextInput size="xs" placeholder="Name" {...form.getInputProps(`components.${i}.name`)} />
                <TextInput size="xs" placeholder="Type (input / button / table …)" {...form.getInputProps(`components.${i}.type`)} />
              </Group>
              <Group grow mt="xs" align="center">
                <TextInput size="xs" placeholder="Default state" {...form.getInputProps(`components.${i}.defaultState`)} />
                <Checkbox label="Editable" {...form.getInputProps(`components.${i}.editable`, { type: 'checkbox' })} />
              </Group>
              <TextInput size="xs" mt="xs" placeholder="Notes" {...form.getInputProps(`components.${i}.notes`)} />
            </Paper>
          ))}
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => form.insertListItem('components', { name: '', type: '', defaultState: '', editable: true, notes: '' })}
          >
            Add component
          </Button>

          <Divider label="Validation rules" labelPosition="left" />
          {form.getValues().validationRules.map((_, i) => (
            <Paper key={i} withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed">Rule {i + 1}</Text>
                <ActionIcon variant="subtle" color="red" aria-label="Remove rule" onClick={() => form.removeListItem('validationRules', i)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              <Group grow>
                <TextInput size="xs" placeholder="Field" {...form.getInputProps(`validationRules.${i}.field`)} />
                <TextInput size="xs" placeholder="Data type" {...form.getInputProps(`validationRules.${i}.dataType`)} />
              </Group>
              <Group grow mt="xs" align="center">
                <TextInput size="xs" placeholder="Min" {...form.getInputProps(`validationRules.${i}.min`)} />
                <TextInput size="xs" placeholder="Max" {...form.getInputProps(`validationRules.${i}.max`)} />
                <Checkbox label="Required" {...form.getInputProps(`validationRules.${i}.required`, { type: 'checkbox' })} />
              </Group>
              <TextInput size="xs" mt="xs" placeholder="Format (e.g. email, ^[0-9]+$)" {...form.getInputProps(`validationRules.${i}.format`)} />
              <TextInput size="xs" mt="xs" placeholder="Error message" {...form.getInputProps(`validationRules.${i}.errorMessage`)} />
              <Group grow mt="xs">
                <Select size="xs" label="Timing" data={VALIDATION_TIMING_OPTIONS} allowDeselect={false} {...form.getInputProps(`validationRules.${i}.validationTiming`)} />
                <TextInput size="xs" label="Server-side rule" placeholder="optional" {...form.getInputProps(`validationRules.${i}.serverSideRule`)} />
              </Group>
            </Paper>
          ))}
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => form.insertListItem('validationRules', { field: '', dataType: '', required: true, min: '', max: '', format: '', errorMessage: '', validationTiming: 'on-submit', serverSideRule: '' })}
          >
            Add validation rule
          </Button>

          <Divider />

          <Group grow>
            <Select
              label="Status"
              data={STORY_STATUS_OPTIONS}
              allowDeselect={false}
              {...form.getInputProps('status')}
            />
            <Select
              label="Assignee"
              placeholder="Unassigned"
              data={MOCK_ASSIGNEES}
              clearable
              {...form.getInputProps('assignee')}
            />
          </Group>

          <MultiSelect
            label="Dependencies"
            placeholder={dependencyOptions.length ? 'Select stories this depends on' : 'No other stories yet'}
            data={dependencyOptions}
            searchable
            clearable
            disabled={dependencyOptions.length === 0}
            {...form.getInputProps('dependencies')}
          />

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" loading={saving}>
              {isEdit ? 'Save changes' : 'Add story'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
