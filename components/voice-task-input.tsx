"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react"

interface VoiceTaskInputProps {
  onTaskCreate: (title: string, dueDate?: Date) => void
  onClose: () => void
}

export function VoiceTaskInput({ onTaskCreate, onClose }: VoiceTaskInputProps) {
  const [taskTitle, setTaskTitle] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const {
    isListening,
    transcript,
    confidence,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
  } = useSpeechRecognition()

  const { speak, isSpeaking, isSupported: ttsSupported, cancel } = useTextToSpeech()

  useEffect(() => {
    if (transcript && !isListening) {
      processVoiceCommand(transcript)
    }
  }, [transcript, isListening])

  const processVoiceCommand = async (command: string) => {
    setIsProcessing(true)

    // Simple command parsing
    const lowerCommand = command.toLowerCase().trim()

    // Extract task title and due date
    let title = command.trim()
    let dueDate: Date | undefined

    // Check for time-based commands
    const timePatterns = [
      { pattern: /today/i, days: 0 },
      { pattern: /tomorrow/i, days: 1 },
      { pattern: /next week/i, days: 7 },
      { pattern: /in (\d+) days?/i, extract: (match: RegExpMatchArray) => Number.parseInt(match[1]) },
    ]

    for (const { pattern, days, extract } of timePatterns) {
      const match = lowerCommand.match(pattern)
      if (match) {
        const daysToAdd = extract ? extract(match) : days
        if (daysToAdd !== undefined) {
          dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + daysToAdd)
          title = title.replace(pattern, "").trim()
        }
        break
      }
    }

    // Remove common command prefixes
    const prefixes = [/^(create|add|new|make)\s+(a\s+)?(task|reminder)\s+/i, /^(remind me to|remember to)\s+/i]

    for (const prefix of prefixes) {
      title = title.replace(prefix, "").trim()
    }

    if (title) {
      setTaskTitle(title)

      // Provide voice feedback
      if (ttsSupported) {
        const feedback = dueDate
          ? `Creating task "${title}" due ${dueDate.toLocaleDateString()}`
          : `Creating task "${title}"`
        speak(feedback)
      }

      // Create the task after a short delay for feedback
      setTimeout(() => {
        onTaskCreate(title, dueDate)
        setIsProcessing(false)
        onClose()
      }, 2000)
    } else {
      setIsProcessing(false)
      if (ttsSupported) {
        speak("I didn't understand that. Please try again.")
      }
    }
  }

  const handleManualSubmit = () => {
    if (taskTitle.trim()) {
      onTaskCreate(taskTitle.trim())
      onClose()
    }
  }

  if (!speechSupported) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">🎤</div>
          <h3 className="text-lg font-semibold">Voice Input Not Supported</h3>
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support speech recognition. Please use manual input.
          </p>
          <Input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
          />
          <div className="flex gap-2">
            <Button onClick={handleManualSubmit} disabled={!taskTitle.trim()}>
              Create Task
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Voice Task Creation</h3>
          <p className="text-sm text-muted-foreground">
            Say something like "Create a task to buy groceries tomorrow" or "Remind me to call mom"
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Error: {error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className="w-32 h-32 rounded-full"
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>
        </div>

        {isListening && (
          <div className="text-center">
            <Badge variant="secondary" className="animate-pulse">
              Listening...
            </Badge>
          </div>
        )}

        {transcript && (
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Transcript:</p>
              <p className="text-sm">{transcript}</p>
              {confidence > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Confidence: {Math.round(confidence * 100)}%</p>
              )}
            </div>
          </div>
        )}

        {taskTitle && (
          <div className="space-y-2">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary">Extracted Task:</p>
              <p className="text-sm">{taskTitle}</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center">
            <Badge variant="secondary" className="animate-pulse">
              Processing...
            </Badge>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          {ttsSupported && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isSpeaking ? cancel() : speak("Voice input is ready. Start speaking to create a task."))}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="outline" onClick={resetTranscript} disabled={!transcript}>
            Clear
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Card>
  )
}
