import type {
  ParcelSize,
  RideOrderStatus,
  RideRequestStatus,
  TripType,
  TopUpRequestMethod,
  TopUpRequestStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../types/domain'

const currencyFormatter = new Intl.NumberFormat('ru-KZ', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 0,
})

export function formatKzt(amount: number) {
  return currencyFormatter.format(amount)
}

export function formatRoute(from: string, to: string) {
  const fromLabel = String(from ?? '').trim()
  const toLabel = String(to ?? '').trim()

  if (!fromLabel && !toLabel) return '—'
  if (!fromLabel) return toLabel
  if (!toLabel) return fromLabel

  return `${fromLabel} → ${toLabel}`
}

export function formatRouteIfPresent(from: string, to: string) {
  const fromLabel = String(from ?? '').trim()
  const toLabel = String(to ?? '').trim()

  if (!fromLabel && !toLabel) return null
  if (!fromLabel) return toLabel
  if (!toLabel) return fromLabel

  return `${fromLabel} → ${toLabel}`
}

export function formatVehicleLabel(
  vehicle?: {
    vehicleName?: string | null
    vehiclePlate?: string | null
    vehiclePlateNumber?: string | null
    vehicleColorName?: string | null
    carModel?: string | null
    carColor?: string | null
    brand?: string | null
    model?: string | null
    color?: string | null
    colorName?: string | null
    plate?: string | null
    plateNumber?: string | null
  } | null,
  fallback = 'Авто не указано',
) {
  const { vehicleName, plateNumber } = formatVehicleParts(vehicle)
  const parts = [vehicleName, plateNumber].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : fallback
}

