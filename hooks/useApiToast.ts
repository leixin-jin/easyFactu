"use client"

import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/constants"

interface ApiToastOptions {
  title: string
  description?: string
}

export function useApiToast() {
  const { toast } = useToast()

  const success = (title: string, description?: string) => {
    toast({ title, description })
  }

  const error = (title: string, description?: string) => {
    toast({ title, description, variant: "destructive" })
  }

  const fromApiError = (
    err: unknown,
    fallbackTitle = "操作失败",
  ): void => {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code
      const rawMessage =
        "error" in err ? ((err as { error: string }).error ?? "") : ""
      const message = getErrorMessage(code, rawMessage)
      toast({ title: fallbackTitle, description: message, variant: "destructive" })
      return
    }
    const message = err instanceof Error ? err.message : "未知错误"
    toast({ title: fallbackTitle, description: message, variant: "destructive" })
  }

  const fromApiResponse = async (
    res: Response,
    options: { successTitle?: string; errorTitle?: string } = {},
  ): Promise<{ ok: boolean; data: unknown }> => {
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const code = data?.code ?? ""
      const rawMessage = data?.error ?? ""
      const message = code
        ? getErrorMessage(code, rawMessage)
        : rawMessage || `操作失败 (${res.status})`
      toast({
        title: options.errorTitle ?? "操作失败",
        description: message,
        variant: "destructive",
      })
      return { ok: false, data }
    }

    if (options.successTitle) {
      toast({ title: options.successTitle })
    }
    return { ok: true, data }
  }

  return { success, error, fromApiError, fromApiResponse }
}
