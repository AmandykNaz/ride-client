import type { RideDriverAnnouncementStatus } from '../api/announcement.types'

export function formatDriverAnnouncementStatusLabel(status?: RideDriverAnnouncementStatus | string | null) {
  switch (String(status ?? '').trim().toUpperCase()) {
    case 'ACTIVE':
      return 'Активно'
    case 'PAUSED':
      return 'На паузе'
    case 'EXPIRED':
      return 'Истекло'
    case 'CANCELLED':
      return 'Отменено'
    case 'COMPLETED':
      return 'Завершено'
    default:
      return '—'
  }
}

export function formatDriverAnnouncementFeatureLabel(value: 'passengers' | 'parcels') {
  return value === 'passengers' ? 'Пассажиры' : 'Посылки'
}

