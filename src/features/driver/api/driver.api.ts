import { backendGet, backendPatch, backendPost } from '../../../shared/api/backend'
import type {
  DriverActiveOrder,
  DriverApplicationDraft,
  DriverCounterOffer,
  DriverFeedOrder,
  DriverProfile,
  DriverVehicle,
  DriverVerificationStatus,
} from '../../../types/domain'
import type {
  DriverApplicationPayload,
  DriverCounterOfferPayload,
  RideDriverApplicationDocument,
  DriverMeViewModel,
  DriverOfferViewModel,
  DriverOrderStatusPayload,
  DriverOrderViewModel,
  DriverFeedViewModel,
  RideDriverApplication,
} from './driver.types'

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

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function asOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function firstRecord(...values: unknown[]) {
  return values.find(isRecord) as BackendRecord | undefined
}

function unwrapRecord(value: unknown, keys: string[]) {
  if (!isRecord(value)) return value

  for (const key of keys) {
    const nested = value[key]
    if (isRecord(nested)) return nested
  }

  return value
}

function normalizeDocumentType(value: unknown) {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, '_')

  if (normalized === 'driver_license_front' || normalized === 'license_front' || normalized === 'front_license') {
    return 'driverLicenseFront'
  }
  if (normalized === 'driver_license_back' || normalized === 'license_back' || normalized === 'back_license') {
    return 'driverLicenseBack'
  }
  if (normalized === 'vehicle_registration' || normalized === 'registration' || normalized === 'tech_passport') {
    return 'vehicleRegistration'
  }
  if (normalized === 'car_front_photo' || normalized === 'vehicle_front_photo' || normalized === 'front_photo') {
    return 'carFrontPhoto'
  }
  if (normalized === 'car_back_photo' || normalized === 'vehicle_back_photo' || normalized === 'back_photo') {
    return 'carBackPhoto'
  }
  if (normalized === 'interior_photo' || normalized === 'salon_photo') {
    return 'interiorPhoto'
  }
  if (normalized === 'trunk_photo' || normalized === 'boot_photo') {
    return 'trunkPhoto'
  }

  return undefined
}

function mapApplicationDocuments(raw: unknown): RideDriverApplicationDocument[] {
  const list =
    Array.isArray(raw)
      ? raw
      : isRecord(raw) && Array.isArray(raw.items)
        ? raw.items
        : isRecord(raw) && Array.isArray(raw.data)
          ? raw.data
          : []

  return list
    .map((item) => {
      const record = isRecord(item) ? item : {}
      const type = asString(record.type ?? record.documentType ?? record.document_type ?? record.key)
      const filePath = asString(record.filePath ?? record.file_path ?? record.path)
      const url = asString(record.url ?? record.link)
      const name = asString(record.name ?? record.title)
      const status = asString(record.status ?? record.uploadStatus ?? record.upload_status)

      return {
        type,
        filePath,
        url,
        name,
        status,
        raw: item,
      }
    })
    .filter((document) => document.type || document.filePath || document.url || document.name || document.status)
}

function mapDocumentFlags(raw: unknown): Record<string, boolean> {
  const flags: Record<string, boolean> = {
    driverLicenseFront: false,
    driverLicenseBack: false,
    vehicleRegistration: false,
    carFrontPhoto: false,
    carBackPhoto: false,
    interiorPhoto: false,
    trunkPhoto: false,
  }

  if (isRecord(raw)) {
    const list = Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.data)
        ? raw.data
        : undefined

    if (list) {
      for (const document of mapApplicationDocuments(list)) {
        const key = normalizeDocumentType(document.type ?? document.name)
        if (!key) continue
        flags[key] = Boolean(document.filePath || document.url || document.status)
      }

      return flags
    }

    for (const [key, value] of Object.entries(raw)) {
      if (typeof value !== 'boolean') continue
      if (key in flags) {
        flags[key] = value
      }
    }

    return flags
  }

  for (const document of mapApplicationDocuments(raw)) {
    const key = normalizeDocumentType(document.type ?? document.name)
    if (!key) continue
    flags[key] = Boolean(document.filePath || document.url || document.status)
  }

  return flags
}

