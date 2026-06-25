import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { yupResolver } from 'mantine-form-yup-resolver'
import { notifications } from '@mantine/notifications'
import { Group, Button, Stack, Divider, Paper, Text, Title, Modal, TextInput, List, ThemeIcon, Checkbox } from '@mantine/core'
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'
import { projectSchema } from '../../validation'
import { useUpdateProjectMutation, useDeleteProjectMutation } from '../../projectsApi'
import { ProjectFields } from '../ProjectFields/ProjectFields'
import type { Project, ProjectFormValues } from '../../model'

interface GeneralSettingsProps {
  project: Project
}

export function GeneralSettings({ project }: GeneralSettingsProps) {
  const navigate = useNavigate()
  const [updateProject, { isLoading }] = useUpdateProjectMutation()
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation()
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false)
  const [confirmText, setConfirmText] = useState('')
  // Default: purge everything (incl. KB + artifacts). Opt in to keep the accumulated knowledge.
  const [keepKnowledge, setKeepKnowledge] = useState(false)

  const form = useForm<ProjectFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: project.name,
      description: project.description,
      type: String(project.typeId),
      logo: project.logo ?? '',
    },
    validate: yupResolver(projectSchema),
  })

  async function handleSave(values: ProjectFormValues) {
    try {
      await updateProject({
        id: project.id,
        patch: {
          name: values.name.trim(),
          description: values.description.trim(),
          typeId: Number(values.type),
        },
      }).unwrap()
      notifications.show({
        color: 'teal',
        title: 'Project updated',
        message: 'Your changes have been saved.',
      })
    } catch {
      notifications.show({
        color: 'red',
        title: 'Could not save changes',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteProject({ id: project.id, keepKnowledge }).unwrap()
      closeConfirm()
      notifications.show({
        color: 'teal',
        title: 'Project deleted',
        message: keepKnowledge
          ? `“${project.name}” was removed; its Knowledge Base & artifacts were kept.`
          : `“${project.name}” and all its data have been permanently removed.`,
      })
      navigate(ROUTES.projects)
    } catch {
      notifications.show({
        color: 'red',
        title: 'Could not delete project',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <>
      <form onSubmit={form.onSubmit(handleSave)}>
        <ProjectFields form={form} />
        <Group justify="flex-end" mt="lg">
          <Button type="submit" variant="accent" loading={isLoading}>
            Save changes
          </Button>
        </Group>
      </form>

      <Divider my="xl" />

      {/* Danger zone — permanent, irreversible hard delete. */}
      <Paper withBorder radius="md" p="md" style={{ borderColor: 'var(--mantine-color-red-4)' }}>
        <Group gap="xs" mb={4}>
          <ThemeIcon size={22} radius="md" color="red" variant="light">
            <IconAlertTriangle size={14} />
          </ThemeIcon>
          <Title order={5} size="h6" c="red">
            Danger zone
          </Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Permanently delete this project and everything in it. This cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button color="red" variant="light" leftSection={<IconTrash size={15} />} onClick={openConfirm}>
            Delete project
          </Button>
        </Group>
      </Paper>

      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={18} color="var(--mantine-color-red-6)" />
            <Text fw={600}>Delete “{project.name}”?</Text>
          </Group>
        }
        size="md"
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This permanently and irreversibly deletes everything for this project:
          </Text>
          <List size="sm" spacing={2} c="dimmed" withPadding>
            <List.Item>Knowledge Base, uploads and stored files</List.Item>
            <List.Item>Features, user stories and their analysis</List.Item>
            <List.Item>Tech stack, generated code and design assets</List.Item>
            <List.Item>Repository connection and stored access token</List.Item>
          </List>
          <Text size="sm">
            Your external repository (e.g. the GitHub repo) is <Text span fw={600}>not</Text> deleted —
            only WISPR’s data and stored connection are removed.
          </Text>
          <Checkbox
            checked={keepKnowledge}
            onChange={(e) => setKeepKnowledge(e.currentTarget.checked)}
            label="Keep the Knowledge Base & uploaded artifacts"
            description="Leave the accumulated knowledge in place (e.g. to reuse later). By default it is deleted with the project."
          />
          <TextInput
            label={
              <Text size="sm">
                Type <Text span fw={700} ff="monospace">{project.name}</Text> to confirm
              </Text>
            }
            value={confirmText}
            onChange={(e) => setConfirmText(e.currentTarget.value)}
            placeholder={project.name}
            autoComplete="off"
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              color="red"
              leftSection={<IconTrash size={15} />}
              loading={deleting}
              disabled={confirmText.trim() !== project.name}
              onClick={handleDelete}
            >
              Delete permanently
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
