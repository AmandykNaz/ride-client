import { backendGet, backendPatch, backendPost } from '../../../shared/api/backend'
import { getKzPlateValidationError, normalizeKzPlateInput } from '../../../lib/format'
import type {
  DriverApplicationDocument,
  DriverActiveOrder,
  DriverApplicationDraft,
  DriverApplicationHistoryItem,
  DriverCounterOffer,
  DriverFeedOrder,
  DriverProfile,
  DriverVehicle,
  DriverVehicleBodyType,
  DriverVehicleBodyTypeApi,
  DriverVerificationStatus,
  ParcelSize,
  RideDriverRecheck,
  RideDriverRecheckFile,
  RideDriverRecheckFileType,
  RideDriverRecheckStatus,
  RideDriverRecheckType,
  RideOrderStatus,
} from '../../../types/domain'
import { DRIVER_VEHICLE_BODY_TYPE_API_MAP } from '../../../types/domain'
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
  RideCity,
  RideVehicleBodyTypeOption,
  RideVehicleBrandOption,
  RideVehicleColorOption,
  RideVehicleModelOption,
} from './driver.types'
export type { RideCity } from './driver.types'

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

function asOptionalNumericId(value: unknown) {
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

function firstRecord(...values: unknown[]) {
  return values.find(isRecord) as BackendRecord | undefined
}

function firstArray(...values: unknown[]) {
  return values.find(Array.isArray) as unknown[] | undefined
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

function normalizeParcelSize(value: unknown): ParcelSize {
  const normalized = asString(value, 'SMALL').toUpperCase()

  if (normalized === 'SMALL' || normalized === 'MEDIUM' || normalized === 'LARGE' || normalized === 'OVERSIZED') {
    return normalized
  }

  return 'SMALL'
}

function unwrapRecord(value: unknown, keys: string[]) {
  if (!isRecord(value)) return value

  for (const key of keys) {
    const nested = value[key]
    if (isRecord(nested)) return nested
  }

  return value
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
        id: asString(record.id ?? record.documentId ?? record.document_id),
        type,
        filePath,
        url,
        name,
        status,
        fileName: asString(record.fileName ?? record.file_name ?? record.filename),
        mimeType: asString(record.mimeType ?? record.mime_type),
        sizeBytes: asOptionalNumber(record.sizeBytes ?? record.size_bytes),
        raw: item,
      }
    })
    .filter((document) => document.type || document.filePath || document.url || document.name || document.status)
}

function mapApplicationDocumentsToDraft(raw: unknown): DriverApplicationDocument[] {
  return mapApplicationDocuments(raw)
    .map((document) => ({
      id: document.id || undefined,
      type: asString(document.type ?? document.name).trim().toUpperCase() as DriverApplicationDocument['type'],
      filePath: asString(document.filePath || document.url).trim(),
      fileName: document.fileName || document.name || undefined,
      mimeType: document.mimeType || undefined,
      sizeBytes: document.sizeBytes ?? undefined,
    }))
    .filter((document) => Boolean(document.type && document.filePath))
}

function mapApplicationHistory(raw: unknown): DriverApplicationHistoryItem[] {
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
      return {
        action: asString(record.action ?? record.type ?? record.event ?? record.name).trim(),
        actorLabel: asString(record.actorLabel ?? record.actor_label ?? record.actorName ?? record.actor_name) || undefined,
        statusFrom: asString(record.statusFrom ?? record.status_from),
        statusTo: asString(record.statusTo ?? record.status_to),
        reason: asString(record.reason ?? record.comment ?? record.moderatorComment ?? record.moderator_comment),
        message: asString(record.message ?? record.text ?? record.description),
        createdAt: asString(record.createdAt ?? record.created_at),
      } satisfies DriverApplicationHistoryItem
    })
    .filter((item) => Boolean(item.action && item.createdAt))
}