function extractList(value: unknown) {
  if (Array.isArray(value)) return value

  if (isRecord(value)) {
    const list =
      (Array.isArray(value.items) && value.items) ||
      (Array.isArray(value.feed) && value.feed) ||
      (Array.isArray(value.orders) && value.orders) ||
      (Array.isArray(value.offers) && value.offers) ||
      (Array.isArray(value.requests) && value.requests) ||
      (Array.isArray(value.results) && value.results) ||
      (Array.isArray(value.data) && value.data) ||
      []

    return list
  }

  return []
}

function getIsoDay(value: unknown) {
  const candidate = asString(value)
  if (candidate) return candidate.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function getTime(value: unknown) {
  const candidate = asString(value)
  if (candidate) {
    return candidate.length >= 5 ? candidate.slice(11, 16) || candidate.slice(0, 5) : candidate
  }

  return new Date().toISOString().slice(11, 16)
}

function diffMinutes(createdAt: unknown) {
  const iso = asString(createdAt)
  if (!iso) return 0

  const created = new Date(iso).getTime()
  if (!Number.isFinite(created)) return 0

  return Math.max(0, Math.round((Date.now() - created) / 60000))
}

function mapVerificationStatus(value: unknown): DriverVerificationStatus {
  const status = asString(value).toUpperCase()

  if (status === 'DRAFT') return 'DRAFT'
  if (status === 'PENDING_REVIEW' || status === 'PENDING') return 'PENDING_REVIEW'
  if (status === 'NEEDS_CHANGES' || status === 'NEEDS_CHANGE') return 'NEEDS_CHANGES'
  if (status === 'APPROVED' || status === 'ACTIVE' || status === 'VERIFIED') return 'APPROVED'
  if (status === 'BLOCKED' || status === 'REJECTED') return 'BLOCKED'

  return 'NOT_STARTED'
}

function mapVehicleBodyType(value: unknown): DriverVehicle['bodyType'] {
  const normalized = asString(value).toLowerCase()

  if (normalized === 'suv') return 'suv'
  if (normalized === 'minivan' || normalized === 'van') return 'minivan'
  if (normalized === 'alphard') return 'alphard'

  return 'sedan'
}

function mapVehicle(raw: unknown): DriverVehicle | undefined {
  if (!isRecord(raw)) return undefined

  return {
    brand: asString(raw.brand ?? raw.make ?? raw.vehicleBrand ?? raw.vehicle_brand),
    model: asString(raw.model ?? raw.vehicleModel ?? raw.vehicle_model),
    year: asString(raw.year ?? raw.vehicleYear ?? raw.vehicle_year),
    plate: asString(raw.plate ?? raw.number ?? raw.vehiclePlate ?? raw.vehicle_plate),
    color: asString(raw.color ?? raw.vehicleColor ?? raw.vehicle_color),
    seats:
      asString(raw.seats ?? raw.vehicleSeats ?? raw.vehicle_seats) ||
      String(asNumber(raw.seats ?? raw.vehicleSeats ?? raw.vehicle_seats)),
    bodyType: mapVehicleBodyType(raw.bodyType ?? raw.body_type ?? raw.type),
  }
}

function mapApplication(raw: unknown): RideDriverApplication | null {
  if (!isRecord(raw)) return null

  const record = raw as BackendRecord
  const data = isRecord(record.data) ? record.data : undefined
  const vehicle = firstRecord(record.vehicle, record.car, record.auto, data?.vehicle)
  const documents = firstRecord(record.documents, record.files, data?.documents)

  return {
    id: asString(record.id, ''),
    status: asString(record.status, ''),
    fullName: asString(record.fullName ?? record.full_name ?? record.name),
    phone: asString(record.phone ?? record.mobile),
    city: asString(record.city),
    cityId: asString(record.cityId ?? record.city_id ?? data?.cityId ?? data?.city_id),
    frequentRoutes: asString(record.frequentRoutes ?? record.frequent_routes),
    vehicleBrand: asString(record.vehicleBrand ?? record.vehicle_brand ?? vehicle?.brand ?? vehicle?.make),
    vehicleModel: asString(record.vehicleModel ?? record.vehicle_model ?? vehicle?.model),
    vehicleYear: asString(record.vehicleYear ?? record.vehicle_year ?? vehicle?.year),
    vehiclePlate: asString(record.vehiclePlate ?? record.vehicle_plate ?? vehicle?.plate),
    vehicleColor: asString(record.vehicleColor ?? record.vehicle_color ?? vehicle?.color),
    vehicleSeats:
      asString(record.vehicleSeats ?? record.vehicle_seats ?? vehicle?.seats) ||
      String(asNumber(record.vehicleSeats ?? record.vehicle_seats ?? vehicle?.seats)),
    vehicleBodyType: asString(record.vehicleBodyType ?? record.vehicle_body_type ?? vehicle?.bodyType ?? vehicle?.body_type),
    documents: mapApplicationDocuments(documents),
    submittedAt: asString(record.submittedAt ?? record.submitted_at),
    moderatorComment: asString(record.moderatorComment ?? record.moderator_comment),
    raw,
  }
}

function mapProfile(raw: unknown): DriverProfile | null {
  if (!isRecord(raw)) return null

  const record = raw as BackendRecord
  const data = isRecord(record.data) ? record.data : undefined
  const customer = firstRecord(record.customer, record.profile, data?.customer, data?.profile)
  const driverProfile = firstRecord(record.driverProfile, record.driver_profile, data?.driverProfile, data?.driver_profile)
  const application = firstRecord(record.application, record.driverApplication, data?.application, data?.driverApplication)
  const vehicle = firstRecord(
    record.vehicle,
    record.car,
    record.auto,
    customer?.vehicle,
    driverProfile?.vehicle,
    application?.vehicle,
    data?.vehicle,
  )

  return {
    id: asString(record.id ?? customer?.id ?? driverProfile?.id, ''),
    fullName: asString(
      customer?.fullName ??
        customer?.name ??
        record.fullName ??
        record.full_name ??
        record.name ??
        driverProfile?.fullName ??
        driverProfile?.name ??
        application?.fullName ??
        application?.name,
    ),
    phone: asString(
      customer?.phone ??
        record.phone ??
        record.mobile ??
        driverProfile?.phone ??
        application?.phone,
    ),
    city: asString(
      customer?.city ??
        record.city ??
        driverProfile?.city ??
        application?.city,
    ),
    rating: asNumber(
      driverProfile?.rating ?? record.rating ?? record.ratingAvg ?? record.rating_avg ?? customer?.rating,
      5,
    ),
    tripsCount: asNumber(
      driverProfile?.tripsCount ??
        record.tripsCount ??
        record.trips_count ??
        record.ordersCount ??
        record.orders_count ??
        customer?.tripsCount,
      0,
    ),
    balance: asOptionalNumber(driverProfile?.balance ?? record.balance ?? record.walletBalance ?? record.wallet_balance),
    minBalance: asOptionalNumber(driverProfile?.minBalance ?? record.minBalance ?? record.min_balance),
    isOnline: asBoolean(driverProfile?.isOnline ?? record.isOnline ?? record.online),
    verificationStatus: mapVerificationStatus(
      driverProfile?.verificationStatus ??
        record.verificationStatus ??
        record.verification_status ??
        application?.status,
    ),
    vehicle: mapVehicle(vehicle),
  }
}

function mapActiveDriverStatus(status: unknown): DriverActiveOrder['status'] {
  const normalized = asString(status).toUpperCase()

  if (normalized === 'DRIVER_ASSIGNED' || normalized === 'GOING_TO_CLIENT' || normalized === 'ACCEPTED') {
    return 'DRIVER_ASSIGNED'
  }
  if (normalized === 'DRIVER_ON_WAY') return 'DRIVER_ON_WAY'
  if (normalized === 'DRIVER_ARRIVED' || normalized === 'ARRIVED') return 'ARRIVED'
  if (normalized === 'IN_PROGRESS' || normalized === 'STARTED') return 'IN_PROGRESS'
  if (normalized === 'COMPLETED' || normalized === 'FINISHED') return 'COMPLETED'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELLED'

  return 'DRIVER_ASSIGNED'
}

function mapFeedStatus(status: unknown): DriverFeedOrder['status'] {
  const normalized = asString(status).toUpperCase()

  if (normalized === 'OFFERED') return 'offered'
  if (normalized === 'ACCEPTED' || normalized === 'BOOKED') return 'accepted'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'cancelled'
  return 'available'
}

function mapOfferStatus(status: unknown): DriverCounterOffer['status'] {
  const normalized = asString(status).toUpperCase()

  if (normalized === 'ACCEPTED') return 'accepted'
  if (normalized === 'REJECTED' || normalized === 'WITHDRAWN' || normalized === 'CANCELLED') return 'rejected'
  return 'pending'
}

function getRouteValue(record: BackendRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  return fallback
}

function mapFeedRequest(raw: unknown): DriverFeedOrder {
  const record = isRecord(raw) ? raw : {}
  const category = asString(record.category ?? record.type ?? record.serviceType ?? record.service_type, 'ride') as DriverFeedOrder['category']
  const from = getRouteValue(
    record,
    ['from', 'originText', 'origin_text', 'pickupAddress', 'pickup_address'],
    '',
  )
  const to = getRouteValue(
    record,
    ['to', 'destinationText', 'destination_text', 'dropoffAddress', 'dropoff_address'],
    '',
  )
  const date = getIsoDay(record.date ?? record.requestDate ?? record.request_date ?? record.createdAt ?? record.created_at)
  const time = getTime(record.time ?? record.requestTime ?? record.request_time ?? record.createdAt ?? record.created_at)
  const requestedPrice = asNumber(
    record.requestedPrice ??
      record.requested_price ??
      record.price ??
      record.agreedPrice ??
      record.agreed_price,
    0,
  )
  const comment = asString(record.comment ?? record.note ?? record.message)
  const clientName = asString(
    record.clientName ??
      record.client_name ??
      record.passengerName ??
      record.passenger_name ??
      record.customerName ??
      record.customer_name ??
      record.senderName ??
      record.sender_name,
    'Пассажир',
  )
  const clientPhone = asString(
    record.clientPhone ??
      record.client_phone ??
      record.passengerPhone ??
      record.passenger_phone ??
      record.customerPhone ??
      record.customer_phone ??
      record.senderPhone ??
      record.sender_phone,
    '',
  )

  return {
    id: asString(record.id, `feed-${Date.now()}`),
    category,
    title: asString(record.title, `${from} → ${to}`),
    from,
    to,
    date,
    time,
    requestedPrice,
    passengersCount: asNumber(record.passengersCount ?? record.passengers_count, 1) || undefined,
    rideType: asString(record.rideType ?? record.ride_type) as DriverFeedOrder['rideType'],
    parcelSize: asString(record.parcelSize ?? record.parcel_size) as DriverFeedOrder['parcelSize'],
    parcelDescription: asString(record.parcelDescription ?? record.parcel_description),
    senderName: asString(record.senderName ?? record.sender_name),
    receiverName: asString(record.receiverName ?? record.receiver_name),
    receiverPhone: asString(record.receiverPhone ?? record.receiver_phone),
    clientName,
    clientPhone,
    comment,
    createdMinutesAgo: asNumber(record.createdMinutesAgo ?? record.created_minutes_ago, diffMinutes(record.createdAt ?? record.created_at)),
    status: mapFeedStatus(record.status),
  }
}

function mapDriverOffer(raw: unknown): DriverCounterOffer {
  const record = isRecord(raw) ? raw : {}
  const driver = firstRecord(record.driver, record.driverProfile, record.driver_profile)
  const request = firstRecord(record.request, record.rideRequest, record.ride_request)
  const driverName = asString(driver?.name ?? driver?.fullName ?? record.driverName ?? record.driver_name, 'Водитель')
  const offeredPrice = asNumber(record.offeredPrice ?? record.offered_price ?? record.price ?? record.amount, 0)
  const originalPrice = asNumber(record.originalPrice ?? record.original_price ?? record.requestedPrice ?? record.requested_price, offeredPrice)

  return {
    id: asString(record.id, `driver-offer-${Date.now()}`),
    orderId: asString(record.orderId ?? record.order_id ?? record.requestId ?? record.request_id ?? request?.id),
    driverName,
    offeredPrice,
    originalPrice,
    comment: asString(record.comment ?? record.message ?? record.note),
    status: mapOfferStatus(record.status),
  }
}

function mapDriverOrder(raw: unknown): DriverActiveOrder {
  const record = isRecord(raw) ? raw : {}
  const category = asString(record.category ?? record.type ?? record.serviceType ?? record.service_type, 'ride') as DriverActiveOrder['category']
  const from = getRouteValue(
    record,
    ['from', 'originText', 'origin_text', 'pickupAddress', 'pickup_address'],
    '',
  )
  const to = getRouteValue(
    record,
    ['to', 'destinationText', 'destination_text', 'dropoffAddress', 'dropoff_address'],
    '',
  )
  const price = asNumber(record.price ?? record.agreedPrice ?? record.agreed_price ?? record.requestedPrice ?? record.requested_price, 0)
  const status = mapActiveDriverStatus(record.status)

  return {
    id: asString(record.id, `driver-order-${Date.now()}`),
    sourceOrderId: asString(record.sourceOrderId ?? record.source_order_id ?? record.requestId ?? record.request_id, asString(record.id, '')),
    category,
    status,
    from,
    to,
    price,
    clientName: asString(
      record.clientName ??
        record.client_name ??
        record.passengerName ??
        record.passenger_name ??
        record.customerName ??
        record.customer_name ??
        record.senderName ??
        record.sender_name,
      'Пассажир',
    ),
    clientPhone: asString(
      record.clientPhone ??
        record.client_phone ??
        record.passengerPhone ??
        record.passenger_phone ??
        record.customerPhone ??
        record.customer_phone ??
        record.senderPhone ??
        record.sender_phone,
      '',
    ),
    requestedPrice: asNumber(record.requestedPrice ?? record.requested_price ?? price, price),
    driverOfferedPrice: asNumber(record.driverOfferedPrice ?? record.driver_offered_price, 0) || undefined,
    commissionPreview: asNumber(record.commissionPreview ?? record.commission_preview, Math.round(price * 0.08)),
    rideType: asString(record.rideType ?? record.ride_type) as DriverActiveOrder['rideType'],
    passengersCount: asNumber(record.passengersCount ?? record.passengers_count, 1) || undefined,
    parcelSize: asString(record.parcelSize ?? record.parcel_size) as DriverActiveOrder['parcelSize'],
    parcelDescription: asString(record.parcelDescription ?? record.parcel_description),
    senderName: asString(record.senderName ?? record.sender_name),
    receiverName: asString(record.receiverName ?? record.receiver_name),
    receiverPhone: asString(record.receiverPhone ?? record.receiver_phone),
  }
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return ''

  const entries = Object.entries(params).reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (value === undefined) return accumulator
    accumulator[key] = String(value)
    return accumulator
  }, {})

  const query = new URLSearchParams(entries).toString()
  return query ? `?${query}` : ''
}

