"use client"

import type React from "react"

import { useRef, useCallback } from "react"

interface LongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void
  onPress?: (e: React.TouchEvent | React.MouseEvent) => void
  delay?: number
}

export function useLongPress({ onLongPress, onPress, delay = 500 }: LongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isLongPress = useRef(false)

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      isLongPress.current = false
      timeoutRef.current = setTimeout(() => {
        isLongPress.current = true
        onLongPress(e)
      }, delay)
    },
    [onLongPress, delay],
  )

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      clear()
      if (!isLongPress.current && onPress) {
        onPress(e)
      }
    },
    [clear, onPress],
  )

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: end,
  }
}
