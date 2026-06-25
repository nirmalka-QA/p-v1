import { useState } from 'react'
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  Accordion,
  Button,
  Group,
  Divider,
  Text,
  Box,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { yupResolver } from 'mantine-form-yup-resolver'
import { IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import {
  useCreateStrategyTemplateMutation,
  useUpdateStrategyTemplateMutation,
} from '../../utility/services/strategyTemplatesApi'
import type { StrategyTemplate, TemplateDraft } from '../../utility/models/strategyTemplate'
import { blankDraft, newPhase, toDraft } from '../../utility/helpers/strategyTemplate'
import { strategyTemplateSchema, firstDraftError } from '../../utility/validation/strategyTemplate'
import { PhaseCard } from './PhaseCard'

interface StrategyTemplateEditorProps {
  opened: boolean
  mode: 'create' | 'edit'
  /** The template being edited (omitted for create). */
  template?: StrategyTemplate | undefined
  onClose: () => void
  onSaved: (name: string) => void
}

/**
 * Create / edit a strategy template — a right-side drawer carrying the template
 * name + description and an accordion of phases, each configuring its input and
 * output documents (and the AI generation prompt per output). Validation runs on
 * submit; nested field errors surface inline, with a summary notification so a
 * problem in a collapsed phase isn't missed.
 */
export function StrategyTemplateEditor({
  opened,
  mode,
  template,
  onClose,
  onSaved,
}: StrategyTemplateEditorProps) {
  const initial: TemplateDraft = mode === 'edit' && template ? toDraft(template) : blankDraft()

  const form = useForm<TemplateDraft>({
    mode: 'uncontrolled',
    initialValues: initial,
    validate: yupResolver(strategyTemplateSchema),
  })

  const [openPhases, setOpenPhases] = useState<string[]>(initial.phases.map((p) => p.id))

  const [create, createState] = useCreateStrategyTemplateMutation()
  const [update, updateState] = useUpdateStrategyTemplateMutation()
  const saving = createState.isLoading || updateState.isLoading

  function addPhase() {
    const phase = newPhase()
    form.insertListItem('phases', phase)
    setOpenPhases((prev) => [...prev, phase.id])
  }

  function removePhase(index: number, id: string) {
    form.removeListItem('phases', index)
    setOpenPhases((prev) => prev.filter((p) => p !== id))
  }

  const handleSubmit = form.onSubmit(
    async () => {
      const values = form.getValues()
      try {
        const input =
          mode === 'edit' && template ? { id: template.id, draft: values } : { draft: values }
        if (mode === 'edit' && template) {
          await update(input).unwrap()
        } else {
          await create(input).unwrap()
        }
        onSaved(values.name.trim())
      } catch {
        notifications.show({
          color: 'red',
          title: 'Save failed',
          message: 'Could not save the template. Please try again.',
        })
      }
    },
    () => {
      notifications.show({
        color: 'red',
        title: 'Check the template',
        message: firstDraftError(form.getValues()) ?? 'Please fix the highlighted fields.',
      })
    },
  )

  const phases = form.getValues().phases

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={760}
      padding="lg"
      title={
        <Text fw={700} size="lg">
          {mode === 'edit' ? 'Edit strategy template' : 'New strategy template'}
        </Text>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Template name"
            placeholder="e.g. Data Strategy, Cloud Migration"
            withAsterisk
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="A short summary of what this strategy template is for"
            autosize
            minRows={2}
            {...form.getInputProps('description')}
          />

          <Divider
            label={
              <Text size="sm" fw={600}>
                Phases
              </Text>
            }
            labelPosition="left"
          />

          {typeof form.errors['phases'] === 'string' && (
            <Text size="xs" c="red">
              {form.errors['phases']}
            </Text>
          )}

          <Accordion multiple value={openPhases} onChange={setOpenPhases} variant="separated">
            {phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                form={form}
                phase={phase}
                index={index}
                canRemove={phases.length > 1}
                onRemove={() => removePhase(index, phase.id)}
              />
            ))}
          </Accordion>

          <Box>
            <Button
              variant="light"
              color="gray"
              leftSection={<IconPlus size={15} />}
              onClick={addPhase}
            >
              Add phase
            </Button>
          </Box>

          <Divider mt="sm" />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {mode === 'edit' ? 'Save changes' : 'Create template'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  )
}
