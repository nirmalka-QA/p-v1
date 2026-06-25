import { Modal, Text, Group, Button, Stack } from '@mantine/core'

interface ConfirmModalProps {
  opened: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  loading?: boolean
  danger?: boolean
}

export function ConfirmModal({
  opened,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm" centered>
      <Stack gap="lg">
        <Text size="sm" c="dimmed" lh={1.6}>
          {message}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            color={danger ? 'red' : 'violet'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
