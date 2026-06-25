import { useState } from 'react'
import type { UseFormReturnType } from '@mantine/form'
import { Stack, TextInput, Textarea, Box, Text, Group, ColorSwatch } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { WORKSPACE_AVATAR_COLORS } from '../../utility/constants/constants'
import type { WorkspaceFormValues } from '../../utility/models/model'

interface WorkspaceFieldsProps {
  form: UseFormReturnType<WorkspaceFormValues>
}

/**
 * Shared workspace detail fields — used by the create flow (drawer) and, later,
 * General settings. Colour is a Mantine palette name (never a hex value); it
 * seeds the workspace avatar deterministically. The selected swatch is tracked
 * locally so it highlights regardless of the form's (uncontrolled) mode.
 */
export function WorkspaceFields({ form }: WorkspaceFieldsProps) {
  const [selected, setSelected] = useState(form.getValues().colorSeed)

  function pickColor(color: string) {
    setSelected(color)
    form.setFieldValue('colorSeed', color)
  }

  return (
    <Stack gap="md">
      <TextInput
        label="Workspace name"
        placeholder="e.g. Meridian Financial"
        withAsterisk
        data-autofocus
        key={form.key('name')}
        {...form.getInputProps('name')}
      />

      <Textarea
        label="Description"
        placeholder="What does this workspace group together?"
        autosize
        minRows={3}
        key={form.key('description')}
        {...form.getInputProps('description')}
      />

      <Box>
        <Text component="label" size="sm" fw={500} display="block" mb={6}>
          Colour
        </Text>
        <Group gap="xs">
          {WORKSPACE_AVATAR_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              component="button"
              type="button"
              color={`var(--mantine-color-${color}-6)`}
              size={26}
              aria-label={color}
              onClick={() => pickColor(color)}
            >
              {selected === color ? <IconCheck size={14} color="white" /> : null}
            </ColorSwatch>
          ))}
        </Group>
      </Box>
    </Stack>
  )
}
