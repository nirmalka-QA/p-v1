import { notifications } from '@mantine/notifications'
import {
  Stack,
  Group,
  Text,
  Paper,
  SimpleGrid,
  Image,
  Button,
  FileButton,
  ActionIcon,
  ThemeIcon,
  Box,
  Skeleton,
} from '@mantine/core'
import { IconUpload, IconTrash, IconFileTypePdf, IconPhoto } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import {
  useGetDesignAssetsQuery,
  useSaveDesignAssetsMutation,
} from '../../utility/services/implementationApi'
import type { UploadedFile } from '../../utility/models/model'

interface MockupsTabProps {
  projectId: string
}

function toUploaded(file: File): UploadedFile {
  return {
    id: `mk-${file.name}-${file.size}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    status: 'ready',
    uploadedAt: new Date().toISOString(),
    url: URL.createObjectURL(file),
  }
}

/** Mockups Library — gallery of uploaded design references (images / PDFs). */
export function MockupsTab({ projectId }: MockupsTabProps) {
  const { data: design, isLoading } = useGetDesignAssetsQuery(projectId)
  const [saveDesign, { isLoading: saving }] = useSaveDesignAssetsMutation()

  const uploads = design?.uploads ?? []

  async function persist(next: UploadedFile[]) {
    try {
      await saveDesign({ projectId, patch: { uploads: next } }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Save failed', message: 'Please try again.' })
    }
  }

  function addFiles(files: File[]) {
    const incoming = files.map(toUploaded).filter((f) => !uploads.some((u) => u.id === f.id))
    if (incoming.length) void persist([...uploads, ...incoming])
  }

  function remove(id: string) {
    void persist(uploads.filter((u) => u.id !== id))
  }

  if (isLoading) return <Skeleton height={320} radius="md" />

  const uploadButton = (
    <FileButton onChange={addFiles} accept="image/png,image/jpeg,image/webp,application/pdf" multiple>
      {(props) => (
        <Button {...props} variant="light" leftSection={<IconUpload size={14} />} loading={saving}>
          Upload mockups
        </Button>
      )}
    </FileButton>
  )

  if (uploads.length === 0) {
    return (
      <EmptyState
        icon={IconPhoto}
        title="No mockups yet"
        description="Upload screens, wireframes, or PDF references. They're available to developers and attached to AI handoffs."
      >
        <Box mt="sm">{uploadButton}</Box>
      </EmptyState>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {uploads.length} reference{uploads.length === 1 ? '' : 's'}
        </Text>
        {uploadButton}
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
        {uploads.map((file) => {
          const isPdf = file.type.includes('pdf')
          return (
            <Paper key={file.id} withBorder radius="md" p="xs">
              <Stack gap="xs">
                {isPdf ? (
                  <Group justify="center" h={120} bg="var(--cl-surface-2)">
                    <ThemeIcon size={44} radius="md" variant="light" color="gray">
                      <IconFileTypePdf size={26} />
                    </ThemeIcon>
                  </Group>
                ) : (
                  <Image src={file.url} alt={file.name} h={120} fit="cover" radius="sm" />
                )}
                <Group gap={6} wrap="nowrap" justify="space-between">
                  <Text size="xs" truncate flex={1}>
                    {file.name}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => remove(file.id)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Paper>
          )
        })}
      </SimpleGrid>
    </Stack>
  )
}
