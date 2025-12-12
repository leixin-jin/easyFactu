import type { ApiError } from "@/types/api"

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public detail?: unknown,
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  timeout?: number
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds

export async function fetcher<T>(url: string, options: FetcherOptions = {}): Promise<T> {
  const { body, timeout = DEFAULT_TIMEOUT, ...init } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const errorData = data as ApiError | null
      throw new ApiClientError(
        errorData?.error ?? `HTTP ${response.status}`,
        response.status,
        errorData?.code,
        errorData?.detail,
      )
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("Request timeout", 408, "TIMEOUT")
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : "Network error",
      0,
      "NETWORK_ERROR",
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

// Convenience methods
export const get = <T>(url: string, options?: FetcherOptions) =>
  fetcher<T>(url, { ...options, method: "GET" })

export const post = <T>(url: string, body?: unknown, options?: FetcherOptions) =>
  fetcher<T>(url, { ...options, method: "POST", body })

export const patch = <T>(url: string, body?: unknown, options?: FetcherOptions) =>
  fetcher<T>(url, { ...options, method: "PATCH", body })

export const del = <T>(url: string, options?: FetcherOptions) =>
  fetcher<T>(url, { ...options, method: "DELETE" })
