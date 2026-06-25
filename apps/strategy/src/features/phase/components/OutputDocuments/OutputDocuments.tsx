import { Paper, Box, Stack, Text } from '@mantine/core'
import type { ProjectPhase } from '@wispr/projects'
import type { PhaseProgress } from '../../utility/models/model'
import { ColumnHeader } from '../ColumnHeader/ColumnHeader'
import { DocBox } from '../DocBox/DocBox'
import { OutputDocItem } from '../OutputDocItem/OutputDocItem'

interface OutputDocumentsProps {
  phase: ProjectPhase
  progress: PhaseProgress
  /** Outputs can only be generated once all mandatory inputs are uploaded. */
  canGenerate: boolean
  /** When the phase is Done, (re)generation is disabled (download stays). */
  locked: boolean
  onGenerate: (name: string) => void
  onDownload: (name: string) => void
}

/** The Output column — a tray of output chips, AI-generated once mandatory inputs are in. */
export function OutputDocuments({ phase, progress, canGenerate, locked, onGenerate, onDownload }: OutputDocumentsProps) {
  return (
    <Paper withBorder radius="md" p="lg">
      <ColumnHeader
        title="Output Documents"
        description="Generated from your uploaded inputs and the context you add to them."
      />

      {phase.outputs.length === 0 ? (
        <Text size="sm" c="dimmed" mt="lg">
          No outputs for this phase.
        </Text>
      ) : (
        <Box mt="lg">
          <DocBox>
            <Stack gap={8}>
              {phase.outputs.map((output) => (
                <OutputDocItem
                  key={output.name}
                  name={output.name}
                  format={output.fmt}
                  generated={progress.generatedOutputs.includes(output.name)}
                  generatedAt={progress.generatedAt[output.name]}
                  locked={locked}
                  canGenerate={canGenerate}
                  onGenerate={() => onGenerate(output.name)}
                  onDownload={() => onDownload(output.name)}
                />
              ))}
            </Stack>
          </DocBox>
          {locked ? (
            <Text size="xs" c="dimmed" mt="sm">
              This phase is Done — set it to In Progress to generate or regenerate.
            </Text>
          ) : !canGenerate ? (
            <Text size="xs" c="dimmed" mt="sm">
              Upload all mandatory inputs to enable generation.
            </Text>
          ) : null}
        </Box>
      )}
    </Paper>
  )
}
