import { backendGet, backendPatch, backendPost } from '../../../shared/api/backend'
import type {
  CreateDriverAnnouncementPayload,
  GetDriverAnnouncementsParams,
  RideDriverAnnouncement,
  RideDriverAnnouncementDriver,
  RideDriverAnnouncementStatus,
  RideDriverAnnouncementVehicle,
  UpdateDriverAnnouncementPayload,
} from './announcement.types'

type BackendRecord = Record<string, unknown>

const INVALID_ANNOUNCEMENT_ID_MESSAGE =
  'Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.'

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeAnnouncementId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value))
  }

  if (typeof value === 'string') {
    const digits = value.trim()
    return /^\d+$/.test(digits) ? digits : null
  }

  return null
}

function unwrapRecord(value: unknown, keys: string[]) {
  if (!isRecord(value)) return value

  for (const key of keys) {
    const nested = value[key]
    if (isRecord(nested)) return nested
  }

  return value
}

function extractList(value: unknown) {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []

  const candidates = [value.items, value.results, value.data, value.announcements]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function normalizeStatus(value: unknown): RideDriverAnnouncementStatus | string {
  const normalized = asString(value).trim().toUpperCase()
  if (
    normalized === 'ACTIVE' ||
    normalized === 'PAUSED' ||
    normalized === 'EXPIRED' ||
    normalized === 'CANCELLED' ||
    normalized === 'COMPLETED'
  ) {
    return normalized
  }

  return asString(value)
}

function normalizeDriver(raw: unknown): RideDriverAnnouncementDriver | null {
  if (!isRecord(raw)) return null

  return {
    id: asString(raw.id ?? raw.driverId ?? raw.driver_id),
    fullName: asNullableString(raw.fullName ?? raw.full_name ?? raw.name),
    phone: asNullableString(raw.phone ?? raw.phoneNumber ?? raw.phone_number),
    avatarUrl: asNullableString(raw.avatarUrl ?? raw.avatar_url),
    ratingAvg: typeof raw.ratingAvg === 'number' && Number.isFinite(raw.ratingAvg) ? raw.ratingAvg : asNumber(raw.ratingAvg, Number.NaN),
    ratingCount: typeof raw.ratingCount === 'number' && Number.isFinite(raw.ratingCount) ? raw.ratingCount : asNumber(raw.ratingCount, Number.NaN),
    raw,
  }
}

function normalizeVehicle(raw: unknown): RideDriverAnnouncementVehicle | null {
  if (!isRecord(raw)) return null

  return {
    id: asString(raw.id ?? raw.vehicleId ?? raw.vehicle_id),
    label: asNullableString(raw.label),
    brand: asNullableString(raw.brand ?? raw.brandName ?? raw.brand_name),
    model: asNullableString(raw.model ?? raw.modelName ?? raw.model_name),
    name: asNullableString(raw.name ?? raw.vehicleName ?? raw.vehicle_name),
    plate: asNullableString(raw.plate ?? raw.plateNumber ?? raw.plate_number),
    plateNumber: asNullableString(raw.plateNumber ?? raw.plate_number ?? raw.plate),
    color: asNullableString(raw.color ?? raw.colorName ?? raw.color_name),
    colorName: asNullableString(raw.colorName ?? raw.color_name ?? raw.color),
    seats: typeof raw.seats === 'number' || typeof raw.seats === 'string' ? raw.seats : null,
    seatsCount: typeof raw.seatsCount === 'number' && Number.isFinite(raw.seatsCount) ? raw.seatsCount : undefined,
    raw,
  }
}

function mapAnnouncement(raw: unknown): RideDriverAnnouncement {
  const record = isRecord(raw) ? raw : {}

  return {
    id: normalizeAnnouncementId(record.id ?? record.announcementId ?? record.announcement_id) ?? '',
    status: normalizeStatus(record.status),
    fromText: asString(record.fromText ?? record.from_text),
    toText: asString(record.toText ?? record.to_text),
    scheduledAt: asString(record.scheduledAt ?? record.scheduled_at),
    pricePerSeat: asNumber(record.pricePerSeat ?? record.price_per_seat ?? record.price ?? record.amount),
    currency: asNullableString(record.currency),
    seatsAvailable: asNumber(record.seatsAvailable ?? record.seats_available, 0),
    comment: asNullableString(record.comment),
    acceptsPassengers: asBoolean(record.acceptsPassengers ?? record.accepts_passengers),
    acceptsParcels: asBoolean(record.acceptsParcels ?? record.accepts_parcels),
    driver: normalizeDriver(record.driver ?? record.driverProfile ?? record.driver_profile),
    vehicle: normalizeVehicle(record.vehicle ?? record.driverVehicle ?? record.driver_vehicle),
    contactOpened: asBoolean(record.contactOpened ?? record.contact_opened),
    publishedAt: asNullableString(record.publishedAt ?? record.published_at),
    cancelledAt: asNullableString(record.cancelledAt ?? record.cancelled_at),
    completedAt: asNullableString(record.completedAt ?? record.completed_at),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    updatedAt: asString(record.updatedAt ?? record.updated_at, new Date().toISOString()),
    raw,
  }
}

function normalizeListResponse(raw: unknown) {
  const record = isRecord(raw) ? raw : undefined

  return {
    items: extractList(raw).map(mapAnnouncement),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    skip: record && typeof record.skip === 'number' ? record.skip : undefined,
    take: record && typeof record.take === 'number' ? record.take : undefined,
    raw,
  }
}

function normalizeSingleResponse(raw: unknown) {
  const record = unwrapRecord(raw, ['announcement', 'item', 'result', 'data'])
  return mapAnnouncement(record)
}

function buildAnnouncementRequestPayload(
  payload: CreateDriverAnnouncementPayload | UpdateDriverAnnouncementPayload,
) {
  return {
    fromText: payload.fromText,
    toText: payload.toText,
    scheduledAt: payload.scheduledAt,
    pricePerSeat: payload.pricePerSeat,
    seatsAvailable: payload.seatsAvailable,
    comment: payload.comment,
    acceptsPassengers: payload.acceptsPassengers,
    acceptsParcels: payload.acceptsParcels,
  }
}

export async function createDriverAnnouncement(payload: CreateDriverAnnouncementPayload) {
  const response = await backendPost<unknown>(
    '/ride/driver/announcements',
    buildAnnouncementRequestPayload(payload),
  )
  return normalizeSingleResponse(response)
}

function buildAnnouncementsQuery(params?: GetDriverAnnouncementsParams) {
  if (!params) return ''

  const query = new URLSearchParams()

  if (params.status) {
    query.set('status', params.status)
  }

  if (typeof params.q === 'string' && params.q.trim()) {
    query.set('q', params.q.trim())
  }

  if (typeof params.take === 'number' && Number.isFinite(params.take) && params.take > 0) {
    query.set('take', String(Math.trunc(params.take)))
  }

  if (typeof params.skip === 'number' && Number.isFinite(params.skip) && params.skip >= 0) {
    query.set('skip', String(Math.trunc(params.skip)))
  }

  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export async function getDriverAnnouncements(params?: GetDriverAnnouncementsParams) {
  const response = await backendGet<unknown>(`/ride/driver/announcements${buildAnnouncementsQuery(params)}`)
  return normalizeListResponse(response)
}

export async function getDriverAnnouncement(id: string) {
  const normalizedId = normalizeAnnouncementId(id)
  if (!normalizedId) {
    throw new Error(INVALID_ANNOUNCEMENT_ID_MESSAGE)
  }

  const response = await backendGet<unknown>(`/ride/driver/announcements/${normalizedId}`)
  return normalizeSingleResponse(response)
}

export async function updateDriverAnnouncement(id: string, payload: UpdateDriverAnnouncementPayload) {
  const normalizedId = normalizeAnnouncementId(id)
  if (!normalizedId) {
    throw new Error(INVALID_ANNOUNCEMENT_ID_MESSAGE)
  }

  const response = await backendPatch<unknown>(
    `/ride/driver/announcements/${normalizedId}`,
    buildAnnouncementRequestPayload(payload),
  )
  return normalizeSingleResponse(response)
}

export async function updateDriverAnnouncementStatus(id: string, status: RideDriverAnnouncementStatus) {
  const normalizedId = normalizeAnnouncementId(id)
  if (!normalizedId) {
    throw new Error(INVALID_ANNOUNCEMENT_ID_MESSAGE)
  }

  const response = await backendPost<unknown>(`/ride/driver/announcements/${normalizedId}/status`, { status })
  return normalizeSingleResponse(response)
}
