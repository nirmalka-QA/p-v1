import { DATABASES } from '../../utility/constants/constants'
import { OptionCardGroup } from './OptionCardGroup'
import type { StackSelection } from '../../utility/helpers/setup'

interface DatabaseSetupProps {
  value: StackSelection
  onChange: (next: StackSelection) => void
}

/** Database picker — type only (ORM lives with the backend selection). Controlled. */
export function DatabaseSetup({ value, onChange }: DatabaseSetupProps) {
  return (
    <OptionCardGroup
      label="Database"
      options={DATABASES.map((v) => ({ value: v }))}
      value={value.database}
      onChange={(v) => onChange({ ...value, database: v })}
    />
  )
}
