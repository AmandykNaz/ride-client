import { clearRideAccessToken, getRideAccessToken } from '../auth/tokenStorage'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

type BackendEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

type BackendMethod = 'GET' | 'POST' | 'PATCH'

type BackendRequestOptions = {
  method: BackendMethod
  body?: unknown
  skipAuth?: boolean
  headers?: HeadersInit
}

export class BackendApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'BackendApiError'
    this.status = status
    this.code = code
  }
}

export class BackendAuthError extends BackendApiError {
  constructor(message = 'Session expired') {
    super(message, 401, 'AUTH_REQUIRED')
    this.name = 'BackendAuthError'
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (isPlainObject(value)) {
    const nestedMessage = value.message ?? value.error ?? value.detail
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage
    }
  }

  return fallback
}

async function parseResponseBody(response: Response) {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function buildHeaders(skipAuth?: boolean, headers?: HeadersInit) {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Content-Type', 'application/json')

  if (!skipAuth) {
    const token = getRideAccessToken()
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  return requestHeaders
}

async function requestBackend<T>(
  path: string,
  { method, body, skipAuth, headers }: BackendRequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(skipAuth, headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const parsed = (await parseResponseBody(response)) as Partial<BackendEnvelope<T>> | T | string | null
  const isEnvelope = isPlainObject(parsed) && 'success' in parsed && 'data' in parsed

  if (!response.ok) {
    if (response.status === 401) {
      clearRideAccessToken()
      throw new BackendAuthError(
        getErrorMessage(
          isEnvelope ? parsed.message : parsed,
          'Your session expired. Please sign in again.',
        ),
      )
    }

    throw new BackendApiError(
      getErrorMessage(
        isEnvelope ? parsed.message : parsed,
        `Request failed with status ${response.status}`,
      ),
      response.status,
    )
  }

  if (isEnvelope) {
    if (!parsed.success) {
      const message = getErrorMessage(parsed.message, 'Backend request failed')
      if (response.status === 401) {
        clearRideAccessToken()
        throw new BackendAuthError(message)
      }

      throw new BackendApiError(message, response.status)
    }

    if (parsed.data === undefined) {
      throw new BackendApiError('Backend response did not include data', response.status)
    }

    return parsed.data
  }

  return parsed as T
}

export function backendGet<T>(path: string) {
  return requestBackend<T>(path, { method: 'GET' })
}

export function backendPost<T>(
  path: string,
  body?: unknown,
  options?: Pick<BackendRequestOptions, 'skipAuth' | 'headers'>,
) {
  return requestBackend<T>(path, { method: 'POST', body, ...options })
}

export function backendPatch<T>(
  path: string,
  body?: unknown,
  options?: Pick<BackendRequestOptions, 'skipAuth' | 'headers'>,
) {
  return requestBackend<T>(path, { method: 'PATCH', body, ...options })
}
