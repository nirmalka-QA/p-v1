import { Card, Stack, Text, Box, Group } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import styles from './StrategyTypeCard.module.css'

interface StrategyTypeCardProps {
  name: string
  description: string
  phaseCount: number
  selected: boolean
  onSelect: () => void
}

/**
 * A selectable strategy-template tile in the wizard's Phases step (prototype `.dcard`
 * in `phaseTemplateHTML`). Picking one configures that template's predefined phases.
 */
export function StrategyTypeCard({ name, description, phaseCount, selected, onSelect }: StrategyTypeCardProps) {
  const classNames = [styles.card, selected ? styles.selected : ''].filter(Boolean).join(' ')

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      className={classNames}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      {selected ? (
        <Box className={styles.check ?? ''}>
          <IconCheck size={11} stroke={3} />
        </Box>
      ) : null}
      <Stack gap={6}>
        <Text fw={600} size="sm">
          {name}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {description}
        </Text>
        <Group gap={4}>
          <Text size="xs" c="dimmed" ff="monospace">
            {phaseCount} phases
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}
