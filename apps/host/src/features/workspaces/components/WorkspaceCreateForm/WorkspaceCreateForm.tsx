import { useNavigate } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { yupResolver } from 'mantine-form-yup-resolver'
import { notifications } from '@mantine/notifications'
import { Stack, Group, Button } from '@mantine/core'
import { ROUTES } from '@wispr/contracts'
import { WorkspaceFields } from '../WorkspaceFields/WorkspaceFields'
import { useCreateWorkspaceMutation } from '../../utility/services/services'
import { WORKSPACE_FORM_INITIAL } from '../../utility/constants/constants'
import { workspaceSchema } from '../../utility/validations/validation'
import type { WorkspaceFormValues } from '../../utility/models/model'

interface WorkspaceCreateFormProps {
  /** Invoked when the user cancels (e.g. closes the drawer). */
  onCancel: () => void
}

/** Create-workspace form — name, description, colour. On success it lands the user
 *  inside the new workspace. The creator becomes the workspace Owner (server-side). */
export function WorkspaceCreateForm({ onCancel }: WorkspaceCreateFormProps) {
  const navigate = useNavigate()
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation()

  const form = useForm<WorkspaceFormValues>({
    mode: 'uncontrolled',
    initialValues: WORKSPACE_FORM_INITIAL,
    validate: yupResolver(workspaceSchema),
  })

  async function handleSubmit(values: WorkspaceFormValues) {
    const name = values.name.trim()
    try {
      const result = await createWorkspace({
        name,
        description: values.description.trim(),
        colorSeed: values.colorSeed,
      }).unwrap()

      notifications.show({
        color: 'teal',
        title: 'Workspace created',
        message: `“${name}” is ready — add your first project.`,
      })
      navigate(ROUTES.workspace(result.workspaceId))
    } catch {
      notifications.show({
        color: 'red',
        title: 'Could not create workspace',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        <WorkspaceFields form={form} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" loading={isLoading}>
            Create workspace
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
