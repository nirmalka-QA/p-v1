import { useEffect } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconMicrophone, IconMicrophoneOff, IconPlayerStopFilled } from '@tabler/icons-react'
import { useDictation } from '../../hooks/useDictation'
import styles from './DictationButton.module.css'

interface DictationButtonProps {
  /** Receives each finalised speech chunk; the caller appends it to its field. */
  onTranscript: (text: string) => void
  /** Disables the mic (e.g. the field itself is read-only or "coming soon"). */
  disabled?: boolean
  /** ActionIcon size token — match the host field. */
  size?: string
}

/**
 * Voice-dictation mic for AI input fields. Drop it into a field's `rightSection`.
 * Shared across every AI input so the dictation affordance looks and behaves
 * identically everywhere. Degrades gracefully when the browser lacks the Web
 * Speech API (disabled with an explanatory tooltip).
 */
export function DictationButton({ onTranscript, disabled = false, size = 'md' }: DictationButtonProps) {
  const { supported, listening, toggle, error } = useDictation({ onResult: onTranscript })

  // Surface recognition failures (blocked mic, etc.) instead of failing silently.
  useEffect(() => {
    if (error) {
      notifications.show({ color: 'red', title: 'Dictation', message: error })
    }
  }, [error])

  if (!supported) {
    return (
      <Tooltip label="Voice dictation isn't supported in this browser" withArrow>
        <ActionIcon variant="subtle" color="gray" size={size} disabled aria-label="Dictation unavailable">
          <IconMicrophoneOff size={16} />
        </ActionIcon>
      </Tooltip>
    )
  }

  return (
    <Tooltip label={listening ? 'Stop dictation' : 'Dictate'} withArrow>
      <ActionIcon
        variant={listening ? 'light' : 'subtle'}
        color={listening ? 'red' : 'gray'}
        size={size}
        disabled={disabled}
        onClick={toggle}
        className={listening ? styles.listening : undefined}
        aria-label={listening ? 'Stop dictation' : 'Dictate'}
        aria-pressed={listening}
      >
        {listening ? <IconPlayerStopFilled size={14} /> : <IconMicrophone size={16} />}
      </ActionIcon>
    </Tooltip>
  )
}
