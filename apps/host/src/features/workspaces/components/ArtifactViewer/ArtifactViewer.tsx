import { Modal, Group, Box, Stack, Text, Button, Paper } from '@mantine/core'
import { IconDownload, IconTrash, IconFile } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { WorkspaceArtifact } from '../../utility/models/model'
import styles from './ArtifactViewer.module.css'

dayjs.extend(relativeTime)

interface ArtifactViewerProps {
  artifact: WorkspaceArtifact | null
  onClose: () => void
  onDownload: (artifact: WorkspaceArtifact) => void
  onDelete: (artifact: WorkspaceArtifact) => void
  deleting: boolean
}

/** Short uppercase extension tile label derived from the file name. */
function extLabel(name: string, kind: WorkspaceArtifact['kind']): string {
  const dot = name.lastIndexOf('.')
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1).toUpperCase().slice(0, 4)
  return kind === 'sheet' ? 'XLS' : kind === 'file' ? 'FILE' : 'DOC'
}

/**
 * Read-only preview of a workspace artifact (prototype's `artv-modal`): file header,
 * snippet, and download/remove actions. The preview is metadata-only — the full
 * document opens in its source project in the live platform.
 */
export function ArtifactViewer({ artifact, onClose, onDownload, onDelete, deleting }: ArtifactViewerProps) {
  if (!artifact) return null

  return (
    <Modal opened onClose={onClose} title="Document preview" size="md" centered>
      <Stack gap="md">
        <Group gap="md" wrap="nowrap" align="flex-start">
          <Box className={styles.fileIcon ?? ''}>
            <IconFile size={18} />
          </Box>
          <Box flex={1} miw={0}>
            <Text fw={700} fz={15} truncate>
              {artifact.name}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" mt={3}>
              {(artifact.source ?? 'Uploaded') + (artifact.updatedAt ? ` · ${dayjs(artifact.updatedAt).fromNow()}` : '')}
              {' · '}
              {extLabel(artifact.name, artifact.kind)}
            </Text>
          </Box>
        </Group>

        <Paper withBorder radius="md" p="md" bg="var(--cl-bg-sunken)">
          <Text size="sm" c="dimmed" lh={1.65}>
            {artifact.snippet ?? 'No preview available for this document.'}
          </Text>
        </Paper>

        <Text size="xs" c="dimmed" lh={1.5}>
          Preview only — the full document opens in its source project in the live platform.
        </Text>

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={15} />}
            loading={deleting}
            onClick={() => onDelete(artifact)}
          >
            Remove
          </Button>
          <Button
            variant="default"
            leftSection={<IconDownload size={15} />}
            onClick={() => onDownload(artifact)}
          >
            Download
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
