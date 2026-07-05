import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  CreateRideComplaintPayload,
  CreateRideRequestComplaintPayload,
  RideComplaint,
  RideComplaintsListResponse,
} from './ride-complaints.types'

type BackendRecord = Record<string, unknown>

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function requireNumericOrderId(context: string, value: string) {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) {
    console.warn(`[ride] ${context}: numeric order id is required`, value)
    return null
  }

  return normalized
}

function getList(value: unknown) {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []

  const candidates = [value.items, value.results, value.data, value.complaints]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function buildQuery(params?: { take?: number; skip?: number }) {
  if (!params) return ''

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    query.set(key, String(value))
  }

  const result = query.toString()
  return result ? `?${result}` : ''
}

function mapComplaint(raw: unknown): RideComplaint {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asString(record.id, `complaint-${Date.now()}`),
    targetType: asString(record.targetType ?? record.target_type, 'ORDER') as 'ORDER' | 'REQUEST_CONTACT',
    orderId: asString(record.orderId ?? record.order_id),
    requestId: asString(record.requestId ?? record.request_id),
    contactUnlockId: asString(record.contactUnlockId ?? record.contact_unlock_id),
    complainantRole: asString(record.complainantRole ?? record.complainant_role) as 'PASSENGER' | 'DRIVER' | string,
    category: asString(record.category ?? record.reasonCode ?? record.reason_code ?? record.type ?? record.reason, 'other'),
    message: asString(record.message ?? record.description ?? record.text),
    status: asString(record.status, 'PENDING_REVIEW'),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    reviewedAt: asString(record.reviewedAt ?? record.reviewed_at),
    raw,
  }
}

function extractComplaintResponse(raw: unknown) {
  if (!isRecord(raw)) return raw

  return raw.complaint ?? raw.complaints ?? raw.data ?? raw.item ?? raw
}

function mapListResponse(raw: unknown): RideComplaintsListResponse {
  const record = isRecord(raw) ? raw : undefined

  return {
    items: getList(raw).map(mapComplaint),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    skip: record && typeof record.skip === 'number' ? record.skip : undefined,
    take: record && typeof record.take === 'number' ? record.take : undefined,
    raw,
  }
}

export async function createRideOrderComplaint(orderId: string, payload: CreateRideComplaintPayload) {
  const normalizedId = requireNumericOrderId('createRideOrderComplaint', orderId)
  if (!normalizedId) {
    throw new Error('Не удалось определить numeric id заказа для жалобы.')
  }

  const description = typeof payload.message === 'string' ? payload.message.trim() : ''
  const response = await backendPost<unknown>(`/ride/orders/${normalizedId}/complaints`, {
    reason: payload.category,
    ...(description ? { description } : {}),
  })
  return mapComplaint(extractComplaintResponse(response))
}

async function createRideRequestComplaint(
  endpoint: string,
  requestId: string,
  payload: CreateRideRequestComplaintPayload,
) {
  const normalizedId = requireNumericOrderId('createRideRequestComplaint', requestId)
  if (!normalizedId) {
    throw new Error('Не удалось определить numeric id заявки для жалобы.')
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  const contactUnlockId = typeof payload.contactUnlockId === 'string' ? payload.contactUnlockId.trim() : ''
  const response = await backendPost<unknown>(`${endpoint}/${normalizedId}/complaints`, {
    reasonCode: payload.reasonCode,
    ...(message ? { message } : {}),
    ...(contactUnlockId ? { contactUnlockId } : {}),
  })
  return mapComplaint(extractComplaintResponse(response))
}

export async function createPassengerRideRequestComplaint(requestId: string, payload: CreateRideRequestComplaintPayload) {
  return createRideRequestComplaint('/ride/passenger/requests', requestId, payload)
}

export async function createDriverRideRequestComplaint(requestId: string, payload: CreateRideRequestComplaintPayload) {
  return createRideRequestComplaint('/ride/driver/requests', requestId, payload)
}

export async function getRideOrderComplaints(orderId: string) {
  const normalizedId = requireNumericOrderId('getRideOrderComplaints', orderId)
  if (!normalizedId) {
    throw new Error('Не удалось определить numeric id заказа для жалоб.')
  }

  const response = await backendGet<unknown>(`/ride/orders/${normalizedId}/complaints`)
  return mapListResponse(response)
}

export async function getPassengerComplaints(params?: { take?: number; skip?: number }) {
  const response = await backendGet<unknown>(`/ride/passenger/complaints${buildQuery(params)}`)
  return mapListResponse(response)
}

export async function getDriverComplaints(params?: { take?: number; skip?: number }) {
  const response = await backendGet<unknown>(`/ride/driver/complaints${buildQuery(params)}`)
  return mapListResponse(response)
}
