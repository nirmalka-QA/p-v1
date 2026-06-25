import { Table, Group, Stack, Text, Avatar, Badge, Menu, ActionIcon } from '@mantine/core'
import {
  IconDots,
  IconShieldCheck,
  IconShieldOff,
  IconUserCheck,
  IconUserOff,
  IconLogout,
} from '@tabler/icons-react'
import {
  USER_STATUS_LABEL,
  USER_STATUS_COLOR,
  WORKSPACE_ROLE_LABEL,
} from '../../utility/constants/constants'
import type { AdminUser } from '../../utility/models/model'

interface UsersTableProps {
  users: AdminUser[]
  /** The signed-in admin's id — destructive self-actions are disabled. */
  currentUserId?: string | undefined
  onTogglePlatformAdmin: (user: AdminUser) => void
  onToggleStatus: (user: AdminUser) => void
  onForceSignOut: (user: AdminUser) => void
}

/**
 * The platform users table: identity, platform-admin flag, workspace membership,
 * and account status, with a per-row actions menu. Pure presentation — every
 * action is delegated to the parent so the module owns confirmation + mutations.
 */
export function UsersTable({
  users,
  currentUserId,
  onTogglePlatformAdmin,
  onToggleStatus,
  onForceSignOut,
}: UsersTableProps) {
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>User</Table.Th>
            <Table.Th>Platform role</Table.Th>
            <Table.Th>Workspaces</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th w={48} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((user) => {
            const isSelf = user.userId === currentUserId
            return (
              <Table.Tr key={user.userId}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color={user.colorSeed} radius="xl" size={36}>
                      {user.initials}
                    </Avatar>
                    <Stack gap={0} miw={0}>
                      <Text size="sm" fw={600} truncate>
                        {user.name}
                        {isSelf && (
                          <Text span c="dimmed" fw={500} ml={6}>
                            (you)
                          </Text>
                        )}
                      </Text>
                      {user.email && (
                        <Text size="xs" c="dimmed" truncate>
                          {user.email}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Table.Td>

                <Table.Td>
                  {user.isPlatformAdmin ? (
                    <Badge color="violet" variant="light" leftSection={<IconShieldCheck size={12} />}>
                      Platform Admin
                    </Badge>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>

                <Table.Td>
                  <Group gap={6} wrap="wrap">
                    <Text size="sm" fw={500}>
                      {user.workspaceCount}
                    </Text>
                    {user.workspaceRoles.map((role) => (
                      <Badge key={role} color="gray" variant="default" size="sm" radius="sm">
                        {WORKSPACE_ROLE_LABEL[role]}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>

                <Table.Td>
                  <Badge color={USER_STATUS_COLOR[user.status]} variant="light">
                    {USER_STATUS_LABEL[user.status]}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Menu position="bottom-end" withinPortal shadow="md" width={216}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${user.name}`}>
                        <IconDots size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={
                          user.isPlatformAdmin ? <IconShieldOff size={16} /> : <IconShieldCheck size={16} />
                        }
                        disabled={isSelf && user.isPlatformAdmin}
                        onClick={() => onTogglePlatformAdmin(user)}
                      >
                        {user.isPlatformAdmin ? 'Revoke platform admin' : 'Make platform admin'}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          user.status === 'active' ? <IconUserOff size={16} /> : <IconUserCheck size={16} />
                        }
                        {...(user.status === 'active' ? { color: 'red' } : {})}
                        disabled={isSelf && user.status === 'active'}
                        onClick={() => onToggleStatus(user)}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconLogout size={16} />}
                        disabled={isSelf}
                        onClick={() => onForceSignOut(user)}
                      >
                        Force sign-out
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
