import type { ReactNode } from 'react'
import {
  Box,
  Group,
  Text,
  Paper,
  Badge,
  TextInput,
  ActionIcon,
  Button,
} from '@mantine/core'
import { IconArrowRight } from '@tabler/icons-react'
import styles from './AIAssistantPanel.module.css'

const QUICK_ACTS = ['Summarise', "What's blocking", 'Generate tests', 'Related context']

export interface AIAssistantPanelProps {
  projectName?: string
  phaseLabel?: string
  /** Optional dictation control rendered beside the quick-action chips. Each app supplies its own. */
  dictationSlot?: ReactNode
}

export function AIAssistantPanel({ projectName, phaseLabel, dictationSlot }: AIAssistantPanelProps) {
  const ctx = phaseLabel && projectName
    ? `${phaseLabel} · ${projectName}`
    : projectName ?? phaseLabel ?? 'No project selected'

  return (
    <Box className={styles.panel ?? ''}>
      {/* Head */}
      <Box className={styles.head ?? ''}>
        <Group className={styles.labelRow ?? ''} justify="space-between">
          <Group gap={8}>
            <Box className={styles.liveInd ?? ''} />
            <Text span className={styles.labelLeft ?? ''}>
              WISPR Assistant
            </Text>
          </Group>
          <Text span className={styles.modelLabel ?? ''}>
            claude sonnet 4.6
          </Text>
        </Group>
        <Box className={styles.ctxChip ?? ''}>
          <Text span className={styles.ctxLabel ?? ''}>
            Context
          </Text>
          {ctx}
        </Box>
      </Box>

      {/* Chat */}
      <Box className={styles.stream ?? ''}>
        <Paper className={styles.bubble ?? ''} withBorder>
          <Text className={styles.bubbleMeta ?? ''}>WISPR Assistant</Text>
          I'm ready to help with your project. The AI assistant is coming in the next release — you'll
          be able to ask questions about requirements, generate stories, and get contextual help
          scoped to your current view.
        </Paper>
      </Box>

      {/* Input */}
      <Box className={styles.inputRow ?? ''}>
        <Badge color="yellow" variant="light" radius="sm" mb={8}>
          Coming soon
        </Badge>
        <TextInput
          disabled
          placeholder="Ask anything — scoped to your current view…"
          rightSection={
            <ActionIcon variant="accent" disabled size="sm">
              <IconArrowRight size={14} />
            </ActionIcon>
          }
        />
        <Group justify="space-between" gap="sm" mt={10}>
          <Group gap={5} wrap="wrap">
            {QUICK_ACTS.map((act) => (
              <Button key={act} size="compact-xs" variant="default" radius="xl" disabled>
                {act}
              </Button>
            ))}
          </Group>
          {dictationSlot}
        </Group>
      </Box>
    </Box>
  )
}