function mapDriverRecheckFile(raw: unknown): RideDriverRecheckFile | null {
  const record = isRecord(raw) ? raw : {}
  const type = normalizeRecheckFileType(
    record.type ?? record.fileType ?? record.file_type ?? record.documentType ?? record.document_type,
  )
  const id = asOptionalNumericId(record.id ?? record.fileId ?? record.file_id)

  if (!type) return null

  return {
    id,
    type,
    filePath: asString(record.filePath ?? record.file_path ?? record.path, '') || undefined,
    fileName: asString(record.fileName ?? record.file_name ?? record.filename ?? record.name, '') || undefined,
    mimeType: asString(record.mimeType ?? record.mime_type, '') || undefined,
    sizeBytes: asOptionalNumber(record.sizeBytes ?? record.size_bytes),
    uploadedAt: asString(record.uploadedAt ?? record.uploaded_at ?? record.createdAt ?? record.created_at, '') || undefined,
    raw,
  }
}

function mapDriverRecheck(raw: unknown): RideDriverRecheck | null {
  const record = isRecord(raw) ? raw : {}
  const data = isRecord(record.data) ? record.data : undefined
  const fileSource =
    firstArray(
      record.files,
      record.documents,
      record.items,
      data?.files,
      data?.documents,
      data?.items,
    ) ?? []

  const files = fileSource.map(mapDriverRecheckFile).filter((file): file is RideDriverRecheckFile => Boolean(file))
  const status = normalizeRecheckStatus(record.status ?? record.recheckStatus ?? record.recheck_status ?? data?.status)
  const type = normalizeRecheckType(record.type ?? record.recheckType ?? record.recheck_type ?? data?.type)
  const id = asOptionalNumericId(
    record.id ?? record.recheckId ?? record.recheck_id ?? data?.id ?? data?.recheckId ?? data?.recheck_id,
  )

  if (!id || id <= 0) {
    return null
  }

  return {
    id,
    driverProfileId: asOptionalNumericId(record.driverProfileId ?? record.driver_profile_id ?? data?.driverProfileId ?? data?.driver_profile_id) ?? null,
    applicationId: asOptionalNumericId(record.applicationId ?? record.application_id ?? data?.applicationId ?? data?.application_id) ?? null,
    status,
    type,
    reason:
      asString(
        record.reason ??
          record.comment ??
          record.message ??
          record.moderatorComment ??
          record.moderator_comment ??
          data?.reason,
      ) || null,
    dueAt:
      asString(record.dueAt ?? record.due_at ?? record.deadline ?? data?.dueAt ?? data?.due_at) || null,
    submittedAt:
      asString(record.submittedAt ?? record.submitted_at ?? data?.submittedAt ?? data?.submitted_at) || null,
    reviewedAt:
      asString(record.reviewedAt ?? record.reviewed_at ?? data?.reviewedAt ?? data?.reviewed_at) || null,
    reviewReason:
      asString(
        record.reviewReason ??
          record.review_reason ??
          record.reviewComment ??
          record.review_comment ??
          data?.reviewReason ??
          data?.review_reason,
      ) || null,
    files,
    raw,
  }
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
  if (status === 'REJECTED') return 'NEEDS_CHANGES'
  if (status === 'BLOCKED') return 'BLOCKED'
  if (status === 'SUSPENDED') return 'SUSPENDED'

  return 'NOT_STARTED'
}

function normalizeRecheckType(value: unknown): RideDriverRecheckType {
  const status = asString(value).trim().toUpperCase()

  if (status === 'SELFIE') return 'SELFIE'
  if (status === 'VEHICLE_PHOTOS') return 'VEHICLE_PHOTOS'
  if (status === 'DOCUMENTS') return 'DOCUMENTS'
  if (status === 'VEHICLE_AND_SELFIE') return 'VEHICLE_AND_SELFIE'

  return 'DOCUMENTS'
}

function normalizeRecheckStatus(value: unknown): RideDriverRecheckStatus {
  const status = asString(value).trim().toUpperCase()

  if (status === 'PENDING_UPLOAD') return 'PENDING_UPLOAD'
  if (status === 'PENDING_REVIEW') return 'PENDING_REVIEW'
  if (status === 'APPROVED') return 'APPROVED'
  if (status === 'REJECTED') return 'REJECTED'
  if (status === 'CANCELLED' || status === 'CANCELED') return 'CANCELLED'
  if (status === 'EXPIRED') return 'EXPIRED'

  return 'PENDING_UPLOAD'
}

