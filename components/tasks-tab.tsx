"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TaskCard } from "./task-card"
import { TaskForm } from "./task-form"
import { VoiceTaskInput } from "./voice-task-input"
import { getTasks, updateTask, addTask, type Task } from "@/lib/db"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Plus, Search, SortAsc, Mic } from "lucide-react"

export function TasksTab() {
  const { triggerHaptic } = useHapticFeedback()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "overdue" | "completed" | "repeating">("all")
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "created" | "manual">("manual")
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { draggedIndex, dragOverIndex, handleDragStart, handleDragOver, handleDragEnd, handleDrop } = useDragDrop(
    filteredTasks,
    {
      onDragStart: (index) => {
        triggerHaptic("light")
      },
      onDragEnd: async (fromIndex, toIndex) => {
        if (sortBy !== "manual") return // Only allow reordering in manual sort mode

        triggerHaptic("medium")
        const newTasks = [...filteredTasks]
        const [movedTask] = newTasks.splice(fromIndex, 1)
        newTasks.splice(toIndex, 0, movedTask)

        // Update task orders
        const updates = newTasks.map((task, index) => updateTask(task.id, { order: index }))

        await Promise.all(updates)
        loadTasks()
      },
    },
  )

  const loadTasks = async () => {
    try {
      const loadedTasks = await getTasks()
      setTasks(loadedTasks)
    } catch (error) {
      console.error("Error loading tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    let filtered = tasks
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Filter by active filter
    switch (activeFilter) {
      case "today":
        filtered = filtered.filter((task) => {
          if (!task.dueDate) return false
          const dueDate = new Date(task.dueDate)
          return dueDate >= todayStart && dueDate <= today && !task.isCompleted
        })
        break
      case "overdue":
        filtered = filtered.filter((task) => {
          if (!task.dueDate || task.isCompleted) return false
          const dueDate = new Date(task.dueDate)
          return dueDate < todayStart
        })
        break
      case "completed":
        filtered = filtered.filter((task) => task.isCompleted)
        break
      case "repeating":
        filtered = filtered.filter((task) => task.repeatType && task.repeatType !== "none")
        break
      case "all":
      default:
        // Show all tasks
        break
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (task) => task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query),
      )
    }

    // Sort tasks
    switch (sortBy) {
      case "dueDate":
        filtered.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })
        break
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        filtered.sort((a, b) => {
          const aPriority = priorityOrder[a.priority || "medium"]
          const bPriority = priorityOrder[b.priority || "medium"]
          return bPriority - aPriority
        })
        break
      case "created":
        filtered.sort((a, b) => b.createdAt - a.createdAt)
        break
      case "manual":
        filtered.sort((a, b) => (a.order || 0) - (b.order || 0))
        break
    }

    setFilteredTasks(filtered)
  }, [tasks, searchQuery, activeFilter, sortBy])

  const handleTaskSaved = () => {
    loadTasks()
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsTaskFormOpen(true)
  }

  const handleCloseTaskForm = () => {
    setIsTaskFormOpen(false)
    setEditingTask(null)
  }

  const handleVoiceTaskCreate = async (title: string, dueDate?: Date) => {
    try {
      await addTask({
        title,
        description: "",
        dueDate: dueDate?.toISOString(),
        priority: "medium",
        isCompleted: false,
        repeatType: "none",
      })
      triggerHaptic("success")
      loadTasks()
    } catch (error) {
      console.error("Error creating voice task:", error)
    }
  }

  // Calculate progress for today's tasks
  const todayTasks = tasks.filter((task) => {
    if (!task.dueDate) return false
    const dueDate = new Date(task.dueDate)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    return dueDate >= todayStart && dueDate <= todayEnd
  })

  const todayCompleted = todayTasks.filter((task) => task.isCompleted).length
  const todayTotal = todayTasks.length
  const todayProgress = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0

  const getFilterCount = (filter: string) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    switch (filter) {
      case "all":
        return tasks.filter((task) => !task.isCompleted).length
      case "today":
        return tasks.filter((task) => {
          if (!task.dueDate) return false
          const dueDate = new Date(task.dueDate)
          return dueDate >= todayStart && dueDate <= today && !task.isCompleted
        }).length
      case "overdue":
        return tasks.filter((task) => {
          if (!task.dueDate || task.isCompleted) return false
          const dueDate = new Date(task.dueDate)
          return dueDate < todayStart
        }).length
      case "completed":
        return tasks.filter((task) => task.isCompleted).length
      case "repeating":
        return tasks.filter((task) => task.repeatType && task.repeatType !== "none").length
      default:
        return 0
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-[120px] z-40 bg-background/95 backdrop-blur-sm border-b border-border pb-4 -mx-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Enhanced progress ring */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted stroke-current"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-accent stroke-current transition-all duration-500"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${todayProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{Math.round(todayProgress)}%</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Today's Progress</h3>
              <p className="text-sm text-muted-foreground">
                {todayCompleted} of {todayTotal} tasks completed
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsVoiceInputOpen(true)
                triggerHaptic("light")
              }}
              size="sm"
              variant="outline"
              className="touch-target"
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                setIsTaskFormOpen(true)
                triggerHaptic("light")
              }}
              size="sm"
              className="btn-primary touch-target"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Enhanced search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-base" // Prevent zoom on iOS
          />
        </div>

        {/* Enhanced filter tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4">
          {[
            { id: "all", label: "All", count: getFilterCount("all") },
            { id: "today", label: "Today", count: getFilterCount("today") },
            { id: "overdue", label: "Overdue", count: getFilterCount("overdue") },
            { id: "completed", label: "Done", count: getFilterCount("completed") },
            { id: "repeating", label: "Repeating", count: getFilterCount("repeating") },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setActiveFilter(filter.id as any)
                triggerHaptic("light")
              }}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg transition-colors touch-target ${
                activeFilter === filter.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    activeFilter === filter.id ? "bg-accent-foreground/20" : "bg-muted-foreground/20"
                  }`}
                >
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2 mb-2">
          <SortAsc className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {[
              { id: "manual", label: "Manual" },
              { id: "dueDate", label: "Due Date" },
              { id: "priority", label: "Priority" },
              { id: "created", label: "Created" },
            ].map((sort) => (
              <button
                key={sort.id}
                onClick={() => {
                  setSortBy(sort.id as any)
                  triggerHaptic("light")
                }}
                className={`flex-shrink-0 px-2 py-1 text-xs rounded-md transition-colors ${
                  sortBy === sort.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-lg mb-1">{tasks.length === 0 ? "No tasks yet" : `No ${activeFilter} tasks`}</p>
            <p className="text-sm">
              {tasks.length === 0 ? "Add your first task to get started!" : "Try a different filter or add a new task"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskUpdated={handleTaskSaved}
              onEditTask={handleEditTask}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              index={index}
            />
          ))
        )}
      </div>

      {/* Task form dialog */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={handleCloseTaskForm}
        onTaskSaved={handleTaskSaved}
        editingTask={editingTask}
      />

      {isVoiceInputOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <VoiceTaskInput onTaskCreate={handleVoiceTaskCreate} onClose={() => setIsVoiceInputOpen(false)} />
        </div>
      )}
    </div>
  )
}
