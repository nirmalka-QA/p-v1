import {
  Accordion,
  Stack,
  Group,
  TextInput,
  Textarea,
  Switch,
  Text,
  Badge,
  Button,
  Divider,
  Box,
} from '@mantine/core'
import { IconPlus, IconTrash, IconFileImport, IconFileExport } from '@tabler/icons-react'
import type { PhaseDraft, TemplateForm } from '../../utility/models/strategyTemplate'
import { newDocSlot } from '../../utility/helpers/strategyTemplate'
import { DocSlotRow } from './DocSlotRow'

interface PhaseCardProps {
  form: TemplateForm
  phase: PhaseDraft
  index: number
  canRemove: boolean
  onRemove: () => void
}

/**
 * One editable phase inside the template editor (rendered as an accordion item).
 * Carries the open-text phase name + a mandatory toggle, then two sections: the
 * input documents the phase consumes and the output documents the AI generates
 * (each with its own generation prompt).
 */
export function PhaseCard({ form, phase, index, canRemove, onRemove }: PhaseCardProps) {
  const base = `phases.${index}`

  return (
    <Accordion.Item value={phase.id}>
      <Accordion.Control>
        <Group gap="sm" wrap="nowrap">
          <Text fw={600} size="sm">
            {phase.name.trim() || `Phase ${index + 1}`}
          </Text>
          {phase.mandatory && (
            <Badge size="xs" color="orange" variant="light" radius="sm">
              Mandatory
            </Badge>
          )}
          <Text size="xs" c="dimmed">
            {phase.inputs.length} input{phase.inputs.length === 1 ? '' : 's'} ·{' '}
            {phase.outputs.length} output{phase.outputs.length === 1 ? '' : 's'}
          </Text>
        </Group>
      </Accordion.Control>

      <Accordion.Panel>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label="Phase name"
              placeholder="e.g. Roadmap, Governance Framework, Implementation Plan"
              withAsterisk
              {...form.getInputProps(`${base}.name`)}
            />
            <Switch
              mt={28}
              label="Mandatory phase"
              description="Must be completed before sign-off"
              {...form.getInputProps(`${base}.mandatory`, { type: 'checkbox' })}
            />
          </Group>

          <Textarea
            label="Description"
            placeholder="What this phase covers"
            autosize
            minRows={2}
            {...form.getInputProps(`${base}.description`)}
          />

          <Divider
            label={
              <Group gap={6}>
                <IconFileImport size={14} />
                <Text size="xs" fw={600}>
                  Mandatory / input documents
                </Text>
              </Group>
            }
            labelPosition="left"
          />
          <Stack gap="sm">
            {phase.inputs.map((slot, i) => (
              <DocSlotRow
                key={slot.id}
                form={form}
                path={`${base}.inputs.${i}`}
                kind="input"
                canRemove
                onRemove={() => form.removeListItem(`${base}.inputs`, i)}
              />
            ))}
            <Box>
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconPlus size={13} />}
                onClick={() => form.insertListItem(`${base}.inputs`, newDocSlot('input'))}
              >
                Add input document
              </Button>
            </Box>
          </Stack>

          <Divider
            label={
              <Group gap={6}>
                <IconFileExport size={14} />
                <Text size="xs" fw={600}>
                  Output documents (AI-generated)
                </Text>
              </Group>
            }
            labelPosition="left"
          />
          <Stack gap="sm">
            {phase.outputs.map((slot, i) => (
              <DocSlotRow
                key={slot.id}
                form={form}
                path={`${base}.outputs.${i}`}
                kind="output"
                canRemove={phase.outputs.length > 1}
                onRemove={() => form.removeListItem(`${base}.outputs`, i)}
              />
            ))}
            <Box>
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconPlus size={13} />}
                onClick={() => form.insertListItem(`${base}.outputs`, newDocSlot('output'))}
              >
                Add output document
              </Button>
            </Box>
          </Stack>

          <Divider />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="red"
              size="compact-sm"
              leftSection={<IconTrash size={14} />}
              disabled={!canRemove}
              onClick={onRemove}
            >
              Remove phase
            </Button>
          </Group>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  )
}
