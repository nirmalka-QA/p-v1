import { Navigate, useSearchParams } from 'react-router-dom'
import { Box, Tabs } from '@mantine/core'
import { IconUsers, IconHistory, IconBuildingCommunity, IconLayoutGrid } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { PageHeader, ComingSoon } from '@wispr/ui'
import { useAppSelector } from '@wispr/store'
import { ROUTES } from '@wispr/contracts'
import { MockDataBanner } from '../../components/ui/MockDataBanner/MockDataBanner'
import { isPlatformAdmin } from '../auth/utility/helpers/helpers'
import {
  ADMIN_MODULES,
  ADMIN_SECTIONS,
  ADMIN_SECTION_PARAM,
  type AdminSection,
} from './utility/constants/constants'
import { UsersModule } from './components/UsersModule/UsersModule'
import { RegistryModule } from './components/RegistryModule/RegistryModule'

/** Module-key → tab icon (icons stay in the view; the module data stays pure). */
const SECTION_ICON: Record<AdminSection, Icon> = {
  [ADMIN_SECTIONS.users]: IconUsers,
  [ADMIN_SECTIONS.audit]: IconHistory,
  [ADMIN_SECTIONS.governance]: IconBuildingCommunity,
  [ADMIN_SECTIONS.registry]: IconLayoutGrid,
}

const DEFAULT_SECTION: AdminSection = ADMIN_SECTIONS.users

/**
 * The platform-admin console (`/admin`) — platformAdmin-gated, host-owned. Composes
 * the admin modules under one tabbed surface; the active module is carried in the
 * URL (`?section=`) so it survives reload / deep-link / back-forward. Only the Users
 * & roles module is live; the rest are scaffolded with ComingSoon.
 */
export function AdminPage() {
  const user = useAppSelector((s) => s.session.user)
  const isAdmin = isPlatformAdmin(user)
  const [searchParams, setSearchParams] = useSearchParams()

  if (!isAdmin) return <Navigate to={ROUTES.workspaces} replace />

  const param = searchParams.get(ADMIN_SECTION_PARAM)
  const active = ADMIN_MODULES.some((m) => m.key === param)
    ? (param as AdminSection)
    : DEFAULT_SECTION

  const setActive = (value: string | null) => {
    if (!value) return
    const next = new URLSearchParams(searchParams)
    next.set(ADMIN_SECTION_PARAM, value)
    setSearchParams(next, { replace: true })
  }

  return (
    <Box maw={1080} mx="auto" w="100%" px={28} pt={44} pb={80}>
      <PageHeader
        title="Settings"
        description="Platform-wide configuration and governance."
      />

      <Box mt="lg">
        <MockDataBanner surface="user and platform data" />
      </Box>

      <Tabs value={active} onChange={setActive} keepMounted={false} mt="lg">
        <Tabs.List mb="lg">
          {ADMIN_MODULES.map((module) => {
            const TabIcon = SECTION_ICON[module.key]
            return (
              <Tabs.Tab key={module.key} value={module.key} leftSection={<TabIcon size={16} />}>
                {module.label}
              </Tabs.Tab>
            )
          })}
        </Tabs.List>

        {ADMIN_MODULES.map((module) => (
          <Tabs.Panel key={module.key} value={module.key}>
            {module.key === ADMIN_SECTIONS.users ? (
              <UsersModule />
            ) : module.key === ADMIN_SECTIONS.registry ? (
              <RegistryModule />
            ) : (
              <ComingSoon label={module.label}>{module.description}</ComingSoon>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Box>
  )
}
