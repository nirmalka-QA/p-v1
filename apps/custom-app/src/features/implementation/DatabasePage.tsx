import { Box } from '@mantine/core'
import { useSearchParams } from 'react-router-dom'
import { IconDatabase } from '@tabler/icons-react'
import { PageHeader } from '@wispr/ui'
import { EmptyState } from '@wispr/ui'
import { PARAM_SETUP } from './utility/constants/params'

/** Implementation › Database. Schema + Migrations tabs arrive in M4. */
export function DatabasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  function openSetup() {
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_SETUP, '1')
    setSearchParams(next)
  }
  return (
    <Box>
      <PageHeader title="Database" description="Configure your database and generate a schema from your stories." />
      <EmptyState
        icon={IconDatabase}
        title="Database workspace"
        description="Schema generation and migrations arrive in the next build. Choose your database now — in Setup, or here once this section ships."
        action={{ label: 'Open Setup', onClick: openSetup }}
      />
    </Box>
  )
}
