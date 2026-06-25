import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, NavLink, Text, Badge, Group, ColorSwatch, Divider, ThemeIcon } from '@mantine/core'
import { IconSettings, IconGitBranch } from '@tabler/icons-react'
import { useGetStoriesQuery } from '../../features/utility/services/featuresApi'
import { visibleStories } from '../../features/utility/helpers/helpers'
import {
  useGetTechStackQuery,
  useGetDesignAssetsQuery,
  useGetRepoQuery,
} from '../utility/services/implementationApi'
import { IMPLEMENTATION_SECTIONS } from '../utility/constants/sections'
import { PARAM_SETUP } from '../utility/constants/params'
import {
  frontendStatus,
  backendStatus,
  databaseStatus,
  designStatus,
} from '../utility/helpers/setup'
import type { ImplementationSectionId, SetupStatus } from '../utility/models/model'
import { ROUTES } from '@wispr/contracts'
import styles from '../utility/styles/implementation.module.css'
import nav from '../../../components/layout/SidebarNav.module.css'

const STATUS_COLOR: Record<SetupStatus, string | null> = {
  complete: 'var(--mantine-color-teal-6)',
  partial: 'var(--mantine-color-yellow-6)',
  untouched: null,
}

/**
 * Implementation workspace sidebar — section navigation (registry-driven, so new
 * sections are added by appending to IMPLEMENTATION_SECTIONS), per-section setup
 * status dots, a read-only repo strip, and the Settings entry to re-open the wizard.
 */
export function ImplementationSidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: stories = [] } = useGetStoriesQuery(projectId ?? skipToken)
  const { data: techStack } = useGetTechStackQuery(projectId ?? skipToken)
  const { data: design } = useGetDesignAssetsQuery(projectId ?? skipToken)
  const { data: repo } = useGetRepoQuery(projectId ?? skipToken)

  if (!projectId) return null

  const items = techStack?.items ?? []
  const active = visibleStories(stories).filter(
    (s) => s.status === 'ready' || s.status === 'in-progress' || s.status === 'done',
  )
  const doneCount = active.filter((s) => s.status === 'done').length

  const statusBySection: Record<ImplementationSectionId, SetupStatus> = {
    stories: 'untouched',
    frontend: frontendStatus(items),
    backend: backendStatus(items),
    database: databaseStatus(items),
    design: designStatus(design ?? null),
    log: 'untouched',
  }

  const activeSegment = location.pathname.split('/implementation/')[1]?.split('/')[0] ?? 'stories'
  const base = ROUTES.implementation(projectId)

  function openSettings() {
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_SETUP, '1')
    setSearchParams(next)
  }

  return (
    <Box className={styles.nav}>
      <Text className={styles.navSectionLabel}>Implementation</Text>

      {IMPLEMENTATION_SECTIONS.map((section) => {
        const Icon = section.icon
        const dotColor = STATUS_COLOR[statusBySection[section.id]]
        return (
          <NavLink
            key={section.id}
            label={section.label}
            classNames={{ root: nav.navRoot, label: nav.navLabel }}
            leftSection={<Icon size={16} />}
            active={activeSegment === section.segment}
            onClick={() => navigate(`${base}/${section.segment}`)}
            rightSection={
              section.id === 'stories' ? (
                <Badge size="xs" variant="default" radius="sm" ff="monospace" color="gray">
                  {doneCount}/{active.length}
                </Badge>
              ) : dotColor ? (
                <ColorSwatch size={8} color={dotColor} withShadow={false} />
              ) : undefined
            }
          />
        )
      })}

      <Divider my="sm" />
      <Text className={styles.navSectionLabel}>Repo</Text>
      <Box px="sm" py={4}>
        <Group gap={6} wrap="nowrap">
          <ThemeIcon size={16} variant="transparent" color="gray">
            <IconGitBranch size={13} />
          </ThemeIcon>
          <Text size="sm" truncate>
            {repo ? repo.branch : 'Not connected'}
          </Text>
        </Group>
        {repo && (
          <Text size="xs" c="dimmed" ff="monospace" mt={2}>
            {repo.repoName}
          </Text>
        )}
      </Box>

      <Divider my="sm" />
      <NavLink
        label="Settings"
        classNames={{ root: nav.navRoot, label: nav.navLabel }}
        leftSection={<IconSettings size={16} />}
        onClick={openSettings}
      />
    </Box>
  )
}
