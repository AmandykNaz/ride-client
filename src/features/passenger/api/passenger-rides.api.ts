import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  ActiveRide,
  RideOrderStatus,
  RideRequestStatus,
} from '../../../types/domain'
import type {
  AcceptRideOfferResponse,
  CreateRideRequestPayload,
  RideOffer,
  RideOfferListResponse,
  RideOrder,
  RideOrderEvent,
  PassengerRideOrdersResponse,
  RideOrderEventsResponse,
  RideRequest,
  RideType,
} from './passenger-rides.types'

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

function normalizeRideRequestStatus(value: unknown): RideRequestStatus {
  const normalized = asString(value, 'SEARCHING').toUpperCase()
  if (
    normalized === 'SEARCHING' ||
    normalized === 'OFFERED' ||
    normalized === 'ACCEPTED' ||
    normalized === 'CANCELLED' ||
    normalized === 'EXPIRED' ||
    normalized === 'CONVERTED_TO_ORDER'
  ) {
    return normalized
  }

  return 'SEARCHING'
}

function normalizeRideOrderStatus(value: unknown): RideOrderStatus {
  const normalized = asString(value, 'DRIVER_ASSIGNED').toUpperCase()

  if (normalized === 'DRIVER_ASSIGNED' || normalized === 'GOING_TO_CLIENT' || normalized === 'ACCEPTED') {
    return 'DRIVER_ASSIGNED'
  }
  if (normalized === 'DRIVER_ON_WAY') return 'DRIVER_ON_WAY'
  if (normalized === 'DRIVER_ARRIVED' || normalized === 'ARRIVED') return 'DRIVER_ARRIVED'
  if (normalized === 'IN_PROGRESS' || normalized === 'STARTED') return 'IN_PROGRESS'
  if (normalized === 'COMPLETED' || normalized === 'FINISHED') return 'COMPLETED'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELLED'
  if (normalized === 'DISPUTE') return 'DISPUTE'

  return 'DRIVER_ASSIGNED'
}

function isNumericString(value: unknown) {
  return typeof value === 'string' && /^\d+$/.test(value.trim())
}

function readNumericId(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return String(value)
  }

  if (typeof value === 'string' && isNumericString(value)) {
    return value.trim()
  }

  return undefined
}

function asTripType(value: unknown) {
  if (value === 'shared' || value === 'SHARED' || value === 'with-companions' || value === 'with_companions' || value === 'с попутчиками' || value === 'С попутчиками') {
    return 'shared'
  }

  if (value === 'full' || value === 'FULL' || value === 'whole-car' || value === 'whole_car' || value === 'весь салон' || value === 'Весь салон') {
    return 'full'
  }

  return undefined
}

function toBackendRideType(value: unknown): RideType | undefined {
  const tripType = asTripType(value)
  if (tripType === 'shared') return 'SHARED'
  if (tripType === 'full') return 'FULL'
  return undefined
}

function warnInvalidRideRequestId(context: string, value: unknown) {
  console.warn(`[ride] ${context}: numeric request id is required`, value)
}

function resolveRideRequestBackendId(record: BackendRecord) {
  const source = isRecord(record.data) ? record.data : record
  return (
    readNumericId(source.id) ??
    readNumericId(source.requestId) ??
    readNumericId(source.request_id) ??
    readNumericId(record.requestId) ??
    readNumericId(record.request_id)
  )
}

function getRideRequestSource(raw: unknown): BackendRecord {
  if (!isRecord(raw)) return {}

  if (isRecord(raw.data)) return raw.data
  if (isRecord(raw.request)) return raw.request
  if (isRecord(raw.rideRequest)) return raw.rideRequest

  return raw
}

function isBackendEnvelope(value: unknown): value is BackendRecord {
  return isRecord(value) && ('items' in value || 'data' in value || 'request' in value || 'order' in value)
}

function extractList(value: unknown) {
  if (Array.isArray(value)) return value

  if (isRecord(value)) {
    const list =
      (Array.isArray(value.items) && value.items) ||
      (Array.isArray(value.offers) && value.offers) ||
      (Array.isArray(value.requests) && value.requests) ||
      (Array.isArray(value.orders) && value.orders) ||
      (Array.isArray(value.results) && value.results) ||
      (Array.isArray(value.data) && value.data) ||
      []

    return list
  }

  return []
}

