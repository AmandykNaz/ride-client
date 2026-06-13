import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  ActiveRide,
  RideRequestStatus,
} from '../../../types/domain'
import type {
  AcceptRideOfferResponse,
  CreateRideRequestPayload,
  RideOffer,
  RideOfferListResponse,
  RideOrder,
  RideOrderEvent,
  RideRequest,
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

function asTripType(value: unknown) {
  return value === 'shared' || value === 'full' ? value : undefined
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

export function mapRideRequestToViewModel(raw: unknown): RideRequest {
  const record = isRecord(raw) ? raw : {}
  const createdAt = getFallbackDate(record.createdAt ?? record.created_at)
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
    id: asString(record.id, `request-${Date.now()}`),
    status: (asString(record.status, 'SEARCHING') as RideRequestStatus) || 'SEARCHING',
    serviceType: asString(record.serviceType ?? record.service_type, 'ride'),
    rideType: asTripType(record.rideType ?? record.ride_type),
    time: asString(record.time ?? record.requestTime ?? record.request_time, createdAt.slice(11, 16) || '08:00'),
    type: asTripType(record.type ?? record.rideType ?? record.ride_type) || 'shared',
    passengersCount: asNumber(record.passengersCount ?? record.passengers_count, 1),
    from,
    to,
    date: getFallbackDay(record.date ?? record.createdAt ?? record.created_at),
    price: asNumber(record.agreedPrice ?? record.agreed_price ?? record.offeredPrice ?? record.offered_price ?? record.price, 0),
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
    status: asString(record.status, 'DRIVER_COMING'),
    serviceType: asString(record.serviceType ?? record.service_type, 'ride'),
    rideType: asTripType(record.rideType ?? record.ride_type),
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
    await backendPost('/ride/requests', payload),
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

export async function getRideRequest(id: string) {
  return mapRideRequestToViewModel(await backendGet(`/ride/requests/${id}`))
}

export async function cancelRideRequest(id: string) {
  return mapRideRequestToViewModel(await backendPost(`/ride/requests/${id}/cancel`))
}

export async function getRideRequestOffers(requestId: number | string): Promise<RideOfferListResponse> {
  const response = await backendGet(`/ride/requests/${String(requestId)}/offers`)
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

export async function getPassengerOrders(params?: Record<string, string | number | boolean | undefined>) {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined) return acc
          acc[key] = String(value)
          return acc
        }, {}),
      ).toString()}`
    : ''

  return normalizeResponse<RideOrder>(await backendGet(`/ride/passenger/orders${query}`), mapRideOrderToViewModel)
}

export async function getRideOrder(id: string) {
  return mapRideOrderToViewModel(await backendGet(`/ride/orders/${id}`))
}

export async function getRideOrderEvents(id: string) {
  return normalizeResponse<RideOrderEvent>(
    await backendGet(`/ride/orders/${id}/events`),
    mapRideOrderEventToViewModel,
  )
}

export function mapOrderToActiveRide(order: RideOrder): ActiveRide {
  return {
    id: order.id,
    requestId: order.requestId ?? order.id,
    status: order.status as ActiveRide['status'],
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
