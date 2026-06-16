import type { ParcelSize, RideOrderStatus, RideRequestStatus } from '../types/domain'

const currencyFormatter = new Intl.NumberFormat('ru-KZ', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 0,
})

export function formatKzt(amount: number) {
  return currencyFormatter.format(amount)
}

export function formatRoute(from: string, to: string) {
  return `${from} → ${to}`
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
  switch (status) {
    case 'SEARCHING':
      return 'Поиск водителя'
    case 'OFFERED':
      return 'Есть предложения'
    case 'ACCEPTED':
      return 'Заявка принята'
    case 'CANCELLED':
      return 'Отменена'
    case 'EXPIRED':
      return 'Истекла'
    case 'CONVERTED_TO_ORDER':
      return 'Создан заказ'
    default:
      return status ?? '—'
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
      return status ?? '—'
  }
}
