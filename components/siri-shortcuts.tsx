"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Smartphone } from "lucide-react"

export function SiriShortcuts() {
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null)

  const shortcuts = [
    {
      id: "quick-task",
      name: "Quick Task",
      description: "Create a new task quickly",
      phrase: "Add task to SmartReminder",
      url: `${window.location.origin}?action=create-task`,
      icon: "📝",
    },
    {
      id: "check-tasks",
      name: "Check Tasks",
      description: "View today's tasks",
      phrase: "Show my tasks",
      url: `${window.location.origin}?action=view-tasks`,
      icon: "📋",
    },
    {
      id: "add-resource",
      name: "Add Resource",
      description: "Add a new study resource",
      phrase: "Add resource to SmartReminder",
      url: `${window.location.origin}?action=add-resource`,
      icon: "📚",
    },
    {
      id: "check-progress",
      name: "Check Progress",
      description: "View your performance stats",
      phrase: "Show my progress",
      url: `${window.location.origin}?action=view-progress`,
      icon: "📊",
    },
  ]

  const copyShortcutURL = async (shortcut: (typeof shortcuts)[0]) => {
    try {
      await navigator.clipboard.writeText(shortcut.url)
      setCopiedShortcut(shortcut.id)
      setTimeout(() => setCopiedShortcut(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const generateShortcutFile = (shortcut: (typeof shortcuts)[0]) => {
    const shortcutData = {
      WFWorkflowActions: [
        {
          WFWorkflowActionIdentifier: "is.workflow.actions.openurl",
          WFWorkflowActionParameters: {
            WFInput: shortcut.url,
          },
        },
      ],
      WFWorkflowClientVersion: "2605.0.5",
      WFWorkflowIcon: {
        WFWorkflowIconStartColor: 2846468607,
        WFWorkflowIconGlyphNumber: 59511,
      },
      WFWorkflowImportQuestions: [],
      WFWorkflowInputContentItemClasses: [],
      WFWorkflowMinimumClientVersion: 900,
      WFWorkflowMinimumClientVersionString: "900",
      WFWorkflowOutputContentItemClasses: [],
      WFWorkflowTypes: ["Watch"],
      WFWorkflowHasShortcutInputVariables: false,
    }

    const blob = new Blob([JSON.stringify(shortcutData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${shortcut.name.replace(/\s+/g, "-").toLowerCase()}.shortcut`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Siri Shortcuts</h3>
              <p className="text-sm text-muted-foreground">
                Set up voice commands to quickly access SmartReminder features
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to set up:</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Copy the shortcut URL or download the shortcut file</li>
              <li>Open the Shortcuts app on your iPhone</li>
              <li>Create a new shortcut or import the downloaded file</li>
              <li>Add the "Open URL" action with the copied URL</li>
              <li>Set up the Siri phrase and save</li>
            </ol>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {shortcuts.map((shortcut) => (
          <Card key={shortcut.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{shortcut.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium">{shortcut.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{shortcut.description}</p>
                  <Badge variant="outline" className="text-xs">
                    "Hey Siri, {shortcut.phrase}"
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyShortcutURL(shortcut)}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedShortcut === shortcut.id ? "Copied!" : "Copy URL"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateShortcutFile(shortcut)}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <h4 className="font-medium">Voice Commands</h4>
          <div className="grid gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Task Creation:</p>
              <p className="text-xs text-muted-foreground">
                "Create a task to [task name]" • "Remind me to [task name] [time]" • "Add [task name] to my list"
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Time Expressions:</p>
              <p className="text-xs text-muted-foreground">
                "today" • "tomorrow" • "next week" • "in 3 days" • "this Friday"
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Examples:</p>
              <p className="text-xs text-muted-foreground">
                "Create a task to buy groceries tomorrow" • "Remind me to call mom today" • "Add study for exam next
                week"
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
