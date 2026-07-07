import { backendGet, backendPatch } from '../../../shared/api/backend'
import type {
  ListRideNotificationsParams,
  RideNotification,
  RideNotificationsListResponse,
  RideUnreadNotificationsCountResponse,
} from './notifications.types'

type BackendRecord = Record<string, unknown>

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function normalizeNotificationId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return ''
}

function asRecordOrNull(value: unknown) {
  return isRecord(value) ? value : null
}

function extractList(value: unknown) {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []

  const candidates = [value.items, value.results, value.notifications, value.data]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function extractEntity(value: unknown) {
  if (!isRecord(value)) return value

  const candidates = [value.notification, value.item, value.result, value.data]
  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate
  }

  return value
}

function mapNotification(raw: unknown): RideNotification {
  const record = isRecord(raw) ? raw : {}
  const readAt = asNullableString(record.readAt ?? record.read_at)

  return {
    id: normalizeNotificationId(record.id ?? record.notificationId ?? record.notification_id),
    type: asString(record.type, 'UNKNOWN'),
    title: asString(record.title, 'Уведомление'),
    body: asNullableString(record.body ?? record.message ?? record.description),
    actionType: asNullableString(record.actionType ?? record.action_type),
    actionPayload: asRecordOrNull(record.actionPayload ?? record.action_payload),
    metadata: asRecordOrNull(record.metadata),
    readAt,
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    isRead: asBoolean(record.isRead ?? record.is_read, Boolean(readAt)),
    raw,
  }
}

function buildQuery(params?: ListRideNotificationsParams) {
  if (!params) return ''

  const query = new URLSearchParams()

  if (typeof params.take === 'number' && Number.isFinite(params.take) && params.take > 0) {
    query.set('take', String(Math.trunc(params.take)))
  }

  if (typeof params.skip === 'number' && Number.isFinite(params.skip) && params.skip >= 0) {
    query.set('skip', String(Math.trunc(params.skip)))
  }

  if (params.unreadOnly) {
    query.set('unreadOnly', 'true')
  }

  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

function mapListResponse(raw: unknown): RideNotificationsListResponse {
  const record = isRecord(raw) ? raw : undefined

  return {
    items: extractList(raw).map(mapNotification),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    skip: record && typeof record.skip === 'number' ? record.skip : undefined,
    take: record && typeof record.take === 'number' ? record.take : undefined,
    raw,
  }
}

function mapUnreadCountResponse(raw: unknown): RideUnreadNotificationsCountResponse {
  const entity = extractEntity(raw)
  const record = isRecord(entity) ? entity : isRecord(raw) ? raw : {}

  return {
    unreadCount: asNumber(
      record.unreadCount ??
        record.unread_count ??
        record.count ??
        record.total ??
        record.value,
      0,
    ),
    raw,
  }
}

export async function listRideNotifications(params?: ListRideNotificationsParams) {
  const response = await backendGet<unknown>(`/ride/notifications${buildQuery(params)}`)
  return mapListResponse(response)
}

export async function getRideUnreadNotificationsCount() {
  const response = await backendGet<unknown>('/ride/notifications/unread-count')
  return mapUnreadCountResponse(response)
}

export async function markRideNotificationRead(id: string) {
  const response = await backendPatch<unknown>(`/ride/notifications/${id}/read`, {})
  return mapNotification(extractEntity(response))
}

export async function markAllRideNotificationsRead() {
  await backendPatch<unknown>('/ride/notifications/read-all', {})
}
