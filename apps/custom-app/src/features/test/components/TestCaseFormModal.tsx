import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { yupResolver } from 'mantine-form-yup-resolver'
import { notifications } from '@mantine/notifications'
import { Modal, Stack, Group, TextInput, Textarea, Select, Button, ScrollArea } from '@mantine/core'
import { ListEditor } from '@wispr/ui'
import { testCaseSchema } from '../utility/validations/validation'
import {
  TEST_FORM_INITIAL,
  TEST_TYPE_OPTIONS,
  TEST_STATUS_OPTIONS,
} from '../utility/constants/constants'
import { useAddTestCaseMutation, useUpdateTestCaseMutation } from '../utility/services/testApi'
import type { TestCase, TestCaseFormValues } from '../utility/models/model'

interface TestCaseFormModalProps {
  opened: boolean
  onClose: () => void
  projectId: string
  storyId: string
  /** When provided, edits this case; otherwise adds a new one to the story. */
  testCase?: TestCase | null
  /** Whether pass/fail may be set — only once the story is implemented/deployed (ADR-0028). */
  canExecute?: boolean
}

function toFormValues(testCase: TestCase): TestCaseFormValues {
  return {
    title: testCase.title,
    type: testCase.type,
    steps: testCase.steps.length ? testCase.steps : [''],
    expectedResult: testCase.expectedResult,
    status: testCase.status,
  }
}

export function TestCaseFormModal({ opened, onClose, projectId, storyId, testCase, canExecute = true }: TestCaseFormModalProps) {
  const [addTestCase, { isLoading: adding }] = useAddTestCaseMutation()
  const [updateTestCase, { isLoading: updating }] = useUpdateTestCaseMutation()
  const isEdit = Boolean(testCase)
  const saving = adding || updating

  // Until the story is implemented, a result can't be recorded — lock the status to pending.
  const statusOptions = canExecute ? TEST_STATUS_OPTIONS : TEST_STATUS_OPTIONS.filter((o) => o.value === 'pending')

  const form = useForm<TestCaseFormValues>({
    initialValues: TEST_FORM_INITIAL,
    validate: yupResolver(testCaseSchema),
  })

  useEffect(() => {
    if (opened) form.setValues(testCase ? toFormValues(testCase) : TEST_FORM_INITIAL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, testCase])

  async function handleSubmit(values: TestCaseFormValues) {
    try {
      if (testCase) {
        await updateTestCase({ projectId, testId: testCase.id, values }).unwrap()
      } else {
        await addTestCase({ projectId, storyId, values }).unwrap()
      }
      notifications.show({
        color: 'teal',
        title: isEdit ? 'Test case updated' : 'Test case added',
        message: `“${values.title.trim()}” has been ${isEdit ? 'updated' : 'added'}.`,
      })
      onClose()
    } catch (err) {
      const data = (err as { data?: unknown })?.data
      notifications.show({
        color: 'red',
        title: isEdit ? 'Could not update test case' : 'Could not add test case',
        message: typeof data === 'string' ? data : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit ${testCase?.id}` : 'Add a test case'}
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600 } }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="What this test verifies"
            withAsterisk
            data-autofocus
            {...form.getInputProps('title')}
          />
          <Group grow>
            <Select label="Type" data={TEST_TYPE_OPTIONS} allowDeselect={false} {...form.getInputProps('type')} />
            <Select
              label="Status"
              data={statusOptions}
              allowDeselect={false}
              disabled={!canExecute}
              description={!canExecute ? 'Results unlock once the story is implemented' : undefined}
              {...form.getInputProps('status')}
            />
          </Group>

          <ListEditor
            label="Steps"
            optional
            addLabel="Add step"
            placeholder="A single action the tester performs"
            value={form.getValues().steps}
            onChange={(v) => form.setFieldValue('steps', v)}
          />

          <Textarea
            label="Expected result"
            placeholder="The outcome that must be observed for this test to pass"
            withAsterisk
            autosize
            minRows={2}
            {...form.getInputProps('expectedResult')}
          />

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" loading={saving}>
              {isEdit ? 'Save changes' : 'Add test case'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
