import { useState } from 'react'
import { Box, Group, Text, UnstyledButton, FileButton } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { artifactKind } from '../../utility/helpers/helpers'
import {
  useUploadArtifactMutation,
  useDeleteArtifactMutation,
} from '../../utility/services/services'
import type { Workspace, WorkspaceArtifact } from '../../utility/models/model'
import { ArtifactViewer } from '../ArtifactViewer/ArtifactViewer'
import styles from './ArtifactLibrary.module.css'

dayjs.extend(relativeTime)

interface ArtifactLibraryProps {
  workspace: Workspace
}

/** Mantine palette name per artifact kind (no hex — resolved by Mantine). */
const KIND_COLOR: Record<WorkspaceArtifact['kind'], string> = {
  doc: 'indigo.6',
  sheet: 'teal.6',
  file: 'gray.6',
}

/** Short uppercase extension tile label derived from the file name. */
function extLabel(name: string, kind: WorkspaceArtifact['kind']): string {
  const dot = name.lastIndexOf('.')
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1).toUpperCase().slice(0, 4)
  return kind === 'sheet' ? 'XLS' : kind === 'file' ? 'FILE' : 'DOC'
}

/**
 * The workspace artifact library aside (prototype `.ws-side`). Lists the workspace's
 * documents, supports upload (metadata-only in the mock), and opens a read-only
 * preview with download + remove. Artifacts are shared context for every project's AI.
 */
export function ArtifactLibrary({ workspace }: ArtifactLibraryProps) {
  const { artifacts } = workspace
  const [viewing, setViewing] = useState<WorkspaceArtifact | null>(null)

  const [uploadArtifact] = useUploadArtifactMutation()
  const [deleteArtifact, { isLoading: deleting }] = useDeleteArtifactMutation()

  async function handleUpload(files: File[]) {
    if (!files.length) return
    try {
      for (const file of files) {
        await uploadArtifact({
          workspaceId: workspace.id,
          name: file.name,
          kind: artifactKind(file.name),
        }).unwrap()
      }
      notifications.show({
        color: 'teal',
        title: 'Uploaded',
        message: `${files.length} document${files.length !== 1 ? 's' : ''} added to the workspace.`,
      })
    } catch {
      notifications.show({ color: 'red', title: 'Upload failed', message: 'Please try again.' })
    }
  }

  function downloadArtifact(artifact: WorkspaceArtifact) {
    notifications.show({ title: 'Download', message: `Downloading “${artifact.name}”…` })
  }

  async function removeArtifact(artifact: WorkspaceArtifact) {
    try {
      await deleteArtifact({ workspaceId: workspace.id, artifactId: artifact.id }).unwrap()
      setViewing(null)
      notifications.show({ color: 'teal', title: 'Removed', message: `“${artifact.name}” was removed.` })
    } catch {
      notifications.show({ color: 'red', title: 'Could not remove', message: 'Please try again.' })
    }
  }

  return (
    <Box component="aside" className={styles.side ?? ''}>
      <Box className={styles.head ?? ''}>
        <Text span className={styles.title ?? ''}>
          Artifact Library
        </Text>
        <Text span className={styles.count ?? ''}>
          {artifacts.length}
        </Text>
        <FileButton onChange={handleUpload} multiple>
          {(props) => (
            <UnstyledButton {...props} className={styles.upload ?? ''}>
              <IconPlus size={11} />
              Upload
            </UnstyledButton>
          )}
        </FileButton>
      </Box>
      <Text className={styles.sub ?? ''}>Documents uploaded to this workspace.</Text>

      {artifacts.length === 0 ? (
        <Text size="xs" c="dimmed" py="md">
          No documents yet. Use Upload to add files — workspace artifacts become shared context for
          every project's AI actions.
        </Text>
      ) : (
        <Box>
          {artifacts.map((a) => (
            <UnstyledButton
              key={a.id}
              className={styles.row ?? ''}
              w="100%"
              ta="left"
              onClick={() => setViewing(a)}
            >
              <Group gap={12} wrap="nowrap" align="center" w="100%">
                <Box className={styles.ic ?? ''} bg={KIND_COLOR[a.kind]} c="white">
                  {extLabel(a.name, a.kind)}
                </Box>
                <Box flex={1} miw={0}>
                  <Text className={styles.name ?? ''} truncate>
                    {a.name}
                  </Text>
                  <Text span className={styles.meta ?? ''}>
                    {a.source ?? 'Uploaded'}
                    {a.updatedAt ? ` · ${dayjs(a.updatedAt).fromNow()}` : ''}
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          ))}
        </Box>
      )}

      <ArtifactViewer
        artifact={viewing}
        onClose={() => setViewing(null)}
        onDownload={downloadArtifact}
        onDelete={removeArtifact}
        deleting={deleting}
      />
    </Box>
  )
}
