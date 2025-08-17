"use client"

import { useState, useCallback } from "react"

interface UseTextToSpeechReturn {
  speak: (text: string, options?: SpeechSynthesisUtteranceOptions) => void
  isSpeaking: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  cancel: () => void
}

interface SpeechSynthesisUtteranceOptions {
  voice?: SpeechSynthesisVoice
  rate?: number
  pitch?: number
  volume?: number
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window

  const loadVoices = useCallback(() => {
    if (isSupported) {
      const availableVoices = speechSynthesis.getVoices()
      setVoices(availableVoices)
    }
  }, [isSupported])

  const speak = useCallback(
    (text: string, options: SpeechSynthesisUtteranceOptions = {}) => {
      if (!isSupported) return

      const utterance = new SpeechSynthesisUtterance(text)

      utterance.voice = options.voice || null
      utterance.rate = options.rate || 1
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      speechSynthesis.speak(utterance)
    },
    [isSupported],
  )

  const cancel = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [isSupported])

  // Load voices when component mounts
  if (isSupported && voices.length === 0) {
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
  }

  return {
    speak,
    isSpeaking,
    isSupported,
    voices,
    cancel,
  }
}