function normalizeRecheckFileType(value: unknown): RideDriverRecheckFileType | null {
  const type = asString(value).trim().toUpperCase()

  if (
    type === 'SELFIE' ||
    type === 'CAR_FRONT_PHOTO' ||
    type === 'CAR_BACK_PHOTO' ||
    type === 'INTERIOR_PHOTO' ||
    type === 'TRUNK_PHOTO' ||
    type === 'DRIVER_LICENSE_FRONT' ||
    type === 'DRIVER_LICENSE_BACK' ||
    type === 'VEHICLE_REGISTRATION'
  ) {
    return type
  }

  return null
}

function mapVehicleBodyType(value: unknown): DriverVehicleBodyType {
  const normalized = asString(value).trim().toLowerCase()

  if (normalized === 'sedan' || normalized === 'suv' || normalized === 'minivan' || normalized === 'alphard' || normalized === 'van' || normalized === 'truck' || normalized === 'other') {
    return normalized
  }

  const uppercase = asString(value).trim().toUpperCase()

  if (uppercase === 'SEDAN') return 'sedan'
  if (uppercase === 'SUV') return 'suv'
  if (uppercase === 'MINIVAN') return 'minivan'
  if (uppercase === 'ALPHARD') return 'alphard'
  if (uppercase === 'VAN') return 'van'
  if (uppercase === 'TRUCK') return 'truck'
  if (uppercase === 'OTHER') return 'other'

  return 'other'
}

function toVehicleBodyTypeApi(value: unknown): DriverVehicleBodyTypeApi {
  return DRIVER_VEHICLE_BODY_TYPE_API_MAP[mapVehicleBodyType(value)]
}

function mapVehicle(raw: unknown): DriverVehicle | undefined {
  if (!isRecord(raw)) return undefined

  const brandName = asString(raw.brandName ?? raw.brand ?? raw.make ?? raw.vehicleBrand ?? raw.vehicle_brand)
  const modelName = asString(raw.modelName ?? raw.model ?? raw.vehicleModel ?? raw.vehicle_model)
  const colorName = asString(raw.colorName ?? raw.color ?? raw.vehicleColor ?? raw.vehicle_color)
  const bodyTypeCode = asString(raw.bodyTypeCode ?? raw.bodyType ?? raw.body_type ?? raw.type)

  return {
    brandId: asOptionalNumber(raw.brandId ?? raw.brand_id),
    modelId: asOptionalNumber(raw.modelId ?? raw.model_id),
    colorId: asOptionalNumber(raw.colorId ?? raw.color_id),
    brandName: brandName || undefined,
    modelName: modelName || undefined,
    brand: brandName,
    model: modelName,
    year: asString(raw.year ?? raw.vehicleYear ?? raw.vehicle_year),
    plate: asString(raw.plate ?? raw.plateNumber ?? raw.number ?? raw.vehiclePlate ?? raw.vehicle_plate),
    plateNumber: asString(raw.plateNumber ?? raw.plate ?? raw.vehiclePlate ?? raw.vehicle_plate),
    color: colorName,
    colorName: colorName || undefined,
    seats:
      asString(raw.seats ?? raw.vehicleSeats ?? raw.vehicle_seats) ||
      String(asNumber(raw.seats ?? raw.vehicleSeats ?? raw.vehicle_seats)),
    seatsCount: asOptionalNumber(raw.seatsCount ?? raw.vehicleSeats ?? raw.vehicle_seats),
    bodyType: mapVehicleBodyType(bodyTypeCode),
    bodyTypeCode: toVehicleBodyTypeApi(bodyTypeCode),
  }
}

