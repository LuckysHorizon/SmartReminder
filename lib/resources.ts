export type ResourceItem = {
  id: string
  name: string
  type: string
  size: number
  category: "document" | "image" | "video" | "audio" | "other"
  tags: string[]
  description?: string
  createdAt: number
  lastAccessed?: number
  label?: string
  link?: string
  folder?: string
  linkPreview?: {
    title?: string
    description?: string
    favicon?: string
    image?: string
  }
}

const RESOURCES_META_STORE = "resources-meta"
const RESOURCES_BLOB_STORE = "resources-blob"

export async function addResource(
  file: File,
  description?: string,
  tags: string[] = [],
  label?: string,
  link?: string,
  folder?: string,
): Promise<ResourceItem> {
  const database = await initDB()
  const id = crypto.randomUUID()

  const category = getFileCategory(file.type)
  const resource: ResourceItem = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    category,
    tags,
    description,
    createdAt: Date.now(),
    label,
    link,
    folder,
  }

  if (link) {
    try {
      const preview = await fetchLinkPreview(link)
      resource.linkPreview = preview
    } catch (error) {
      console.warn("Failed to fetch link preview:", error)
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([RESOURCES_META_STORE, RESOURCES_BLOB_STORE], "readwrite")
    const metaStore = transaction.objectStore(RESOURCES_META_STORE)
    const blobStore = transaction.objectStore(RESOURCES_BLOB_STORE)

    const metaRequest = metaStore.add(resource)
    const blobRequest = blobStore.put(file, id)

    transaction.oncomplete = () => resolve(resource)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function addLinkResource(
  name: string,
  link: string,
  description?: string,
  tags: string[] = [],
  label?: string,
  folder?: string,
): Promise<ResourceItem> {
  const database = await initDB()
  const id = crypto.randomUUID()

  const resource: ResourceItem = {
    id,
    name,
    type: "link",
    size: 0,
    category: "other",
    tags,
    description,
    createdAt: Date.now(),
    label,
    link,
    folder,
  }

  try {
    const preview = await fetchLinkPreview(link)
    resource.linkPreview = preview
    if (!name || name === link) {
      resource.name = preview.title || link
    }
  } catch (error) {
    console.warn("Failed to fetch link preview:", error)
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([RESOURCES_META_STORE], "readwrite")
    const metaStore = transaction.objectStore(RESOURCES_META_STORE)
    const metaRequest = metaStore.add(resource)

    transaction.oncomplete = () => resolve(resource)
    transaction.onerror = () => reject(transaction.error)
  })
}

async function fetchLinkPreview(url: string): Promise<ResourceItem["linkPreview"]> {
  try {
    const domain = new URL(url).hostname

    let favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    let title = domain
    let description = url

    if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
      title = "YouTube Video"
      description = "Video content from YouTube"
      favicon = "https://www.youtube.com/favicon.ico"
    } else if (domain.includes("drive.google.com")) {
      title = "Google Drive File"
      description = "File stored in Google Drive"
      favicon = "https://drive.google.com/favicon.ico"
    } else if (domain.includes("github.com")) {
      title = "GitHub Repository"
      description = "Code repository on GitHub"
      favicon = "https://github.com/favicon.ico"
    } else if (domain.includes("notion.so")) {
      title = "Notion Page"
      description = "Document or workspace in Notion"
      favicon = "https://www.notion.so/favicon.ico"
    }

    return { title, description, favicon }
  } catch (error) {
    return { title: url, description: url }
  }
}

export async function getFolders(): Promise<string[]> {
  const resources = await getResources()
  const folders = new Set<string>()

  resources.forEach((resource) => {
    if (resource.folder) {
      folders.add(resource.folder)
    }
  })

  return Array.from(folders).sort()
}

export async function getResources(): Promise<ResourceItem[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([RESOURCES_META_STORE], "readonly")
    const store = transaction.objectStore(RESOURCES_META_STORE)
    const index = store.index("createdAt")
    const request = index.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result.reverse())
  })
}

export async function getResourceBlob(id: string): Promise<Blob> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([RESOURCES_BLOB_STORE], "readonly")
    const store = transaction.objectStore(RESOURCES_BLOB_STORE)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result)
      } else {
        reject(new Error("Resource not found"))
      }
    }
  })
}