function getFallbackDate(value: unknown) {
  const candidate = asString(value)
  if (candidate) return candidate
  return new Date().toISOString()
}

function getFallbackDay(value: unknown) {
  const candidate = asString(value)
  if (candidate) return candidate.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function readRequestedPrice(record: BackendRecord) {
  return asNumber(
    record.requestedPrice ??
      record.requested_price ??
      record.agreedPrice ??
      record.agreed_price ??
      record.offeredPrice ??
      record.offered_price ??
      record.price,
    0,
  )
}

export function mapRideRequestToViewModel(raw: unknown): RideRequest {
  const record = getRideRequestSource(raw)
  const createdAt = getFallbackDate(record.createdAt ?? record.created_at)
  const backendId = resolveRideRequestBackendId(isRecord(raw) ? raw : record)
  const localId = backendId ? undefined : `request-${Date.now()}`
  const from = asString(
    record.from ?? record.originText ?? record.origin_text ?? record.pickupAddress ?? record.pickup_address,
    '',
  )
  const to = asString(
    record.to ??
      record.destinationText ??
      record.destination_text ??
      record.dropoffAddress ??
      record.dropoff_address,
    '',
  )

  return {
    id: backendId ?? localId ?? `request-${Date.now()}`,
    backendId,
    localId,
    status: normalizeRideRequestStatus(record.status),
    serviceType: asString(record.serviceType ?? record.service_type, 'INTERCITY_RIDE'),
    rideType: asTripType(record.rideType ?? record.ride_type ?? record.type),
    time: asString(record.time ?? record.requestTime ?? record.request_time, createdAt.slice(11, 16) || '08:00'),
    type: asTripType(record.type ?? record.rideType ?? record.ride_type) || 'shared',
    passengersCount: asNumber(record.passengersCount ?? record.passengers_count, 1),
    from,
    to,
    date: getFallbackDay(record.date ?? record.createdAt ?? record.created_at),
    price: readRequestedPrice(record),
    originText: asString(
      record.originText ?? record.origin_text ?? from,
      from,
    ),
    destinationText: asString(
      record.destinationText ??
        record.destination_text ??
        to,
      to,
    ),
    pickupAddress: asString(record.pickupAddress ?? record.pickup_address),
    dropoffAddress: asString(record.dropoffAddress ?? record.dropoff_address),
    comment: asString(record.comment),
    createdAt,
    expiresAt: asString(record.expiresAt ?? record.expires_at),
    offersCount: asNumber(record.offersCount ?? record.offers_count, 0),
    selectedOfferId: asString(record.selectedOfferId ?? record.selected_offer_id),
    raw,
  }
}

function requireNumericRideRequestId(context: string, value: string | number) {
  const normalized = readNumericId(value)
  if (!normalized) {
    warnInvalidRideRequestId(context, value)
    return null
  }

  return normalized
}

export function mapRideOfferToViewModel(raw: unknown): RideOffer {
  const record = isRecord(raw) ? raw : {}
  const driver = isRecord(record.driver) ? record.driver : {}
  const vehicle = isRecord(record.vehicle) ? record.vehicle : {}

  return {
    id: asString(record.id, `offer-${Date.now()}`),
    requestId: asString(record.requestId ?? record.request_id),
    status: asString(record.status, 'pending'),
    driverName: asString(
      record.driverName ??
        record.driver_name ??
        record.driverFullName ??
        record.driver_full_name ??
        driver.name ??
        driver.fullName ??
        driver.full_name ??
        record.customerName ??
        record.customer_name,
      'Водитель',
    ),
    rating: asNumber(record.rating ?? record.driverRating ?? record.driver_rating ?? driver.rating ?? vehicle.rating, 5),
    tripsCount: asNumber(record.tripsCount ?? record.trips_count ?? driver.tripsCount ?? driver.trips_count, 0),
    carModel: asString(
      record.carModel ?? record.car_model ?? vehicle.model ?? vehicle.carModel ?? driver.carModel ?? driver.car_model,
      '',
    ),
    carColor: asString(record.carColor ?? record.car_color ?? vehicle.color ?? driver.carColor ?? driver.car_color, ''),
    plate: asString(
      record.plate ??
        record.carPlate ??
        record.car_plate ??
        vehicle.plate ??
        driver.plate ??
        driver.carPlate ??
        driver.car_plate,
      '',
    ),
    etaMinutes: asNumber(record.etaMinutes ?? record.eta_minutes ?? record.eta ?? record.minutesToArrival, 0),
    originalPrice: asNumber(
      record.originalPrice ??
        record.original_price ??
        record.price ??
        record.amount ??
        record.requestedPrice ??
        record.requested_price,
      0,
    ),
    offeredPrice: asNumber(
      record.offeredPrice ??
        record.offered_price ??
        record.price ??
        record.amount ??
        record.agreedPrice ??
        record.agreed_price,
      0,
    ),
    isCustomOffer: Boolean(
      record.isCustomOffer ?? record.is_custom_offer ?? record.customOffer ?? record.custom_offer ?? record.custom,
    ),
    comment: asString(record.comment ?? record.message ?? record.note),
    raw,
  }
}

export function mapRideOrderToViewModel(raw: unknown): RideOrder {
  const record = isRecord(raw) ? raw : {}
  const driver = isRecord(record.driver) ? record.driver : {}
  const from = asString(
    record.from ?? record.originText ?? record.origin_text ?? record.pickupAddress ?? record.pickup_address,
    '',
  )
  const to = asString(
    record.to ??
      record.destinationText ??
      record.destination_text ??
      record.dropoffAddress ??
      record.dropoff_address,
    '',
  )

  return {
    id: asString(record.id, `order-${Date.now()}`),
    requestId: asString(record.requestId ?? record.request_id),
    status: normalizeRideOrderStatus(record.status),
    serviceType: asString(record.serviceType ?? record.service_type, 'ride'),
    rideType: asTripType(record.rideType ?? record.ride_type ?? record.type),
    from,
    to,
    date: getFallbackDay(record.date ?? record.createdAt ?? record.created_at),
    price: asNumber(record.price ?? record.agreedPrice ?? record.agreed_price, 0),
    originText: asString(record.originText ?? record.origin_text ?? from, from),
    destinationText: asString(record.destinationText ?? record.destination_text ?? to, to),
    pickupAddress: asString(record.pickupAddress ?? record.pickup_address),
    dropoffAddress: asString(record.dropoffAddress ?? record.dropoff_address),
    agreedPrice: asNumber(record.agreedPrice ?? record.agreed_price ?? record.price, 0),
    driverName: asString(record.driverName ?? record.driver_name ?? driver.name ?? driver.fullName ?? driver.full_name, 'Водитель'),
    driverPhone: asString(record.driverPhone ?? record.driver_phone ?? driver.phone ?? driver.mobile, ''),
    driverRating: asNumber(record.driverRating ?? record.driver_rating ?? driver.rating, 5),
    carModel: asString(record.carModel ?? record.car_model ?? driver.carModel ?? driver.car_model, ''),
    carColor: asString(record.carColor ?? record.car_color ?? driver.carColor ?? driver.car_color, ''),
    plate: asString(record.plate ?? record.carPlate ?? record.car_plate ?? driver.plate, ''),
    createdAt: getFallbackDate(record.createdAt ?? record.created_at),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    raw,
  }
}

export function mapRideOrderEventToViewModel(raw: unknown): RideOrderEvent {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asString(record.id, `event-${Date.now()}`),
    orderId: asString(record.orderId ?? record.order_id),
    status: asString(record.status, ''),
    message: asString(record.message ?? record.title ?? record.name, asString(record.status, 'Событие')),
    createdAt: getFallbackDate(record.createdAt ?? record.created_at),
    raw,
  }
}

