import { backendGet } from '../../../shared/api/backend'
import { formatVehicleLabel } from '../../../lib/format'
import type {
  BusCity,
  BusSeat,
  BusSeatStatus,
  BusSeatType,
  BusTripDetail,
  BusTripSearchParams,
  BusTripSeats,
  BusTripStation,
  BusTripSummary,
  BusTripVehicle,
} from './bus.types'

type BackendRecord = Record<string, unknown>

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function cleanLabel(value: unknown) {
  return asString(value).replace(/\s+/g, ' ').trim()
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

function asId(value: unknown, fallback = '') {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  if (typeof value === 'string' && value.trim()) return value.trim()

  return fallback
}

function firstRecord(...values: unknown[]) {
  return values.find(isRecord) as BackendRecord | undefined
}

function firstArray(...values: unknown[]) {
  return values.find(Array.isArray) as unknown[] | undefined
}

function collectList(value: unknown) {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []

  return firstArray(value.items, value.results, value.rows, value.list, value.data, value.trips, value.seats) ?? []
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const normalized = cleanLabel(value)
    if (normalized) {
      return normalized
    }
  }

  return ''
}

function debugBusPayload(label: '[bus search response]' | '[bus trip detail response]' | '[bus seats response]', value: unknown) {
  if (!import.meta.env.DEV) return

  console.debug(label, value)
}

function buildCityLabel(name: string, regionName?: string | null) {
  return regionName?.trim() ? `${name} · ${regionName.trim()}` : name
}

function mapCity(item: unknown): BusCity | null {
  const record = isRecord(item) ? item : {}
  const nestedCity = firstRecord(record.city, record.fromCity, record.toCity)
  const id = asId(record.id ?? record.cityId ?? nestedCity?.id)
  const name = asString(
    record.nameRu ?? record.name ?? record.title ?? nestedCity?.nameRu ?? nestedCity?.name ?? nestedCity?.title,
  )
  const regionName = asString(
    record.regionName ?? record.region ?? nestedCity?.regionName ?? nestedCity?.region,
  )

  if (!id || !name) return null

  return {
    id,
    name,
    regionName: regionName || null,
    label: buildCityLabel(name, regionName),
  }
}

function mapVehicle(raw: unknown): BusTripVehicle | null {
  const vehicle = isRecord(raw) ? raw : {}
  const rootVehicleCompany = firstRecord((vehicle as BackendRecord).organization, (vehicle as BackendRecord).company)
  const company = firstRecord(
    vehicle.company,
    vehicle.carrier,
    vehicle.operator,
    vehicle.vendor,
    rootVehicleCompany,
  )
  const plateNumber = asString(
    vehicle.plateNumber ??
      vehicle.plate ??
      vehicle.registrationNumber ??
      vehicle.regNumber ??
      vehicle.licensePlate ??
      vehicle.number ??
      vehicle.govNumber,
  )
  const model = asString(
    vehicle.model ?? vehicle.vehicleModel ?? vehicle.busModel ?? vehicle.vehicleName ?? vehicle.name ?? vehicle.brand,
  )
  const label = formatVehicleLabel(
    {
      vehicleName: asString(vehicle.name ?? vehicle.vehicleName ?? model),
      brand: asString(vehicle.brand),
      model,
      color: asString(vehicle.color ?? vehicle.colorName),
      plateNumber,
    },
    '',
  )

  if (!label) return null

  return {
    name: label,
    plateNumber: plateNumber || null,
    model: model || null,
    companyName: asString(
      vehicle.companyName ??
        vehicle.organizationName ??
        vehicle.carrierName ??
        vehicle.operatorName ??
        company?.name ??
        company?.nameRu,
    ) || null,
    capacity: asNumber(vehicle.capacity ?? vehicle.seatCapacity ?? vehicle.totalSeats) ?? null,
    color: asString(vehicle.color ?? vehicle.colorName) || null,
  }
}