export async function updateResource(id: string, updates: Partial<ResourceItem>): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([RESOURCES_META_STORE], "readwrite")
    const store = transaction.objectStore(RESOURCES_META_STORE)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const resource = getRequest.result
      if (resource) {
        const updatedResource = { ...resource, ...updates }
        const putRequest = store.put(updatedResource)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error("Resource not found"))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function deleteResource(id: string): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([RESOURCES_META_STORE, RESOURCES_BLOB_STORE], "readwrite")
    const metaStore = transaction.objectStore(RESOURCES_META_STORE)
    const blobStore = transaction.objectStore(RESOURCES_BLOB_STORE)

    metaStore.delete(id)
    blobStore.delete(id)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function openResource(id: string): Promise<void> {
  try {
    const resources = await getResources()
    const resource = resources.find((r) => r.id === id)

    if (!resource) {
      throw new Error("Resource not found")
    }

    if (resource.link) {
      // For links, create an in-app preview modal or open in new tab
      const shouldOpenInApp =
        resource.category === "document" ||
        resource.link.includes("youtube.com") ||
        resource.link.includes("drive.google.com")

      if (shouldOpenInApp) {
        // Create an in-app iframe preview
        const previewWindow = window.open("", "_blank", "width=800,height=600")
        if (previewWindow) {
          previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${resource.name}</title>
                <style>
                  body { margin: 0; padding: 20px; font-family: system-ui; }
                  .header { display: flex; justify-content: between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                  .title { font-size: 18px; font-weight: 600; }
                  .url { color: #666; font-size: 14px; }
                  iframe { width: 100%; height: calc(100vh - 100px); border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  .fallback { text-align: center; padding: 40px; color: #666; }
                  .fallback a { color: #0066cc; text-decoration: none; }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="title">${resource.name}</div>
                    <div class="url">${resource.link}</div>
                  </div>
                </div>
                <iframe src="${resource.link}" onerror="document.querySelector('.fallback').style.display='block'; this.style.display='none';"></iframe>
                <div class="fallback" style="display: none;">
                  <p>Unable to preview this content in the app.</p>
                  <p><a href="${resource.link}" target="_blank">Open in new tab →</a></p>
                </div>
              </body>
            </html>
          `)
        }
      } else {
        window.open(resource.link, "_blank")
      }

      await updateResource(id, { lastAccessed: Date.now() })
      return
    }

    // For files, create an in-app preview
    const blob = await getResourceBlob(id)
    const url = URL.createObjectURL(blob)

    await updateResource(id, { lastAccessed: Date.now() })

    // Create in-app preview for supported file types
    if (resource.category === "image" || resource.category === "document" || resource.type.includes("pdf")) {
      const previewWindow = window.open("", "_blank", "width=800,height=600")
      if (previewWindow) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${resource.name}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: system-ui; background: #f5f5f5; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .title { font-size: 18px; font-weight: 600; }
                .info { color: #666; font-size: 14px; }
                .content { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                img { max-width: 100%; height: auto; display: block; }
                iframe, embed, object { width: 100%; height: calc(100vh - 120px); border: none; }
                .download-btn { background: #0066cc; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="title">${resource.name}</div>
                  <div class="info">${formatFileSize(resource.size)} • ${resource.type}</div>
                </div>
                <a href="${url}" download="${resource.name}" class="download-btn">Download</a>
              </div>
              <div class="content">
                ${
                  resource.category === "image"
                    ? `<img src="${url}" alt="${resource.name}" />`
                    : `<iframe src="${url}"></iframe>`
                }
              </div>
            </body>
          </html>
        `)
      }
    } else {
      // For other file types, trigger download or open in new tab
      window.open(url, "_blank")
    }

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error("Error opening resource:", error)
    throw error
  }
}

function getFileCategory(mimeType: string): ResourceItem["category"] {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  ) {
    return "document"
  }
  return "other"
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export function getFileIcon(category: ResourceItem["category"], type?: string, link?: string): string {
  if (link) {
    const domain = new URL(link).hostname
    if (domain.includes("youtube.com") || domain.includes("youtu.be")) return "📺"
    if (domain.includes("drive.google.com")) return "💾"
    if (domain.includes("github.com")) return "🐙"
    if (domain.includes("notion.so")) return "📝"
    return "🔗"
  }

  switch (category) {
    case "document":
      return "📄"
    case "image":
      return "🖼️"
    case "video":
      return "🎥"
    case "audio":
      return "🎵"
    default:
      return "📎"
  }
}

import { initDB } from "./db"

const originalInitDB = initDB

export { initDB }

export async function initResourceDB(): Promise<IDBDatabase> {
  const DB_NAME = "smart-reminder-db"
  const DB_VERSION = 2

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      if (!database.objectStoreNames.contains("tasks")) {
        const tasksStore = database.createObjectStore("tasks", { keyPath: "id" })
        tasksStore.createIndex("createdAt", "createdAt", { unique: false })
        tasksStore.createIndex("dueDate", "dueDate", { unique: false })
        tasksStore.createIndex("isCompleted", "isCompleted", { unique: false })
      }

      if (!database.objectStoreNames.contains("reminders")) {
        const remindersStore = database.createObjectStore("reminders", { keyPath: "id" })
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
    }
  })
}
