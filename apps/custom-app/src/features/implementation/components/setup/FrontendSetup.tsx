import { Stack, TextInput, Badge } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import {
  FRONTEND_FRAMEWORKS,
  UI_LIBRARIES,
  STATE_LIBRARIES,
  FRONTEND_LANGUAGES,
} from '../../utility/constants/constants'
import { OptionCardGroup, type StackOption } from './OptionCardGroup'
import type { StackSelection } from '../../utility/helpers/setup'

interface FrontendSetupProps {
  value: StackSelection
  onChange: (next: StackSelection) => void
  /** The framework value AI-suggested from the Knowledge Base, for the badge. */
  suggestedFramework?: string
}

const OTHER = 'Other'

/** Frontend tech-stack picker — framework cards + UI/state/language extras. Controlled. */
export function FrontendSetup({ value, onChange, suggestedFramework }: FrontendSetupProps) {
  const isPreset = (FRONTEND_FRAMEWORKS as readonly string[]).includes(value.feFramework)
  const radioValue = value.feFramework === '' || isPreset ? value.feFramework : OTHER
  const set = (patch: Partial<StackSelection>) => onChange({ ...value, ...patch })

  const frameworkOptions: StackOption[] = [...FRONTEND_FRAMEWORKS, OTHER].map((fw) => ({
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
        onChange={(v) => set({ feFramework: v === OTHER ? '' : v })}
      />

      {radioValue === OTHER && (
        <TextInput
          label="Framework name"
          placeholder="e.g. SolidJS"
          value={value.feFramework}
          onChange={(e) => set({ feFramework: e.currentTarget.value })}
        />
      )}

      <OptionCardGroup
        label="UI library"
        options={UI_LIBRARIES.map((v) => ({ value: v }))}
        value={value.uiLibrary}
        onChange={(v) => set({ uiLibrary: v })}
      />

      <OptionCardGroup
        label="State management"
        options={STATE_LIBRARIES.map((v) => ({ value: v }))}
        value={value.stateManagement}
        onChange={(v) => set({ stateManagement: v })}
      />

      <OptionCardGroup
        label="Language"
        options={FRONTEND_LANGUAGES.map((v) => ({ value: v }))}
        value={value.feLanguage}
        onChange={(v) => set({ feLanguage: v })}
        cols={{ base: 2 }}
      />
    </Stack>
  )
}
