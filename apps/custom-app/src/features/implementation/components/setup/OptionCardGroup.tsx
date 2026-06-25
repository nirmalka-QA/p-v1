import type { ReactNode } from 'react'
import { Radio, SimpleGrid, Group, Text, ThemeIcon, Box } from '@mantine/core'
import { stackIcon, stackColor } from '../../utility/helpers/stackIcons'
import styles from '../../utility/styles/implementation.module.css'

export interface StackOption {
  value: string
  label?: string
  /** Optional trailing marker (e.g. an AI-suggested "KB" badge). */
  badge?: ReactNode
}

interface OptionCardGroupProps {
  label: string
  description?: string
  options: StackOption[]
  value: string
  onChange: (value: string) => void
  cols?: number | Record<string, number>
}

/**
 * Single-select grid of icon cards for tech-stack choices. Every option carries
 * an icon (brand glyph where known, generic cube otherwise) so frameworks, libs,
 * languages, ORMs, and databases all read consistently across the wizard.
 */
export function OptionCardGroup({
  label,
  description,
  options,
  value,
  onChange,
  cols = { base: 2, sm: 3 },
}: OptionCardGroupProps) {
  return (
    <Radio.Group label={label} description={description} value={value} onChange={onChange}>
      <SimpleGrid cols={cols} mt="xs" spacing="sm">
        {options.map((opt) => {
          const Icon = stackIcon(opt.value)
          return (
            <Radio.Card key={opt.value} value={opt.value} radius="md" className={styles.optionCard}>
              <Group gap="sm" wrap="nowrap" p="sm">
                <ThemeIcon variant="light" color={stackColor(opt.value)} size={32} radius="md">
                  <Icon size={18} />
                </ThemeIcon>
                <Box flex={1} miw={0}>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" fw={500} truncate>
                      {opt.label ?? opt.value}
                    </Text>
                    {opt.badge}
                  </Group>
                </Box>
                <Radio.Indicator />
              </Group>
            </Radio.Card>
          )
        })}
      </SimpleGrid>
    </Radio.Group>
  )
}
