import type { DriverApplicationDraft } from '../../../types/domain'

type CityOption = {
  id: number | string
  name: string
}

type DriverApplicationDraftLike = DriverApplicationDraft & {
  city?: string | { id?: string | number | null; name?: string | null; cityName?: string | null; nameRu?: string | null }
  cityName?: string
  year?: string | number
  manufactureYear?: string | number
  productionYear?: string | number
  yearOfManufacture?: string | number
  vehicle?: Record<string, unknown>
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asOptionalStringId(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeYearValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }

  const text = asTrimmedString(value)
  if (!text) return ''

  const parsed = Number(text)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : text
}

function hasReadyDocument(document: unknown): boolean {
  const record = asRecord(document)
  if (!record) return false

  return Boolean(
    asTrimmedString(record.filePath) ||
      asTrimmedString(record.url) ||
      asTrimmedString(record.file_path),
  )
}

function hasNonEmptyDocuments(documents: unknown): documents is DriverApplicationDraft['documents'] {
  return Array.isArray(documents) && documents.some((document) => hasReadyDocument(document))
}

function findCityByName(cities: readonly CityOption[], cityName: string) {
  const normalizedTarget = cityName.trim().toLocaleLowerCase('ru-RU')
  if (!normalizedTarget) return null

  return (
    cities.find((city) => city.name.trim().toLocaleLowerCase('ru-RU') === normalizedTarget) ??
    null
  )
}

function getVehicleRecord(draft: DriverApplicationDraftLike) {
  return asRecord(draft.vehicle) ?? {}
}

export function getDriverApplicationCityId(
  draft: DriverApplicationDraftLike,
  cities: readonly CityOption[] = [],
): string {
  const directCityId = asOptionalStringId(draft.cityId)
  if (directCityId) return directCityId

  const cityRecord = asRecord(draft.city)
  const nestedCityId = asOptionalStringId(cityRecord?.id)
  if (nestedCityId) return nestedCityId

  const cityName = getDriverApplicationCityName(draft, cities)
  const matchedCity = cityName ? findCityByName(cities, cityName) : null
  return matchedCity ? String(matchedCity.id) : ''
}

export function getDriverApplicationCityName(
  draft: DriverApplicationDraftLike,
  cities: readonly CityOption[] = [],
): string {
  const directCityName = asTrimmedString(draft.city)
  if (directCityName) return directCityName

  const legacyCityName = asTrimmedString(draft.cityName)
  if (legacyCityName) return legacyCityName

  const cityRecord = asRecord(draft.city)
  const nestedCityName =
    asTrimmedString(cityRecord?.name) ||
    asTrimmedString(cityRecord?.cityName) ||
    asTrimmedString(cityRecord?.nameRu)
  if (nestedCityName) return nestedCityName

  const cityId = asOptionalStringId(draft.cityId) || asOptionalStringId(cityRecord?.id)
  if (!cityId) return ''

  const matchedCity = cities.find((city) => String(city.id) === cityId) ?? null
  return matchedCity?.name?.trim() ?? ''
}

export function getDriverApplicationVehicleYear(draft: DriverApplicationDraftLike): string {
  const vehicleRecord = getVehicleRecord(draft)

  return (
    normalizeYearValue(vehicleRecord.year) ||
    normalizeYearValue(draft.vehicleYear) ||
    normalizeYearValue(draft.year) ||
    normalizeYearValue(draft.manufactureYear) ||
    normalizeYearValue(draft.productionYear) ||
    normalizeYearValue(draft.yearOfManufacture)
  )
}

export function normalizeDriverApplicationDraft(
  draft: DriverApplicationDraftLike,
  options?: {
    cities?: readonly CityOption[]
  },
): DriverApplicationDraft {
  const cities = options?.cities ?? []
  const cityId = getDriverApplicationCityId(draft, cities)
  const cityName = getDriverApplicationCityName(draft, cities)
  const vehicleYear = getDriverApplicationVehicleYear(draft)
  const vehicleRecord = getVehicleRecord(draft)

  return {
    ...draft,
    city: cityName || asTrimmedString(draft.city),
    cityName: cityName || undefined,
    cityId: cityId || undefined,
    vehicleYear: vehicleYear || normalizeYearValue(vehicleRecord.year),
    vehicle: {
      ...vehicleRecord,
      ...((vehicleYear || normalizeYearValue(vehicleRecord.year))
        ? { year: vehicleYear || normalizeYearValue(vehicleRecord.year) }
        : {}),
    },
  }
}

