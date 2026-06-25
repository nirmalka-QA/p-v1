import { Box, Tabs } from '@mantine/core'
import { useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@wispr/ui'
import { useCurrentProject } from '@wispr/projects'
import { PARAM_TAB } from './utility/constants/params'
import { DESIGN_TABS, DEFAULT_DESIGN_TAB, type DesignTabId } from './utility/constants/design'
import { ConnectionsTab } from './components/design/ConnectionsTab'
import { TokensTab } from './components/design/TokensTab'
import { MockupsTab } from './components/design/MockupsTab'

const TAB_IDS = DESIGN_TABS.map((t) => t.id)

function isDesignTab(value: string | null): value is DesignTabId {
  return value !== null && (TAB_IDS as string[]).includes(value)
}

/**
 * Implementation › Design — the design-system hub. Gathers everything that
 * informs how the app looks and how AI generates it: external connections &
 * references, design tokens, the mockups library, and the generated AI
 * instruction file. Tabs are driven by `?tab=` so links are shareable.
 */
export function DesignPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useCurrentProject()
  const [searchParams, setSearchParams] = useSearchParams()

  const param = searchParams.get(PARAM_TAB)
  const tab = isDesignTab(param) ? param : DEFAULT_DESIGN_TAB

  function setTab(next: string | null) {
    if (!next) return
    const params = new URLSearchParams(searchParams)
    params.set(PARAM_TAB, next)
    setSearchParams(params)
  }

  if (!projectId || !project) return null

  return (
    <Box>
      <PageHeader
        title="Design"
        description="Your design connections, tokens, mockups, and AI instructions in one place — the shared visual context for code generation."
      />

      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List mb="xl">
          {DESIGN_TABS.map((t) => {
            const Icon = t.icon
            return (
              <Tabs.Tab key={t.id} value={t.id} leftSection={<Icon size={15} />}>
                {t.label}
              </Tabs.Tab>
            )
          })}
        </Tabs.List>

        <Tabs.Panel value="connections">
          <ConnectionsTab projectId={projectId} />
        </Tabs.Panel>
        <Tabs.Panel value="tokens">
          <TokensTab projectId={projectId} />
        </Tabs.Panel>
        <Tabs.Panel value="mockups">
          <MockupsTab projectId={projectId} />
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
