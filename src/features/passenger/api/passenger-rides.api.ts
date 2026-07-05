import { backendGet, backendPatch, backendPost } from '../../../shared/api/backend'
import type {
  ActiveRide,
  DriverCallOutcome,
  RideOrderStatus,
  RideRequestStatus,
} from '../../../types/domain'
import type {
  CancelRideRequestPayload,
  AcceptRideOfferResponse,
  AcceptRideOfferResult,
  CloseRideRequestExternallyPayload,
  CloseRideRequestExternallyResult,
  CreateRideRequestPayload,
  RideOffer,
  RideOfferListResponse,
  RideOrder,
  RideOrderEvent,
  RidePassengerRequestContactUnlock,
  RidePassengerRequestContactUnlocksResponse,
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

function normalizeOfferStatus(value: unknown): 'pending' | 'accepted' | 'rejected' | string {
  const normalized = asString(value, 'pending').trim().toLowerCase()

  if (normalized === 'pending' || normalized === 'accepted' || normalized === 'rejected') {
    return normalized
  }

  return normalized || 'pending'
}

function normalizeDriverCallOutcome(value: unknown): DriverCallOutcome | undefined {
  const normalized = asString(value).trim().toUpperCase()

  if (normalized === 'AGREED_OFFLINE') return 'AGREED_OFFLINE'
  if (normalized === 'NO_ANSWER') return 'NO_ANSWER'
  if (normalized === 'DECLINED') return 'DECLINED'
  if (normalized === 'OTHER') return 'OTHER'

  return undefined
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
    normalized === 'CLOSED_EXTERNALLY' ||
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

function asIdString(value: unknown, fallback = '') {
  const numericId = readNumericId(value)
  if (numericId) return numericId

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return fallback
}

function readNumericOrderId(value: unknown) {
  return readNumericId(value)
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

function getRideOrderEnvelope(raw: unknown) {
  const envelope = isRecord(raw) ? raw : {}
  const order =
    (isRecord(envelope.order) && envelope.order) ||
    (isRecord(envelope.rideOrder) && envelope.rideOrder) ||
    envelope
  const request =
    (isRecord(envelope.request) && envelope.request) ||
    (isRecord(envelope.rideRequest) && envelope.rideRequest) ||
    (isRecord(order.request) && order.request) ||
    {}
  const offer =
    (isRecord(envelope.offer) && envelope.offer) ||
    (isRecord(envelope.rideOffer) && envelope.rideOffer) ||
    (isRecord(order.offer) && order.offer) ||
    {}
  const driverContainer =
    (isRecord(envelope.driver) && envelope.driver) ||
    (isRecord(order.driver) && order.driver) ||
    {}
  const driver =
    (isRecord(driverContainer.driverProfile) && driverContainer.driverProfile) ||
    (isRecord(order.driverProfile) && order.driverProfile) ||
    driverContainer
  const driverCustomer =
    (isRecord(driverContainer.customer) && driverContainer.customer) ||
    (isRecord(driver.customer) && driver.customer) ||
    {}
  const vehicle =
    (isRecord(envelope.vehicle) && envelope.vehicle) ||
    (isRecord(order.vehicle) && order.vehicle) ||
    (isRecord(driver.vehicle) && driver.vehicle) ||
    {}

  return { envelope, order, request, offer, driver, driverCustomer, vehicle }
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
  const cancelledAt = asString(record.cancelledAt ?? record.cancelled_at)
  const cancelledBy = asString(record.cancelledBy ?? record.cancelled_by)
  const cancelReasonCode = asString(record.cancelReasonCode ?? record.cancel_reason_code)
  const cancelReasonText = asString(record.cancelReasonText ?? record.cancel_reason_text)
  const cancelReasonLabel = asString(record.cancelReasonLabel ?? record.cancel_reason_label)
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
  const closedExternallySource = isRecord(record.closedExternally ?? record.closed_externally)
    ? ((record.closedExternally ?? record.closed_externally) as BackendRecord)
    : null
  const closedExternally =
    closedExternallySource ||
    asString(record.closedExternallyAt ?? record.closed_externally_at) ||
    asString(record.closedExternallyNote ?? record.closed_externally_note) ||
    asString(record.closedExternallyDriverName ?? record.closed_externally_driver_name)
      ? {
          at: asString(closedExternallySource?.at ?? record.closedExternallyAt ?? record.closed_externally_at) || undefined,
          note: asString(closedExternallySource?.note ?? record.closedExternallyNote ?? record.closed_externally_note) || undefined,
          contactUnlockId:
            asIdString(
              closedExternallySource?.contactUnlockId ??
                record.closedExternallyContactUnlockId ??
                record.closed_externally_contact_unlock_id,
            ) || undefined,
          driverProfileId:
            asIdString(
              closedExternallySource?.driverProfileId ??
                record.closedExternallyDriverProfileId ??
                record.closed_externally_driver_profile_id,
            ) || undefined,
          driverName:
            asString(
              closedExternallySource?.driverName ??
                record.closedExternallyDriverName ??
                record.closed_externally_driver_name,
            ) || undefined,
          driverPhone:
            asString(
              closedExternallySource?.driverPhone ??
                record.closedExternallyDriverPhone ??
                record.closed_externally_driver_phone,
            ) || undefined,
          driverAvatarUrl:
            asString(
              closedExternallySource?.driverAvatarUrl ??
                closedExternallySource?.driver_avatar_url ??
                record.closedExternallyDriverAvatarUrl ??
                record.closed_externally_driver_avatar_url,
            ) || undefined,
          vehicleName:
            asString(
              closedExternallySource?.vehicleName ??
                record.closedExternallyVehicleName ??
                record.closed_externally_vehicle_name,
            ) || undefined,
          vehiclePlateNumber:
            asString(
              closedExternallySource?.vehiclePlateNumber ??
                record.closedExternallyVehiclePlateNumber ??
                record.closed_externally_vehicle_plate_number,
            ) || undefined,
          vehicleColorName:
            asString(
              closedExternallySource?.vehicleColorName ??
                closedExternallySource?.vehicle_color_name ??
                record.closedExternallyVehicleColorName ??
                record.closed_externally_vehicle_color_name,
            ) || undefined,
        }
      : undefined

  return {
    id: backendId ?? localId ?? `request-${Date.now()}`,
    backendId,
    localId,
    status: normalizeRideRequestStatus(record.status),
    closedExternally,
    serviceType: asString(record.serviceType ?? record.service_type, 'INTERCITY_RIDE'),
    rideType: asTripType(record.rideType ?? record.ride_type ?? record.type),
    timingMode,
    scheduledAt: timingMode === 'NOW' ? undefined : scheduledAt || undefined,
    scheduledDate: timingMode === 'NOW' ? undefined : scheduledDate || undefined,
    scheduledTime: timingMode === 'NOW' ? undefined : scheduledTime || undefined,
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
    cancelledAt: cancelledAt || undefined,
    cancelledBy: cancelledBy || undefined,
    cancelReasonCode: cancelReasonCode || undefined,
    cancelReasonText: cancelReasonText || undefined,
    cancelReasonLabel: cancelReasonLabel || undefined,
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
  const driverCustomer = isRecord(driver.customer) ? driver.customer : {}
  const backendId = readNumericId(record.id)
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
    id: backendId ?? asIdString(record.id, `offer-${Date.now()}`),
    backendId,
    requestId: asIdString(record.requestId ?? record.request_id),
    driverId: asIdString(record.driverId ?? record.driver_id ?? record.driverProfileId ?? record.driver_profile_id ?? driver.id),
    status: normalizeOfferStatus(record.status),
    currency: asString(record.currency ?? record.requestCurrency ?? record.request_currency),
    driverName,
    driverAvatarUrl: asString(
      record.driverAvatarUrl ??
        record.driver_avatar_url ??
        driver.driverAvatarUrl ??
        driver.driver_avatar_url ??
        driver.avatarUrl ??
        driver.avatar_url ??
        driverCustomer.avatarUrl ??
        driverCustomer.avatar_url,
    ) || undefined,
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
        vehicleSource.vehicleName ??
        vehicleSource.model ??
        vehicleSource.carModel ??
        driver.carModel ??
        driver.car_model,
      '',
    ),
    carColor: asString(
      record.carColor ??
        record.car_color ??
        vehicleSource.colorName ??
        vehicleSource.color_name ??
        vehicleSource.color ??
        driver.carColor ??
        driver.car_color,
      '',
    ),
    colorName: asString(
      record.colorName ??
        record.color_name ??
        vehicleSource.colorName ??
        vehicleSource.color_name ??
        vehicleSource.color ??
        driver.carColor ??
        driver.car_color,
    ) || undefined,
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

function mapPassengerRequestContactUnlock(raw: unknown): RidePassengerRequestContactUnlock {
  const record = isRecord(raw) ? raw : {}

  return {
    contactUnlockId: asIdString(record.contactUnlockId ?? record.contact_unlock_id, `contact-unlock-${Date.now()}`),
    driverProfileId: asIdString(record.driverProfileId ?? record.driver_profile_id) || undefined,
    driverName: asString(record.driverName ?? record.driver_name, 'Водитель'),
    driverPhone: asString(record.driverPhone ?? record.driver_phone),
    driverAvatarUrl: asString(record.driverAvatarUrl ?? record.driver_avatar_url) || undefined,
    vehicleName: asString(record.vehicleName ?? record.vehicle_name) || undefined,
    vehiclePlateNumber: asString(record.vehiclePlateNumber ?? record.vehicle_plate_number) || undefined,
    vehicleColorName: asString(record.vehicleColorName ?? record.vehicle_color_name) || undefined,
    openedAt: asString(record.openedAt ?? record.opened_at),
    callOutcome: normalizeDriverCallOutcome(record.callOutcome ?? record.call_outcome),
    callOutcomeAt: asString(record.callOutcomeAt ?? record.call_outcome_at) || undefined,
    callOutcomeNote: asString(record.callOutcomeNote ?? record.call_outcome_note) || null,
    raw,
  }
}

export async function getPassengerRequestContactUnlocks(
  requestId: number | string,
): Promise<RidePassengerRequestContactUnlocksResponse> {
  const normalizedId = requireNumericRideRequestId('getPassengerRequestContactUnlocks', requestId)
  if (!normalizedId) {
    return { requestId: '', items: [], raw: null }
  }

  const raw = await backendGet(`/ride/passenger/requests/${normalizedId}/contact-unlocks`)
  const record = isRecord(raw) ? raw : {}

  return {
    requestId: asIdString(record.requestId ?? record.request_id ?? normalizedId, normalizedId),
    items: extractList(raw).map(mapPassengerRequestContactUnlock),
    raw,
  }
}

function mapCloseRideRequestExternallyResult(raw: unknown): CloseRideRequestExternallyResult {
  const record = isRecord(raw)
    ? (isRecord(raw.data) ? raw.data : raw)
    : {}

  return {
    requestId: asIdString(record.requestId ?? record.request_id ?? record.id),
    status: normalizeRideRequestStatus(record.status ?? 'CLOSED_EXTERNALLY'),
    closedExternallyAt: asString(record.closedExternallyAt ?? record.closed_externally_at) || undefined,
    contactUnlockId: asIdString(record.contactUnlockId ?? record.contact_unlock_id) || undefined,
    driverProfileId: asIdString(record.driverProfileId ?? record.driver_profile_id) || undefined,
    driverName: asString(record.driverName ?? record.driver_name) || undefined,
    driverPhone: asString(record.driverPhone ?? record.driver_phone) || undefined,
    driverAvatarUrl: asString(record.driverAvatarUrl ?? record.driver_avatar_url) || undefined,
    vehicleName: asString(record.vehicleName ?? record.vehicle_name) || undefined,
    vehiclePlateNumber: asString(record.vehiclePlateNumber ?? record.vehicle_plate_number) || undefined,
    vehicleColorName: asString(record.vehicleColorName ?? record.vehicle_color_name) || undefined,
    note: asString(record.note) || undefined,
    raw,
  }
}

export function mapRideOrderToViewModel(raw: unknown): RideOrder {
  const { order: record, request, offer, driver, driverCustomer, vehicle } = getRideOrderEnvelope(raw)
  const originCityName = asString(
    record.originCityName ?? record.origin_city_name ?? request.originCityName ?? request.origin_city_name ?? record.cityName ?? record.city_name,
  )
  const destinationCityName = asString(
    record.destinationCityName ?? record.destination_city_name ?? request.destinationCityName ?? request.destination_city_name ?? record.toCityName ?? record.to_city_name,
  )
  const originAddress = asString(record.originAddress ?? record.origin_address ?? request.originAddress ?? request.origin_address)
  const destinationAddress = asString(record.destinationAddress ?? record.destination_address ?? request.destinationAddress ?? request.destination_address)
  const from = asString(
    record.from ??
      record.originText ??
      record.origin_text ??
      request.originText ??
      request.origin_text ??
      record.pickupAddress ??
      record.pickup_address,
    buildLocationText(originCityName, originAddress) || '',
  )
  const to = asString(
    record.to ??
      record.destinationText ??
      record.destination_text ??
      request.destinationText ??
      request.destination_text ??
      record.dropoffAddress ??
      record.dropoff_address,
    buildLocationText(destinationCityName, destinationAddress) || '',
  )
  const orderId = asIdString(record.id)
  const requestId = asIdString(record.requestId ?? record.request_id ?? request.id)
  const offerId = asIdString(record.offerId ?? record.offer_id ?? offer.id)
  const agreedPrice = asNumber(
    record.finalPrice ??
      record.final_price ??
      record.agreedPrice ??
      record.agreed_price ??
      record.price ??
      offer.offeredPrice ??
      offer.offered_price ??
      offer.price ??
      offer.amount ??
      request.requestedPrice ??
      request.requested_price,
    0,
  )
  const driverName = asString(
    record.driverName ??
      record.driver_name ??
      driver.fullName ??
      driver.full_name ??
      driver.name ??
      driverCustomer.fullName ??
      driverCustomer.full_name ??
      driverCustomer.name,
    'Водитель',
  )
  const driverPhone = asString(
    record.driverPhone ??
      record.driver_phone ??
      driver.phone ??
      driver.mobile ??
      driverCustomer.phone,
  )
  const driverAvatarUrl = asString(
    record.driverAvatarUrl ??
      record.driver_avatar_url ??
      driver.avatarUrl ??
      driver.avatar_url ??
      driver.photoUrl ??
      driver.photo_url ??
      driverCustomer.avatarUrl ??
      driverCustomer.avatar_url,
  )
  const carModel = asString(
    record.carModel ??
      record.car_model ??
      vehicle.vehicleName ??
      vehicle.model ??
      driver.carModel ??
      driver.car_model,
  )
  const carColor = asString(
    record.carColor ??
      record.car_color ??
      vehicle.colorName ??
      vehicle.color_name ??
      vehicle.color ??
      driver.carColor ??
      driver.car_color,
  )
  const plate = asString(
    record.plate ??
      record.carPlate ??
      record.car_plate ??
      vehicle.plate ??
      vehicle.plateNumber ??
      driver.plate,
  )

  return {
    id: orderId,
    offerId: offerId || undefined,
    requestId: requestId || undefined,
    status: normalizeRideOrderStatus(record.status),
    serviceType: asString(record.serviceType ?? record.service_type ?? request.serviceType ?? request.service_type, 'ride'),
    currency: asString(record.currency ?? request.currency, 'KZT'),
    rideType: asTripType(record.rideType ?? record.ride_type ?? request.rideType ?? request.ride_type ?? record.type),
    from,
    to,
    originCityId: readOptionalNumericId(record.originCityId ?? record.origin_city_id ?? request.originCityId ?? request.origin_city_id),
    originCityName,
    originRegionName: asString(record.originRegionName ?? record.origin_region_name) || undefined,
    originAddress: originAddress || undefined,
    destinationCityId: readOptionalNumericId(record.destinationCityId ?? record.destination_city_id ?? request.destinationCityId ?? request.destination_city_id),
    destinationCityName,
    destinationRegionName: asString(record.destinationRegionName ?? record.destination_region_name) || undefined,
    destinationAddress: destinationAddress || undefined,
    date: getFallbackDay(record.date ?? request.date ?? request.createdAt ?? record.createdAt ?? record.created_at),
    price: agreedPrice,
    originText: asString(
      record.originText ?? record.origin_text ?? request.originText ?? request.origin_text ?? buildLocationText(originCityName, originAddress) ?? from,
      from,
    ),
    destinationText: asString(
      record.destinationText ??
        record.destination_text ??
        request.destinationText ??
        request.destination_text ??
        buildLocationText(destinationCityName, destinationAddress) ??
        to,
      to,
    ),
    pickupAddress: asString(record.pickupAddress ?? record.pickup_address ?? request.pickupAddress ?? request.pickup_address),
    dropoffAddress: asString(record.dropoffAddress ?? record.dropoff_address ?? request.dropoffAddress ?? request.dropoff_address),
    agreedPrice,
    contactUnlocked: Boolean(record.contactUnlocked ?? record.contact_unlocked),
    canCallDriver: Boolean(record.canCallDriver ?? record.can_call_driver ?? record.contactUnlocked ?? record.contact_unlocked),
    driverName,
    driverPhone,
    driverAvatarUrl: driverAvatarUrl || undefined,
    driverRating: asNumber(record.driverRating ?? record.driver_rating ?? driver.rating ?? driver.ratingAvg, 5),
    carModel,
    carColor,
    plate,
    createdAt: getFallbackDate(record.createdAt ?? record.created_at),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    raw,
  }
}

export function mapRideOrderEventToViewModel(raw: unknown): RideOrderEvent {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asIdString(record.id, `event-${Date.now()}`),
    orderId: asIdString(record.orderId ?? record.order_id),
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

function requireNumericRideOrderId(context: string, value: string | number) {
  const normalized = readNumericOrderId(value)
  if (!normalized) {
    console.warn(`[ride] ${context}: numeric order id is required`, value)
    return null
  }

  return normalized
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

  return mapRideRequestToViewModel(await backendGet(`/ride/requests/${normalizedId}`))
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

export async function cancelPassengerRideOrder(
  orderId: string | number,
  payload?: CancelRideRequestPayload,
) {
  const normalizedId = requireNumericRideOrderId('cancelPassengerRideOrder', orderId)
  if (!normalizedId) {
    throw new Error('Ride order id must be numeric.')
  }

  try {
    return mapRideOrderToViewModel(
      await backendPost(`/ride/orders/${normalizedId}/cancel`, payload ?? {}),
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot POST')) {
      throw new Error('Не удалось отменить поездку. Попробуйте ещё раз.', { cause: error })
    }

    throw error
  }
}

export async function closeRideRequestExternally(
  requestId: string | number,
  payload: CloseRideRequestExternallyPayload,
) {
  const normalizedId = requireNumericRideRequestId('closeRideRequestExternally', requestId)
  if (!normalizedId) {
    throw new Error('Ride request id must be numeric.')
  }

  return mapCloseRideRequestExternallyResult(
    await backendPost(`/ride/passenger/requests/${normalizedId}/close`, {
      contactUnlockId: String(payload.contactUnlockId ?? '').trim(),
      ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
    }),
  )
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
  const record = isRecord(response) ? response : {}
  const orderSource = record.order ?? record.rideOrder ?? response
  const requestSource = record.request ?? record.rideRequest
  const offerSource = record.offer ?? record.rideOffer

  return {
    order: mapRideOrderToViewModel(orderSource),
    request: requestSource ? mapRideRequestToViewModel(requestSource) : null,
    offer: offerSource ? mapRideOfferToViewModel(offerSource) : null,
    raw: response,
  } satisfies AcceptRideOfferResult
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
  const normalizedId = requireNumericRideOrderId('getRideOrder', orderId)
  if (!normalizedId) {
    throw new Error('Ride order id must be numeric.')
  }

  return mapRideOrderToViewModel(await backendGet(`/ride/orders/${normalizedId}`))
}

export async function getRideOrderEvents(orderId: number | string): Promise<RideOrderEventsResponse> {
  const normalizedId = requireNumericRideOrderId('getRideOrderEvents', orderId)
  if (!normalizedId) {
    throw new Error('Ride order id must be numeric.')
  }

  return normalizeResponse<RideOrderEvent>(
    await backendGet(`/ride/orders/${normalizedId}/events`),
    mapRideOrderEventToViewModel,
  )
}

export function mapRideOrderToActiveRideViewModel(order: RideOrder): ActiveRide {
  return {
    id: order.id,
    orderId: order.id,
    requestId: order.requestId ?? order.id,
    offerId: order.offerId,
    status: normalizeRideOrderStatus(order.status),
    contactUnlocked: order.contactUnlocked,
    canCallDriver: order.canCallDriver,
    canCallPassenger: order.contactUnlocked ?? order.canCallDriver,
    driverName: order.driverName,
    driverPhone: order.driverPhone,
    driverAvatarUrl: order.driverAvatarUrl,
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
