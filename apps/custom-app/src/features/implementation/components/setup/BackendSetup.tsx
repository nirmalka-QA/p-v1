import { Stack, TextInput, Badge } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { BACKEND_FRAMEWORKS, BACKEND_LANGUAGES, ORMS } from '../../utility/constants/constants'
import { OptionCardGroup, type StackOption } from './OptionCardGroup'
import type { StackSelection } from '../../utility/helpers/setup'

interface BackendSetupProps {
  value: StackSelection
  onChange: (next: StackSelection) => void
  suggestedFramework?: string
}

const OTHER = 'Other'

/** Backend tech-stack picker — framework cards + language/ORM extras. Controlled. */
export function BackendSetup({ value, onChange, suggestedFramework }: BackendSetupProps) {
  const isPreset = (BACKEND_FRAMEWORKS as readonly string[]).includes(value.beFramework)
  const radioValue = value.beFramework === '' || isPreset ? value.beFramework : OTHER
  const set = (patch: Partial<StackSelection>) => onChange({ ...value, ...patch })

  const frameworkOptions: StackOption[] = [...BACKEND_FRAMEWORKS, OTHER].map((fw) => ({
    value: fw,
    badge:
      fw === suggestedFramework ? (
        <Badge size="xs" color="violet" variant="light" leftSection={<IconSparkles size={9} />}>
          KB
        </Badge>
      ) : undefined,
  }))

  return (
    <Stack gap="lg">
      <OptionCardGroup
        label="Framework"
        options={frameworkOptions}
        value={radioValue}
        onChange={(v) => set({ beFramework: v === OTHER ? '' : v })}
      />

      {radioValue === OTHER && (
        <TextInput
          label="Framework name"
          placeholder="e.g. Go / Gin"
          value={value.beFramework}
          onChange={(e) => set({ beFramework: e.currentTarget.value })}
        />
      )}

      <OptionCardGroup
        label="Language"
        options={BACKEND_LANGUAGES.map((v) => ({ value: v }))}
        value={value.beLanguage}
        onChange={(v) => set({ beLanguage: v })}
      />

      <OptionCardGroup
        label="ORM"
        options={ORMS.map((v) => ({ value: v }))}
        value={value.orm}
        onChange={(v) => set({ orm: v })}
      />
    </Stack>
  )
}
