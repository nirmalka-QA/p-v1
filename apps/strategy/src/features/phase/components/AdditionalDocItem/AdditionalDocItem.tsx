import { useState } from 'react'
import { Stack } from '@mantine/core'
import { IconDownload, IconTrash, IconMessagePlus } from '@tabler/icons-react'
import { fileMeta } from '../../utility/helpers/helpers'
import { FileItem } from '../FileItem/FileItem'
import { ContextEditor } from '../ContextEditor/ContextEditor'

interface AdditionalDocItemProps {
  name: string
  size?: number | undefined
  context: string
  locked: boolean
  onDownload: () => void
  onDelete: () => void
  onSaveContext: (text: string) => void
}

/**
 * One user-added additional document — a file chip whose ⋯ menu carries Download, the
 * (subtle) context toggle, and Delete, with its context editor beneath.
 */
export function AdditionalDocItem({ name, size, context, locked, onDownload, onDelete, onSaveContext }: AdditionalDocItemProps) {
  const [ctxOpen, setCtxOpen] = useState(false)
  const hasContext = context.trim().length > 0

  return (
    <Stack gap={8}>
      <FileItem
        name={name}
        meta={fileMeta(name, size)}
        actions={[
          { label: 'Download', icon: <IconDownload size={15} />, onClick: onDownload },
          { label: hasContext ? 'Edit context' : 'Add context', icon: <IconMessagePlus size={15} />, onClick: () => setCtxOpen(true), disabled: locked },
          { label: 'Delete', icon: <IconTrash size={15} />, color: 'red', confirm: true, onClick: onDelete, disabled: locked },
        ]}
      />
      <ContextEditor context={context} opened={ctxOpen} locked={locked} onSave={onSaveContext} onClose={() => setCtxOpen(false)} />
    </Stack>
  )
}
