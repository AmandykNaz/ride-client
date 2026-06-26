import type {
  ParcelSize,
  RideOrderStatus,
  RideRequestStatus,
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

export function formatRideRequestStatusLabel(status?: RideRequestStatus | string | null) {
  const normalized = typeof status === 'string' ? status.trim().toUpperCase() : status

  switch (normalized) {
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
    case 'IN_PROGRESS':
      return 'В поездке'
    case 'COMPLETED':
      return 'Завершена'
    case 'CANCELLED':
      return 'Отменена'
    case 'CONVERTED_TO_ORDER':
      return 'Водитель назначен'
    case 'EXPIRED':
      return 'Истекла'
    default:
      return 'Статус неизвестен'
  }
}

export function formatRideOrderStatusLabel(status?: RideOrderStatus | string | null) {
  switch (status) {
    case 'DRIVER_ASSIGNED':
      return 'Водитель назначен'
    case 'DRIVER_ON_WAY':
      return 'Водитель едет'
    case 'DRIVER_ARRIVED':
      return 'Водитель на месте'
    case 'IN_PROGRESS':
      return 'Поездка идёт'
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
