"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  requestNotificationPermission,
  getScheduledNotifications,
  type NotificationPermissionStatus,
  type ScheduledNotification,
} from "@/lib/notifications"
import { formatDistanceToNow } from "date-fns"

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermissionStatus>("default")
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadNotificationData()
  }, [])

  const loadNotificationData = async () => {
    try {
      // Check current permission
      if ("Notification" in window) {
        setPermission(Notification.permission as NotificationPermissionStatus)
      }

      // Load scheduled notifications
      const notifications = await getScheduledNotifications()
      setScheduledNotifications(notifications.filter((n) => !n.isTriggered))
    } catch (error) {
      console.error("Error loading notification data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestPermission = async () => {
    const newPermission = await requestNotificationPermission()
    setPermission(newPermission)
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case "granted":
        return { text: "Enabled", color: "bg-green-500/10 text-green-600 border-green-500/20" }
      case "denied":
        return { text: "Blocked", color: "bg-red-500/10 text-red-600 border-red-500/20" }
      default:
        return { text: "Not Set", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" }
    }
  }

  const permissionStatus = getPermissionStatus()

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Notification Permissions</h3>
              <p className="text-sm text-muted-foreground">Allow notifications to receive reminders for your tasks</p>
            </div>
            <Badge className={permissionStatus.color}>{permissionStatus.text}</Badge>
          </div>

          {permission !== "granted" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {permission === "denied"
                  ? "Notifications are blocked. Please enable them in your browser settings."
                  : "Click below to enable notifications for task reminders."}
              </p>
              <Button onClick={handleRequestPermission} disabled={permission === "denied"} className="btn-primary">
                {permission === "denied" ? "Blocked by Browser" : "Enable Notifications"}
              </Button>
            </div>
          )}

          {permission === "granted" && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Notifications are enabled</span>
            </div>
          )}
        </div>
      </Card>

      {scheduledNotifications.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Reminders</h3>
          <div className="space-y-3">
            {scheduledNotifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{notification.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{notification.body}</p>
                </div>
                <div className="text-sm text-muted-foreground ml-4">
                  {formatDistanceToNow(notification.scheduledTime, { addSuffix: true })}
                </div>
              </div>
            ))}
            {scheduledNotifications.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                And {scheduledNotifications.length - 5} more reminders...
              </p>
            )}
          </div>
        </Card>
      )}

      {scheduledNotifications.length === 0 && permission === "granted" && (
        <Card className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">🔔</div>
            <p className="text-lg mb-1">No upcoming reminders</p>
            <p className="text-sm">Add reminder times to your tasks to see them here</p>
          </div>
        </Card>
      )}
    </div>
  )
}
