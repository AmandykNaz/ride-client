import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  CreateRideReviewPayload,
  RideReview,
  RideReviewSummary,
  RideReviewsListResponse,
} from './ride-reviews.types'

type BackendRecord = Record<string, unknown>

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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

  const candidates = [value.items, value.results, value.data, value.reviews]
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

function mapReview(raw: unknown): RideReview {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asString(record.id, `review-${Date.now()}`),
    orderId: asString(record.orderId ?? record.order_id),
    rating: asNumber(record.rating, 0),
    comment: asString(record.comment ?? record.message ?? record.note),
    authorRole: asString(record.authorRole ?? record.author_role ?? record.role),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    raw,
  }
}

function mapSummary(raw: unknown): RideReviewSummary {
  const record = isRecord(raw) ? raw : {}

  return {
    averageRating: asNumber(
      record.averageRating ?? record.average_rating ?? record.ratingAverage ?? record.rating_average,
      0,
    ),
    reviewsCount: asNumber(
      record.reviewsCount ?? record.reviews_count ?? record.count ?? record.totalReviews,
      0,
    ),
    raw,
  }
}

function mapListResponse(raw: unknown): RideReviewsListResponse {
  const record = isRecord(raw) ? raw : undefined

  return {
    items: getList(raw).map(mapReview),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    skip: record && typeof record.skip === 'number' ? record.skip : undefined,
    take: record && typeof record.take === 'number' ? record.take : undefined,
    raw,
  }
}

export async function createRideOrderReview(orderId: string, payload: CreateRideReviewPayload) {
  const normalizedId = requireNumericOrderId('createRideOrderReview', orderId)
  if (!normalizedId) {
    throw new Error('Не удалось определить numeric id заказа для отзыва.')
  }

  const response = await backendPost<unknown>(`/ride/orders/${normalizedId}/reviews`, payload)
  return mapReview(response)
}

export async function getRideOrderReviews(orderId: string) {
  const normalizedId = requireNumericOrderId('getRideOrderReviews', orderId)
  if (!normalizedId) {
    throw new Error('Не удалось определить numeric id заказа для отзывов.')
  }

  const response = await backendGet<unknown>(`/ride/orders/${normalizedId}/reviews`)
  return mapListResponse(response)
}

export async function getDriverReviews(params?: { take?: number; skip?: number }) {
  const response = await backendGet<unknown>(`/ride/driver/reviews${buildQuery(params)}`)
  return mapListResponse(response)
}

export async function getDriverReviewSummary() {
  const response = await backendGet<unknown>('/ride/driver/reviews/summary')
  return mapSummary(response)
}

export async function getPassengerReviews(params?: { take?: number; skip?: number }) {
  const response = await backendGet<unknown>(`/ride/passenger/reviews${buildQuery(params)}`)
  return mapListResponse(response)
}

export async function getPassengerReviewSummary() {
  const response = await backendGet<unknown>('/ride/passenger/reviews/summary')
  return mapSummary(response)
}
