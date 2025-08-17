"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { addTask, updateTask, type Task } from "@/lib/db"
import { updateUserStats } from "@/lib/profile"

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  onTaskSaved: () => void
  editingTask?: Task | null
}

export function TaskForm({ isOpen, onClose, onTaskSaved, editingTask }: TaskFormProps) {
  const [title, setTitle] = useState(editingTask?.title || "")
  const [description, setDescription] = useState(editingTask?.description || "")
  const [dueDate, setDueDate] = useState(editingTask?.dueDate || "")
  const [reminderTime, setReminderTime] = useState(editingTask?.reminderTime || "")
  const [isRepeating, setIsRepeating] = useState(editingTask?.isRepeating || false)
  const [repeatInterval, setRepeatInterval] = useState<"daily" | "weekly" | "monthly">(
    editingTask?.repeatInterval || "daily",
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        reminderTime: reminderTime || undefined,
        isRepeating,
        repeatInterval: isRepeating ? repeatInterval : undefined,
        isCompleted: editingTask?.isCompleted || false,
      }

      if (editingTask) {
        await updateTask(editingTask.id, taskData)
      } else {
        await addTask(taskData)
        // Update user stats for creating a task
        updateUserStats({ tasksCreated: 1 })
      }

      onTaskSaved()
      handleClose()
    } catch (error) {
      console.error("Error saving task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setDueDate("")
    setReminderTime("")
    setIsRepeating(false)
    setRepeatInterval("daily")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add task description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderTime">Reminder Time</Label>
              <Input
                id="reminderTime"
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="repeating">Repeating Reminder</Label>
            <Switch id="repeating" checked={isRepeating} onCheckedChange={setIsRepeating} />
          </div>

          {isRepeating && (
            <div className="space-y-2">
              <Label>Repeat Interval</Label>
              <Select value={repeatInterval} onValueChange={(value: any) => setRepeatInterval(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()} className="flex-1 btn-primary">
              {isLoading ? "Saving..." : editingTask ? "Update Task" : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
