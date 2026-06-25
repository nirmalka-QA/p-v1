import { Box, Group, Badge, Text, Button, Stack, ThemeIcon } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import styles from './AIPlaceholder.module.css'

interface AIPlaceholderProps {
  action: string
  description: string
  onTrigger: () => void
  loading?: boolean
  disabled?: boolean
  disabledReason?: string
}

export function AIPlaceholder({
  action,
  description,
  onTrigger,
  loading = false,
  disabled = false,
  disabledReason,
}: AIPlaceholderProps) {
  return (
    <Box p="xl" className={styles.aiPlaceholder ?? ''}>
      <Stack align="center" gap="md">
        <ThemeIcon size={44} radius="xl" color="violet" variant="light">
          <IconSparkles size={22} />
        </ThemeIcon>
        <Stack align="center" gap={6}>
          <Group gap="xs" align="center">
            <Badge size="xs" color="violet" variant="filled" leftSection={<IconSparkles size={9} />}>
              AI
            </Badge>
            <Text fw={600} size="sm">
              {action}
            </Text>
          </Group>
          <Text size="sm" c="dimmed" ta="center" maw={440} lh={1.6}>
            {description}
          </Text>
        </Stack>
        <Button
          color="violet"
          leftSection={<IconSparkles size={15} />}
          onClick={onTrigger}
          loading={loading}
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
        >
          {action}
        </Button>
        {disabled && disabledReason && (
          <Text size="xs" c="dimmed" ta="center">
            {disabledReason}
          </Text>
        )}
      </Stack>
    </Box>
  )
}
