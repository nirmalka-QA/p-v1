import type { UseFormReturnType } from '@mantine/form'
import {
  Box,
  Text,
  TextInput,
  Textarea,
  Select,
  Group,
  Avatar,
  Button,
  FileButton,
  Stack,
  Loader,
} from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import { projectInitials } from '../../helpers'
import { useGetProjectTypesQuery } from '../../projectsApi'
import type { ProjectFormValues } from '../../model'

interface ProjectFieldsProps {
  form: UseFormReturnType<ProjectFormValues>
}

/** Shared project detail fields — used by create (drawer) and General settings. */
export function ProjectFields({ form }: ProjectFieldsProps) {
  const { data: projectTypes = [], isLoading: typesLoading } = useGetProjectTypesQuery()
  const typeOptions = projectTypes.map((t) => ({ value: String(t.id), label: t.name }))

  const logoUrl = form.getValues().logo
  const nameValue = form.getValues().name

  function handleLogoSelect(file: File | null) {
    if (!file) return
    form.setFieldValue('logo', URL.createObjectURL(file))
  }

  return (
    <Stack gap="md">
      <TextInput
        label="Project Name"
        placeholder="e.g. NorthWind Retail — Customer Portal v2"
        withAsterisk
        data-autofocus
        key={form.key('name')}
        {...form.getInputProps('name')}
      />

      <Textarea
        label="Description"
        placeholder="One or two sentences describing what this project is and why it exists."
        withAsterisk
        autosize
        minRows={3}
        key={form.key('description')}
        {...form.getInputProps('description')}
      />

      <Select
        label="Project Type"
        placeholder={typesLoading ? 'Loading types…' : 'Select a type…'}
        withAsterisk
        data={typeOptions}
        disabled={typesLoading}
        rightSection={typesLoading ? <Loader size={16} /> : undefined}
        key={form.key('type')}
        {...form.getInputProps('type')}
      />

      <Box>
        <Text component="label" size="sm" fw={500} display="block" mb={6}>
          Project Logo{' '}
          <Text span size="xs" c="dimmed">
            · Optional
          </Text>
        </Text>
        <Group gap="md" wrap="nowrap">
          {logoUrl ? (
            <Avatar src={logoUrl} radius="md" size={44} />
          ) : (
            <Avatar radius="md" size={44} color="gray">
              {nameValue ? projectInitials(nameValue) : <IconUpload size={18} />}
            </Avatar>
          )}
          <FileButton onChange={handleLogoSelect} accept="image/png,image/jpeg,image/svg+xml">
            {(props) => (
              <Button {...props} variant="default" size="sm">
                {logoUrl ? 'Change logo' : 'Upload logo'}
              </Button>
            )}
          </FileButton>
        </Group>
      </Box>
    </Stack>
  )
}
