"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, Trash2, RefreshCw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Image upload props interface
export interface ImageUploadProps {
    value?: string | null
    onChange: (url: string | null) => void
    onError?: (error: string) => void
    onUploadingChange?: (uploading: boolean) => void
    disabled?: boolean
}

// Allowed file types and max size
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

// Bucket name
const BUCKET_NAME = "menu_items_photos"

/**
 * Extract the file path from a Supabase Storage URL.
 * Returns null if the URL doesn't match the bucket.
 */
function getPathFromUrl(url: string): string | null {
    const match = url.match(/menu_items_photos\/(.+)$/)
    return match ? match[1] : null
}

/**
 * Generate a unique file name for uploads.
 * Format: menu-{timestamp}-{random}.{ext}
 */
function generateFileName(file: File): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    return `menu-${timestamp}-${random}.${ext}`
}

/**
 * Validate file type and size.
 * Returns error message or null if valid.
 */
function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return `不支持的文件格式。请上传 JPEG、PNG、WebP 或 GIF 图片。`
    }
    if (file.size > MAX_SIZE_BYTES) {
        return `文件大小超过限制。最大允许 ${MAX_SIZE_MB}MB。`
    }
    return null
}

/**
 * ImageUpload component for menu item photos.
 * Supports drag-and-drop, click to select, preview, replace, and delete.
 */
export function ImageUpload({
    value,
    onChange,
    onError,
    onUploadingChange,
    disabled = false,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [dragOver, setDragOver] = useState(false)

    const supabase = createClient()

    // Handle file upload
    const uploadFile = useCallback(
        async (file: File, oldUrl?: string | null) => {
            // Validate file
            const validationError = validateFile(file)
            if (validationError) {
                onError?.(validationError)
                return
            }

            setUploading(true)
            onUploadingChange?.(true)

            try {
                // Generate unique file name
                const fileName = generateFileName(file)

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(fileName, file, {
                        cacheControl: "3600",
                        upsert: false,
                    })

                if (uploadError) {
                    // Handle specific errors
                    if (uploadError.message.includes("not authenticated")) {
                        throw new Error("请先登录后再上传图片")
                    }
                    throw new Error(uploadError.message || "上传失败")
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(fileName)

                if (!urlData?.publicUrl) {
                    throw new Error("获取图片 URL 失败")
                }

                // Upload succeeded, now delete old file if it exists and belongs to our bucket
                if (oldUrl) {
                    const oldPath = getPathFromUrl(oldUrl)
                    if (oldPath) {
                        // Delete silently - don't throw if delete fails
                        await supabase.storage.from(BUCKET_NAME).remove([oldPath]).catch(() => {
                            // Ignore delete errors - the old file will be orphaned but new upload succeeded
                        })
                    }
                }

                // Update value with new URL
                onChange(urlData.publicUrl)
            } catch (err) {
                const message = err instanceof Error ? err.message : "上传图片失败"
                onError?.(message)
            } finally {
                setUploading(false)
                onUploadingChange?.(false)
            }
        },
        [supabase, onChange, onError, onUploadingChange]
    )

    // Handle file selection (from input or drop)
    const handleFileSelect = useCallback(
        (files: FileList | null) => {
            if (!files || files.length === 0) return
            const file = files[0]
            uploadFile(file, value)
        },
        [uploadFile, value]
    )

    // Handle delete
    const handleDelete = useCallback(async () => {
        if (!value) return

        setDeleting(true)
        onUploadingChange?.(true)

        try {
            const path = getPathFromUrl(value)
            if (path) {
                const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])
                if (error) {
                    // Handle specific errors
                    if (error.message.includes("not authenticated")) {
                        throw new Error("请先登录后再删除图片")
                    }
                    throw new Error(error.message || "删除失败")
                }
            }
            // Clear the value regardless of whether we deleted from storage
            onChange(null)
        } catch (err) {
            const message = err instanceof Error ? err.message : "删除图片失败"
            onError?.(message)
        } finally {
            setDeleting(false)
            onUploadingChange?.(false)
        }
    }, [value, supabase, onChange, onError, onUploadingChange])

    // Handle drag events
    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled && !uploading && !deleting) {
                setDragOver(true)
            }
        },
        [disabled, uploading, deleting]
    )

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(false)

            if (disabled || uploading || deleting) return

            const files = e.dataTransfer.files
            handleFileSelect(files)
        },
        [disabled, uploading, deleting, handleFileSelect]
    )

    // Handle click to open file picker
    const handleClick = useCallback(() => {
        if (disabled || uploading || deleting) return

        const input = document.createElement("input")
        input.type = "file"
        input.accept = ALLOWED_TYPES.join(",")
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement
            handleFileSelect(target.files)
        }
        input.click()
    }, [disabled, uploading, deleting, handleFileSelect])

    const isLoading = uploading || deleting

    // Check if value is a valid image URL (must start with http://, https://, or /)
    const isValidImageUrl = (url: string | null | undefined): boolean => {
        if (!url || url.trim() === "") return false
        const trimmed = url.trim().toLowerCase()
        // Exclude "null" string (case insensitive)
        if (trimmed === "null") return false
        // Must be a valid URL format
        return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")
    }

    const hasImage = isValidImageUrl(value)

    // Render preview with image
    if (hasImage) {
        return (
            <div className="space-y-2">
                <Card className="relative w-full h-48 overflow-hidden bg-muted">
                    <Image
                        src={value!}
                        alt="菜品图片预览"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    )}
                </Card>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClick}
                        disabled={isLoading || disabled}
                        className="flex-1"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        更换图片
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isLoading || disabled}
                        className="flex-1"
                    >
                        {deleting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        删除图片
                    </Button>
                </div>
            </div>
        )
    }

    // Render upload area
    return (
        <Card
            className={`
        relative w-full h-48 flex flex-col items-center justify-center gap-2
        border-2 border-dashed transition-colors cursor-pointer
        ${dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }
        ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            {uploading ? (
                <>
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">正在上传...</p>
                </>
            ) : (
                <>
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center px-4">
                        点击或拖拽图片到此处上传
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                        支持 JPEG、PNG、WebP、GIF，最大 {MAX_SIZE_MB}MB
                    </p>
                </>
            )}
        </Card>
    )
}
