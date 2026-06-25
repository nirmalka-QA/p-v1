import { useState } from 'react'
import {
  Stack,
  Group,
  Avatar,
  Box,
  Text,
  Select,
  ActionIcon,
  Button,
  TextInput,
  Paper,
  Tooltip,
} from '@mantine/core'
import { IconUserPlus, IconTrash, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import type { Role } from '@wispr/contracts'
import { WORKSPACE_ROLES, WORKSPACE_ROLE_LABEL } from '../../utility/constants/constants'
import {
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from '../../utility/services/services'
import type { Workspace } from '../../utility/models/model'

interface WorkspaceMembersProps {
  workspace: Workspace
}

const ROLE_OPTIONS = WORKSPACE_ROLES.map((role) => ({
  value: role,
  label: WORKSPACE_ROLE_LABEL[role],
}))

/**
 * Manage a workspace's members — change roles, remove, and invite. The body of the
 * settings modal's "People & Roles" tab, which is itself a management surface, so the
 * controls are always available. The last owner can't be removed or demoted, so a
 * workspace always keeps an owner.
 */
export function WorkspaceMembers({ workspace }: WorkspaceMembersProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')

  const [inviteMember, { isLoading: inviting }] = useInviteMemberMutation()
  const [updateMemberRole] = useUpdateMemberRoleMutation()
  const [removeMember] = useRemoveMemberMutation()

  const ownerCount = workspace.members.filter((m) => m.role === 'owner').length

  async function changeRole(userId: string, nextRole: Role) {
    try {
      await updateMemberRole({ workspaceId: workspace.id, userId, role: nextRole }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Could not update role', message: 'Please try again.' })
    }
  }

  async function remove(userId: string, memberName: string) {
    try {
      await removeMember({ workspaceId: workspace.id, userId }).unwrap()
      notifications.show({ color: 'teal', title: 'Member removed', message: `${memberName} no longer has access.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not remove member', message: 'Please try again.' })
    }
  }

  function resetInvite() {
    setName('')
    setEmail('')
    setRole('member')
    setInviteOpen(false)
  }

  async function submitInvite() {
    if (!name.trim()) return
    try {
      await inviteMember({
        workspaceId: workspace.id,
        name: name.trim(),
        role,
        ...(email.trim() ? { email: email.trim() } : {}),
      }).unwrap()
      notifications.show({ color: 'teal', title: 'Member invited', message: `${name.trim()} was added to the workspace.` })
      resetInvite()
    } catch {
      notifications.show({ color: 'red', title: 'Could not invite member', message: 'Please try again.' })
    }
  }

  return (
    <Stack gap="sm">
      {workspace.members.map((member) => {
        const isLastOwner = member.role === 'owner' && ownerCount === 1
        return (
          <Paper key={member.userId} withBorder radius="md" px="sm" py="xs">
            <Group gap="sm" wrap="nowrap">
              <Avatar color={member.colorSeed} variant="filled" radius="xl" size={34} fz={12} fw={700}>
                {member.initials}
              </Avatar>
              <Box flex={1} miw={0}>
                <Text size="sm" fw={600} truncate>
                  {member.name}
                </Text>
                {member.email ? (
                  <Text size="xs" c="dimmed" truncate>
                    {member.email}
                  </Text>
                ) : null}
              </Box>
              <Tooltip label="A workspace must keep an owner" disabled={!isLastOwner} withinPortal>
                <Select
                  data={ROLE_OPTIONS}
                  value={member.role}
                  onChange={(v) => v && changeRole(member.userId, v as Role)}
                  disabled={isLastOwner}
                  allowDeselect={false}
                  w={130}
                  size="xs"
                />
              </Tooltip>
              <Tooltip label={isLastOwner ? 'A workspace must keep an owner' : 'Remove member'} withinPortal>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="md"
                  aria-label={`Remove ${member.name}`}
                  disabled={isLastOwner}
                  onClick={() => remove(member.userId, member.name)}
                >
                  <IconTrash size={15} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Paper>
        )
      })}

      {!inviteOpen ? (
        <Button
          variant="default"
          leftSection={<IconUserPlus size={15} />}
          onClick={() => setInviteOpen(true)}
          mt="xs"
        >
          Invite member
        </Button>
      ) : null}

      {inviteOpen ? (
        <Paper withBorder radius="md" p="md" mt="xs">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Invite a member
              </Text>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Cancel invite" onClick={resetInvite}>
                <IconX size={15} />
              </ActionIcon>
            </Group>
            <Group gap="sm" align="flex-end" wrap="wrap">
              <TextInput
                label="Name"
                placeholder="e.g. Alex Yim"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                flex={1}
                miw={160}
              />
              <TextInput
                label="Email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                flex={1}
                miw={160}
              />
              <Select
                label="Role"
                data={ROLE_OPTIONS}
                value={role}
                onChange={(v) => v && setRole(v as Role)}
                allowDeselect={false}
                w={130}
              />
            </Group>
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" color="gray" onClick={resetInvite}>
                Cancel
              </Button>
              <Button variant="accent" loading={inviting} disabled={!name.trim()} onClick={submitInvite}>
                Add member
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  )
}
