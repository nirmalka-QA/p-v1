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
  Button,
  ScrollArea,
} from '@mantine/core'
import { ListEditor } from '@wispr/ui'
import { featureSchema } from '../utility/validations/validation'
import {
  PRIORITY_OPTIONS,
  COMPLEXITY_OPTIONS,
  FEATURE_FORM_INITIAL,
} from '../utility/constants/constants'
import {
  useAddFeatureMutation,
  useUpdateFeatureMutation,
} from '../utility/services/planningApi'
import type { Feature, FeatureFormValues } from '../utility/models/model'

interface FeatureFormModalProps {
  opened: boolean
  onClose: () => void
  projectId: string
  /** When provided, the modal edits this feature; otherwise it adds a new one. */
  feature?: Feature | null
}

/** Ensures a list always shows at least one (empty) editable row. */
function withRow(items: string[]): string[] {
  return items.length > 0 ? items : ['']
}

function toFormValues(feature: Feature): FeatureFormValues {
  return {
    title: feature.title,
    description: feature.description,
    priority: feature.priority,
    complexity: feature.complexity,
    functionalRequirements: withRow(feature.functionalRequirements),
    nonFunctionalRequirements: withRow(feature.nonFunctionalRequirements),
  }
}

export function FeatureFormModal({ opened, onClose, projectId, feature }: FeatureFormModalProps) {
  const [addFeature, { isLoading: adding }] = useAddFeatureMutation()
  const [updateFeature, { isLoading: updating }] = useUpdateFeatureMutation()
  const isEdit = Boolean(feature)
  const saving = adding || updating

  const form = useForm<FeatureFormValues>({
    initialValues: FEATURE_FORM_INITIAL,
    validate: yupResolver(featureSchema),
  })

  // Reset the form to the target feature (or a blank draft) each time it opens.
  useEffect(() => {
    if (opened) form.setValues(feature ? toFormValues(feature) : FEATURE_FORM_INITIAL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, feature])

  async function handleSubmit(values: FeatureFormValues) {
    try {
      if (feature) {
        await updateFeature({ projectId, featureId: feature.id, values }).unwrap()
      } else {
        await addFeature({ projectId, values }).unwrap()
      }
      notifications.show({
        color: 'teal',
        title: isEdit ? 'Feature updated' : 'Feature added',
        message: `“${values.title.trim()}” has been ${isEdit ? 'updated' : 'added to your plan'}.`,
      })
      onClose()
    } catch {
      notifications.show({
        color: 'red',
        title: isEdit ? 'Could not update feature' : 'Could not add feature',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit ${feature?.id}` : 'Add a feature'}
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600 } }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="e.g. User Authentication & Session Management"
            withAsterisk
            data-autofocus
            {...form.getInputProps('title')}
          />
          <Textarea
            label="Description"
            placeholder="One or two sentences describing what this feature delivers."
            withAsterisk
            autosize
            minRows={2}
            {...form.getInputProps('description')}
          />
          <Group grow>
            <Select
              label="Priority"
              data={PRIORITY_OPTIONS}
              allowDeselect={false}
              {...form.getInputProps('priority')}
            />
            <Select
              label="Complexity"
              data={COMPLEXITY_OPTIONS}
              allowDeselect={false}
              {...form.getInputProps('complexity')}
            />
          </Group>

          <ListEditor
            label="Functional requirements"
            optional
            addLabel="Add requirement"
            placeholder="What the feature must let users do…"
            value={form.getValues().functionalRequirements}
            onChange={(v) => form.setFieldValue('functionalRequirements', v)}
          />
          <ListEditor
            label="Non-functional requirements"
            optional
            addLabel="Add requirement"
            placeholder="Performance, security, accessibility constraints…"
            value={form.getValues().nonFunctionalRequirements}
            onChange={(v) => form.setFieldValue('nonFunctionalRequirements', v)}
          />

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" loading={saving}>
              {isEdit ? 'Save changes' : 'Add feature'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