function mapStation(item: unknown, index: number): BusTripStation | null {
  const record = isRecord(item) ? item : {}
  const city = firstRecord(record.city)
  const name = asString(record.name ?? record.stationName ?? record.stopName ?? record.title)
  const cityName = asString(record.cityName ?? city?.nameRu ?? city?.name)

  if (!name && !cityName) return null

  return {
    id: asId(record.id ?? record.stationId ?? index + 1, `station-${index + 1}`),
    name: name || cityName,
    cityName: cityName || null,
    address: asString(record.address ?? record.location ?? record.platform) || null,
    arrivalAt: asString(record.arrivalAt ?? record.arrivalTime ?? record.arrivalDateTime) || null,
    departureAt: asString(record.departureAt ?? record.departureTime ?? record.departureDateTime) || null,
    order: asNumber(record.order ?? record.sequence ?? index + 1) ?? index + 1,
  }
}

function resolveRouteName(fromCityName: string, toCityName: string) {
  if (fromCityName && toCityName) {
    return `${fromCityName} → ${toCityName}`
  }

  return fromCityName || toCityName || 'Маршрут не указан'
}

function resolveTripEndpointLabel(record: BackendRecord, side: 'from' | 'to') {
  const route = firstRecord(record.route)
  const sideRecord = firstRecord(
    record[`${side}City`],
    record[`${side}Station`],
    record[side],
    route?.[side],
    route?.[`${side}City`],
    route?.[`${side}Station`],
    side === 'from' ? record.originCity : record.destinationCity,
  )
  const sideCityRecord = firstRecord(sideRecord?.city)

  const stationName = firstNonEmptyString(
    record[`${side}StationName`],
    sideRecord?.stationName,
    sideRecord?.name,
    sideRecord?.title,
  )
  const cityName = firstNonEmptyString(
    record[`${side}CityName`],
    sideRecord?.cityName,
    sideRecord?.nameRu,
    sideCityRecord?.nameRu,
    sideCityRecord?.name,
    sideRecord?.name,
    side === 'from' ? record.originCityName : record.destinationCityName,
  )

  return stationName || cityName || ''
}

function mapTrip(item: unknown): BusTripSummary | null {
  const record = isRecord(item) ? item : {}
  const route = firstRecord(record.route)
  const rootCompany = firstRecord(record.company, record.organization, record.carrier)
  const vehicleRecord = firstRecord(record.vehicle, record.bus, record.transport)
  const fromCityName = resolveTripEndpointLabel(record, 'from')
  const toCityName = resolveTripEndpointLabel(record, 'to')
  const id = asId(record.id ?? record.tripId)

  if (!id) return null

  const basePrice =
    asNumber(record.price ?? record.basePrice ?? record.ticketPrice ?? route?.price ?? route?.basePrice) ?? null
  const rawMinPrice =
    asNumber(record.minPrice ?? route?.minPrice ?? record.lowestPrice ?? record.startingPrice) ?? null
  const minPrice =
    basePrice != null && rawMinPrice != null ? Math.min(basePrice, rawMinPrice) : rawMinPrice
  const price = minPrice ?? basePrice
  const availableSeats =
    asNumber(record.availableSeats ?? record.freeSeats ?? record.seatsAvailable ?? record.remainingSeats) ?? null
  const status = asString(record.status ?? record.tripStatus, 'UNKNOWN').toUpperCase()
  const vehicle = mapVehicle({
    ...(vehicleRecord ?? {}),
    companyName:
      asString(
        vehicleRecord?.companyName ??
          vehicleRecord?.organizationName ??
          vehicleRecord?.carrierName ??
          rootCompany?.name ??
          rootCompany?.nameRu ??
          record.companyName ??
          record.organizationName ??
          record.carrierName,
      ) || undefined,
  })

  return {
    id,
    tripNumber:
      firstNonEmptyString(
        record.tripNumber,
        record.number,
        record.displayNumber,
        record.tripCode,
        record.code,
        record.tripNo,
      ) || id,
    routeName: asString(record.routeName ?? route?.name) || resolveRouteName(fromCityName, toCityName),
    fromCityName: fromCityName || 'Не указано',
    toCityName: toCityName || 'Не указано',
    departureAt: asString(
      record.departureAt ?? record.departureTime ?? record.departAt ?? record.departureDateTime ?? record.startAt,
    ) || null,
    arrivalAt: asString(
      record.arrivalAt ?? record.arrivalTime ?? record.arriveAt ?? record.arrivalDateTime ?? record.endAt,
    ) || null,
    price,
    basePrice,
    minPrice,
    availableSeats,
    status,
    vehicle,
  }
}