function isRealApplicationDocument(document: unknown): document is RideDriverApplicationDocument {
  return (
    isRecord(document) &&
    asString(document.type).trim().length > 0 &&
    asString(document.filePath).trim().length > 0
  )
}

function buildApplicationDocumentsPayload(
  documents: unknown,
): RideDriverApplicationDocument[] | undefined {
  // TODO: wire a real document upload flow and populate this from uploaded file metadata.
  if (!Array.isArray(documents)) return undefined

  const realDocuments = documents
    .filter(isRealApplicationDocument)
    .map((document) => ({
      type: asString(document.type).trim(),
      filePath: asString(document.filePath).trim(),
    }))

  return realDocuments.length > 0 ? realDocuments : undefined
}

function normalizeResponse<T>(value: unknown, mapper: (item: unknown) => T) {
  return {
    items: extractList(value).map(mapper),
    raw: value,
  }
}

function mapDriverApplicationDraft(application: RideDriverApplication | null): DriverApplicationDraft {
  const rawDocuments = isRecord(application?.raw)
    ? firstRecord((application?.raw as BackendRecord).documents, (application?.raw as BackendRecord).files)
    : application?.documents
  const documentSource =
    application?.documents && application.documents.length > 0
      ? application.documents
      : rawDocuments

  return {
    step: 1,
    fullName: application?.fullName ?? '',
    phone: application?.phone ?? '',
    city: application?.city ?? '',
    cityId: application?.cityId ?? '',
    frequentRoutes: application?.frequentRoutes ?? '',
    vehicleBrand: application?.vehicleBrand ?? '',
    vehicleModel: application?.vehicleModel ?? '',
    vehicleYear: application?.vehicleYear ?? '',
    vehiclePlate: application?.vehiclePlate ?? '',
    vehicleColor: application?.vehicleColor ?? '',
    vehicleSeats:
      asString(application?.vehicleSeats) ||
      String(typeof application?.vehicleSeats === 'number' ? application.vehicleSeats : ''),
    vehicleBodyType: mapVehicleBodyType(application?.vehicleBodyType),
    documents: mapDocumentFlags(documentSource) as DriverApplicationDraft['documents'],
    submittedAt: application?.submittedAt,
    moderatorComment: application?.moderatorComment,
  }
}

