export type NotificationPermissionStatus = "default" | "granted" | "denied"

export interface ScheduledNotification {
  id: string
  taskId: string
  title: string
  body: string
  scheduledTime: number
  isTriggered: boolean
  createdAt: number
  priority?: "low" | "normal" | "high"
  category?: "reminder" | "overdue" | "deadline"
  taskDueDate?: number
  isGrouped?: boolean
  groupId?: string
  snoozeCount?: number
  originalScheduledTime?: number
  isRecurring?: boolean
  recurringPattern?: "daily" | "weekly" | "monthly"
}

const NOTIFICATIONS_STORE = "scheduled-notifications"

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return "denied"
  }

  if (Notification.permission === "granted") {
    return "granted"
  }

  if (Notification.permission === "denied") {
    return "denied"
  }

  const permission = await Notification.requestPermission()

  if (permission === "granted" && isIOSDevice()) {
    showEnhancedIOSInstallPrompt()
  }

  return permission as NotificationPermissionStatus
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

function isIOSPWA(): boolean {
  return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches
}

function showEnhancedIOSInstallPrompt(): void {
  if (localStorage.getItem("ios-install-prompted") === "true") return
  if (isIOSPWA()) return // Already installed

  setTimeout(() => {
    const shouldPrompt = confirm(
      "🚀 Get the best SmartReminder experience!\n\n" +
        "Add to your home screen for:\n" +
        "• Rich push notifications\n" +
        "• Faster app loading\n" +
        "• Full-screen experience\n\n" +
        "Would you like instructions?",
    )

    if (shouldPrompt) {
      showIOSInstallInstructions()
    }
    localStorage.setItem("ios-install-prompted", "true")
  }, 5000)
}

function showIOSInstallInstructions(): void {
  const instructions = document.createElement("div")
  instructions.innerHTML = `
    <div style="
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0; 
      background: rgba(0,0,0,0.8); 
      z-index: 10000; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      padding: 20px;
    ">
      <div style="
        background: white; 
        border-radius: 12px; 
        padding: 24px; 
        max-width: 320px; 
        text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      ">
        <h3 style="margin: 0 0 16px 0; color: #333;">Install SmartReminder</h3>
        <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
          1. Tap the Share button <span style="font-size: 18px;">⬆️</span> in Safari<br>
          2. Scroll down and tap "Add to Home Screen"<br>
          3. Tap "Add" to install
        </p>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #007AFF; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 8px; 
          font-size: 16px;
          cursor: pointer;
        ">Got it!</button>
      </div>
    </div>
  `
  document.body.appendChild(instructions)

  setTimeout(() => {
    if (instructions.parentElement) {
      instructions.remove()
    }
  }, 15000)
}

export async function scheduleNotification(
  taskId: string,
  title: string,
  body: string,
  scheduledTime: number,
  options?: {
    priority?: "low" | "normal" | "high"
    category?: "reminder" | "overdue" | "deadline"
    taskDueDate?: number
    isRecurring?: boolean
    recurringPattern?: "daily" | "weekly" | "monthly"
  },
): Promise<ScheduledNotification> {
  const { initDB } = await import("./db")
  const database = await initDB()

  const notification: ScheduledNotification = {
    id: crypto.randomUUID(),
    taskId,
    title,
    body,
    scheduledTime,
    isTriggered: false,
    createdAt: Date.now(),
    priority: options?.priority || "normal",
    category: options?.category || "reminder",
    taskDueDate: options?.taskDueDate,
    snoozeCount: 0,
    originalScheduledTime: scheduledTime,
    isRecurring: options?.isRecurring || false,
    recurringPattern: options?.recurringPattern,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([NOTIFICATIONS_STORE], "readwrite")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.add(notification)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(notification)
  })
}