function mapTripDetail(value: unknown): BusTripDetail {
  const summary = mapTrip(value) ?? {
    id: '',
    tripNumber: null,
    routeName: 'Маршрут не указан',
    fromCityName: 'Не указано',
    toCityName: 'Не указано',
    departureAt: null,
    arrivalAt: null,
    price: null,
    basePrice: null,
    minPrice: null,
    availableSeats: null,
    status: 'UNKNOWN',
    vehicle: null,
  }
  const record = isRecord(value) ? value : {}
  const stations = collectList(record.stations ?? record.stationStops ?? record.routeStations)
    .map((item, index) => mapStation(item, index))
    .filter((item): item is BusTripStation => item != null)
    .sort((left, right) => left.order - right.order)

  return {
    ...summary,
    stations,
  }
}

function normalizeSeatStatus(value: unknown): BusSeatStatus {
  const normalized = asString(value, 'UNKNOWN').toUpperCase()

  if (normalized === 'AVAILABLE') {
    return 'AVAILABLE'
  }

  if (normalized === 'HELD' || normalized === 'HOLD' || normalized === 'RESERVED' || normalized === 'BOOKED') {
    return 'HELD'
  }

  if (normalized === 'SOLD' || normalized === 'OCCUPIED' || normalized === 'ACTIVE' || normalized === 'USED') {
    return 'SOLD'
  }

  if (normalized === 'UNAVAILABLE' || normalized === 'BLOCKED') {
    return 'UNAVAILABLE'
  }

  return 'UNKNOWN'
}

function normalizeSeatType(value: unknown): BusSeatType {
  const normalized = asString(value, 'UNKNOWN').toUpperCase()

  if (normalized === 'SEAT' || normalized === 'CHAIR' || normalized === 'PLACE') {
    return 'SEAT'
  }

  if (normalized === 'BED' || normalized === 'SLEEPER' || normalized === 'SLEEP' || normalized === 'BERTH') {
    return normalized === 'BED' ? 'BED' : 'SLEEPER'
  }

  if (normalized === 'AISLE' || normalized === 'PASSAGE' || normalized === 'WALKWAY') {
    return 'AISLE'
  }

  if (normalized === 'DOOR' || normalized === 'ENTRY' || normalized === 'ENTRANCE') {
    return 'DOOR'
  }

  if (normalized === 'DRIVER' || normalized === 'CABIN' || normalized === 'STEERING') {
    return 'DRIVER'
  }

  if (normalized === 'EMPTY' || normalized === 'SPACE' || normalized === 'VOID') {
    return 'EMPTY'
  }

  return 'UNKNOWN'
}

function extractSeatArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (!isRecord(value)) {
    return []
  }

  const seatMap = firstRecord(value.seatMap, value.layout, value.scheme)
  const seatMapLayout = firstRecord(seatMap?.layout)
  const rootLayout = firstRecord(value.layout)
  const directSeats =
    firstArray(
      value.tripSeats,
      value.seats,
      value.items,
      value.results,
      seatMap?.seats,
      seatMap?.items,
      seatMap?.results,
      seatMap?.cells,
      seatMapLayout?.cells,
      seatMapLayout?.items,
      seatMapLayout?.results,
      value.cells,
      rootLayout?.cells,
      value.layoutSeats,
    ) ?? []

  if (directSeats.length > 0) {
    return directSeats
  }

  const rowGroups = firstArray(value.rows, seatMap?.rows) ?? []
  const nestedSeats = rowGroups.flatMap((row) => {
    if (!isRecord(row)) return []

    const rowSeats = firstArray(row.seats, row.items, row.cells, row.places, row.positions)
    if (rowSeats && rowSeats.length > 0) {
      return rowSeats.map((seat) => {
        if (!isRecord(seat)) return seat

        return {
          ...seat,
          row: seat.row ?? row.row ?? row.index ?? row.rowIndex,
          floor: seat.floor ?? row.floor ?? row.deck ?? row.level,
        }
      })
    }

    return []
  })

  return nestedSeats
}

