import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechRecognition, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from '../types'

/**
 * Wraps the browser's Web Speech API for voice dictation into any text field.
 * Exists so every AI input (Discovery context, AI-enhance guidance, the
 * assistant chat) shares one implementation rather than each re-deriving the
 * recognition lifecycle. Emits finalised transcript chunks via `onResult`;
 * the caller decides where to append them.
 */
interface UseDictationOptions {
  /** Called with each finalised transcript chunk (already trimmed). */
  onResult: (text: string) => void
  /** BCP-47 language tag for recognition. Defaults to the document language. */
  lang?: string
}

interface UseDictationReturn {
  /** False when the browser has no Web Speech API — callers should disable the mic. */
  supported: boolean
  listening: boolean
  start: () => void
  stop: () => void
  toggle: () => void
  /** Human-readable error from the last failed recognition attempt, if any. */
  error: string | null
}

/** Appends a dictated chunk to existing field text with sensible spacing. */
export function appendTranscript(existing: string, addition: string): string {
  const trimmed = existing.trimEnd()
  if (!trimmed) return addition
  return `${trimmed} ${addition}`
}

export function useDictation({ onResult, lang }: UseDictationOptions): UseDictationReturn {
  const Recognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined
  const supported = Boolean(Recognition)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep the latest onResult without re-creating the recognition instance.
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!Recognition || recognitionRef.current) return

    const recognition = new Recognition()
    recognition.lang = lang ?? document.documentElement.lang ?? 'en-US'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0].transcript.trim()
          if (text) onResultRef.current(text)
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' / 'no-speech' are benign (user stopped or stayed silent).
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(
          event.error === 'not-allowed'
            ? 'Microphone access was blocked. Allow it in your browser to dictate.'
            : 'Voice dictation failed. Please try again.',
        )
      }
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    recognition.start()
  }, [Recognition, lang])

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop()
    else start()
  }, [start, stop])

  // Abort any in-flight recognition if the component unmounts mid-dictation.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  return { supported, listening, start, stop, toggle, error }
}