function buildApplicationPayload(
  application: DriverApplicationDraft,
): DriverApplicationPayload {
  const cityId = asString(application.cityId)
  const documents = buildApplicationDocumentsPayload(
    (application as unknown as { documents?: unknown }).documents,
  )

  if (!cityId) {
    throw new Error('Для отправки заявки на проверку нужен cityId.')
  }

  return {
    fullName: application.fullName,
    phone: application.phone,
    cityId,
    frequentRoutes: application.frequentRoutes,
    vehicle: {
      brand: application.vehicleBrand,
      model: application.vehicleModel,
      year: application.vehicleYear,
      plate: application.vehiclePlate,
      color: application.vehicleColor,
      seats: application.vehicleSeats,
      bodyType: application.vehicleBodyType,
    },
    ...(documents ? { documents } : {}),
  }
}

export function mapDriverMeToViewModel(raw: unknown): DriverMeViewModel {
  const record = (isRecord(raw) ? raw : {}) as BackendRecord
  const data = isRecord(record.data) ? record.data : undefined
  const applicationRecord = firstRecord(
    record.application,
    record.driverApplication,
    data?.application,
    data?.driverApplication,
  )

  const application = mapApplication(applicationRecord ?? record.application)
  const profile = mapProfile(record)
  const verificationStatus = mapVerificationStatus(
    record.verificationStatus ??
      record.verification_status ??
      application?.status ??
      profile?.verificationStatus,
  )
  const isOnline = asBoolean(record.isOnline ?? record.is_online ?? profile?.isOnline)

  return {
    profile: profile
      ? ({
          ...profile,
          verificationStatus,
          isOnline,
        } satisfies DriverProfile)
      : null,
    application: mapDriverApplicationDraft(application),
    applicationId: application?.id,
    verificationStatus,
    isOnline,
    raw,
  }
}

