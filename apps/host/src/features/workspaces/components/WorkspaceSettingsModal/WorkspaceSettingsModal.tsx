import { useEffect, useState } from 'react'
import {
  Modal,
  Tabs,
  Stack,
  TextInput,
  Textarea,
  Group,
  Button,
  Text,
  Box,
  UnstyledButton,
} from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { ConfirmModal } from '@wispr/ui'
import { WS_SETTINGS, WS_SETTINGS_TABS } from '../../utility/constants/constants'
import type { WsSettingsTab } from '../../utility/constants/constants'
import {
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} from '../../utility/services/services'
import { WorkspaceMembers } from '../WorkspaceMembers/WorkspaceMembers'
import type { Workspace } from '../../utility/models/model'
import styles from './WorkspaceSettingsModal.module.css'

interface WorkspaceSettingsModalProps {
  workspace: Workspace
  tab: WsSettingsTab
  onTabChange: (tab: WsSettingsTab) => void
  onClose: () => void
  onDeleted: () => void
}

/**
 * Workspace settings (prototype's `wset-modal`): a centered, elevated modal with
 * underline tabs — General (name/description), Instructions (shared AI guidance),
 * People & Roles (member management), and a Danger zone (delete → cascades to the
 * workspace's projects). The footer "Done" persists General/Instructions edits (the
 * People/Danger actions persist immediately). The active tab is carried in the URL so
 * it's deep-linkable — the Members nav item opens this modal straight on People.
 */
export function WorkspaceSettingsModal({
  workspace,
  tab,
  onTabChange,
  onClose,
  onDeleted,
}: WorkspaceSettingsModalProps) {
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description)
  const [instructions, setInstructions] = useState(workspace.instructions)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [updateWorkspace, { isLoading: saving }] = useUpdateWorkspaceMutation()
  const [deleteWorkspace, { isLoading: deleting }] = useDeleteWorkspaceMutation()

  // Re-seed the editable fields whenever the workspace changes (cache refetch / switch).
  useEffect(() => {
    setName(workspace.name)
    setDescription(workspace.description)
    setInstructions(workspace.instructions)
  }, [workspace.id, workspace.name, workspace.description, workspace.instructions])

  const trimmedName = name.trim()
  const dirty =
    trimmedName !== workspace.name ||
    description.trim() !== workspace.description ||
    instructions !== workspace.instructions

  // "Done" — persist General/Instructions edits in one call, then close. A blank name
  // is the only blocker (the workspace must keep a name); everything else is optional.
  async function done() {
    if (!trimmedName) return
    if (!dirty) {
      onClose()
      return
    }
    try {
      await updateWorkspace({
        id: workspace.id,
        name: trimmedName,
        description: description.trim(),
        instructions,
      }).unwrap()
      notifications.show({ color: 'teal', title: 'Workspace updated', message: 'Settings saved.' })
      onClose()
    } catch {
      notifications.show({ color: 'red', title: 'Could not save', message: 'Please try again.' })
    }
  }

  async function confirmDelete() {
    try {
      await deleteWorkspace(workspace.id).unwrap()
      setConfirmOpen(false)
      onClose()
      notifications.show({
        color: 'teal',
        title: 'Workspace deleted',
        message: `“${workspace.name}” and its projects were removed.`,
      })
      onDeleted()
    } catch {
      notifications.show({ color: 'red', title: 'Could not delete', message: 'Please try again.' })
    }
  }

  return (
    <>
      <Modal
        opened
        onClose={onClose}
        centered
        size={620}
        radius="lg"
        padding={0}
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.48, blur: 6 }}
        classNames={{ content: styles.content ?? '', body: styles.body ?? '' }}
      >
        <Box className={styles.head ?? ''}>
          <Box>
            <Text className={styles.headTitle ?? ''}>Workspace settings</Text>
            <Text className={styles.headSub ?? ''}>Manage this workspace and who can access it.</Text>
          </Box>
          <UnstyledButton className={styles.close ?? ''} onClick={onClose} aria-label="Close settings">
            <IconX size={15} />
          </UnstyledButton>
        </Box>

        <Tabs
          value={tab}
          onChange={(v) => v && onTabChange(v as WsSettingsTab)}
          keepMounted={false}
          className={styles.tabs ?? ''}
          classNames={{ list: styles.tabsList ?? '', tab: styles.tab ?? '' }}
        >
          <Tabs.List>
            {WS_SETTINGS_TABS.map((t) => (
              <Tabs.Tab
                key={t.value}
                value={t.value}
                className={t.value === WS_SETTINGS.danger ? styles.tabDanger ?? '' : ''}
              >
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Box className={styles.panelArea ?? ''}>
            <Tabs.Panel value={WS_SETTINGS.general}>
              <Stack gap="md">
                <TextInput
                  label="Workspace name"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  withAsterisk
                  error={!trimmedName ? 'A workspace name is required' : undefined}
                />
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  autosize
                  minRows={3}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value={WS_SETTINGS.instructions}>
              <Stack gap="md">
                <Box className={`${styles.callout ?? ''} ${styles.calloutViolet ?? ''}`}>
                  <Box className={`${styles.calloutDot ?? ''} ${styles.calloutDotViolet ?? ''}`} />
                  <Text size="sm" lh={1.6}>
                    Instructions are shared AI guidance for every project in this workspace — tone,
                    constraints, defaults, and standards the assistant should always apply.
                  </Text>
                </Box>
                <Textarea
                  label="Workspace instructions"
                  placeholder="e.g. Audience is regulated financial services. Favour GDPR/SOC2-aware language."
                  value={instructions}
                  onChange={(e) => setInstructions(e.currentTarget.value)}
                  autosize
                  minRows={6}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value={WS_SETTINGS.people}>
              <WorkspaceMembers workspace={workspace} />
            </Tabs.Panel>

            <Tabs.Panel value={WS_SETTINGS.danger}>
              <Stack gap="md">
                <Box className={`${styles.callout ?? ''} ${styles.calloutDanger ?? ''}`}>
                  <Box className={`${styles.calloutDot ?? ''} ${styles.calloutDotDanger ?? ''}`} />
                  <Text size="sm" c="var(--cl-rose)" lh={1.6}>
                    Deleting a workspace removes all of its projects and its artifact library. This
                    cannot be undone.
                  </Text>
                </Box>
                <Group justify="flex-start">
                  <Button color="red" onClick={() => setConfirmOpen(true)}>
                    Delete this workspace
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>
          </Box>
        </Tabs>

        <Box className={styles.foot ?? ''}>
          <Button variant="accent" loading={saving} disabled={!trimmedName} onClick={done}>
            Done
          </Button>
        </Box>
      </Modal>

      <ConfirmModal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete workspace"
        message={`Delete “${workspace.name}” and all of its projects and artifacts? This cannot be undone.`}
        confirmLabel="Delete workspace"
        onConfirm={confirmDelete}
        loading={deleting}
        danger
      />
    </>
  )
}
