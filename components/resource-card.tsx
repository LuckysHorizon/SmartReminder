"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatFileSize, getFileIcon, type ResourceItem } from "@/lib/resources"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { useLongPress } from "@/hooks/use-long-press"
import { ResourcePreviewModal } from "./resource-preview-modal"
import { ResourceContextMenu } from "./resource-context-menu"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, Copy, Eye, MoreVertical } from "lucide-react"

interface ResourceCardProps {
  resource: ResourceItem
  onResourceUpdated: () => void
  folders: string[]
}

export function ResourceCard({ resource, onResourceUpdated, folders }: ResourceCardProps) {
  const { triggerHaptic } = useHapticFeedback()
  const [showPreview, setShowPreview] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)

  const longPressProps = useLongPress({
    onLongPress: () => {
      triggerHaptic("medium")
      setShowContextMenu(true)
    },
    onPress: () => {
      setShowPreview(true)
    },
    delay: 500,
  })

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!resource.link) return

    try {
      await navigator.clipboard.writeText(resource.link)
      triggerHaptic("success")
    } catch (err) {
      triggerHaptic("error")
      console.error("Failed to copy link:", err)
    }
  }

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (resource.link) {
      window.open(resource.link, "_blank")
    }
    triggerHaptic("light")
  }

  const getCategoryColor = (category: ResourceItem["category"]) => {
    switch (category) {
      case "document":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      case "image":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "video":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20"
      case "audio":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20"
    }
  }

  const getResourceIcon = () => {
    return getFileIcon(resource.category, resource.type, resource.link)
  }

  return (
    <>
      <Card className="p-4 transition-all duration-200 hover:shadow-lg cursor-pointer touch-target" {...longPressProps}>
        <div className="flex items-start gap-3">
          {/* Enhanced icon with link preview favicon */}
          <div className="flex-shrink-0 mt-1 relative">
            {resource.link && resource.linkPreview?.favicon ? (
              <div className="relative">
                <img
                  src={resource.linkPreview.favicon || "/placeholder.svg"}
                  alt=""
                  className="w-8 h-8 rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.nextElementSibling?.classList.remove("hidden")
                  }}
                />
                <div className="text-2xl hidden">{getResourceIcon()}</div>
              </div>
            ) : (
              <div className="text-2xl">{getResourceIcon()}</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" title={resource.name}>
                  {resource.name}
                </h3>
                {resource.label && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {resource.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge className={`text-xs ${getCategoryColor(resource.category)}`}>{resource.category}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowContextMenu(true)
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Enhanced description with link preview */}
            {(resource.description || resource.linkPreview?.description) && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {resource.description || resource.linkPreview?.description}
              </p>
            )}

            {/* Enhanced metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
              {!resource.link && <span>{formatFileSize(resource.size)}</span>}
              {resource.folder && (
                <>
                  {!resource.link && <span>•</span>}
                  <span>📁 {resource.folder}</span>
                </>
              )}
              <span>{!resource.link && resource.folder ? "•" : ""}</span>
              <span>Added {formatDistanceToNow(resource.createdAt, { addSuffix: true })}</span>
              {resource.lastAccessed && (
                <>
                  <span>•</span>
                  <span>Opened {formatDistanceToNow(resource.lastAccessed, { addSuffix: true })}</span>
                </>
              )}
            </div>

            {/* Enhanced tags */}
            {resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Enhanced action buttons */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPreview(true)
                }}
                className="btn-primary flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                Preview
              </Button>

              {resource.link && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 bg-transparent"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenExternal}
                    className="flex items-center gap-1 bg-transparent"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ResourcePreviewModal resource={resource} isOpen={showPreview} onClose={() => setShowPreview(false)} />

      <ResourceContextMenu
        resource={resource}
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        onResourceUpdated={onResourceUpdated}
        folders={folders}
      />
    </>
  )
}
