import { Paper, Stack, Text, FileButton, Button } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import type { ProjectPhase } from '@wispr/projects'
import type { PhaseProgress } from '../../utility/models/model'
import { ColumnHeader } from '../ColumnHeader/ColumnHeader'
import { SectionHeader } from '../SectionHeader/SectionHeader'
import { MandatoryInput } from '../MandatoryInput/MandatoryInput'
import { AdditionalDocuments } from '../AdditionalDocuments/AdditionalDocuments'

interface InputDocumentsProps {
  phase: ProjectPhase
  progress: PhaseProgress
  /** When the phase is Done, all input mutations are disabled (download stays). */
  locked: boolean
  onUpload: (slot: string, file: File) => void
  onDeleteMandatoryFile: (slot: string, fileId: string) => void
  onSaveContext: (slot: string, text: string) => void
  onUploadAdditional: (file: File) => void
  onDeleteAdditional: (id: string) => void
  onSaveAdditionalContext: (id: string, text: string) => void
  onDownload: (name: string, objectBlobName?: string) => void
}

/**
 * The Input column — a modal-style header over two clearly-separated sections: Mandatory
 * inputs (one tray per requirement) and Additional documents (one tray). The Additional
 * Upload action lives in its section header.
 */
export function InputDocuments({
  phase,
  progress,
  locked,
  onUpload,
  onDeleteMandatoryFile,
  onSaveContext,
  onUploadAdditional,
  onDeleteAdditional,
  onSaveAdditionalContext,
  onDownload,
}: InputDocumentsProps) {
  const mandatory = phase.inputs.filter((i) => i.mandatory)

  return (
    <Paper withBorder radius="md" p="lg">
      <ColumnHeader
        title="Input Documents"
        description="Upload the documents and add context to steer the AI. Mandatory inputs unlock generation."
      />

      {mandatory.length > 0 ? (
        <>
          <SectionHeader title="Mandatory inputs" hint="Required before outputs can be generated." />
          <Stack gap="sm">
            {mandatory.map((input) => (
              <MandatoryInput
                key={input.name}
                title={input.name}
                files={progress.mandatoryFiles[input.name] ?? []}
                context={progress.inputContext[input.name] ?? ''}
                locked={locked}
                onUpload={(file) => onUpload(input.name, file)}
                onDownload={onDownload}
                onDeleteFile={(fileId) => onDeleteMandatoryFile(input.name, fileId)}
                onSaveContext={(text) => onSaveContext(input.name, text)}
              />
            ))}
          </Stack>
        </>
      ) : null}

      <SectionHeader
        title="Additional documents"
        hint="Optional supporting material — informs generation."
        topDivider
        right={
          <FileButton onChange={(file) => file && onUploadAdditional(file)} disabled={locked}>
            {(props) => (
              <Button {...props} size="compact-sm" variant="subtle" leftSection={<IconUpload size={14} />} disabled={locked}>
                Upload
              </Button>
            )}
          </FileButton>
        }
      />
      <AdditionalDocuments
        docs={progress.additionalDocs}
        locked={locked}
        onDelete={onDeleteAdditional}
        onSaveContext={onSaveAdditionalContext}
        onDownload={onDownload}
      />

      {locked ? (
        <Text size="xs" c="dimmed" mt="md">
          This phase is Done — set it to In Progress to upload or edit documents.
        </Text>
      ) : null}
    </Paper>
  )
}