function normalizeResponse<T>(value: unknown, mapper: (item: unknown) => T): { items: T[]; raw: unknown } {
  const items = extractList(value).map(mapper)
  return { items, raw: value }
}

export async function createRideRequest(payload: CreateRideRequestPayload) {
  return mapRideRequestToViewModel(
    await backendPost('/ride/requests', {
      ...payload,
      rideType: toBackendRideType(payload.rideType),
    }),
  )
}

export async function getPassengerRequests(params?: Record<string, string | number | boolean | undefined>) {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined) return acc
          acc[key] = String(value)
          return acc
        }, {}),
      ).toString()}`
    : ''

  return normalizeResponse<RideRequest>(await backendGet(`/ride/passenger/requests${query}`), mapRideRequestToViewModel)
}

export async function getRideRequest(id: string | number) {
  const normalizedId = requireNumericRideRequestId('getRideRequest', id)
  if (!normalizedId) {
    throw new Error('Ride request id must be numeric.')
  }

  return mapRideRequestToViewModel(await backendGet(`/ride/requests/${normalizedId}`))
}

export async function cancelRideRequest(id: string | number) {
  const normalizedId = requireNumericRideRequestId('cancelRideRequest', id)
  if (!normalizedId) {
    throw new Error('Ride request id must be numeric.')
  }

  return mapRideRequestToViewModel(await backendPost(`/ride/requests/${normalizedId}/cancel`))
}

export async function getRideRequestOffers(requestId: number | string): Promise<RideOfferListResponse> {
  const normalizedId = requireNumericRideRequestId('getRideRequestOffers', requestId)
  if (!normalizedId) {
    return { items: [], raw: null }
  }

  const response = await backendGet(`/ride/requests/${normalizedId}/offers`)
  const list = isBackendEnvelope(response) && Array.isArray(response.items)
    ? response.items
    : response
  return normalizeResponse<RideOffer>(list, mapRideOfferToViewModel)
}

export async function rejectRideOffer(offerId: number | string) {
  return backendPost(`/ride/offers/${String(offerId)}/reject`)
}

function extractAcceptedRideOrder(response: AcceptRideOfferResponse | unknown) {
  if (isRecord(response)) {
    if (response.order) return mapRideOrderToViewModel(response.order)
    if (response.rideOrder) return mapRideOrderToViewModel(response.rideOrder)
    if (response.request && !response.order) return mapRideOrderToViewModel(response.request)
    if (response.rideRequest) return mapRideOrderToViewModel(response.rideRequest)
  }

  return mapRideOrderToViewModel(response)
}

export async function acceptRideOffer(offerId: number | string) {
  const response = await backendPost<AcceptRideOfferResponse>(`/ride/offers/${String(offerId)}/accept`)
  return extractAcceptedRideOrder(response)
}

export async function getPassengerOrders(
  params?: Record<string, string | number | boolean | undefined>,
): Promise<PassengerRideOrdersResponse> {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined) return acc
          acc[key] = String(value)
          return acc
        }, {}),
      ).toString()}`
    : ''

  return normalizeResponse<RideOrder>(
    await backendGet(`/ride/passenger/orders${query}`),
    mapRideOrderToViewModel,
  ) as PassengerRideOrdersResponse
}

export async function getRideOrder(orderId: number | string) {
  return mapRideOrderToViewModel(await backendGet(`/ride/orders/${String(orderId)}`))
}

export async function getRideOrderEvents(orderId: number | string): Promise<RideOrderEventsResponse> {
  return normalizeResponse<RideOrderEvent>(
    await backendGet(`/ride/orders/${String(orderId)}/events`),
    mapRideOrderEventToViewModel,
  )
}

export function mapRideOrderToActiveRideViewModel(order: RideOrder): ActiveRide {
  return {
    id: order.id,
    requestId: order.requestId ?? order.id,
    status: normalizeRideOrderStatus(order.status),
    driverName: order.driverName,
    driverPhone: order.driverPhone,
    driverRating: order.driverRating,
    carModel: order.carModel,
    carColor: order.carColor,
    plate: order.plate,
    from: order.originText,
    to: order.destinationText,
    price: order.agreedPrice,
  }
}

export const mapOrderToActiveRide = mapRideOrderToActiveRideViewModel
