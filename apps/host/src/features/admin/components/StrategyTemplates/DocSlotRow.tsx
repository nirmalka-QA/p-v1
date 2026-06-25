import { Box, Group, TextInput, MultiSelect, Switch, ActionIcon, Textarea, Stack } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { DOC_TYPE_OPTIONS } from '../../utility/models/strategyTemplate'
import type { TemplateForm } from '../../utility/models/strategyTemplate'

interface DocSlotRowProps {
  form: TemplateForm
  /** Form path to this slot, e.g. `phases.0.inputs.1`. */
  path: string
  kind: 'input' | 'output'
  canRemove: boolean
  onRemove: () => void
}

/**
 * One editable document slot. Inputs carry a name, accepted types, and a
 * mandatory toggle; outputs carry a name, types, and the AI generation prompt
 * the user authors. Driven entirely through the form via index paths.
 */
export function DocSlotRow({ form, path, kind, canRemove, onRemove }: DocSlotRowProps) {
  const isOutput = kind === 'output'

  return (
    <Box>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <TextInput
          flex={1}
          placeholder={isOutput ? 'Output document name' : 'Input document name'}
          aria-label="Document name"
          {...form.getInputProps(`${path}.name`)}
        />
        <MultiSelect
          w={220}
          placeholder="Type(s)"
          aria-label="Document types"
          data={DOC_TYPE_OPTIONS}
          searchable
          clearable
          comboboxProps={{ withinPortal: true }}
          {...form.getInputProps(`${path}.documentTypes`)}
        />
        {!isOutput && (
          <Switch
            mt={8}
            label="Required"
            labelPosition="left"
            {...form.getInputProps(`${path}.mandatory`, { type: 'checkbox' })}
          />
        )}
        <ActionIcon
          mt={6}
          variant="subtle"
          color="gray"
          aria-label="Remove document"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <IconTrash size={15} />
        </ActionIcon>
      </Group>

      {isOutput && (
        <Stack gap={4} mt="xs" mb="xs" pl={2}>
          <Textarea
            label="Generation prompt"
            description="What the AI uses to generate this document. Be specific and tell it to ground the output in the uploaded inputs."
            placeholder="e.g. From the uploaded inputs, produce a current-state assessment covering the landscape, pain points, and stakeholder needs. Ground every point in the provided material."
            autosize
            minRows={3}
            maxRows={8}
            {...form.getInputProps(`${path}.prompt`)}
          />
        </Stack>
      )}
    </Box>
  )
}