export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  const { initDB } = await import("./db")
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([NOTIFICATIONS_STORE], "readonly")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function markNotificationTriggered(id: string): Promise<void> {
  const { initDB } = await import("./db")
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([NOTIFICATIONS_STORE], "readwrite")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const notification = getRequest.result
      if (notification) {
        notification.isTriggered = true
        const putRequest = store.put(notification)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error("Notification not found"))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function deleteScheduledNotification(id: string): Promise<void> {
  const { initDB } = await import("./db")
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([NOTIFICATIONS_STORE], "readwrite")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function showNotification(
  title: string,
  body: string,
  data?: any,
  options?: {
    priority?: "low" | "normal" | "high"
    category?: "reminder" | "overdue" | "deadline"
    taskDueDate?: number
    actions?: Array<{ action: string; title: string }>
    snoozeCount?: number
    isGrouped?: boolean
    groupCount?: number
  },
): Promise<void> {
  const permission = await requestNotificationPermission()
  if (permission !== "granted") {
    console.warn("Notification permission not granted")
    return
  }

  try {
    let vibrationPattern = [200, 100, 200]

    if (options?.category === "overdue") {
      vibrationPattern = [400, 100, 400, 100, 400, 100, 400]
    } else if (options?.priority === "high") {
      vibrationPattern = [300, 150, 300, 150, 300]
    } else if (options?.priority === "low") {
      vibrationPattern = [100, 50, 100]
    } else if (options?.isGrouped) {
      vibrationPattern = [150, 75, 150, 75, 150, 75, 150]
    }

    const actions = options?.actions || [
      { action: "complete", title: "✅ Done" },
      { action: "snooze-10", title: "⏰ 10min" },
      { action: "snooze-60", title: "⏰ 1hr" },
      { action: "view", title: "👁️ View" },
    ]

    let enhancedBody = body
    if (options?.taskDueDate) {
      const dueDate = new Date(options.taskDueDate)
      const now = new Date()
      const isOverdue = dueDate < now
      const timeString = dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const dateString = dueDate.toLocaleDateString()

      if (isOverdue) {
        const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        if (overdueDays > 0) {
          enhancedBody += ` (${overdueDays} day${overdueDays > 1 ? "s" : ""} overdue)`
        } else {
          enhancedBody += ` (Overdue since ${timeString})`
        }
      } else {
        const isToday = dateString === new Date().toLocaleDateString()
        enhancedBody += isToday ? ` (Due at ${timeString})` : ` (Due ${dateString} at ${timeString})`
      }
    }

    if (options?.snoozeCount && options.snoozeCount > 0) {
      enhancedBody += ` (Snoozed ${options.snoozeCount} time${options.snoozeCount > 1 ? "s" : ""})`
    }

    if (options?.isGrouped && options?.groupCount) {
      enhancedBody = `${options.groupCount} tasks need your attention: ${enhancedBody}`
    }

    const notificationOptions = {
      body: enhancedBody,
      icon: "/logo.png",
      badge: "/logo.png",
      vibrate: vibrationPattern,
      data: {
        ...data,
        priority: options?.priority,
        category: options?.category,
        taskDueDate: options?.taskDueDate,
        snoozeCount: options?.snoozeCount || 0,
        timestamp: Date.now(),
      },
      actions: actions.slice(0, 4),
      requireInteraction: options?.priority === "high" || options?.category === "overdue",
      silent: false,
      tag: data?.taskId || options?.category || "task-reminder",
      renotify: options?.category === "overdue" || (options?.snoozeCount && options.snoozeCount > 0),
      timestamp: Date.now(),
      image: options?.category === "overdue" ? "/notification-urgent.png" : undefined,
    }

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, notificationOptions)
        return
      }
    }

    const notification = new Notification(title, {
      body: enhancedBody,
      icon: "/logo.png",
      vibrate: vibrationPattern,
      data: data || {},
      tag: data?.taskId || options?.category || "task-reminder",
      renotify: options?.category === "overdue",
    })

    if (options?.priority !== "high" && options?.category !== "overdue") {
      const closeDelay = options?.priority === "low" ? 5000 : 8000
      setTimeout(() => notification.close(), closeDelay)
    }
  } catch (error) {
    console.error("Error showing notification:", error)
  }
}

