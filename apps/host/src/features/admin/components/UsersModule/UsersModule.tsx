import { useMemo, useState } from 'react'
import { Stack, Group, TextInput, Skeleton } from '@mantine/core'
import { IconSearch, IconAlertTriangle, IconUsers, IconUserSearch } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { EmptyState, ConfirmModal } from '@wispr/ui'
import { useAppSelector } from '@wispr/store'
import {
  useGetAdminUsersQuery,
  useSetPlatformAdminMutation,
  useSetUserStatusMutation,
  useForceSignOutMutation,
} from '../../utility/services/services'
import type { AdminUser } from '../../utility/models/model'
import { UsersTable } from '../UsersTable/UsersTable'

/** A pending destructive action awaiting confirmation. */
type PendingAction =
  | { kind: 'platformAdmin'; user: AdminUser }
  | { kind: 'status'; user: AdminUser }
  | { kind: 'signOut'; user: AdminUser }

/**
 * Users & roles module — the platform-wide directory aggregated across every
 * workspace. Owns the query lifecycle (loading / error / empty), client-side
 * search, and the confirm-then-mutate flow for the row actions.
 */
export function UsersModule() {
  const currentUserId = useAppSelector((s) => s.session.user?.id)
  const { data, isLoading, isError, refetch } = useGetAdminUsersQuery()

  const [setPlatformAdmin, platformAdminState] = useSetPlatformAdminMutation()
  const [setUserStatus, statusState] = useSetUserStatusMutation()
  const [forceSignOut, signOutState] = useForceSignOutMutation()

  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)

  const users = useMemo(() => data?.users ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
    )
  }, [users, search])

  const mutating =
    platformAdminState.isLoading || statusState.isLoading || signOutState.isLoading

  async function confirmPending() {
    if (!pending) return
    const { kind, user } = pending
    try {
      if (kind === 'platformAdmin') {
        await setPlatformAdmin({ userId: user.userId, isPlatformAdmin: !user.isPlatformAdmin }).unwrap()
        notifications.show({
          color: 'violet',
          message: user.isPlatformAdmin
            ? `Revoked platform admin from ${user.name}.`
            : `${user.name} is now a platform admin.`,
        })
      } else if (kind === 'status') {
        const next = user.status === 'active' ? 'deactivated' : 'active'
        await setUserStatus({ userId: user.userId, status: next }).unwrap()
        notifications.show({
          color: next === 'deactivated' ? 'red' : 'teal',
          message: next === 'deactivated'
            ? `${user.name} has been deactivated.`
            : `${user.name} has been reactivated.`,
        })
      } else {
        await forceSignOut(user.userId).unwrap()
        notifications.show({ color: 'blue', message: `Signed ${user.name} out of all sessions.` })
      }
      setPending(null)
    } catch {
      notifications.show({
        color: 'red',
        title: 'Action failed',
        message: 'Could not complete the request. Please try again.',
      })
    }
  }

  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton height={40} radius="md" />
        <Skeleton height={64} radius="md" />
        <Skeleton height={64} radius="md" />
        <Skeleton height={64} radius="md" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load users"
        description="Something went wrong while fetching the platform directory. Please try again."
        action={{ label: 'Retry', onClick: () => refetch() }}
      />
    )
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={IconUsers}
        title="No users yet"
        description="Users appear here once they're invited to a workspace. Create a workspace and invite your team to get started."
      />
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search by name or email"
          leftSection={<IconSearch size={16} />}
          w={300}
        />
      </Group>

      {filtered.length === 0 ? (
        <EmptyState
          icon={IconUserSearch}
          title="No matching users"
          description="No users match your search. Try a different name or email."
        />
      ) : (
        <UsersTable
          users={filtered}
          currentUserId={currentUserId}
          onTogglePlatformAdmin={(user) => setPending({ kind: 'platformAdmin', user })}
          onToggleStatus={(user) => setPending({ kind: 'status', user })}
          onForceSignOut={(user) => setPending({ kind: 'signOut', user })}
        />
      )}

      <ConfirmModal
        opened={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        loading={mutating}
        danger={pending?.kind === 'status' && pending.user.status === 'active'}
        title={confirmTitle(pending)}
        message={confirmMessage(pending)}
        confirmLabel={confirmLabel(pending)}
      />
    </Stack>
  )
}

function confirmTitle(action: PendingAction | null): string {
  if (!action) return ''
  if (action.kind === 'platformAdmin') {
    return action.user.isPlatformAdmin ? 'Revoke platform admin?' : 'Grant platform admin?'
  }
  if (action.kind === 'status') {
    return action.user.status === 'active' ? 'Deactivate user?' : 'Reactivate user?'
  }
  return 'Force sign-out?'
}

function confirmMessage(action: PendingAction | null): string {
  if (!action) return ''
  const { user } = action
  if (action.kind === 'platformAdmin') {
    return user.isPlatformAdmin
      ? `${user.name} will lose access to the admin console and all platform-wide controls.`
      : `${user.name} will gain full access to the admin console and every workspace.`
  }
  if (action.kind === 'status') {
    return user.status === 'active'
      ? `${user.name} will be signed out and won't be able to sign in until reactivated. Their data is preserved.`
      : `${user.name} will be able to sign in again.`
  }
  return `${user.name} will be signed out of all active sessions immediately.`
}

function confirmLabel(action: PendingAction | null): string {
  if (!action) return 'Confirm'
  if (action.kind === 'platformAdmin') return action.user.isPlatformAdmin ? 'Revoke' : 'Grant'
  if (action.kind === 'status') return action.user.status === 'active' ? 'Deactivate' : 'Reactivate'
  return 'Sign out'
}
