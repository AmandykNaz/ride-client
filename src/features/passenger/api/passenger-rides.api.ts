import { backendGet, backendPatch, backendPost } from '../../../shared/api/backend'
import type {
  ActiveRide,
  RideOrderStatus,
  RideRequestStatus,
} from '../../../types/domain'
import type {
  CancelRideRequestPayload,
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

function normalizeRideRequestTimingMode(value: unknown) {
  const normalized = asString(value, 'NOW').toUpperCase()

  if (normalized === 'SCHEDULED') return 'SCHEDULED' as const
  return 'NOW' as const
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

function readOptionalNumericId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed)
    }
  }

  return undefined
}

function buildLocationText(cityName: string, address?: string | null) {
  const trimmedCity = cityName.trim()
  const trimmedAddress = address?.trim() || ''

  if (!trimmedCity) return ''
  if (!trimmedAddress) return trimmedCity

  return `${trimmedCity}, ${trimmedAddress}`
}

export function mapRideRequestToViewModel(raw: unknown): RideRequest {
  const record = getRideRequestSource(raw)
  const createdAt = getFallbackDate(record.createdAt ?? record.created_at)
  const backendId = resolveRideRequestBackendId(isRecord(raw) ? raw : record)
  const localId = backendId ? undefined : `request-${Date.now()}`
  const timingMode = normalizeRideRequestTimingMode(record.timingMode ?? record.timing_mode)
  const scheduledAt = asString(record.scheduledAt ?? record.scheduled_at)
  const scheduledDate = asString(record.scheduledDate ?? record.scheduled_date)
  const scheduledTime = asString(record.scheduledTime ?? record.scheduled_time)
  const originCityName = asString(
    record.originCityName ?? record.origin_city_name ?? record.cityName ?? record.city_name,
  )
  const destinationCityName = asString(
    record.destinationCityName ?? record.destination_city_name ?? record.toCityName ?? record.to_city_name,
  )
  const originAddress = asString(
    record.originAddress ?? record.origin_address,
  )
  const destinationAddress = asString(
    record.destinationAddress ?? record.destination_address,
  )
  const from = asString(
    record.from ?? record.originText ?? record.origin_text ?? record.pickupAddress ?? record.pickup_address,
    buildLocationText(originCityName, originAddress) || '',
  )
  const to = asString(
    record.to ??
      record.destinationText ??
      record.destination_text ??
      record.dropoffAddress ??
      record.dropoff_address,
    buildLocationText(destinationCityName, destinationAddress) || '',
  )

  return {
    id: backendId ?? localId ?? `request-${Date.now()}`,
    backendId,
    localId,
    status: normalizeRideRequestStatus(record.status),
    serviceType: asString(record.serviceType ?? record.service_type, 'INTERCITY_RIDE'),
    rideType: asTripType(record.rideType ?? record.ride_type ?? record.type),
    timingMode,
    scheduledAt: scheduledAt || undefined,
    scheduledDate: scheduledDate || undefined,
    scheduledTime: scheduledTime || undefined,
    time: asString(
      record.time ?? scheduledTime ?? record.requestTime ?? record.request_time,
      createdAt.slice(11, 16) || '08:00',
    ),
    type: asTripType(record.type ?? record.rideType ?? record.ride_type) || 'shared',
    passengersCount: asNumber(record.passengersCount ?? record.passengers_count, 1),
    from,
    to,
    originCityId: readOptionalNumericId(record.originCityId ?? record.origin_city_id),
    originCityName,
    originRegionName: asString(record.originRegionName ?? record.origin_region_name) || undefined,
    originAddress: originAddress || undefined,
    destinationCityId: readOptionalNumericId(record.destinationCityId ?? record.destination_city_id),
    destinationCityName,
    destinationRegionName: asString(record.destinationRegionName ?? record.destination_region_name) || undefined,
    destinationAddress: destinationAddress || undefined,
    date: getFallbackDay(record.date ?? scheduledDate ?? record.createdAt ?? record.created_at),
    price: readRequestedPrice(record),
    originText: asString(
      record.originText ??
        record.origin_text ??
        buildLocationText(originCityName, originAddress) ??
        from,
      from,
    ),
    destinationText: asString(
      record.destinationText ??
        record.destination_text ??
        buildLocationText(destinationCityName, destinationAddress) ??
        to,
      to,
    ),
    pickupAddress: asString(record.pickupAddress ?? record.pickup_address),
    dropoffAddress: asString(record.dropoffAddress ?? record.dropoff_address),
    comment: asString(record.comment),
    createdAt,
    priceUpdatedAt: asString(record.priceUpdatedAt ?? record.price_updated_at) || undefined,
    searchRemainingSeconds:
      typeof record.searchRemainingSeconds === 'number' && Number.isFinite(record.searchRemainingSeconds)
        ? Math.max(0, Math.trunc(record.searchRemainingSeconds))
        : typeof record.search_remaining_seconds === 'number' && Number.isFinite(record.search_remaining_seconds)
          ? Math.max(0, Math.trunc(record.search_remaining_seconds))
          : undefined,
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
  const driverVehicle = isRecord(driver.vehicle) ? driver.vehicle : {}
  const vehicleSource = vehicle.id ? vehicle : driverVehicle
  const driverName = asString(
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
  )

  return {
    id: asString(record.id, `offer-${Date.now()}`),
    requestId: asString(record.requestId ?? record.request_id),
    driverId: asString(record.driverId ?? record.driver_id ?? record.driverProfileId ?? record.driver_profile_id ?? driver.id),
    status: asString(record.status, 'pending'),
    currency: asString(record.currency ?? record.requestCurrency ?? record.request_currency),
    driverName,
    rating: asNumber(
      record.rating ??
        record.driverRating ??
        record.driver_rating ??
        driver.rating ??
        driver.ratingAvg ??
        vehicleSource.rating,
      5,
    ),
    tripsCount: asNumber(
      record.tripsCount ?? record.trips_count ?? driver.tripsCount ?? driver.trips_count ?? driver.completedOrdersCount,
      0,
    ),
    carModel: asString(
      record.carModel ??
        record.car_model ??
        vehicleSource.model ??
        vehicleSource.carModel ??
        driver.carModel ??
        driver.car_model,
      '',
    ),
    carColor: asString(
      record.carColor ?? record.car_color ?? vehicleSource.color ?? driver.carColor ?? driver.car_color,
      '',
    ),
    plate: asString(
      record.plate ??
        record.carPlate ??
        record.car_plate ??
        vehicleSource.plate ??
        vehicleSource.plateNumber ??
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

export async function getPassengerRideRequestOffers(requestId: number | string): Promise<RideOfferListResponse> {
  const normalizedId = requireNumericRideRequestId('getPassengerRideRequestOffers', requestId)
  if (!normalizedId) {
    return { items: [], raw: null }
  }

  try {
    const response = await backendGet(`/ride/passenger/requests/${normalizedId}/offers`)
    const list = isBackendEnvelope(response) && Array.isArray(response.items) ? response.items : response
    return normalizeResponse<RideOffer>(list, mapRideOfferToViewModel)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot GET')) {
      throw new Error('Не удалось загрузить предложения. Попробуйте еще раз.', { cause: error })
    }

    throw error
  }
}

export function mapRideOrderToViewModel(raw: unknown): RideOrder {
  const record = isRecord(raw) ? raw : {}
  const driver = isRecord(record.driver) ? record.driver : {}
  const originCityName = asString(
    record.originCityName ?? record.origin_city_name ?? record.cityName ?? record.city_name,
  )
  const destinationCityName = asString(
    record.destinationCityName ?? record.destination_city_name ?? record.toCityName ?? record.to_city_name,
  )
  const originAddress = asString(record.originAddress ?? record.origin_address)
  const destinationAddress = asString(record.destinationAddress ?? record.destination_address)
  const from = asString(
    record.from ?? record.originText ?? record.origin_text ?? record.pickupAddress ?? record.pickup_address,
    buildLocationText(originCityName, originAddress) || '',
  )
  const to = asString(
    record.to ??
      record.destinationText ??
      record.destination_text ??
      record.dropoffAddress ??
      record.dropoff_address,
    buildLocationText(destinationCityName, destinationAddress) || '',
  )

  return {
    id: asString(record.id, `order-${Date.now()}`),
    requestId: asString(record.requestId ?? record.request_id),
    status: normalizeRideOrderStatus(record.status),
    serviceType: asString(record.serviceType ?? record.service_type, 'ride'),
    rideType: asTripType(record.rideType ?? record.ride_type ?? record.type),
    from,
    to,
    originCityId: readOptionalNumericId(record.originCityId ?? record.origin_city_id),
    originCityName,
    originRegionName: asString(record.originRegionName ?? record.origin_region_name) || undefined,
    originAddress: originAddress || undefined,
    destinationCityId: readOptionalNumericId(record.destinationCityId ?? record.destination_city_id),
    destinationCityName,
    destinationRegionName: asString(record.destinationRegionName ?? record.destination_region_name) || undefined,
    destinationAddress: destinationAddress || undefined,
    date: getFallbackDay(record.date ?? record.createdAt ?? record.created_at),
    price: asNumber(record.price ?? record.agreedPrice ?? record.agreed_price, 0),
    originText: asString(
      record.originText ?? record.origin_text ?? buildLocationText(originCityName, originAddress) ?? from,
      from,
    ),
    destinationText: asString(
      record.destinationText ??
        record.destination_text ??
        buildLocationText(destinationCityName, destinationAddress) ??
        to,
      to,
    ),
    pickupAddress: asString(record.pickupAddress ?? record.pickup_address),
    dropoffAddress: asString(record.dropoffAddress ?? record.dropoff_address),
    agreedPrice: asNumber(record.agreedPrice ?? record.agreed_price ?? record.price, 0),
    contactUnlocked: Boolean(record.contactUnlocked ?? record.contact_unlocked),
    canCallDriver: Boolean(record.canCallDriver ?? record.can_call_driver ?? record.contactUnlocked ?? record.contact_unlocked),
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
    await backendPost('/ride/passenger/requests', {
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

  return mapRideRequestToViewModel(await backendGet(`/ride/passenger/requests/${normalizedId}`))
}

export async function cancelPassengerRideRequest(
  id: string | number,
  payload?: CancelRideRequestPayload,
) {
  const normalizedId = requireNumericRideRequestId('cancelRideRequest', id)
  if (!normalizedId) {
    throw new Error('Ride request id must be numeric.')
  }

  try {
    return mapRideRequestToViewModel(
      await backendPost(`/ride/passenger/requests/${normalizedId}/cancel`, payload ?? {}),
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot POST')) {
      throw new Error('Не удалось отменить заявку. Попробуйте ещё раз.', { cause: error })
    }

    throw error
  }
}

export async function cancelRideRequest(id: string | number, payload?: CancelRideRequestPayload) {
  return cancelPassengerRideRequest(id, payload)
}

export async function getRideRequestOffers(requestId: number | string): Promise<RideOfferListResponse> {
  return getPassengerRideRequestOffers(requestId)
}

export async function extendPassengerRideRequest(requestId: number | string) {
  const normalizedId = requireNumericRideRequestId('extendPassengerRideRequest', requestId)
  if (!normalizedId) {
    throw new Error('Ride request id must be numeric.')
  }

  return mapRideRequestToViewModel(
    await backendPost(`/ride/passenger/requests/${normalizedId}/extend`),
  )
}

export async function updatePassengerRideRequestPrice(
  requestId: number | string,
  requestedPrice: number,
) {
  const normalizedId = requireNumericRideRequestId('updatePassengerRideRequestPrice', requestId)
  if (!normalizedId) {
    throw new Error('Ride request id must be numeric.')
  }

  return mapRideRequestToViewModel(
    await backendPatch(`/ride/passenger/requests/${normalizedId}/price`, {
      requestedPrice,
    }),
  )
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
    contactUnlocked: order.contactUnlocked,
    canCallDriver: order.canCallDriver,
    canCallPassenger: order.contactUnlocked ?? order.canCallDriver,
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