export function formatVehicleParts(
  vehicle?: {
    vehicleName?: string | null
    vehiclePlate?: string | null
    vehiclePlateNumber?: string | null
    vehicleColorName?: string | null
    carModel?: string | null
    carColor?: string | null
    brand?: string | null
    model?: string | null
    color?: string | null
    colorName?: string | null
    plate?: string | null
    plateNumber?: string | null
  } | null,
) {
  const vehicleName =
    String(vehicle?.vehicleName ?? '').trim() ||
    String(vehicle?.carModel ?? '').trim() ||
    [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ').trim()
  const plateNumber = formatKzPlateNumber(
    vehicle?.vehiclePlateNumber ?? vehicle?.vehiclePlate ?? vehicle?.plateNumber ?? vehicle?.plate ?? null,
  )
  const colorName =
    String(vehicle?.vehicleColorName ?? '').trim() ||
    String(vehicle?.colorName ?? '').trim() ||
    String(vehicle?.carColor ?? '').trim() ||
    String(vehicle?.color ?? '').trim()

  return {
    vehicleName,
    plateNumber,
    colorName,
  }
}

export const getVehicleDisplayParts = formatVehicleParts

function formatDateTimeParts(date: string, time: string) {
  const normalizedDate = String(date ?? '').trim()
  const normalizedTime = String(time ?? '').trim()

  if (!normalizedDate && !normalizedTime) {
    return '—'
  }

  if (!normalizedDate || !normalizedTime) {
    return normalizedDate || normalizedTime
  }

  const combined = new Date(`${normalizedDate}T${normalizedTime}`)
  if (Number.isNaN(combined.getTime())) {
    return `${normalizedDate} ${normalizedTime}`.trim()
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(combined)
}

function formatDateTimeValue(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return normalized
  }

  return new Intl.DateTimeFormat('ru-RU', options).format(date)
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatShortTime(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const KZ_PLATE_REGION_CODES = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
]

const CYRILLIC_TO_LATIN_PLATE: Record<string, string> = {
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
  У: 'Y',
}

const KZ_PLATE_REGEX = /^(?!000)\d{3}[A-Z]{3}(0[1-9]|1[0-9]|20)$/

function transliterateKzPlateChars(value: string) {
  return value.replace(/[АВЕКМНОРСТХУ]/g, (char) => CYRILLIC_TO_LATIN_PLATE[char] ?? char)
}

export function normalizeKzPlateInput(input?: string | null) {
  const uppercased = String(input ?? '').trim().toUpperCase()
  if (!uppercased) return ''

  const transliterated = transliterateKzPlateChars(uppercased)
  const compact = transliterated.replace(/[^A-Z0-9]/g, '')
  const withoutPrefix = compact.startsWith('KZ') ? compact.slice(2) : compact

  return withoutPrefix.slice(0, 8)
}

export function isValidKzPlateNumber(value?: string | null) {
  return KZ_PLATE_REGEX.test(normalizeKzPlateInput(value))
}

export function formatKzPlateNumber(value?: string | null) {
  const normalized = normalizeKzPlateInput(value)
  if (!isValidKzPlateNumber(normalized)) {
    return normalized
  }

  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 8)}`
}

export function getKzPlateValidationError(value?: string | null) {
  const normalized = normalizeKzPlateInput(value)

  if (!normalized) {
    return 'Введите госномер автомобиля.'
  }

  if (normalized.startsWith('000')) {
    return 'Номер не может начинаться с 000.'
  }

  if (normalized.length === 8) {
    const regionCode = normalized.slice(6, 8)
    const firstSixMatch = /^\d{3}[A-Z]{3}$/.test(normalized.slice(0, 6))

    if (firstSixMatch && /^\d{2}$/.test(regionCode) && !KZ_PLATE_REGION_CODES.includes(regionCode)) {
      return 'Код региона госномера должен быть от 01 до 20.'
    }
  }

  if (!KZ_PLATE_REGEX.test(normalized)) {
    return 'Госномер должен быть в формате 123 ABC 02.'
  }

  return null
}

export function formatParcelSizeLabel(size?: ParcelSize | string | null) {
  switch (size) {
    case 'SMALL':
      return 'Маленькая'
    case 'MEDIUM':
      return 'Средняя'
    case 'LARGE':
      return 'Большая'
    case 'OVERSIZED':
      return 'Негабарит'
    default:
      return size ?? '—'
  }
}

export function normalizeRideType(value?: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (
    normalized === 'shared' ||
    normalized === 'with-companions' ||
    normalized === 'with_companions' ||
    normalized === 'с попутчиками'
  ) {
    return 'shared' as const
  }

  if (
    normalized === 'full' ||
    normalized === 'whole-car' ||
    normalized === 'whole_car' ||
    normalized === 'private' ||
    normalized === 'full-car' ||
    normalized === 'full_car' ||
    normalized === 'весь салон'
  ) {
    return 'full' as const
  }

  return null
}

export function isSharedRideType(value?: TripType | string | null) {
  return normalizeRideType(value) === 'shared'
}

export function isPrivateRideType(value?: TripType | string | null) {
  return normalizeRideType(value) === 'full'
}

export function formatRideTypeLabel(value?: TripType | string | null) {
  const normalized = normalizeRideType(value)

  if (normalized === 'shared') {
    return 'С попутчиками'
  }

  if (normalized === 'full') {
    return 'Весь салон'
  }

  return 'Тип поездки не указан'
}

export function formatRideRequestStatusLabel(status?: RideRequestStatus | string | null) {
  const normalized = typeof status === 'string' ? status.trim().toUpperCase() : status

  switch (normalized) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'Активна'
    case 'SEARCHING':
      return 'Поиск водителя'
    case 'OFFERED':
    case 'HAS_OFFERS':
      return 'Есть предложения'
    case 'ACCEPTED':
    case 'DRIVER_ASSIGNED':
      return 'Водитель назначен'
    case 'DRIVER_ON_WAY':
      return 'Водитель в пути'
    case 'DRIVER_ARRIVED':
      return 'Водитель прибыл'
    case 'COMPLETED':
      return 'Завершена'
    case 'CANCELLED':
      return 'Отменена'
    case 'CLOSED_EXTERNALLY':
      return 'Закрыта по договорённости'
    case 'CONVERTED_TO_ORDER':
      return 'Водитель назначен'
    case 'EXPIRED':
      return 'Истекла'
    default:
      return 'Статус неизвестен'
  }
}

export function formatPassengerRideRequestStatusLabel(request?: {
  status?: RideRequestStatus | string | null
  cancelledBy?: string | null
}) {
  const normalizedStatus = String(request?.status ?? '').trim().toUpperCase()

  if (normalizedStatus === 'CANCELLED') {
    if (String(request?.cancelledBy ?? '').trim().toUpperCase() === 'PASSENGER') {
      return 'Отменена пассажиром'
    }

    return 'Отменена'
  }

  if (normalizedStatus === 'CLOSED_EXTERNALLY' || normalizedStatus === 'CLOSED_EXTERNALLY'.toLowerCase().toUpperCase()) {
    return 'Закрыта по договорённости'
  }

  return formatRideRequestStatusLabel(request?.status ?? null)
}

export function formatRideOrderStatusLabel(status?: RideOrderStatus | string | null) {
  switch (String(status ?? '').trim().toUpperCase()) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'Активна'
    case 'DRIVER_ASSIGNED':
      return 'Водитель назначен'
    case 'DRIVER_ON_WAY':
      return 'Водитель едет'
    case 'DRIVER_ARRIVED':
      return 'Водитель на месте'
    case 'COMPLETED':
      return 'Завершена'
    case 'CANCELLED':
      return 'Отменена'
    case 'DISPUTE':
      return 'Спор'
    default:
      return 'Статус неизвестен'
  }
}

export function formatPassengerHistoryStatusLabel(status?: string | null) {
  switch (String(status ?? '').trim().toUpperCase()) {
    case 'COMPLETED':
      return 'Завершена'
    case 'CANCELLED':
      return 'Отменена'
    case 'CLOSED_EXTERNALLY':
      return 'Закрыта по договорённости'
    default:
      return formatRideOrderStatusLabel(status)
  }
}

export function formatShortDateTime(value?: string | null) {
  if (!value) return 'Не указано'

  return (
    formatDateTimeValue(value, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }) || 'Не указано'
  )
}

export function formatShortDate(value?: string | null) {
  if (!value) return 'Не указано'

  return (
    formatDateTimeValue(value, {
      day: 'numeric',
      month: 'short',
    }) || 'Не указано'
  )
}

export function formatFullDateTime(value?: string | null) {
  if (!value) return 'Не указано'

  return (
    formatDateTimeValue(value, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) || 'Не указано'
  )
}

export function formatShortDateTimeParts(date?: string | null, time?: string | null) {
  const normalizedDate = String(date ?? '').trim()
  const normalizedTime = String(time ?? '').trim()

  if (!normalizedDate && !normalizedTime) return 'Не указано'
  if (!normalizedDate || !normalizedTime) return normalizedDate || normalizedTime

  const combined = new Date(`${normalizedDate}T${normalizedTime}`)
  if (Number.isNaN(combined.getTime())) {
    return `${normalizedDate} ${normalizedTime}`.trim()
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(combined)
}

export function formatRideRequestWhenLabel(
  request?:
    | {
        timingMode?: 'NOW' | 'SCHEDULED' | 'immediate' | 'scheduled'
        date?: string
        time?: string
        scheduledDate?: string
        scheduledTime?: string
        scheduledAt?: string | null
      }
    | null,
) {
  if (!request) return 'Сегодня, как можно скорее'

  if (request.scheduledAt?.trim()) {
    const scheduledAt = new Date(request.scheduledAt)
    if (!Number.isNaN(scheduledAt.getTime())) {
      if (isSameLocalDay(scheduledAt, new Date())) {
        return `Сегодня, ${formatShortTime(scheduledAt)}`
      }

      return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(scheduledAt)
    }
  }

  const hasScheduledFields = Boolean(request.scheduledDate?.trim() || request.scheduledTime?.trim())
  const timingMode = typeof request.timingMode === 'string' ? request.timingMode.trim().toUpperCase() : ''

  if (timingMode === 'SCHEDULED' || timingMode === 'scheduled' || (hasScheduledFields && timingMode !== 'IMMEDIATE' && timingMode !== 'NOW')) {
    return (
      formatDateTimeParts(
        request.scheduledDate ?? request.date ?? '',
        request.scheduledTime ?? request.time ?? '',
      ) || 'Запланировано'
    )
  }

  return 'Сегодня, как можно скорее'
}

export function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatTopUpMethodLabel(method?: TopUpRequestMethod | string | null) {
  switch (method) {
    case 'KASPI':
    case 'KASPI_TRANSFER':
      return 'Kaspi'
    case 'KASPI_QR':
      return 'Kaspi QR'
    case 'HALYK':
      return 'Halyk'
    case 'CASH':
      return 'Наличные'
    case 'OTHER':
    case 'BANK':
    case 'BANK_TRANSFER':
      return 'Другое'
    default:
      return 'Другое'
  }
}

export function formatTopUpStatusLabel(status?: TopUpRequestStatus | string | null) {
  switch (status) {
    case 'PENDING_UPLOAD':
      return 'Ожидает чек'
    case 'PENDING_REVIEW':
      return 'На проверке'
    case 'APPROVED':
      return 'Подтверждено'
    case 'REJECTED':
      return 'Отклонено'
    case 'CANCELLED':
      return 'Отменено'
    default:
      return 'Статус неизвестен'
  }
}

export function getTopUpStatusTone(status?: TopUpRequestStatus | string | null) {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'REJECTED':
      return 'danger'
    case 'CANCELLED':
      return 'neutral'
    case 'PENDING_UPLOAD':
    case 'PENDING_REVIEW':
    default:
      return 'warning'
  }
}

export function formatWalletTransactionTypeLabel(type?: WalletTransactionType | string | null) {
  switch (type) {
    case 'TOP_UP_APPROVED':
      return 'Пополнение по заявке'
    case 'COMMISSION_CHARGED':
      return 'Комиссия сервиса'
    case 'COMMISSION_REFUND':
    case 'REFUND':
      return 'Возврат'
    case 'MANUAL_ADJUSTMENT':
      return 'Ручное пополнение'
    default:
      return 'Операция'
  }
}

export function formatWalletManualCreditReasonLabel(reason?: string | null) {
  switch (String(reason ?? '').trim().toUpperCase()) {
    case 'CASH_RECEIVED':
      return 'Наличные получены'
    case 'KASPI_TRANSFER_CONFIRMED':
    case 'KASPI_CONFIRMED_MANUALLY':
      return 'Kaspi перевод подтверждён'
    case 'HALYK_TRANSFER_CONFIRMED':
      return 'Halyk перевод подтверждён'
    case 'BALANCE_CORRECTION':
      return 'Корректировка баланса'
    case 'BONUS':
      return 'Бонус'
    case 'OTHER':
      return 'Другое'
    case 'SUPPORT_COMPENSATION':
      return 'Компенсация поддержки'
    default:
      return 'Другая причина'
  }
}

function isTechnicalTopUpComment(text?: string | null) {
  const normalized = text?.trim()
  if (!normalized) return false

  return /^approved top-up request #\d+$/i.test(normalized) || /^top-up request #\d+ approved$/i.test(normalized)
}

export function formatWalletTransactionStatusLabel(status?: WalletTransactionStatus | string | null) {
  switch (status) {
    case 'PENDING':
      return 'В обработке'
    case 'APPROVED':
      return 'Зачислено'
    case 'REJECTED':
      return 'Отклонено'
    case 'FAILED':
      return 'Ошибка'
    default:
      return 'Статус неизвестен'
  }
}

export function formatWalletTransactionDescription(
  description?: string | null,
  transaction?: {
    type?: WalletTransactionType | string | null
    publicCode?: string | null
    referenceNumber?: string | null
  } | null,
) {
  const text = description?.trim()
  const normalizedType = String(transaction?.type ?? '').trim().toUpperCase()

  if (normalizedType === 'TOP_UP_APPROVED') {
    const code = transaction?.publicCode?.trim() || transaction?.referenceNumber?.trim()
    if (text && !isTechnicalTopUpComment(text)) {
      return text
    }
    return code ? `Пополнение по заявке ${code}` : 'Подтверждённое пополнение по заявке'
  }

  if (normalizedType === 'MANUAL_ADJUSTMENT') {
    if (!text) {
      return 'Администратор пополнил баланс'
    }
    if (isTechnicalTopUpComment(text)) {
      return 'Подтверждённое пополнение по заявке'
    }
    return text
  }

  if (!text) {
    return transaction?.type ? formatWalletTransactionTypeLabel(transaction.type) : 'Операция'
  }

  if (/^approved top-up request #\d+$/i.test(text)) {
    return text.replace(/^approved top-up request #(\d+)$/i, 'Подтверждённое пополнение #$1')
  }

  if (/^top-up request #\d+ approved$/i.test(text)) {
    return text.replace(/^top-up request #(\d+) approved$/i, 'Пополнение #$1 подтверждено')
  }

  if (/^commission charged$/i.test(text)) {
    return 'Списана комиссия'
  }

  if (/^refund$/i.test(text)) {
    return 'Возврат'
  }

  if (/^top-up$/i.test(text)) {
    return 'Пополнение'
  }

  return text
}