function mapApplication(raw: unknown): RideDriverApplication | null {
  if (!isRecord(raw)) return null

  const record = raw as BackendRecord
  const data = isRecord(record.data) ? record.data : undefined
  const vehicle = firstRecord(
    record.vehicleSnapshot,
    record.vehicle_snapshot,
    record.vehicle,
    record.car,
    record.auto,
    data?.vehicleSnapshot,
    data?.vehicle_snapshot,
    data?.vehicle,
  )
  const documents = firstArray(record.documents, record.files, data?.documents)
  const history = firstArray(record.history, record.applicationHistory, record.application_history, data?.history, data?.applicationHistory, data?.application_history)
  const vehicleRecord = isRecord(vehicle) ? (vehicle as BackendRecord) : undefined
  const status = asString(record.status ?? record.applicationStatus ?? data?.status).trim().toUpperCase()
  const vehicleBrandId = asOptionalNumber(vehicleRecord?.brandId ?? vehicleRecord?.brand_id)
  const vehicleModelId = asOptionalNumber(vehicleRecord?.modelId ?? vehicleRecord?.model_id)
  const vehicleColorId = asOptionalNumber(vehicleRecord?.colorId ?? vehicleRecord?.color_id)
  const vehicleBodyType = vehicleRecord
    ? toVehicleBodyTypeApi(
        vehicleRecord.bodyTypeCode ??
          vehicleRecord.body_type_code ??
          vehicleRecord.bodyType ??
          vehicleRecord.body_type,
      )
    : toVehicleBodyTypeApi(record.vehicleBodyType ?? record.vehicle_body_type)

  return {
    id: asString(record.id, ''),
    status: asString(record.status, ''),
    fullName: asString(record.fullName ?? record.full_name ?? record.name),
    phone: asString(record.phone ?? record.mobile),
    city: asString(record.city ?? record.cityName ?? record.city_name ?? data?.city ?? data?.cityName ?? data?.city_name),
    cityName: asString(record.cityName ?? record.city_name ?? data?.cityName ?? data?.city_name),
    cityId: asString(record.cityId ?? record.city_id ?? data?.cityId ?? data?.city_id),
    frequentRoutes: asString(record.frequentRoutes ?? record.frequent_routes),
    vehicleSnapshot: vehicleRecord ?? null,
    vehicleBrandId,
    vehicleBrand: asString(
      record.vehicleBrand ??
        record.vehicle_brand ??
        vehicleRecord?.brandName ??
        vehicleRecord?.brand ??
        vehicleRecord?.make ??
        (vehicleBrandId != null ? vehicleRecord?.brandName ?? vehicleRecord?.brand ?? vehicleRecord?.make : ''),
    ),
    vehicleModelId,
    vehicleModel: asString(
      record.vehicleModel ??
        record.vehicle_model ??
        vehicleRecord?.modelName ??
        vehicleRecord?.model,
    ),
    vehicleYear: asString(record.vehicleYear ?? record.vehicle_year ?? vehicleRecord?.year),
    vehiclePlate: asString(record.vehiclePlate ?? record.vehicle_plate ?? vehicleRecord?.plateNumber ?? vehicleRecord?.plate),
    vehicleColorId,
    vehicleColor: asString(
      record.vehicleColor ??
        record.vehicle_color ??
        vehicleRecord?.colorName ??
        vehicleRecord?.color,
    ),
    vehicleSeats:
      asString(record.vehicleSeats ?? record.vehicle_seats ?? vehicleRecord?.seatsCount ?? vehicleRecord?.seats) ||
      String(asNumber(record.vehicleSeats ?? record.vehicle_seats ?? vehicleRecord?.seatsCount ?? vehicleRecord?.seats)),
    vehicleBodyType,
    documents: mapApplicationDocumentsToDraft(documents),
    submittedAt: asString(record.submittedAt ?? record.submitted_at),
    changesRequestedReason: asString(record.changesRequestedReason ?? record.changes_requested_reason),
    rejectionReason: asString(record.rejectionReason ?? record.rejection_reason),
    blockedReason: asString(record.blockedReason ?? record.blocked_reason),
    moderatorComment:
      status === 'BLOCKED'
        ? asString(record.blockedReason ?? record.blocked_reason ?? record.moderatorComment ?? record.moderator_comment)
        : status === 'NEEDS_CHANGES'
          ? asString(record.changesRequestedReason ?? record.changes_requested_reason ?? record.moderatorComment ?? record.moderator_comment)
          : status === 'REJECTED'
            ? asString(record.rejectionReason ?? record.rejection_reason ?? record.moderatorComment ?? record.moderator_comment)
            : asString(
                record.moderatorComment ??
                  record.moderator_comment ??
                  record.changesRequestedReason ??
                  record.rejectionReason ??
                  record.blockedReason,
              ),
    history: mapApplicationHistory(history),
    raw,
  }
}

