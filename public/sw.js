const CACHE_NAME = "smart-reminder-v2"
const urlsToCache = ["/", "/manifest.json", "/logo.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action

  // Handle different notification actions
  if (action === "complete" && data.taskId) {
    // Mark task as complete
    event.waitUntil(
      handleTaskAction(data.taskId, "complete").then(() => {
        return focusOrOpenApp()
      }),
    )
  } else if (action === "snooze-10" && data.taskId) {
    // Snooze for 10 minutes
    event.waitUntil(
      handleTaskAction(data.taskId, "snooze", 10).then(() => {
        return focusOrOpenApp()
      }),
    )
  } else if (action === "snooze-60" && data.taskId) {
    // Snooze for 1 hour
    event.waitUntil(
      handleTaskAction(data.taskId, "snooze", 60).then(() => {
        return focusOrOpenApp()
      }),
    )
  } else if (action === "view" && data.taskId) {
    // Open the app and focus on the specific task
    event.waitUntil(focusOrOpenApp(`/?task=${data.taskId}`))
  } else if (action === "dismiss") {
    // Just close the notification (already handled above)
    return
  } else {
    // Default action - open the app
    event.waitUntil(focusOrOpenApp())
  }
})

async function handleTaskAction(taskId, action, minutes = 0) {
  try {
    // Send message to all clients to handle the action
    const clients = await self.clients.matchAll({ type: "window" })

    const message = {
      type: "NOTIFICATION_ACTION",
      taskId,
      action,
      minutes,
    }

    // Send to all open clients
    clients.forEach((client) => {
      client.postMessage(message)
    })

    // If no clients are open, store the action for when app opens
    if (clients.length === 0) {
      // Store pending action in IndexedDB or localStorage equivalent
      await storePendingAction(message)
    }
  } catch (error) {
    console.error("Error handling task action:", error)
  }
}

async function focusOrOpenApp(url = "/") {
  const clients = await self.clients.matchAll({ type: "window" })

  // If app is already open, focus it
  for (const client of clients) {
    if (client.url.includes(self.location.origin) && "focus" in client) {
      if (url !== "/") {
        client.navigate(url)
      }
      return client.focus()
    }
  }

  // If app is not open, open it
  if (self.clients.openWindow) {
    return self.clients.openWindow(url)
  }
}

async function storePendingAction(action) {
  // Store in IndexedDB for when app opens
  const request = indexedDB.open("smart-reminder-db", 2)

  request.onsuccess = (event) => {
    const db = event.target.result
    const transaction = db.transaction(["pending-actions"], "readwrite")
    const store = transaction.objectStore("pending-actions")

    store.add({
      id: Date.now().toString(),
      action,
      timestamp: Date.now(),
    })
  }
}

self.addEventListener("notificationclose", (event) => {
  // Track notification dismissals for analytics
  console.log("Notification was closed", event.notification.data)

  // Optional: Send analytics data
  const data = event.notification.data || {}
  if (data.category === "overdue") {
    // Track overdue notification dismissals
    console.log("Overdue notification dismissed", data.taskId)
  }
})

self.addEventListener("sync", (event) => {
  if (event.tag === "check-notifications") {
    event.waitUntil(checkNotifications())
  } else if (event.tag === "sync-task-actions") {
    event.waitUntil(syncPendingActions())
  }
})

async function checkNotifications() {
  try {
    // Check for due notifications in the background
    const clients = await self.clients.matchAll({ type: "window" })

    if (clients.length > 0) {
      // If app is open, let it handle notifications
      clients[0].postMessage({ type: "CHECK_NOTIFICATIONS" })
    } else {
      // App is closed, check notifications here
      console.log("Background notification check - app closed")
      // Could implement background notification checking here
    }
  } catch (error) {
    console.error("Error in background notification check:", error)
  }
}

async function syncPendingActions() {
  try {
    // Sync any pending task actions when connection is restored
    const clients = await self.clients.matchAll({ type: "window" })

    if (clients.length > 0) {
      clients[0].postMessage({ type: "SYNC_PENDING_ACTIONS" })
    }
  } catch (error) {
    console.error("Error syncing pending actions:", error)
  }
}

self.addEventListener("message", (event) => {
  const { type, data } = event.data || {}

  if (type === "SKIP_WAITING") {
    self.skipWaiting()
  } else if (type === "CLAIM_CLIENTS") {
    self.clients.claim()
  } else if (type === "SCHEDULE_NOTIFICATION") {
    // Handle notification scheduling from main app
    scheduleNotification(data)
  }
})

function scheduleNotification(notificationData) {
  // Schedule a notification (this would integrate with the notification system)
  console.log("Scheduling notification:", notificationData)
}
