import { useState } from 'react'
import { Stack, Text, Group, FileButton, Button, ActionIcon, Tooltip } from '@mantine/core'
import { IconUpload, IconMessagePlus, IconDownload, IconTrash } from '@tabler/icons-react'
import type { UploadedFile } from '../../utility/models/model'
import { fileMeta } from '../../utility/helpers/helpers'
import { DocBox } from '../DocBox/DocBox'
import { FileItem } from '../FileItem/FileItem'
import { ContextEditor } from '../ContextEditor/ContextEditor'

interface MandatoryInputProps {
  /** The mandatory requirement title (the tray title). */
  title: string
  files: UploadedFile[]
  context: string
  locked: boolean
  onUpload: (file: File) => void
  onDownload: (fileName: string) => void
  onDeleteFile: (fileId: string) => void
  onSaveContext: (text: string) => void
}

/**
 * One mandatory requirement as a tray: the requirement title with a subtle Upload action
 * and an even subtler context toggle, the uploaded files listed inside as file chips
 * (each with a ⋯ menu), and the slot's context editor.
 */
export function MandatoryInput({ title, files, context, locked, onUpload, onDownload, onDeleteFile, onSaveContext }: MandatoryInputProps) {
  const [ctxOpen, setCtxOpen] = useState(false)
  const hasContext = context.trim().length > 0

  const action = (
    <Group gap={4} wrap="nowrap">
      <FileButton onChange={(file) => file && onUpload(file)} disabled={locked}>
        {(props) => (
          <Button {...props} size="compact-sm" variant="subtle" leftSection={<IconUpload size={14} />} disabled={locked}>
            Upload
          </Button>
        )}
      </FileButton>
      <Tooltip label={hasContext ? 'Edit context' : 'Add context'}>
        <ActionIcon
          variant="subtle"
          color={hasContext ? 'violet' : 'gray'}
          aria-label={hasContext ? 'Edit context' : 'Add context'}
          disabled={locked}
          onClick={() => setCtxOpen((open) => !open)}
        >
          <IconMessagePlus size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )

  return (
    <DocBox title={title} action={action}>
      {files.length > 0 ? (
        <Stack gap={8}>
          {files.map((file) => (
            <FileItem
              key={file.id}
              name={file.name}
              meta={fileMeta(file.name, file.size)}
              actions={[
                { label: 'Download', icon: <IconDownload size={15} />, onClick: () => onDownload(file.name) },
                { label: 'Delete', icon: <IconTrash size={15} />, color: 'red', confirm: true, onClick: () => onDeleteFile(file.id), disabled: locked },
              ]}
            />
          ))}
        </Stack>
      ) : (
        <Text size="xs" c="dimmed">
          No file uploaded yet.
        </Text>
      )}

      <ContextEditor context={context} opened={ctxOpen} locked={locked} onSave={onSaveContext} onClose={() => setCtxOpen(false)} />
    </DocBox>
  )
}
