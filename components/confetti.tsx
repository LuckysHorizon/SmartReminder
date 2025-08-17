"use client"

import { useEffect } from "react"

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  useEffect(() => {
    if (!trigger) return

    const confettiContainer = document.createElement("div")
    confettiContainer.className = "confetti"
    document.body.appendChild(confettiContainer)

    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("div")
      piece.className = "confetti-piece"
      piece.style.left = Math.random() * 100 + "%"
      piece.style.animationDelay = Math.random() * 2 + "s"
      piece.style.animationDuration = Math.random() * 2 + 2 + "s"
      confettiContainer.appendChild(piece)
    }

    // Clean up after animation
    const cleanup = setTimeout(() => {
      document.body.removeChild(confettiContainer)
      onComplete?.()
    }, 4000)

    return () => {
      clearTimeout(cleanup)
      if (document.body.contains(confettiContainer)) {
        document.body.removeChild(confettiContainer)
      }
    }
  }, [trigger, onComplete])

  return null
}
