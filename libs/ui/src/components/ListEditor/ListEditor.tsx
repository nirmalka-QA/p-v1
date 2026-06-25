import { Box, Text, Stack, Group, TextInput, ActionIcon, Button } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'

interface ListEditorProps {
  label: string
  placeholder: string
  value: string[]
  onChange: (next: string[]) => void
  optional?: boolean
  addLabel?: string
}

/**
 * Repeatable single-line text editor for an array-of-strings form field
 * (acceptance criteria, functional/non-functional requirements, …). Decoupled
 * from any form library — drives a `string[]` via value/onChange. Always shows
 * at least one row; empty rows are sanitised by the caller on submit.
 */
export function ListEditor({
  label,
  placeholder,
  value,
  onChange,
  optional = false,
  addLabel = 'Add item',
}: ListEditorProps) {
  const rows = value.length > 0 ? value : ['']

  function update(index: number, text: string) {
    onChange(rows.map((row, i) => (i === index ? text : row)))
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <Box>
      <Text component="label" size="sm" fw={500} display="block" mb={6}>
        {label}{' '}
        {optional && (
          <Text span size="xs" c="dimmed">
            · Optional
          </Text>
        )}
      </Text>
      <Stack gap="xs">
        {rows.map((row, index) => (
          <Group key={index} gap="xs" wrap="nowrap">
            <TextInput
              flex={1}
              placeholder={placeholder}
              value={row}
              onChange={(e) => update(index, e.currentTarget.value)}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => remove(index)}
              disabled={rows.length === 1}
              aria-label="Remove item"
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
      <Button
        variant="subtle"
        color="gray"
        size="compact-sm"
        mt="xs"
        leftSection={<IconPlus size={13} />}
        onClick={() => onChange([...rows, ''])}
      >
        {addLabel}
      </Button>
    </Box>
  )
}
