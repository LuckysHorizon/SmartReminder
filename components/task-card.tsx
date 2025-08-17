"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { updateTask, deleteTask, type Task } from "@/lib/db"
import { updateUserStats } from "@/lib/profile"
import { getTaskUrgencyGradient, triggerMicroAnimation } from "@/lib/animations"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Confetti } from "./confetti"
import { formatDistanceToNow, format, isPast } from "date-fns"
import { Calendar, Clock, Repeat, AlertCircle, GripVertical } from "lucide-react"

interface TaskCardProps {
  task: Task
  onTaskUpdated: () => void
  onEditTask: (task: Task) => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  index?: number
}

export function TaskCard({
  task,
  onTaskUpdated,
  onEditTask,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  index,
}: TaskCardProps) {
  const { triggerHaptic } = useHapticFeedback()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "")
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDraggingTouch = useRef(false)
  const isSwipeGesture = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isDraggingTouch.current = true
    isSwipeGesture.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingTouch.current) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = currentX - startX.current
    const diffY = currentY - startY.current

    // Determine if this is a horizontal swipe gesture
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwipeGesture.current = true
      e.preventDefault() // Prevent scrolling during swipe

      // Limit swipe distance with resistance
      const maxSwipe = 120
      const resistance = 0.6
      let clampedDiff = diffX

      if (Math.abs(diffX) > maxSwipe) {
        const excess = Math.abs(diffX) - maxSwipe
        clampedDiff = diffX > 0 ? maxSwipe + excess * resistance : -maxSwipe - excess * resistance
      }

      setSwipeOffset(clampedDiff)
    }
  }

  const handleTouchEnd = () => {
    if (!isDraggingTouch.current) return
    isDraggingTouch.current = false

    if (isSwipeGesture.current) {
      const threshold = 60

      if (swipeOffset > threshold) {
        // Swipe right - complete task
        triggerHaptic("success")
        handleToggleComplete()
      } else if (swipeOffset < -threshold) {
        // Swipe left - delete task
        triggerHaptic("warning")
        handleDelete()
      } else {
        // Insufficient swipe - provide feedback
        triggerHaptic("light")
      }
    }

    // Reset swipe offset with animation
    setSwipeOffset(0)
    isSwipeGesture.current = false
  }

  const handleToggleComplete = async () => {
    setIsUpdating(true)
    try {
      const wasCompleted = task.isCompleted
      await updateTask(task.id, {
        isCompleted: !task.isCompleted,
        completedAt: !task.isCompleted ? Date.now() : undefined,
      })

      if (!wasCompleted && !task.isCompleted) {
        updateUserStats({ tasksCompleted: 1 })
        setShowConfetti(true)
        triggerHaptic("success")
        if (cardRef.current) {
          triggerMicroAnimation(cardRef.current, "micro-bounce")
        }
      } else {
        triggerHaptic("light")
      }

      onTaskUpdated()
    } catch (error) {
      console.error("Error updating task:", error)
      triggerHaptic("error")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(task.id)
        triggerHaptic("medium")
        onTaskUpdated()
      } catch (error) {
        console.error("Error deleting task:", error)
        triggerHaptic("error")
      }
    }
  }

  const handleTitleEdit = async () => {
    if (isEditingTitle && editTitle.trim() !== task.title) {
      try {
        await updateTask(task.id, { title: editTitle.trim() })
        triggerHaptic("light")
        onTaskUpdated()
      } catch (error) {
        console.error("Error updating task title:", error)
        setEditTitle(task.title) // Reset on error
        triggerHaptic("error")
      }
    }
    setIsEditingTitle(!isEditingTitle)
  }

  const handleDueDateEdit = async () => {
    if (isEditingDueDate && editDueDate !== task.dueDate) {
      try {
        await updateTask(task.id, { dueDate: editDueDate || undefined })
        triggerHaptic("light")
        onTaskUpdated()
      } catch (error) {
        console.error("Error updating due date:", error)
        setEditDueDate(task.dueDate || "")
        triggerHaptic("error")
      }
    }
    setIsEditingDueDate(!isEditingDueDate)
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: "title" | "dueDate") => {
    if (e.key === "Enter") {
      if (type === "title") handleTitleEdit()
      else handleDueDateEdit()
    } else if (e.key === "Escape") {
      if (type === "title") {
        setEditTitle(task.title)
        setIsEditingTitle(false)
      } else {
        setEditDueDate(task.dueDate || "")
        setIsEditingDueDate(false)
      }
    }
  }

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const isOverdue = isPast(date) && !task.isCompleted
    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    const isTomorrow = format(date, "yyyy-MM-dd") === format(new Date(Date.now() + 86400000), "yyyy-MM-dd")

    let displayText = format(date, "MMM d")
    if (isToday) displayText = "Today"
    else if (isTomorrow) displayText = "Tomorrow"

    return {
      formatted: displayText,
      relative: formatDistanceToNow(date, { addSuffix: true }),
      isOverdue,
      isToday,
      isTomorrow,
    }
  }

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null
  const urgencyGradient = getTaskUrgencyGradient(task.dueDate, task.isCompleted)

  const getSwipeActionStyle = () => {
    if (swipeOffset > 20) {
      return {
        backgroundColor: `rgba(34, 197, 94, ${Math.min(swipeOffset / 100, 0.2)})`,
        borderLeft: `3px solid rgba(34, 197, 94, ${Math.min(swipeOffset / 60, 1)})`,
      }
    } else if (swipeOffset < -20) {
      return {
        backgroundColor: `rgba(239, 68, 68, ${Math.min(Math.abs(swipeOffset) / 100, 0.2)})`,
        borderRight: `3px solid rgba(239, 68, 68, ${Math.min(Math.abs(swipeOffset) / 60, 1)})`,
      }
    }
    return {}
  }

  return (
    <>
      <Card
        ref={cardRef}
        draggable={!isEditingTitle && !isEditingDueDate}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`p-4 transition-all duration-200 touch-target relative overflow-hidden ${
          task.isCompleted ? "opacity-75" : ""
        } ${urgencyGradient} ${isDragging ? "opacity-50 rotate-2 scale-105 shadow-lg z-10" : ""} ${
          isDragOver ? "border-2 border-accent border-dashed" : ""
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDraggingTouch.current ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          ...getSwipeActionStyle(),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Enhanced swipe action indicators */}
        {swipeOffset > 30 && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-green-600">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Checkbox className="w-5 h-5" />
            </div>
            <span className="font-medium">Complete</span>
          </div>
        )}
        {swipeOffset < -30 && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-red-600">
            <span className="font-medium">Delete</span>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-lg">🗑️</span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div className="flex flex-col items-center gap-2">
            <Checkbox
              checked={task.isCompleted}
              onCheckedChange={handleToggleComplete}
              disabled={isUpdating}
              className="touch-target"
            />
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Enhanced inline title editing */}
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleEdit}
                onKeyDown={(e) => handleKeyDown(e, "title")}
                className="font-semibold text-base border-0 border-b-2 border-accent rounded-none px-0 focus:ring-0"
                autoFocus
              />
            ) : (
              <h3
                className={`font-semibold cursor-pointer hover:text-accent transition-colors ${
                  task.isCompleted ? "line-through text-muted-foreground" : ""
                }`}
                onClick={handleTitleEdit}
              >
                {task.title}
              </h3>
            )}

            {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}

            {/* Enhanced badges with better visual hierarchy */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {dueDateInfo && (
                <div className="flex items-center gap-1">
                  {isEditingDueDate ? (
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      onBlur={handleDueDateEdit}
                      onKeyDown={(e) => handleKeyDown(e, "dueDate")}
                      className="text-xs h-6 w-32 border-accent"
                      autoFocus
                    />
                  ) : (
                    <Badge
                      variant={dueDateInfo.isOverdue ? "destructive" : dueDateInfo.isToday ? "default" : "secondary"}
                      className="text-xs cursor-pointer hover:opacity-80 flex items-center gap-1"
                      onClick={handleDueDateEdit}
                    >
                      <Calendar className="w-3 h-3" />
                      {dueDateInfo.formatted}
                      {dueDateInfo.isOverdue && <AlertCircle className="w-3 h-3" />}
                    </Badge>
                  )}
                </div>
              )}

              {task.repeatType && task.repeatType !== "none" && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {task.repeatType}
                </Badge>
              )}

              {task.reminderTime && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Reminder
                </Badge>
              )}

              {task.priority && task.priority !== "medium" && (
                <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-xs capitalize">
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditTask(task)}
              className="h-8 w-8 p-0 touch-target hover:bg-accent/20"
            >
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
            >
              🗑️
            </Button>
          </div>
        </div>
      </Card>

      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
    </>
  )
}
