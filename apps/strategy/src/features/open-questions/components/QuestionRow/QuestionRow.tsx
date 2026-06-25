import { Paper, Group, ThemeIcon, Box, Text, Button, Badge } from '@mantine/core'
import { IconHelpCircle, IconCheck } from '@tabler/icons-react'

interface QuestionRowProps {
  question: string
  /** What surfaced the question (e.g. the output generation that flagged it). */
  source: string
  resolved: boolean
  /** When the phase is Done, resolving/reopening is disabled. */
  locked: boolean
  onResolve: () => void
  onReopen: () => void
}

/**
 * One AI-flagged open question. Unresolved → a Resolve action; resolved → de-emphasised
 * with a Reopen action. Question text wraps in full (never truncated).
 */
export function QuestionRow({ question, source, resolved, locked, onResolve, onReopen }: QuestionRowProps) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" wrap="nowrap" gap="md" align="flex-start">
        <Group gap="sm" wrap="nowrap" align="flex-start" miw={0} flex={1}>
          <ThemeIcon size={32} radius="md" variant="light" color={resolved ? 'teal' : 'yellow'}>
            {resolved ? <IconCheck size={16} /> : <IconHelpCircle size={16} />}
          </ThemeIcon>
          <Box miw={0}>
            <Text size="sm" fw={600} {...(resolved ? { c: 'dimmed' } : {})}>
              {question}
            </Text>
            <Badge mt={6} size="sm" radius="sm" variant="default">
              Flagged · {source}
            </Badge>
          </Box>
        </Group>

        {resolved ? (
          <Button size="compact-sm" variant="subtle" color="gray" disabled={locked} onClick={onReopen}>
            Reopen
          </Button>
        ) : (
          <Button
            size="compact-sm"
            variant="light"
            color="teal"
            leftSection={<IconCheck size={14} />}
            disabled={locked}
            onClick={onResolve}
          >
            Resolve
          </Button>
        )}
      </Group>
    </Paper>
  )
}
