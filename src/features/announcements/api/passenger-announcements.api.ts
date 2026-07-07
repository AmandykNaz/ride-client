import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  RideDriverAnnouncement,
  RideDriverAnnouncementDriver,
  RideDriverAnnouncementStatus,
  RideDriverAnnouncementVehicle,
  RidePassengerAnnouncementContactOpen,
} from './announcement.types'

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

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function asNullableNumber(value: unknown) {
  const parsed = asNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeAnnouncementId(value: unknown): string | null {
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
    id: normalizeAnnouncementId(raw.id ?? raw.driverId ?? raw.driver_id) ?? undefined,
    fullName: asNullableString(raw.fullName ?? raw.full_name ?? raw.name),
    phone: asNullableString(raw.phone ?? raw.phoneNumber ?? raw.phone_number),
    avatarUrl: asNullableString(raw.avatarUrl ?? raw.avatar_url),
    ratingAvg: asNullableNumber(raw.ratingAvg ?? raw.rating_avg),
    ratingCount: asNullableNumber(raw.ratingCount ?? raw.rating_count),
    raw,
  }
}

function normalizeVehicle(raw: unknown): RideDriverAnnouncementVehicle | null {
  if (!isRecord(raw)) return null

  return {
    id: normalizeAnnouncementId(raw.id ?? raw.vehicleId ?? raw.vehicle_id) ?? undefined,
    label: asNullableString(raw.label),
    brand: asNullableString(raw.brand ?? raw.brandName ?? raw.brand_name),
    model: asNullableString(raw.model ?? raw.modelName ?? raw.model_name),
    name: asNullableString(raw.name ?? raw.vehicleName ?? raw.vehicle_name),
    plate: asNullableString(raw.plate ?? raw.plateNumber ?? raw.plate_number),
    plateNumber: asNullableString(raw.plateNumber ?? raw.plate_number ?? raw.plate),
    color: asNullableString(raw.color ?? raw.colorName ?? raw.color_name),
    colorName: asNullableString(raw.colorName ?? raw.color_name ?? raw.color),
    seats: typeof raw.seats === 'number' || typeof raw.seats === 'string' ? raw.seats : null,
    seatsCount: asNullableNumber(raw.seatsCount ?? raw.seats_count),
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

function mapContactOpen(raw: unknown): RidePassengerAnnouncementContactOpen {
  const record = isRecord(raw) ? raw : {}

  return {
    announcementId: normalizeAnnouncementId(record.announcementId ?? record.announcement_id) ?? '',
    driverProfileId: normalizeAnnouncementId(record.driverProfileId ?? record.driver_profile_id),
    driverName: asNullableString(record.driverName ?? record.driver_name),
    driverPhone: asString(record.driverPhone ?? record.driver_phone),
    avatarUrl: asNullableString(record.avatarUrl ?? record.avatar_url),
    vehicle: normalizeVehicle(record.vehicle),
    contactOpened: asBoolean(record.contactOpened ?? record.contact_opened, true),
    openedAt: asString(record.openedAt ?? record.opened_at, new Date().toISOString()),
    raw,
  }
}

function normalizeListResponse(raw: unknown) {
  const record = isRecord(raw) ? raw : undefined

  return {
    items: extractList(raw).map(mapAnnouncement),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    raw,
  }
}

export async function getPassengerAnnouncements() {
  const response = await backendGet<unknown>('/ride/passenger/announcements')
  return normalizeListResponse(response)
}

export async function getPassengerAnnouncement(id: string) {
  const normalizedId = normalizeAnnouncementId(id)
  if (!normalizedId) {
    throw new Error('Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.')
  }

  const response = await backendGet<unknown>(`/ride/passenger/announcements/${normalizedId}`)
  return mapAnnouncement(unwrapRecord(response, ['announcement', 'item', 'result', 'data']))
}

export async function openPassengerAnnouncementContact(id: string) {
  const normalizedId = normalizeAnnouncementId(id)
  if (!normalizedId) {
    throw new Error('Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.')
  }

  const response = await backendPost<unknown>(`/ride/passenger/announcements/${normalizedId}/contact-open`)
  return mapContactOpen(unwrapRecord(response, ['contact', 'item', 'result', 'data']))
}