export function mapDriverFeedRequestToViewModel(raw: unknown): DriverFeedViewModel {
  return mapFeedRequest(raw)
}

export function mapDriverOfferToViewModel(raw: unknown): DriverOfferViewModel {
  return mapDriverOffer(raw)
}

export function mapDriverOrderToViewModel(raw: unknown): DriverOrderViewModel {
  return mapDriverOrder(raw)
}

export async function getDriverMe() {
  return mapDriverMeToViewModel(await backendGet('/ride/driver/me'))
}

export async function createDriverApplication(payload: DriverApplicationDraft) {
  return mapDriverMeToViewModel(await backendPost('/ride/driver/application', buildApplicationPayload(payload)))
}

export async function updateDriverApplication(payload: DriverApplicationDraft) {
  return mapDriverMeToViewModel(await backendPatch('/ride/driver/application', buildApplicationPayload(payload)))
}

export async function submitDriverApplication() {
  return mapDriverMeToViewModel(await backendPost('/ride/driver/application/submit'))
}

export async function setDriverOnline(isOnline: boolean) {
  return mapDriverMeToViewModel(await backendPatch('/ride/driver/online', { isOnline }))
}

export async function getDriverFeed(params?: Record<string, string | number | boolean | undefined>) {
  return normalizeResponse<DriverFeedViewModel>(
    await backendGet(`/ride/driver/feed${buildQuery(params)}`),
    mapDriverFeedRequestToViewModel,
  )
}

