"use client"

import type React from "react"

import { useRef, useState } from "react"

interface DragDropOptions {
  onDragStart?: (index: number) => void
  onDragEnd?: (fromIndex: number, toIndex: number) => void
  onDragOver?: (index: number) => void
}

export function useDragDrop<T>(items: T[], options: DragDropOptions = {}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const draggedItem = useRef<T | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
    draggedItem.current = items[index]
    options.onDragStart?.(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
      options.onDragOver?.(index)
    }
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      options.onDragEnd?.(draggedIndex, dragOverIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
    draggedItem.current = null
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    handleDragEnd()
  }

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  }
}