export async function checkAndTriggerNotifications(): Promise<void> {
  try {
    const notifications = await getScheduledNotifications()
    const now = Date.now()

    const dueNotifications = notifications.filter((n) => !n.isTriggered && n.scheduledTime <= now)

    if (dueNotifications.length === 0) return

    const groups = groupNotificationsByTimeAndPriority(dueNotifications, 3 * 60 * 1000) // 3 minute window

    for (const group of groups) {
      if (group.length === 1) {
        const notification = group[0]
        await showNotification(
          notification.title,
          notification.body,
          {
            taskId: notification.taskId,
            notificationId: notification.id,
          },
          {
            priority: notification.priority,
            category: notification.category,
            taskDueDate: notification.taskDueDate,
            snoozeCount: notification.snoozeCount,
          },
        )
      } else {
        const overdueCount = group.filter((n) => n.category === "overdue").length
        const highPriorityCount = group.filter((n) => n.priority === "high").length

        let groupTitle = `${group.length} tasks need attention`
        if (overdueCount > 0) {
          groupTitle = `${overdueCount} overdue task${overdueCount > 1 ? "s" : ""} + ${group.length - overdueCount} more`
        } else if (highPriorityCount > 0) {
          groupTitle = `${highPriorityCount} urgent task${highPriorityCount > 1 ? "s" : ""} + ${group.length - highPriorityCount} more`
        }

        const groupBody = group
          .slice(0, 3)
          .map((n) => n.body.replace("Don't forget: ", ""))
          .join(", ")

        const remainingCount = group.length - 3
        const finalBody = remainingCount > 0 ? `${groupBody} and ${remainingCount} more` : groupBody

        await showNotification(
          groupTitle,
          finalBody,
          {
            taskIds: group.map((n) => n.taskId),
            notificationIds: group.map((n) => n.id),
            isGrouped: true,
          },
          {
            priority: group.some((n) => n.priority === "high") ? "high" : "normal",
            category: group.some((n) => n.category === "overdue") ? "overdue" : "reminder",
            isGrouped: true,
            groupCount: group.length,
          },
        )
      }

      for (const notification of group) {
        await markNotificationTriggered(notification.id)

        if (notification.isRecurring && notification.recurringPattern) {
          await scheduleRecurringNotification(notification)
        }
      }
    }
  } catch (error) {
    console.error("Error checking notifications:", error)
  }
}

