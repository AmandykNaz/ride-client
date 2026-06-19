import type { DriverApplicationDocument } from '../../../types/domain'

type DriverDocumentType = DriverApplicationDocument['type']

export const requiredDocumentDefinitions: Array<{ type: DriverDocumentType; label: string; required: true }> = [
  { type: 'DRIVER_LICENSE_FRONT', label: 'ВУ лицевая сторона', required: true },
  { type: 'DRIVER_LICENSE_BACK', label: 'ВУ обратная сторона', required: true },
  { type: 'VEHICLE_REGISTRATION', label: 'Техпаспорт / регистрация авто', required: true },
  { type: 'CAR_FRONT_PHOTO', label: 'Фото авто спереди', required: true },
]

export const optionalDocumentDefinitions: Array<{ type: DriverDocumentType; label: string; required?: false }> = [
  { type: 'CAR_BACK_PHOTO', label: 'Фото авто сзади' },
  { type: 'INTERIOR_PHOTO', label: 'Фото салона' },
  { type: 'TRUNK_PHOTO', label: 'Фото багажника' },
]

export const documentDefinitions = [...requiredDocumentDefinitions, ...optionalDocumentDefinitions]

export function documentTitle(type: DriverDocumentType) {
  return documentDefinitions.find((definition) => definition.type === type)?.label ?? type
}

export function formatFileSize(sizeBytes?: number) {
  if (sizeBytes == null) return '—'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
