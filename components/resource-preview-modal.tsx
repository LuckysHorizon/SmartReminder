"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getResourceBlob, formatFileSize, type ResourceItem } from "@/lib/resources"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Download, ExternalLink, Copy, X } from "lucide-react"

interface ResourcePreviewModalProps {
  resource: ResourceItem | null
  isOpen: boolean
  onClose: () => void
}

export function ResourcePreviewModal({ resource, isOpen, onClose }: ResourcePreviewModalProps) {
  const { triggerHaptic } = useHapticFeedback()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!resource || !isOpen) {
      setBlobUrl(null)
      setError(null)
      return
    }

    if (resource.link) {
      // For links, no need to load blob
      return
    }

    const loadBlob = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const blob = await getResourceBlob(resource.id)
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (err) {
        setError("Failed to load resource")
        console.error("Error loading resource blob:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadBlob()

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [resource, isOpen])

  const handleCopyLink = async () => {
    if (!resource?.link) return

    try {
      await navigator.clipboard.writeText(resource.link)
      triggerHaptic("success")
      // Could add a toast notification here
    } catch (err) {
      triggerHaptic("error")
      console.error("Failed to copy link:", err)
    }
  }

  const handleDownload = () => {
    if (resource?.link) {
      window.open(resource.link, "_blank")
    } else if (blobUrl && resource) {
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = resource.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    triggerHaptic("light")
  }

  const handleOpenExternal = () => {
    if (resource?.link) {
      window.open(resource.link, "_blank")
    } else if (blobUrl) {
      window.open(blobUrl, "_blank")
    }
    triggerHaptic("light")
  }

  if (!resource) return null

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <p className="mb-2">Failed to load preview</p>
            <Button onClick={handleOpenExternal} variant="outline" size="sm">
              Open Externally
            </Button>
          </div>
        </div>
      )
    }

    if (resource.link) {
      // Enhanced link preview
      return (
        <div className="space-y-4">
          {resource.linkPreview && (
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
              {resource.linkPreview.favicon && (
                <img
                  src={resource.linkPreview.favicon || "/placeholder.svg"}
                  alt=""
                  className="w-8 h-8 rounded flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{resource.linkPreview.title || resource.name}</h4>
                {resource.linkPreview.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{resource.linkPreview.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 truncate">{resource.link}</p>
              </div>
            </div>
          )}

          {/* Embedded preview for supported sites */}
          {resource.link.includes("youtube.com") || resource.link.includes("youtu.be") ? (
            <div className="aspect-video">
              <iframe
                src={resource.link.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Preview not available</p>
                <p className="text-xs">Click "Open External" to view</p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // File preview
    if (resource.category === "image" && blobUrl) {
      return (
        <div className="max-h-96 overflow-hidden rounded-lg">
          <img src={blobUrl || "/placeholder.svg"} alt={resource.name} className="w-full h-auto object-contain" />
        </div>
      )
    }

    if (resource.type === "application/pdf" && blobUrl) {
      return (
        <div className="h-96">
          <iframe src={blobUrl} className="w-full h-full rounded-lg border" />
        </div>
      )
    }

    if (resource.category === "video" && blobUrl) {
      return (
        <div className="aspect-video">
          <video src={blobUrl} controls className="w-full h-full rounded-lg" />
        </div>
      )
    }

    if (resource.category === "audio" && blobUrl) {
      return (
        <div className="p-8">
          <audio src={blobUrl} controls className="w-full" />
        </div>
      )
    }

    // Fallback for unsupported types
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-4">{resource.category === "document" ? "📄" : "📎"}</div>
          <p className="mb-2">Preview not available for this file type</p>
          <Button onClick={handleDownload} variant="outline" size="sm">
            Download to View
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{resource.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {resource.label && <Badge variant="outline">{resource.label}</Badge>}
                <Badge variant="secondary">{resource.category}</Badge>
                {!resource.link && (
                  <span className="text-sm text-muted-foreground">{formatFileSize(resource.size)}</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">{renderPreview()}</div>

        {resource.description && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">{resource.description}</p>
          </div>
        )}

        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          {resource.link && (
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          )}
          <Button
            onClick={handleOpenExternal}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent"
          >
            <ExternalLink className="w-4 h-4" />
            Open External
          </Button>
          <Button onClick={handleDownload} variant="default" size="sm" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {resource.link ? "Visit" : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