function mapSeat(item: unknown, index: number): BusSeat | null {
  const record = isRecord(item) ? item : {}
  const position = firstRecord(record.position, record.seatPosition, record.layoutPosition, record.coordinates)
  const row = asNumber(record.row ?? record.rowIndex ?? record.rowNumber ?? record.y ?? position?.row ?? position?.y)
  const column = asNumber(
    record.column ?? record.col ?? record.columnIndex ?? record.colIndex ?? record.x ?? position?.column ?? position?.x,
  )
  const x = asNumber(record.x ?? record.column ?? record.col ?? record.columnIndex ?? record.colIndex ?? position?.x)
  const y = asNumber(record.y ?? record.row ?? record.rowIndex ?? record.rowNumber ?? position?.y)
  const label = asString(
    record.label ?? record.seatLabel ?? record.name ?? record.seatNumber ?? record.number ?? record.code,
  )
  const id = asId(record.id ?? record.seatId ?? label, `seat-${index + 1}`)
  const deck = asString(record.deck ?? record.level ?? record.floor ?? position?.deck ?? position?.level ?? position?.floor) || null
  const level =
    asString(record.level ?? record.deck ?? record.floor ?? position?.level ?? position?.deck ?? position?.floor) || null
  const floor =
    asString(record.floor ?? record.deck ?? record.level ?? position?.floor ?? position?.deck ?? position?.level) || null
  const type = normalizeSeatType(
    record.type ?? record.cellType ?? record.seatType ?? record.kind ?? record.placeType ?? position?.type,
  )

  if (!id) return null

  return {
    id,
    label: label || `Место ${index + 1}`,
    row,
    column,
    x,
    y,
    deck,
    level,
    floor,
    type: type === 'UNKNOWN' && label ? 'SEAT' : type,
    status: normalizeSeatStatus(record.status ?? record.availabilityStatus ?? record.seatStatus),
    price: asNumber(record.price ?? record.seatPrice ?? record.tariff ?? record.amount) ?? null,
  }
}

export async function getBusCities() {
  const result = await backendGet<unknown>('/bus-client/cities')

  return collectList(result)
    .map(mapCity)
    .filter((item): item is BusCity => item != null)
    .sort((left, right) => left.label.localeCompare(right.label, 'ru'))
}

export async function searchBusTrips(params: BusTripSearchParams) {
  const query = new URLSearchParams({
    fromCityId: params.fromCityId,
    toCityId: params.toCityId,
    date: params.date,
  })
  const result = await backendGet<unknown>(`/bus-client/trips/search?${query.toString()}`)
  const trips = collectList(result)
    .map(mapTrip)
    .filter((item): item is BusTripSummary => item != null)

  debugBusPayload('[bus search response]', {
    raw: result,
    trips: trips.map((trip) => ({
      tripId: trip.id,
      departureAt: trip.departureAt,
      arrivalAt: trip.arrivalAt,
      fromCityName: trip.fromCityName,
      toCityName: trip.toCityName,
      status: trip.status,
      availableSeats: trip.availableSeats,
    })),
  })

  return trips
}

export async function getBusTrip(id: string) {
  const result = await backendGet<unknown>(`/bus-client/trips/${encodeURIComponent(id)}`)
  const trip = mapTripDetail(result)

  debugBusPayload('[bus trip detail response]', {
    raw: result,
    tripId: trip.id,
    departureAt: trip.departureAt,
    arrivalAt: trip.arrivalAt,
    stationsCount: trip.stations.length,
    availableSeats: trip.availableSeats,
    vehicle: trip.vehicle,
  })

  return trip
}

export async function getBusTripSeats(id: string) {
  const result = await backendGet<unknown>(`/bus-client/trips/${encodeURIComponent(id)}/seats`)
  const record = isRecord(result) ? result : {}
  const seats = extractSeatArray(result)
    .map((item, index) => mapSeat(item, index))
    .filter((item): item is BusSeat => item != null)

  debugBusPayload('[bus seats response]', {
    raw: result,
    tripId: asId(record.tripId ?? record.id, id) || id,
    seatsCount: seats.length,
    seatsPreview: seats.slice(0, 10).map((seat) => ({
      id: seat.id,
      label: seat.label,
      row: seat.row,
      column: seat.column,
      x: seat.x,
      y: seat.y,
      deck: seat.deck,
      level: seat.level,
      floor: seat.floor,
      type: seat.type,
      status: seat.status,
      price: seat.price,
    })),
  })

  return {
    tripId: asId(record.tripId ?? record.id, id) || id,
    seats,
  } satisfies BusTripSeats
}
