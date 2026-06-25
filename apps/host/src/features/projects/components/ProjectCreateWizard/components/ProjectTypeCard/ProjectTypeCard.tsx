import { Card, Stack, Group, ThemeIcon, Text, Badge, Box } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import type { ProjectType } from '@wispr/contracts'
import { PROJECT_TYPE_META } from '../../../../utility/constants/constants'
import styles from './ProjectTypeCard.module.css'

interface ProjectTypeCardProps {
  /** Federation type the card represents — drives the icon + accent colour. */
  typeKey: ProjectType
  name: string
  description: string
  comingSoon: boolean
  selected: boolean
  onSelect: () => void
}

/**
 * One selectable tile in the create wizard's type picker — used for both the "All
 * types" catalog and the "By category" solutions (which map to a federation type).
 * Available tiles are clickable and show a selected accent ring; coming-soon tiles
 * are muted, badged, and non-interactive (the creation gate — §7 of the plan).
 */
export function ProjectTypeCard({
  typeKey,
  name,
  description,
  comingSoon,
  selected,
  onSelect,
}: ProjectTypeCardProps) {
  const meta = PROJECT_TYPE_META[typeKey]
  const Icon = meta?.icon
  const color = meta?.colorSeed ?? 'indigo'

  const classNames = [
    styles.card,
    selected ? styles.selected : '',
    comingSoon ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ')

  function handleSelect() {
    if (!comingSoon) onSelect()
  }

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      className={classNames}
      role="button"
      tabIndex={comingSoon ? -1 : 0}
      aria-disabled={comingSoon}
      aria-pressed={selected}
      onClick={handleSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect()}
    >
      {selected && !comingSoon ? (
        <Box className={styles.check ?? ''}>
          <IconCheck size={11} stroke={3} />
        </Box>
      ) : null}
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          {Icon ? (
            <ThemeIcon size={38} radius="md" variant="light" color={color}>
              <Icon size={20} />
            </ThemeIcon>
          ) : null}
          {comingSoon ? (
            <Badge size="xs" variant="light" color="gray" radius="sm">
              Coming soon
            </Badge>
          ) : null}
        </Group>
        <Text fw={600} size="sm">
          {name}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {description}
        </Text>
      </Stack>
    </Card>
  )
}
