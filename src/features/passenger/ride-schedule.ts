export type RideScheduleMode = 'immediate' | 'scheduled'

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function getLocalDateInputValue(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-')
}

export function getLocalTimeInputValue(date = new Date()) {
  return [pad2(date.getHours()), pad2(date.getMinutes())].join(':')
}

export function getRideScheduleMinTime(dateValue: string) {
  const trimmedDate = String(dateValue ?? '').trim()
  if (!trimmedDate) return ''

  const today = getLocalDateInputValue()
  if (trimmedDate !== today) return ''

  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return getLocalTimeInputValue(now)
}

function parseRideScheduleDateTime(date: string, time: string) {
  const trimmedDate = String(date ?? '').trim()
  const trimmedTime = String(time ?? '').trim()

  if (!trimmedDate || !trimmedTime) return null

  const parsed = new Date(`${trimmedDate}T${trimmedTime}:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function buildScheduledAt(date: string, time: string) {
  const parsed = parseRideScheduleDateTime(date, time)
  return parsed ? parsed.toISOString() : null
}

export function isScheduledInFuture(date: string, time: string) {
  const scheduledAt = parseRideScheduleDateTime(date, time)
  if (!scheduledAt) return false

  const minAllowedAt = new Date(Date.now() + 5 * 60 * 1000)
  return scheduledAt.getTime() >= minAllowedAt.getTime()
}

export function isRideScheduleValid(mode: RideScheduleMode, date: string, time: string) {
  if (mode !== 'scheduled') return true
  return isScheduledInFuture(date, time)
}

export const buildRideScheduledAt = buildScheduledAt
export const isRideScheduledAtInFuture = isScheduledInFuture
