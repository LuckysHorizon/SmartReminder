"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ResourceCard } from "./resource-card"
import { ResourceUpload } from "./resource-upload"
import { getResources, getFolders, addLinkResource, type ResourceItem } from "@/lib/resources"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { Search, Folder, Link, Upload, FolderPlus, Filter } from "lucide-react"

export function ResourcesTab() {
  const { triggerHaptic } = useHapticFeedback()
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [filteredResources, setFilteredResources] = useState<ResourceItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "files" | "links" | "folders">("all")
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file")
  const [isLoading, setIsLoading] = useState(true)

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkFolder, setLinkFolder] = useState("")
  const [linkTags, setLinkTags] = useState("")
  const [linkDescription, setLinkDescription] = useState("")
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const loadResources = async () => {
    try {
      const [loadedResources, loadedFolders] = await Promise.all([getResources(), getFolders()])
      setResources(loadedResources)
      setFolders(loadedFolders)

      // Extract all unique tags
      const tags = new Set<string>()
      loadedResources.forEach((resource) => {
        resource.tags.forEach((tag) => tags.add(tag))
      })
      setAllTags(Array.from(tags).sort())
    } catch (error) {
      console.error("Error loading resources:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

  useEffect(() => {
    let filtered = resources

    // Filter by folder if selected
    if (selectedFolder) {
      filtered = filtered.filter((resource) => resource.folder === selectedFolder)
    }

    // Filter by tags if selected
    if (selectedTags.length > 0) {
      filtered = filtered.filter((resource) => selectedTags.every((tag) => resource.tags.includes(tag)))
    }

    // Filter by active filter
    switch (activeFilter) {
      case "files":
        filtered = filtered.filter((resource) => !resource.link)
        break
      case "links":
        filtered = filtered.filter((resource) => resource.link)
        break
      case "folders":
        // Show resources that have folders
        filtered = filtered.filter((resource) => resource.folder)
        break
      case "all":
      default:
        // Show all resources
        break
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (resource) =>
          resource.name.toLowerCase().includes(query) ||
          resource.description?.toLowerCase().includes(query) ||
          resource.label?.toLowerCase().includes(query) ||
          resource.folder?.toLowerCase().includes(query) ||
          resource.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          resource.linkPreview?.title?.toLowerCase().includes(query) ||
          resource.linkPreview?.description?.toLowerCase().includes(query),
      )
    }

    setFilteredResources(filtered)
  }, [resources, searchQuery, activeFilter, selectedFolder, selectedTags])

  const handleResourceAdded = () => {
    loadResources()
  }

  const handleAddLink = async () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return

    try {
      const tags = linkTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await addLinkResource(
        linkLabel.trim(),
        linkUrl.trim(),
        linkDescription.trim() || undefined,
        tags,
        linkLabel.trim(),
        linkFolder.trim() || undefined,
      )

      setLinkLabel("")
      setLinkUrl("")
      setLinkFolder("")
      setLinkTags("")
      setLinkDescription("")
      setIsLinkDialogOpen(false)
      triggerHaptic("success")
      handleResourceAdded()
    } catch (error) {
      console.error("Error adding link:", error)
      triggerHaptic("error")
    }
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return

    // Add the folder to the list if it doesn't exist
    if (!folders.includes(newFolderName.trim())) {
      setFolders([...folders, newFolderName.trim()].sort())
    }

    setNewFolderName("")
    setIsFolderDialogOpen(false)
    triggerHaptic("light")
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    triggerHaptic("light")
  }

  const getTotalSize = () => {
    const totalBytes = resources.reduce((sum, resource) => sum + resource.size, 0)
    const totalMB = totalBytes / (1024 * 1024)
    return totalMB.toFixed(1)
  }

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case "all":
        return resources.length
      case "files":
        return resources.filter((r) => !r.link).length
      case "links":
        return resources.filter((r) => r.link).length
      case "folders":
        return resources.filter((r) => r.folder).length
      default:
        return 0
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Enhanced fixed header */}
      <div className="sticky top-[120px] z-40 bg-background/95 backdrop-blur-sm border-b border-border pb-4 -mx-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{resources.length} resources</span>
            <span>{getTotalSize()} MB used</span>
            {selectedTags.length > 0 && (
              <span>
                • {selectedTags.length} tag filter{selectedTags.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsLinkDialogOpen(true)
                triggerHaptic("light")
              }}
              variant="outline"
              size="sm"
              className="touch-target"
            >
              <Link className="w-4 h-4 mr-1" />
              Add Link
            </Button>
            <Button
              onClick={() => {
                setUploadMode("file")
                setIsUploadOpen(true)
                triggerHaptic("light")
              }}
              size="sm"
              className="btn-primary touch-target"
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
        </div>

        {/* Enhanced search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search resources, labels, folders, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-base"
          />
        </div>

        {/* Enhanced filter tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4">
          {[
            { id: "all", label: "All", count: getFilterCount("all") },
            { id: "files", label: "Files", count: getFilterCount("files") },
            { id: "links", label: "Links", count: getFilterCount("links") },
            { id: "folders", label: "Folders", count: getFilterCount("folders") },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setActiveFilter(filter.id as any)
                setSelectedFolder(null)
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

        {/* Enhanced folder navigation */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
            <button
              onClick={() => {
                setSelectedFolder(null)
                triggerHaptic("light")
              }}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
                !selectedFolder
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Folder className="w-3 h-3" />
              All Folders
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => {
                  setSelectedFolder(folder)
                  triggerHaptic("light")
                }}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedFolder === folder
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Folder className="w-3 h-3" />
                {folder}
              </button>
            ))}
          </div>
          <Button
            onClick={() => {
              setIsFolderDialogOpen(true)
              triggerHaptic("light")
            }}
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Enhanced tag filters */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {allTags.length > 10 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">+{allTags.length - 10} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced resources grid */}
      <div className="space-y-3 pt-4">
        {filteredResources.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-lg mb-1">
              {resources.length === 0 ? "No resources yet" : `No ${activeFilter} resources found`}
            </p>
            <p className="text-sm">
              {resources.length === 0
                ? "Upload files or add links to get started!"
                : "Try adjusting your filters or add new resources"}
            </p>
          </div>
        ) : (
          filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onResourceUpdated={handleResourceAdded}
              folders={folders}
            />
          ))
        )}
      </div>

      {/* Upload dialog */}
      <ResourceUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onResourceAdded={handleResourceAdded}
        mode={uploadMode}
      />

      {/* Enhanced link dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Add Link Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-label">Label</Label>
              <Input
                id="link-label"
                placeholder="Enter a label for this link"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-description">Description (optional)</Label>
              <Input
                id="link-description"
                placeholder="Brief description of the link"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-folder">Folder (optional)</Label>
              <Input
                id="link-folder"
                placeholder="Enter folder name"
                value={linkFolder}
                onChange={(e) => setLinkFolder(e.target.value)}
                className="text-base"
                list="folders-list"
              />
              <datalist id="folders-list">
                {folders.map((folder) => (
                  <option key={folder} value={folder} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-tags">Tags (optional)</Label>
              <Input
                id="link-tags"
                placeholder="tag1, tag2, tag3"
                value={linkTags}
                onChange={(e) => setLinkTags(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsLinkDialogOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddLink} disabled={!linkLabel.trim() || !linkUrl.trim()} className="flex-1">
                Add Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced folder dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                className="text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsFolderDialogOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="flex-1">
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
