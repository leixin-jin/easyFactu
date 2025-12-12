export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface FetcherOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  timeout?: number
}

export async function fetcher<T>(url: string, options: FetcherOptions = {}): Promise<T> {
  const { body, timeout = 30000, ...init } = options

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

    clearTimeout(timeoutId)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const errorMessage = data?.error ?? data?.message ?? `HTTP ${response.status}`
      const errorCode = data?.code ?? `HTTP_${response.status}`
      throw new ApiError(response.status, errorCode, errorMessage, data?.detail)
    }

    return data as T
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new ApiError(408, "TIMEOUT", "请求超时")
      }
      throw new ApiError(0, "NETWORK_ERROR", error.message)
    }

    throw new ApiError(0, "UNKNOWN_ERROR", "未知错误")
  }
}
