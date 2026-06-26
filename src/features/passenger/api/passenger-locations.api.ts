import { backendGet } from '../../../shared/api/backend'

import type { RideLocation } from './passenger-locations.types'

type BackendRecord = Record<string, unknown>

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function extractList(value: unknown) {
  if (Array.isArray(value)) return value

  if (isRecord(value)) {
    return (
      (Array.isArray(value.items) && value.items) ||
      (Array.isArray(value.results) && value.results) ||
      (Array.isArray(value.data) && value.data) ||
      []
    )
  }

  return []
}

function mapRideLocation(raw: unknown): RideLocation | null {
  const record = isRecord(raw) ? raw : null
  if (!record) return null

  const id = asNumber(record.id, 0)
  if (!Number.isFinite(id) || id <= 0) return null

  return {
    id,
    type: asString(record.type, ''),
    nameRu: asString(record.nameRu ?? record.name_ru ?? record.name, ''),
    nameKk: asOptionalString(record.nameKk ?? record.name_kk),
    regionName: asOptionalString(record.regionName ?? record.region_name),
    displayName: asString(record.displayName ?? record.display_name, ''),
    lat: asOptionalString(record.lat),
    lng: asOptionalString(record.lng),
  }
}

function normalizeResponse(value: unknown) {
  return extractList(value).map(mapRideLocation).filter((item): item is RideLocation => Boolean(item))
}

export async function searchRideLocations(query: string, limit = 10) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })

  return normalizeResponse(await backendGet(`/ride/locations/search?${params.toString()}`))
}

