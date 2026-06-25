import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { yupResolver } from 'mantine-form-yup-resolver'
import { notifications } from '@mantine/notifications'
import { Modal, Stack, Group, TextInput, Textarea, Button, ScrollArea, Input } from '@mantine/core'
import { noteSchema } from '../utility/validations/validation'
import { useUpdateNoteMutation } from '../utility/services/discoveryApi'
import { MarkdownEditor } from '@wispr/ui'
import type { KBNote, NoteFormValues } from '../utility/models/model'

interface KBNoteFormModalProps {
  opened: boolean
  onClose: () => void
  projectId: string
  note: KBNote
}

/** Manual edit of a KB note — title, summary, and Markdown content. */
export function KBNoteFormModal({ opened, onClose, projectId, note }: KBNoteFormModalProps) {
  const [updateNote, { isLoading: saving }] = useUpdateNoteMutation()

  const form = useForm<NoteFormValues>({
    initialValues: { title: note.title, description: note.description, content: note.content },
    validate: yupResolver(noteSchema),
  })

  // Reset to the latest note content whenever the modal is (re)opened.
  useEffect(() => {
    if (opened) {
      form.setValues({ title: note.title, description: note.description, content: note.content })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, note.id])

  async function handleSubmit(values: NoteFormValues) {
    try {
      await updateNote({ projectId, noteId: note.id, values }).unwrap()
      notifications.show({ color: 'teal', title: 'Note updated', message: `“${values.title.trim()}” saved.` })
      onClose()
    } catch {
      notifications.show({ color: 'red', title: 'Could not update note', message: 'Please try again.' })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Edit note`}
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600 } }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput label="Title" withAsterisk data-autofocus {...form.getInputProps('title')} />
          <Textarea
            label="Summary"
            placeholder="One-line description shown on the note card."
            autosize
            minRows={1}
            {...form.getInputProps('description')}
          />
          <Input.Wrapper label="Content" withAsterisk error={form.errors.content}>
            <MarkdownEditor
              value={form.values.content}
              onChange={(md) => form.setFieldValue('content', md)}
            />
          </Input.Wrapper>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" loading={saving}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
