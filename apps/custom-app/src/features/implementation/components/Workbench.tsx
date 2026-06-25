import { useParams, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, Tabs, Skeleton, Group, Tooltip, ActionIcon, Popover, Switch } from '@mantine/core'
import { IconSettings, IconArrowsMaximize } from '@tabler/icons-react'
import { PageHeader } from '@wispr/ui'
import { ComingSoon } from '@wispr/ui'
import { useCurrentProject } from '@wispr/projects'
import { SectionSetup } from './SectionSetup'
import { DevelopMode } from './DevelopMode'
import { RepoPanel } from './RepoPanel'
import { StoryLogPanel } from './StoryLogPanel'
import { ContinueToTestButton } from './ContinueToTestButton'
import { useGetTechStackQuery } from '../utility/services/implementationApi'
import { useCommitMode } from '../utility/hooks/useCommitMode'
import { frontendStatus, backendStatus, type StackArea } from '../utility/helpers/setup'
import { PARAM_MODE, PARAM_FOCUS } from '../utility/constants/params'

export interface WorkbenchConfig {
  area: Extract<StackArea, 'frontend' | 'backend'>
  title: string
  /** Header copy before the stack is configured (points to setup). */
  description: string
  /** Header copy once the stack is configured (points to the actual work). */
  configuredDescription: string
  setupDescription: string
  /** What generated code covers, surfaced in the handoff prompt. */
  codeScope: string
  showDesignRef: boolean
}

const MODES = ['develop', 'code', 'preview', 'log'] as const
type Mode = (typeof MODES)[number]

/**
 * Shared Frontend/Backend workspace. Shows the section's own setup when its
 * stack isn't configured (skippable wizard alternative); otherwise the
 * Develop / Code / Preview tabs.
 */
export function Workbench({ config }: { config: WorkbenchConfig }) {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useCurrentProject()
  const { data: techStack, isLoading } = useGetTechStackQuery(projectId ?? skipToken)
  const [searchParams, setSearchParams] = useSearchParams()
  const [commitMode, setCommitMode] = useCommitMode(projectId ?? '', config.area)

  const focus = searchParams.get(PARAM_FOCUS) === '1'
  function toggleFocus() {
    const next = new URLSearchParams(searchParams)
    if (focus) next.delete(PARAM_FOCUS)
    else next.set(PARAM_FOCUS, '1')
    setSearchParams(next)
  }

  if (!projectId || !project) return null

  const items = techStack?.items ?? []
  const configured =
    config.area === 'frontend' ? frontendStatus(items) !== 'untouched' : backendStatus(items) !== 'untouched'

  const paramMode = searchParams.get(PARAM_MODE)
  const mode: Mode = (MODES as readonly string[]).includes(paramMode ?? '') ? (paramMode as Mode) : 'develop'

  function setMode(value: string | null) {
    if (!value) return
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_MODE, value)
    setSearchParams(next)
  }

  return (
    <Box>
      <PageHeader
        title={config.title}
        description={configured ? config.configuredDescription : config.description}
        actions={
          <Group gap="xs">
            <Tooltip label={focus ? 'Exit focus' : 'Focus mode'} withArrow>
              <ActionIcon
                variant={focus ? 'filled' : 'default'}
                color={focus ? 'indigo' : 'gray'}
                size="lg"
                onClick={toggleFocus}
                aria-label="Toggle focus mode"
              >
                <IconArrowsMaximize size={16} />
              </ActionIcon>
            </Tooltip>
            <Popover position="bottom-end" withArrow>
              <Popover.Target>
                <ActionIcon variant="default" size="lg" aria-label="Workspace settings">
                  <IconSettings size={16} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Switch
                  checked={commitMode === 'auto'}
                  onChange={(e) => setCommitMode(e.currentTarget.checked ? 'auto' : 'manual')}
                  label="Auto-commit"
                  description="Open the PR automatically after a push"
                />
              </Popover.Dropdown>
            </Popover>
            <ContinueToTestButton projectId={projectId} />
          </Group>
        }
      />

      {isLoading ? (
        <Skeleton height={200} radius="md" />
      ) : !configured ? (
        <SectionSetup
          projectId={projectId}
          projectType={project.type}
          area={config.area}
          description={config.setupDescription}
        />
      ) : (
        <>
          <Tabs value={mode} onChange={setMode} mb="md">
            <Tabs.List>
              <Tabs.Tab value="develop">Develop</Tabs.Tab>
              <Tabs.Tab value="code">Code</Tabs.Tab>
              <Tabs.Tab value="preview" rightSection={<ComingSoon inline />}>
                Preview
              </Tabs.Tab>
              <Tabs.Tab value="log">Implementation log</Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {mode === 'develop' && (
            <DevelopMode
              projectId={projectId}
              scopeKey={config.area}
              showDesignRef={config.showDesignRef}
              autoCommit={commitMode === 'auto'}
            />
          )}
          {mode === 'code' && <RepoPanel projectId={projectId} projectName={project.name} />}
          {mode === 'preview' && (
            <ComingSoon label="Preview Mode">
              Run your {config.area} app directly in the platform. Coming soon.
            </ComingSoon>
          )}
          {mode === 'log' && <StoryLogPanel projectId={projectId} />}
        </>
      )}
    </Box>
  )
}
