import { Stack, Text } from '@mantine/core'
import type { AdditionalDoc } from '../../utility/models/model'
import { DocBox } from '../DocBox/DocBox'
import { AdditionalDocItem } from '../AdditionalDocItem/AdditionalDocItem'

interface AdditionalDocumentsProps {
  docs: AdditionalDoc[]
  /** When the phase is Done, deleting / editing are disabled. */
  locked: boolean
  onDelete: (id: string) => void
  onSaveContext: (id: string, text: string) => void
  onDownload: (name: string, objectBlobName?: string) => void
}

/**
 * The Additional documents tray — the same DocBox treatment as a mandatory requirement,
 * holding the free-form file chips (the Upload action lives in the section header above).
 */
export function AdditionalDocuments({ docs, locked, onDelete, onSaveContext, onDownload }: AdditionalDocumentsProps) {
  return (
    <DocBox>
      {docs.length === 0 ? (
        <Text size="xs" c="dimmed">
          No additional documents yet.
        </Text>
      ) : (
        <Stack gap={8}>
          {docs.map((doc) => (
            <AdditionalDocItem
              key={doc.id}
              name={doc.name}
              size={doc.size}
              context={doc.context}
              locked={locked}
              onDownload={() => onDownload(doc.name, doc.objectBlobName)}
              onDelete={() => onDelete(doc.id)}
              onSaveContext={(text) => onSaveContext(doc.id, text)}
            />
          ))}
        </Stack>
      )}
    </DocBox>
  )
}
