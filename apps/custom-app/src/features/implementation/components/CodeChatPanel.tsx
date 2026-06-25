import { useState } from 'react'
import { Paper, Box, Stack, Group, Text, Textarea, Button, ScrollArea, ThemeIcon } from '@mantine/core'
import { IconMessage, IconSparkles, IconUser, IconSend } from '@tabler/icons-react'
import styles from '../utility/styles/implementation.module.css'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CodeChatPanelProps {
  messages: ChatMessage[]
  /** Send a free-text change/fix/enhancement request; runs an iteration on the story's code. */
  onSend: (text: string) => void
  busy: boolean
  /** Render flush inside the code workbench (no own border, fills the column height). */
  embedded?: boolean
}

/**
 * Post-generation change requests (ADR-0027): once code exists, ask for changes,
 * fixes or enhancements in natural language. Each request iterates this story's
 * code, so the implementation is refined conversationally — strictly per story.
 */
export function CodeChatPanel({ messages, onSend, busy, embedded = false }: CodeChatPanelProps) {
  const [text, setText] = useState('')

  function send() {
    const t = text.trim()
    if (!t || busy) return
    onSend(t)
    setText('')
  }

  const header = (
    <>
      <Group gap="xs" mb="xs">
        <ThemeIcon size={22} radius="xl" color="grape" variant="light">
          <IconMessage size={13} />
        </ThemeIcon>
        <Text fw={600} size="sm">
          Change requests
        </Text>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">
        Ask for fixes or enhancements — each request refines this story's code.
      </Text>
    </>
  )

  const list = (
    <Stack gap="sm">
      {messages.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic">
          No requests yet. Describe a change to refine the generated code.
        </Text>
      )}
      {messages.map((m, i) => (
        <Group key={i} gap={6} align="flex-start" wrap="nowrap">
          <ThemeIcon size={20} radius="xl" variant="light" color={m.role === 'user' ? 'blue' : 'grape'}>
            {m.role === 'user' ? <IconUser size={11} /> : <IconSparkles size={11} />}
          </ThemeIcon>
          <Box className={styles.chatMessage}>
            <Text size="xs" c="dimmed" lh={1.5} className={styles.chatMessageText}>
              {m.content}
            </Text>
          </Box>
        </Group>
      ))}
    </Stack>
  )

  const composer = (
    <>
      <Textarea
        placeholder="e.g. fix the validation error on the email field"
        autosize
        minRows={2}
        maxRows={5}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
        }}
        mb="xs"
      />
      <Button leftSection={<IconSend size={14} />} onClick={send} loading={busy} disabled={!text.trim()}>
        Send change request
      </Button>
    </>
  )

  if (embedded) {
    return (
      <Box className={styles.chatColumn} h="100%">
        {header}
        <ScrollArea className={styles.chatScroll} mb="sm">
          {list}
        </ScrollArea>
        {composer}
      </Box>
    )
  }

  return (
    <Paper withBorder radius="md" p="sm" w={340} className={styles.chatColumn}>
      {header}
      <ScrollArea.Autosize mah={360} mih={120} mb="sm">
        {list}
      </ScrollArea.Autosize>
      {composer}
    </Paper>
  )
}
