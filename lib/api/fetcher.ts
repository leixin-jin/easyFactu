/**
 * API 客户端错误类
 */
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

/**
 * 统一 API 请求函数
 * 
 * 特性：
 * - 自动处理 JSON 序列化/反序列化
 * - 支持请求超时
 * - 统一错误处理，解析 { error, code, detail } 格式
 * - 成功响应自动解包 { data } 结构
 */
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

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      // 解析统一错误响应格式 { error, code, detail }
      const errorMessage = payload?.error ?? payload?.message ?? `HTTP ${response.status}`
      const errorCode = payload?.code ?? `HTTP_${response.status}`
      throw new ApiError(response.status, errorCode, errorMessage, payload?.detail)
    }

    // 成功响应：解包 { data } 结构，兼容旧格式
    return (payload?.data ?? payload) as T
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