export async function acceptRideRequestPrice(requestId: number | string) {
  return mapDriverOrderToViewModel(
    unwrapRecord(
      await backendPost(`/ride/driver/requests/${String(requestId)}/accept-price`),
      ['order', 'rideOrder', 'data'],
    ),
  )
}

export async function counterOfferRideRequest(
  requestId: number | string,
  payload: DriverCounterOfferPayload,
) {
  return mapDriverOfferToViewModel(
    unwrapRecord(
      await backendPost(`/ride/driver/requests/${String(requestId)}/counter-offer`, {
        price: payload.price,
        offeredPrice: payload.offeredPrice ?? payload.price,
        comment: payload.comment,
      }),
      ['offer', 'driverOffer', 'data'],
    ),
  )
}

export async function getDriverOffers(
  params?: Record<string, string | number | boolean | undefined>,
) {
  return normalizeResponse<DriverOfferViewModel>(
    await backendGet(`/ride/driver/offers${buildQuery(params)}`),
    mapDriverOfferToViewModel,
  )
}

export async function withdrawDriverOffer(offerId: number | string) {
  return mapDriverOfferToViewModel(
    unwrapRecord(
      await backendPost(`/ride/driver/offers/${String(offerId)}/withdraw`),
      ['offer', 'driverOffer', 'data'],
    ),
  )
}

export async function getDriverOrders(
  params?: Record<string, string | number | boolean | undefined>,
) {
  return normalizeResponse<DriverOrderViewModel>(
    await backendGet(`/ride/driver/orders${buildQuery(params)}`),
    mapDriverOrderToViewModel,
  )
}

export async function getActiveDriverOrder() {
  return mapDriverOrderToViewModel(
    unwrapRecord(await backendGet('/ride/driver/orders/active'), ['order', 'rideOrder', 'data']),
  )
}

export async function updateDriverOrderStatus(
  orderId: number | string,
  payload: DriverOrderStatusPayload,
) {
  return mapDriverOrderToViewModel(
    unwrapRecord(
      await backendPost(`/ride/driver/orders/${String(orderId)}/status`, {
        status: payload.status,
      }),
      ['order', 'rideOrder', 'data'],
    ),
  )
}
