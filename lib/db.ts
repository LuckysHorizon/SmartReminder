export type Task = {
  id: string
  title: string
  description?: string
  dueDate?: string
  reminderTime?: string
  isRepeating: boolean
  repeatInterval?: "daily" | "weekly" | "monthly"
  isCompleted: boolean
  createdAt: number
  completedAt?: number
}

export type Reminder = {
  id: string
  taskId: string
  scheduledTime: number
  isTriggered: boolean
}

const DB_NAME = "smart-reminder-db"
const DB_VERSION = 3 // Updated version to support notification stores
const TASKS_STORE = "tasks"
const REMINDERS_STORE = "reminders"
const RESOURCES_META_STORE = "resources-meta"
const RESOURCES_BLOB_STORE = "resources-blob"
const NOTIFICATIONS_STORE = "scheduled-notifications" // Added notifications store

let db: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create tasks store
      if (!database.objectStoreNames.contains(TASKS_STORE)) {
        const tasksStore = database.createObjectStore(TASKS_STORE, { keyPath: "id" })
        tasksStore.createIndex("createdAt", "createdAt", { unique: false })
        tasksStore.createIndex("dueDate", "dueDate", { unique: false })
        tasksStore.createIndex("isCompleted", "isCompleted", { unique: false })
      }

      // Create reminders store
      if (!database.objectStoreNames.contains(REMINDERS_STORE)) {
        const remindersStore = database.createObjectStore(REMINDERS_STORE, { keyPath: "id" })
        remindersStore.createIndex("taskId", "taskId", { unique: false })
        remindersStore.createIndex("scheduledTime", "scheduledTime", { unique: false })
      }

      if (!database.objectStoreNames.contains(RESOURCES_META_STORE)) {
        const metaStore = database.createObjectStore(RESOURCES_META_STORE, { keyPath: "id" })
        metaStore.createIndex("createdAt", "createdAt", { unique: false })
        metaStore.createIndex("category", "category", { unique: false })
        metaStore.createIndex("name", "name", { unique: false })
      }

      if (!database.objectStoreNames.contains(RESOURCES_BLOB_STORE)) {
        database.createObjectStore(RESOURCES_BLOB_STORE)
      }

      if (!database.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        const notificationsStore = database.createObjectStore(NOTIFICATIONS_STORE, { keyPath: "id" })
        notificationsStore.createIndex("taskId", "taskId", { unique: false })
        notificationsStore.createIndex("scheduledTime", "scheduledTime", { unique: false })
        notificationsStore.createIndex("isTriggered", "isTriggered", { unique: false })
      }
    }
  })
}

export async function addTask(task: Omit<Task, "id" | "createdAt">): Promise<Task> {
  const database = await initDB()
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }

  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction([TASKS_STORE], "readwrite")
    const store = transaction.objectStore(TASKS_STORE)
    const request = store.add(newTask)

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      if (newTask.reminderTime) {
        try {
          const { scheduleTaskReminder } = await import("./notifications")
          await scheduleTaskReminder(
            newTask.id,
            newTask.title,
            newTask.reminderTime,
            newTask.isRepeating,
            newTask.repeatInterval,
          )
        } catch (error) {
          console.error("Error scheduling reminder:", error)
        }
      }
      resolve(newTask)
    }
  })
}

export async function getTasks(): Promise<Task[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([TASKS_STORE], "readonly")
    const store = transaction.objectStore(TASKS_STORE)
    const index = store.index("createdAt")
    const request = index.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result.reverse()) // Most recent first
  })
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const database = await initDB()

  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction([TASKS_STORE], "readwrite")
    const store = transaction.objectStore(TASKS_STORE)
    const getRequest = store.get(id)

    getRequest.onsuccess = async () => {
      const task = getRequest.result
      if (task) {
        const updatedTask = { ...task, ...updates }
        const putRequest = store.put(updatedTask)
        putRequest.onsuccess = async () => {
          if (updates.reminderTime && updates.reminderTime !== task.reminderTime) {
            try {
              const { scheduleTaskReminder } = await import("./notifications")
              await scheduleTaskReminder(
                updatedTask.id,
                updatedTask.title,
                updatedTask.reminderTime,
                updatedTask.isRepeating,
                updatedTask.repeatInterval,
              )
            } catch (error) {
              console.error("Error scheduling reminder:", error)
            }
          }
          resolve()
        }
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error("Task not found"))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function deleteTask(id: string): Promise<void> {
  const database = await initDB()

  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction([TASKS_STORE], "readwrite")
    const store = transaction.objectStore(TASKS_STORE)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      try {
        const { getScheduledNotifications, deleteScheduledNotification } = await import("./notifications")
        const notifications = await getScheduledNotifications()
        const taskNotifications = notifications.filter((n) => n.taskId === id)

        for (const notification of taskNotifications) {
          await deleteScheduledNotification(notification.id)
        }
      } catch (error) {
        console.error("Error cleaning up notifications:", error)
      }
      resolve()
    }
  })
}

export async function addReminder(reminder: Omit<Reminder, "id">): Promise<Reminder> {
  const database = await initDB()
  const newReminder: Reminder = {
    ...reminder,
    id: crypto.randomUUID(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REMINDERS_STORE], "readwrite")
    const store = transaction.objectStore(REMINDERS_STORE)
    const request = store.add(newReminder)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(newReminder)
  })
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REMINDERS_STORE], "readonly")
    const store = transaction.objectStore(REMINDERS_STORE)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const reminders = request.result.filter((r) => !r.isTriggered && r.scheduledTime <= Date.now())
      resolve(reminders)
    }
  })
}
