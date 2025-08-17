"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { updateResource, deleteResource, type ResourceItem } from "@/lib/resources"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Edit, Trash2, Copy, FolderOpen, Tag } from "lucide-react"

interface ResourceContextMenuProps {
  resource: ResourceItem
  isOpen: boolean
  onClose: () => void
  onResourceUpdated: () => void
  folders: string[]
}

export function ResourceContextMenu({
  resource,
  isOpen,
  onClose,
  onResourceUpdated,
  folders,
}: ResourceContextMenuProps) {
  const { triggerHaptic } = useHapticFeedback()
  const [action, setAction] = useState<"rename" | "move" | "edit-tags" | null>(null)
  const [newName, setNewName] = useState(resource.name)
  const [newFolder, setNewFolder] = useState(resource.folder || "")
  const [newTags, setNewTags] = useState(resource.tags.join(", "))

  const handleCopyLink = async () => {
    if (!resource.link) return

    try {
      await navigator.clipboard.writeText(resource.link)
      triggerHaptic("success")
      onClose()
    } catch (err) {
      triggerHaptic("error")
      console.error("Failed to copy link:", err)
    }
  }

  const handleRename = async () => {
    if (!newName.trim() || newName === resource.name) {
      setAction(null)
      return
    }

    try {
      await updateResource(resource.id, { name: newName.trim() })
      triggerHaptic("success")
      onResourceUpdated()
      setAction(null)
      onClose()
    } catch (err) {
      triggerHaptic("error")
      console.error("Failed to rename resource:", err)
    }
  }

  const handleMove = async () => {
    if (newFolder === resource.folder) {
      setAction(null)
      return
    }

    try {
      await updateResource(resource.id, { folder: newFolder || undefined })
      triggerHaptic("success")
      onResourceUpdated()
      setAction(null)
      onClose()
    } catch (err) {
      triggerHaptic("error")
      console.error("Failed to move resource:", err)
    }
  }

  const handleEditTags = async () => {
    const tags = newTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      await updateResource(resource.id, { tags })
      triggerHaptic("success")
      onResourceUpdated()
      setAction(null)
      onClose()
    } catch (err) {
      triggerHaptic("error")
      console.error("Failed to update tags:", err)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      try {
        await deleteResource(resource.id)
        triggerHaptic("medium")
        onResourceUpdated()
        onClose()
      } catch (err) {
        triggerHaptic("error")
        console.error("Failed to delete resource:", err)
      }
    }
  }

  const renderActionDialog = () => {
    switch (action) {
      case "rename":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">New Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAction(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleRename} className="flex-1">
                Rename
              </Button>
            </div>
          </div>
        )

      case "move":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-folder">Folder</Label>
              <Input
                id="new-folder"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMove()}
                placeholder="Enter folder name (leave empty for root)"
                list="folders-list"
                autoFocus
              />
              <datalist id="folders-list">
                {folders.map((folder) => (
                  <option key={folder} value={folder} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAction(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleMove} className="flex-1">
                Move
              </Button>
            </div>
          </div>
        )

      case "edit-tags":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-tags">Tags (comma-separated)</Label>
              <Input
                id="new-tags"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditTags()}
                placeholder="tag1, tag2, tag3"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAction(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleEditTags} className="flex-1">
                Update Tags
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action ? "Edit Resource" : "Resource Actions"}</DialogTitle>
        </DialogHeader>

        {action ? (
          renderActionDialog()
        ) : (
          <div className="space-y-2">
            <Button onClick={() => setAction("rename")} variant="ghost" className="w-full justify-start" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Rename
            </Button>

            <Button onClick={() => setAction("move")} variant="ghost" className="w-full justify-start" size="sm">
              <FolderOpen className="w-4 h-4 mr-2" />
              Move to Folder
            </Button>

            <Button onClick={() => setAction("edit-tags")} variant="ghost" className="w-full justify-start" size="sm">
              <Tag className="w-4 h-4 mr-2" />
              Edit Tags
            </Button>

            {resource.link && (
              <Button onClick={handleCopyLink} variant="ghost" className="w-full justify-start" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            )}

            <Button
              onClick={handleDelete}
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