function mapRideCity(raw: unknown): RideCity | null {
  if (!isRecord(raw)) return null

  const id = asOptionalNumber(raw.id)
  const name = asString(raw.name)
  const code = asString(raw.code)

  if (id == null || !name) return null

  return {
    id,
    name,
    ...(code ? { code } : {}),
    pickupEnabled: asBoolean(raw.pickupEnabled, true),
    dropoffEnabled: asBoolean(raw.dropoffEnabled, true),
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
  const documents = mapApplicationDocumentsToDraft(
    firstRecord(record.documents, record.files, driverProfile?.documents, application?.documents, data?.documents),
  )
  const city = asString(
    customer?.city ??
      record.city ??
      record.cityName ??
      record.city_name ??
      driverProfile?.city ??
      driverProfile?.cityName ??
      driverProfile?.city_name ??
      application?.city ??
      application?.cityName ??
      application?.city_name,
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
    city,
    cityName: city || undefined,
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
    blockedAt: asString(driverProfile?.blockedAt ?? record.blockedAt ?? record.blocked_at) || undefined,
    blockedReason: asString(driverProfile?.blockedReason ?? record.blockedReason ?? record.blocked_reason),
    verificationStatus: mapVerificationStatus(
      driverProfile?.verificationStatus ??
        record.verificationStatus ??
        record.verification_status ??
        application?.status,
    ),
    vehicle: mapVehicle(vehicle),
    documents,
  }
}

function mapActiveDriverStatus(status: unknown): DriverActiveOrder['status'] {
  return normalizeRideOrderStatus(status)
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
    parcelSize: normalizeParcelSize(record.parcelSize ?? record.parcel_size),
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
  const envelope = isRecord(raw) ? raw : {}
  const record = firstRecord(envelope.order, envelope.rideOrder, envelope.ride_order, envelope.data) ?? envelope
  const category = asString(record.category ?? record.type ?? record.serviceType ?? record.service_type, 'ride') as DriverActiveOrder['category']
  const request = firstRecord(record.request, envelope.request, envelope.rideRequest, envelope.ride_request)
  const requestRecord = (request ?? {}) as BackendRecord
  const from = getRouteValue(
    record,
    ['from', 'originText', 'origin_text', 'pickupAddress', 'pickup_address'],
    getRouteValue(
      requestRecord,
      ['originText', 'origin_text', 'pickupAddress', 'pickup_address'],
      '',
    ),
  )
  const to = getRouteValue(
    record,
    ['to', 'destinationText', 'destination_text', 'dropoffAddress', 'dropoff_address'],
    getRouteValue(
      requestRecord,
      ['destinationText', 'destination_text', 'dropoffAddress', 'dropoff_address'],
      '',
    ),
  )
  const passenger = firstRecord(record.passenger, envelope.passenger, envelope.ridePassenger, envelope.ride_passenger)
  const passengerCustomer = firstRecord(
    passenger?.customer,
    passenger?.passengerProfile,
    passenger?.profile,
    passenger,
  )
  const routePrice = asNumber(
    record.price ?? record.agreedPrice ?? record.agreed_price ?? request?.requestedPrice ?? request?.requested_price ?? record.requestedPrice ?? record.requested_price,
    0,
  )
  const status = mapActiveDriverStatus(record.status)

  return {
    id: asString(record.id, `driver-order-${Date.now()}`),
    sourceOrderId: asString(record.sourceOrderId ?? record.source_order_id ?? record.requestId ?? record.request_id, asString(record.id, '')),
    category,
    status,
    from,
    to,
    price: routePrice,
    agreedPrice: routePrice,
    commissionAmount: asNumber(record.commissionAmount ?? record.commission_amount, 0) || undefined,
    clientName: asString(
      record.clientName ??
        record.client_name ??
        passengerCustomer?.name ??
        passengerCustomer?.fullName ??
        passengerCustomer?.firstName ??
        passengerCustomer?.lastName ??
        passengerCustomer?.displayName ??
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
        passengerCustomer?.phone ??
        record.passengerPhone ??
        record.passenger_phone ??
        record.customerPhone ??
        record.customer_phone ??
        record.senderPhone ??
        record.sender_phone,
      '',
    ),
    requestedPrice: asNumber(record.requestedPrice ?? record.requested_price ?? routePrice, routePrice),
    driverOfferedPrice: asNumber(record.driverOfferedPrice ?? record.driver_offered_price, 0) || undefined,
    commissionPreview: asOptionalNumber(record.commissionPreview ?? record.commission_preview),
    rideType: asString(record.rideType ?? record.ride_type) as DriverActiveOrder['rideType'],
    passengersCount: asNumber(record.passengersCount ?? record.passengers_count, 1) || undefined,
    parcelSize: normalizeParcelSize(record.parcelSize ?? record.parcel_size),
    parcelDescription: asString(record.parcelDescription ?? record.parcel_description),
    senderName: asString(record.senderName ?? record.sender_name),
    receiverName: asString(record.receiverName ?? record.receiver_name),
    receiverPhone: asString(record.receiverPhone ?? record.receiver_phone),
    originText: from,
    destinationText: to,
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
  if (!Array.isArray(documents)) return undefined

  const realDocuments = documents
    .filter(isRealApplicationDocument)
    .map((document) => ({
      type: asString(document.type).trim(),
      filePath: asString(document.filePath).trim(),
      ...(asString(document.fileName ?? document.name).trim() ? { fileName: asString(document.fileName ?? document.name).trim() } : {}),
      ...(asString(document.mimeType).trim() ? { mimeType: asString(document.mimeType).trim() } : {}),
      ...(asOptionalNumber(document.sizeBytes) ? { sizeBytes: asOptionalNumber(document.sizeBytes) } : {}),
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
  const vehicleSnapshot = isRecord(application?.vehicleSnapshot)
    ? (application?.vehicleSnapshot as BackendRecord)
    : undefined
  const status = asString(application?.status).trim().toUpperCase()
  const changesRequestedReason = application?.changesRequestedReason
  const rejectionReason = application?.rejectionReason
  const blockedReason = application?.blockedReason
  const moderatorComment =
    status === 'BLOCKED'
      ? blockedReason ?? application?.moderatorComment
      : status === 'NEEDS_CHANGES'
        ? changesRequestedReason ?? application?.moderatorComment
        : status === 'REJECTED'
          ? rejectionReason ?? application?.moderatorComment
          : application?.moderatorComment

  return {
    step: 1,
    fullName: application?.fullName ?? '',
    phone: application?.phone ?? '',
    city: application?.city ?? '',
    cityId: application?.cityId ?? '',
    frequentRoutes: application?.frequentRoutes ?? '',
    vehicleBrandId: application?.vehicleBrandId ?? asOptionalNumber(vehicleSnapshot?.brandId ?? vehicleSnapshot?.brand_id),
    vehicleBrand: application?.vehicleBrand ?? asString(vehicleSnapshot?.brandName ?? vehicleSnapshot?.brand ?? vehicleSnapshot?.make),
    vehicleModelId: application?.vehicleModelId ?? asOptionalNumber(vehicleSnapshot?.modelId ?? vehicleSnapshot?.model_id),
    vehicleModel: application?.vehicleModel ?? asString(vehicleSnapshot?.modelName ?? vehicleSnapshot?.model),
    vehicleYear: application?.vehicleYear ?? '',
    vehiclePlate: normalizeKzPlateInput(
      application?.vehiclePlate ?? asString(vehicleSnapshot?.plateNumber ?? vehicleSnapshot?.plate) ?? '',
    ),
    vehicleColorId: application?.vehicleColorId ?? asOptionalNumber(vehicleSnapshot?.colorId ?? vehicleSnapshot?.color_id),
    vehicleColor: application?.vehicleColor ?? asString(vehicleSnapshot?.colorName ?? vehicleSnapshot?.color),
    vehicleSeats:
      asString(application?.vehicleSeats) ||
      String(typeof application?.vehicleSeats === 'number' ? application.vehicleSeats : ''),
    vehicleBodyType: mapVehicleBodyType(application?.vehicleBodyType),
    documents: mapApplicationDocumentsToDraft(documentSource),
    submittedAt: application?.submittedAt,
    moderatorComment,
    changesRequestedReason: changesRequestedReason ?? undefined,
    rejectionReason: rejectionReason ?? undefined,
    blockedReason: blockedReason ?? undefined,
  }
}

function buildApplicationPayload(
  application: DriverApplicationDraft,
): DriverApplicationPayload {
  const cityId = asString(application.cityId)
  const documents = buildApplicationDocumentsPayload(
    (application as unknown as { documents?: unknown }).documents,
  )
  const bodyTypeCode = toVehicleBodyTypeApi(application.vehicleBodyType)

  if (!cityId) {
    throw new Error('Для отправки заявки на проверку нужен cityId.')
  }

  const vehicleBrandId = typeof application.vehicleBrandId === 'number' ? application.vehicleBrandId : undefined
  const vehicleModelId = typeof application.vehicleModelId === 'number' ? application.vehicleModelId : undefined
  const vehicleColorId = typeof application.vehicleColorId === 'number' ? application.vehicleColorId : undefined
  const vehicleBrand = application.vehicleBrand.trim()
  const vehicleModel = application.vehicleModel.trim()
  const vehicleColor = application.vehicleColor.trim()
  const vehicleYear = Number(application.vehicleYear.trim())
  const vehicleSeatsCount = Number(application.vehicleSeats.trim())
  const vehiclePlate = normalizeKzPlateInput(application.vehiclePlate)
  const plateValidationError = getKzPlateValidationError(vehiclePlate)

  if (plateValidationError) {
    throw new Error(plateValidationError)
  }

  const vehicle: NonNullable<DriverApplicationPayload['vehicle']> = {
    ...(vehicleBrandId != null ? { brandId: vehicleBrandId } : vehicleBrand ? { brand: vehicleBrand } : {}),
    ...(vehicleModelId != null ? { modelId: vehicleModelId } : vehicleModel ? { model: vehicleModel } : {}),
    plateNumber: vehiclePlate,
    ...(vehicleColorId != null ? { colorId: vehicleColorId } : vehicleColor ? { color: vehicleColor } : {}),
    bodyTypeCode,
    ...(Number.isFinite(vehicleYear) ? { year: vehicleYear } : {}),
    ...(Number.isFinite(vehicleSeatsCount) ? { seatsCount: vehicleSeatsCount } : {}),
  }

  return {
    fullName: application.fullName,
    cityId,
    vehicle,
    ...(documents ? { documents } : {}),
  }
}

export function mapDriverMeToViewModel(raw: unknown): DriverMeViewModel {
  const record = (isRecord(raw) ? raw : {}) as BackendRecord
  const data = isRecord(record.data) ? record.data : undefined
  const applicationRecord = firstRecord(
    record.application,
    record.driverApplication,
    record.currentApplication,
    record.current_application,
    data?.application,
    data?.driverApplication,
    data?.currentApplication,
  )

  const application = mapApplication(applicationRecord ?? record.application)
  const applicationHistorySource = firstArray(
    record.applicationHistory,
    record.application_history,
    record.history,
    data?.applicationHistory,
    data?.application_history,
    data?.history,
    application?.history,
  )
  const profile = mapProfile(record)
  const activeRecheck = mapDriverRecheck(
    firstRecord(
      record.activeRecheck,
      record.active_recheck,
      record.recheck,
      data?.activeRecheck,
      data?.active_recheck,
      data?.recheck,
    ),
  )
  const verificationStatus = mapVerificationStatus(
    record.verificationStatus ??
      record.verification_status ??
      profile?.verificationStatus ??
      application?.status,
  )
  const isOnline = asBoolean(record.isOnline ?? record.is_online ?? profile?.isOnline)
  const vehiclesRaw = Array.isArray(record.vehicles)
    ? record.vehicles
    : Array.isArray(data?.vehicles)
      ? data?.vehicles
      : []
  const walletRaw = firstRecord(record.wallet, record.driverWallet, data?.wallet)
  const primaryVehicle = mapVehicle(firstRecord(record.vehicle, data?.vehicle)) ?? profile?.vehicle ?? null

  const applicationDocuments = mapApplicationDocumentsToDraft(application?.documents ?? undefined)
  const applicationHistory = mapApplicationHistory(applicationHistorySource)

  return {
    profile: profile
      ? ({
          ...profile,
          verificationStatus: profile.verificationStatus ?? verificationStatus,
          isOnline,
          blockedAt: profile.blockedAt ?? undefined,
          blockedReason: profile.blockedReason ?? undefined,
          documents: profile.documents ?? applicationDocuments,
        } satisfies DriverProfile)
      : null,
    application: {
      ...mapDriverApplicationDraft(application),
      history: applicationHistory,
    },
    currentApplication: application
      ? {
          ...mapDriverApplicationDraft(application),
          history: applicationHistory,
        }
      : null,
    applicationId: application?.id,
    applicationHistory,
    vehicle: primaryVehicle,
    vehicles: vehiclesRaw.map(mapVehicle).filter((vehicle): vehicle is NonNullable<ReturnType<typeof mapVehicle>> => Boolean(vehicle)),
    wallet: isRecord(walletRaw)
      ? {
          id: asString(walletRaw.id, ''),
          balance: asNumber(walletRaw.balance, 0),
          minimumBalance: asNumber(walletRaw.minimumBalance, 0),
          currency: asString(walletRaw.currency, 'KZT'),
          isBlocked: asBoolean(walletRaw.isBlocked),
          blockedReason: asString(walletRaw.blockedReason ?? walletRaw.rejectionReason),
        }
      : undefined,
    documents: profile?.documents ?? applicationDocuments ?? undefined,
    activeRecheck,
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

export async function getActiveDriverRecheck() {
  return mapDriverRecheck(await backendGet('/ride/driver/rechecks/active'))
}

export async function getRideCities() {
  const rows = await backendGet<unknown>('/ride/cities')

  return (Array.isArray(rows) ? rows : [])
    .map(mapRideCity)
    .filter((city): city is RideCity => Boolean(city))
}

export async function getRideVehicleBrands() {
  return backendGet<RideVehicleBrandOption[]>('/ride/vehicle-catalog/brands')
}

export async function getRideVehicleModels(brandId: number | string) {
  return backendGet<RideVehicleModelOption[]>(`/ride/vehicle-catalog/brands/${String(brandId)}/models`)
}

export async function getRideVehicleColors() {
  return backendGet<RideVehicleColorOption[]>('/ride/vehicle-catalog/colors')
}

export async function getRideVehicleBodyTypes() {
  return backendGet<RideVehicleBodyTypeOption[]>('/ride/vehicle-catalog/body-types')
}

export async function uploadDriverDocument(type: RideDriverApplicationDocument['type'], file: File) {
  const formData = new FormData()
  formData.set('type', String(type ?? '').trim())
  formData.set('file', file)

  return backendPost<DriverApplicationDocument>('/ride/driver/documents/upload', formData)
}

export async function uploadDriverRecheckFile(
  recheckId: number | string,
  fileType: RideDriverRecheckFile['type'],
  file: File,
) {
  const formData = new FormData()
  formData.set('type', String(fileType ?? '').trim())
  formData.set('file', file)

  return backendPost(
    `/ride/driver/rechecks/${String(recheckId)}/files`,
    formData,
  )
}

export async function submitDriverRecheck(recheckId: number | string) {
  return mapDriverRecheck(
    await backendPost(`/ride/driver/rechecks/${String(recheckId)}/submit`),
  )
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

export async function getActiveDriverOrder(): Promise<DriverOrderViewModel | null> {
  const response = await backendGet('/ride/driver/orders/active')

  if (isRecord(response) && 'order' in response && response.order == null) {
    return null
  }

  return mapDriverOrderToViewModel(response)
}

export async function updateDriverOrderStatus(
  orderId: number | string,
  payload: DriverOrderStatusPayload,
) {
  return mapDriverOrderToViewModel(
    unwrapRecord(
      await backendPost(`/ride/driver/orders/${String(orderId)}/status`, {
        status: normalizeRideOrderStatus(payload.status),
      }),
      ['order', 'rideOrder', 'data'],
    ),
  )
}