function groupNotificationsByTimeAndPriority(
  notifications: ScheduledNotification[],
  timeWindow: number,
): ScheduledNotification[][] {
  const groups: ScheduledNotification[][] = []
  const sorted = [...notifications].sort((a, b) => {
    const priorityOrder = { high: 3, normal: 2, low: 1 }
    const aPriority = priorityOrder[a.priority || "normal"]
    const bPriority = priorityOrder[b.priority || "normal"]

    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }

    return a.scheduledTime - b.scheduledTime
  })

  let currentGroup: ScheduledNotification[] = []
  let groupStartTime = 0

  for (const notification of sorted) {
    if (currentGroup.length === 0 || notification.scheduledTime - groupStartTime <= timeWindow) {
      if (currentGroup.length === 0) {
        groupStartTime = notification.scheduledTime
      }
      currentGroup.push(notification)
    } else {
      groups.push(currentGroup)
      currentGroup = [notification]
      groupStartTime = notification.scheduledTime
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

export async function snoozeNotification(taskId: string, minutes: number): Promise<void> {
  try {
    const { getTasks } = await import("./db")
    const tasks = await getTasks()
    const task = tasks.find((t) => t.id === taskId)

    if (!task) return

    const notifications = await getScheduledNotifications()
    const existingNotification = notifications.find((n) => n.taskId === taskId && !n.isTriggered)
    const snoozeCount = (existingNotification?.snoozeCount || 0) + 1

    const snoozeTime = Date.now() + minutes * 60 * 1000
    const snoozeTitle = snoozeCount > 1 ? `Snoozed Task (${snoozeCount}x)` : "Snoozed Task Reminder"

    await scheduleNotification(taskId, snoozeTitle, `Don't forget: ${task.title}`, snoozeTime, {
      priority: snoozeCount > 2 ? "high" : "normal",
      category: "reminder",
      taskDueDate: task.dueDate ? new Date(task.dueDate).getTime() : undefined,
    })

    const newNotifications = await getScheduledNotifications()
    const newNotification = newNotifications.find((n) => n.taskId === taskId && n.scheduledTime === snoozeTime)
    if (newNotification) {
      newNotification.snoozeCount = snoozeCount
      const { initDB } = await import("./db")
      const database = await initDB()
      const transaction = database.transaction([NOTIFICATIONS_STORE], "readwrite")
      const store = transaction.objectStore(NOTIFICATIONS_STORE)
      store.put(newNotification)
    }

    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  } catch (error) {
    console.error("Error snoozing notification:", error)
  }
}

async function scheduleRecurringNotification(notification: ScheduledNotification): Promise<void> {
  if (!notification.recurringPattern) return

  const nextTime = new Date(notification.originalScheduledTime || notification.scheduledTime)

  switch (notification.recurringPattern) {
    case "daily":
      nextTime.setDate(nextTime.getDate() + 1)
      break
    case "weekly":
      nextTime.setDate(nextTime.getDate() + 7)
      break
    case "monthly":
      nextTime.setMonth(nextTime.getMonth() + 1)
      break
  }

  await scheduleNotification(notification.taskId, notification.title, notification.body, nextTime.getTime(), {
    priority: notification.priority,
    category: notification.category,
    taskDueDate: notification.taskDueDate,
    isRecurring: true,
    recurringPattern: notification.recurringPattern,
  })
}

export async function scheduleTaskReminder(
  taskId: string,
  taskTitle: string,
  reminderTime: string,
  isRepeating = false,
  repeatInterval?: "daily" | "weekly" | "monthly",
  options?: {
    priority?: "low" | "normal" | "high"
    taskDueDate?: string
  },
): Promise<void> {
  const reminderDate = new Date(reminderTime)
  const now = new Date()

  if (reminderDate <= now) {
    console.warn("Cannot schedule reminder in the past")
    return
  }

  const dueDate = options?.taskDueDate ? new Date(options.taskDueDate) : null
  let category: "reminder" | "overdue" | "deadline" = "reminder"

  if (dueDate) {
    const timeToDue = dueDate.getTime() - reminderDate.getTime()
    if (timeToDue <= 0) {
      category = "overdue"
    } else if (timeToDue <= 60 * 60 * 1000) {
      category = "deadline"
    }
  }

  const title =
    category === "overdue" ? "Overdue Task!" : category === "deadline" ? "Task Deadline Approaching" : "Task Reminder"
  const body = `Don't forget: ${taskTitle}`

  await scheduleNotification(taskId, title, body, reminderDate.getTime(), {
    priority: options?.priority || (category === "overdue" ? "high" : "normal"),
    category,
    taskDueDate: dueDate?.getTime(),
  })

  if (isRepeating && repeatInterval) {
    const nextReminderDate = new Date(reminderDate)

    switch (repeatInterval) {
      case "daily":
        nextReminderDate.setDate(nextReminderDate.getDate() + 1)
        break
      case "weekly":
        nextReminderDate.setDate(nextReminderDate.getDate() + 7)
        break
      case "monthly":
        nextReminderDate.setMonth(nextReminderDate.getMonth() + 1)
        break
    }

    await scheduleTaskReminder(taskId, taskTitle, nextReminderDate.toISOString(), isRepeating, repeatInterval, options)
  }
}

export function startNotificationScheduler(): void {
  const checkInterval = setInterval(checkAndTriggerNotifications, 60000)

  checkAndTriggerNotifications()

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkAndTriggerNotifications()
    }
  })

  window.addEventListener("focus", checkAndTriggerNotifications)
  ;(window as any).__notificationInterval = checkInterval
}

export function stopNotificationScheduler(): void {
  const intervalId = (window as any).__notificationInterval
  if (intervalId) {
    clearInterval(intervalId)
    delete (window as any).__notificationInterval
  }
}
