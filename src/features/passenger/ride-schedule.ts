export type RideScheduleMode = 'immediate' | 'scheduled'

export const RIDE_SCHEDULE_MIN_ADVANCE_MINUTES = 30
export const PASSENGER_RIDE_REQUEST_MAX_DAYS_AHEAD = 7

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
  now.setMinutes(now.getMinutes() + RIDE_SCHEDULE_MIN_ADVANCE_MINUTES)
  return getLocalTimeInputValue(now)
}

export function getRideScheduleMaxDate(date = new Date()) {
  const maxDate = new Date(date)
  maxDate.setDate(maxDate.getDate() + PASSENGER_RIDE_REQUEST_MAX_DAYS_AHEAD)
  return getLocalDateInputValue(maxDate)
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

  const minAllowedAt = new Date(Date.now() + RIDE_SCHEDULE_MIN_ADVANCE_MINUTES * 60 * 1000)
  const maxAllowedAt = new Date()
  maxAllowedAt.setDate(maxAllowedAt.getDate() + PASSENGER_RIDE_REQUEST_MAX_DAYS_AHEAD)
  maxAllowedAt.setHours(23, 59, 59, 999)

  return scheduledAt.getTime() >= minAllowedAt.getTime() && scheduledAt.getTime() <= maxAllowedAt.getTime()
}

export function isRideScheduleValid(mode: RideScheduleMode, date: string, time: string) {
  if (mode !== 'scheduled') return true
  return isScheduledInFuture(date, time)
}

export const buildRideScheduledAt = buildScheduledAt
export const isRideScheduledAtInFuture = isScheduledInFuture
