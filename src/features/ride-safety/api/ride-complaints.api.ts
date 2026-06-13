import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  CreateRideComplaintPayload,
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
    orderId: asString(record.orderId ?? record.order_id),
    category: asString(record.category ?? record.type ?? record.reason, 'other'),
    message: asString(record.message ?? record.description ?? record.text),
    status: asString(record.status, 'PENDING_REVIEW'),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    reviewedAt: asString(record.reviewedAt ?? record.reviewed_at),
    raw,
  }
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
  const response = await backendPost<unknown>(`/ride/orders/${orderId}/complaints`, payload)
  return mapComplaint(response)
}

export async function getRideOrderComplaints(orderId: string) {
  const response = await backendGet<unknown>(`/ride/orders/${orderId}/complaints`)
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