export function mergeDriverApplicationDraft(
  currentDraft: DriverApplicationDraftLike,
  incomingDraft?: Partial<DriverApplicationDraftLike> | null,
  options?: {
    cities?: readonly CityOption[]
  },
): DriverApplicationDraft {
  const incoming = incomingDraft ?? {}
  const normalizedCurrent = normalizeDriverApplicationDraft(currentDraft, options)
  const incomingVehicle = asRecord(incoming.vehicle) ?? {}
  const currentVehicle = getVehicleRecord(normalizedCurrent)

  const cityName =
    getDriverApplicationCityName(incoming as DriverApplicationDraftLike, options?.cities) ||
    getDriverApplicationCityName(normalizedCurrent, options?.cities)
  const cityId =
    getDriverApplicationCityId(incoming as DriverApplicationDraftLike, options?.cities) ||
    getDriverApplicationCityId(
      {
        ...normalizedCurrent,
        city: cityName || normalizedCurrent.city,
        cityName: cityName || normalizedCurrent.cityName,
      },
      options?.cities,
    ) ||
    normalizedCurrent.cityId ||
    ''
  const vehicleYear =
    getDriverApplicationVehicleYear(incoming as DriverApplicationDraftLike) ||
    getDriverApplicationVehicleYear(normalizedCurrent)
  const documents =
    hasNonEmptyDocuments(incoming.documents) || !hasNonEmptyDocuments(normalizedCurrent.documents)
      ? (Array.isArray(incoming.documents) ? incoming.documents : normalizedCurrent.documents)
      : normalizedCurrent.documents

  return normalizeDriverApplicationDraft(
    {
      ...normalizedCurrent,
      ...incoming,
      city: cityName || normalizedCurrent.city,
      cityName: cityName || normalizedCurrent.cityName,
      cityId: cityId || normalizedCurrent.cityId,
      vehicleYear: vehicleYear || normalizedCurrent.vehicleYear,
      vehicle: {
        ...currentVehicle,
        ...incomingVehicle,
        ...((vehicleYear || normalizeYearValue(currentVehicle.year))
          ? { year: vehicleYear || normalizeYearValue(currentVehicle.year) }
          : {}),
      },
      documents,
    } as DriverApplicationDraftLike,
    options,
  )
}

export function getMissingDriverApplicationFields(
  draft: DriverApplicationDraftLike,
  options?: {
    cities?: readonly CityOption[]
    vehicleBrandSelected?: boolean
    vehicleModelSelected?: boolean
    vehiclePlateValid?: boolean
    vehicleColorSelected?: boolean
    vehicleSeatsValid?: boolean
    vehicleBodyTypeSelected?: boolean
  },
): string[] {
  const normalizedDraft = normalizeDriverApplicationDraft(draft, { cities: options?.cities })
  const vehicleYear = getDriverApplicationVehicleYear(normalizedDraft)
  const vehicleYearNumber = Number(vehicleYear)
  const currentVehicleYear = new Date().getFullYear()
  const vehicleYearValid =
    vehicleYear.trim().length > 0 &&
    Number.isInteger(vehicleYearNumber) &&
    vehicleYearNumber >= 1990 &&
    vehicleYearNumber <= currentVehicleYear + 1

  return [
    !normalizedDraft.fullName.trim() && 'ФИО',
    !normalizedDraft.phone.trim() && 'Телефон',
    !getDriverApplicationCityId(normalizedDraft, options?.cities) && 'Город',
    options?.vehicleBrandSelected === false && 'Марка',
    options?.vehicleModelSelected === false && 'Модель',
    !vehicleYearValid && 'Год',
    options?.vehiclePlateValid === false && 'Госномер',
    options?.vehicleColorSelected === false && 'Цвет',
    options?.vehicleSeatsValid === false && 'Мест',
    options?.vehicleBodyTypeSelected === false && 'Тип кузова',
  ].filter((value): value is string => Boolean(value))
}
