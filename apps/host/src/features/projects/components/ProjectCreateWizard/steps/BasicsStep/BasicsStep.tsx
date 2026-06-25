import type { UseFormReturnType } from '@mantine/form'
import { Stack, TextInput, Textarea, Box, Text, Group, Avatar, Button, FileButton, Select } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import { projectInitials, PROJECT_TYPE_OPTIONS } from '@wispr/projects'
import type { ProjectWizardValues } from '@wispr/projects'

interface BasicsStepProps {
  form: UseFormReturnType<ProjectWizardValues>
}

/** Wizard step ① — project name, description, and an optional logo. */
export function BasicsStep({ form }: BasicsStepProps) {
  const { name, logo } = form.getValues()

  function handleLogoSelect(file: File | null) {
    if (!file) return
    form.setFieldValue('logo', URL.createObjectURL(file))
  }

  return (
    <Stack gap="md">
      <TextInput
        label="Project name"
        placeholder="e.g. NorthWind Customer Portal"
        withAsterisk
        data-autofocus
        key={form.key('name')}
        {...form.getInputProps('name')}
      />

      <Textarea
        label="Description"
        placeholder="What is this project about?"
        withAsterisk
        autosize
        minRows={3}
        key={form.key('description')}
        {...form.getInputProps('description')}
      />

      <Select
        label={
          <Text span size="sm" fw={500}>
            Industry{' '}
            <Text span size="xs" c="dimmed">
              · Optional
            </Text>
          </Text>
        }
        placeholder="Select an industry"
        data={PROJECT_TYPE_OPTIONS}
        clearable
        key={form.key('industry')}
        {...form.getInputProps('industry')}
      />

      <Box>
        <Text component="label" size="sm" fw={500} display="block" mb={6}>
          Logo{' '}
          <Text span size="xs" c="dimmed">
            · Optional
          </Text>
        </Text>
        <Group gap="md" wrap="nowrap">
          {logo ? (
            <Avatar src={logo} radius="md" size={44} />
          ) : (
            <Avatar radius="md" size={44} color="gray">
              {name ? projectInitials(name) : <IconUpload size={18} />}
            </Avatar>
          )}
          <FileButton onChange={handleLogoSelect} accept="image/png,image/jpeg,image/svg+xml">
            {(props) => (
              <Button {...props} variant="default" size="sm">
                {logo ? 'Change image' : 'Upload image'}
              </Button>
            )}
          </FileButton>
          {logo ? (
            <Button variant="subtle" color="gray" size="sm" onClick={() => form.setFieldValue('logo', '')}>
              Remove
            </Button>
          ) : null}
        </Group>
        <Text size="xs" c="dimmed" mt={8}>
          If omitted, the project initials are used.
        </Text>
      </Box>
    </Stack>
  )
}
