import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
  Loader2,
  LoaderCircle,
  MapPin,
  Save,
  Search,
} from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt, formatRoute, formatShortDate, formatShortDateTime } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { PageCard } from '../../shared/ui/PageCard'
import {
  getDriverAnnouncement,
  normalizeAnnouncementId,
  type RideDriverAnnouncement,
} from '../../features/announcements'
import { searchRideLocations } from '../../features/passenger/api/passenger-locations.api'
import type { RideLocation } from '../../features/passenger/api/passenger-locations.types'

type CitySelection = {
  id: number | null
  name: string
  regionName?: string
}

type AnnouncementFormState = {
  fromCity: CitySelection | null
  toCity: CitySelection | null
  date: string
  time: string
  pricePerSeat: string
  seatsAvailable: string
  comment: string
  acceptsPassengers: boolean
  acceptsParcels: boolean
}

type AnnouncementFieldErrors = {
  fromCity?: string
  toCity?: string
  date?: string
  time?: string
  pricePerSeat?: string
  seatsAvailable?: string
  comment?: string
  accepts?: string
}

type CityPickerTarget = 'from' | 'to'
const MAX_COMMENT_LENGTH = 300
const MAX_DAYS_AHEAD = 14
const MIN_ADVANCE_MINUTES = 30

function createEmptyForm(): AnnouncementFormState {
  return {
    fromCity: null,
    toCity: null,
    date: '',
    time: '',
    pricePerSeat: '',
    seatsAvailable: '',
    comment: '',
    acceptsPassengers: true,
    acceptsParcels: false,
  }
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function getLocalDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function getLocalTimeValue(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function parseIsoToLocalParts(value?: string | null) {
  if (!value) {
    return { date: '', time: '' }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { date: '', time: '' }
  }

  return {
    date: getLocalDateValue(parsed),
    time: getLocalTimeValue(parsed),
  }
}

function buildLocalDateTime(date: string, time: string) {
  const normalizedDate = String(date ?? '').trim()
  const normalizedTime = String(time ?? '').trim()

  if (!normalizedDate || !normalizedTime) return null

  const parsed = new Date(`${normalizedDate}T${normalizedTime}:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildScheduledAt(date: string, time: string) {
  const parsed = buildLocalDateTime(date, time)
  return parsed ? parsed.toISOString() : null
}

function normalizeSelectedCity(rawName?: string | null) {
  const name = String(rawName ?? '').trim()
  return name ? { id: null, name } satisfies CitySelection : null
}

function announcementToForm(announcement: RideDriverAnnouncement): AnnouncementFormState {
  const schedule = parseIsoToLocalParts(announcement.scheduledAt)

  return {
    fromCity: normalizeSelectedCity(announcement.fromText),
    toCity: normalizeSelectedCity(announcement.toText),
    date: schedule.date,
    time: schedule.time,
    pricePerSeat: String(announcement.pricePerSeat ?? ''),
    seatsAvailable: String(announcement.seatsAvailable ?? ''),
    comment: announcement.comment ?? '',
    acceptsPassengers: Boolean(announcement.acceptsPassengers),
    acceptsParcels: Boolean(announcement.acceptsParcels),
  }
}

function getScheduleBounds() {
  const minDate = new Date()
  minDate.setMinutes(minDate.getMinutes() + MIN_ADVANCE_MINUTES, 0, 0)

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD)
  maxDate.setHours(23, 59, 59, 999)

  return { minDate, maxDate }
}

function getMinTimeForDate(date: string) {
  const normalizedDate = String(date ?? '').trim()
  if (!normalizedDate) return ''

  const { minDate } = getScheduleBounds()
  if (normalizedDate !== getLocalDateValue(minDate)) {
    return ''
  }

  return getLocalTimeValue(minDate)
}

function getDateOptions() {
  return Array.from({ length: MAX_DAYS_AHEAD + 1 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)

    return {
      value: getLocalDateValue(date),
      title:
        index === 0
          ? 'Сегодня'
          : index === 1
            ? 'Завтра'
            : index === 2
              ? 'Послезавтра'
              : new Intl.DateTimeFormat('ru-RU', {
                  weekday: 'short',
                }).format(date),
      subtitle: formatShortDate(date.toISOString()),
    }
  })
}

function getCompactDateOptions() {
  return getDateOptions().slice(0, 3)
}

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function getCityDisplay(city: CitySelection | null) {
  if (!city?.name.trim()) return ''
  return city.regionName?.trim() ? `${city.name} · ${city.regionName}` : city.name
}

function resolveAnnouncementErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback
  }

  const uniqueParts = Array.from(
    new Set(
      error.message
        .split(/\r?\n|[;,]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  )
  const joined = uniqueParts.join('\n')

  if (/property\s+.+\s+should\s+not\s+exist/i.test(joined)) {
    return fallback
  }

  if (/Validation failed \(numeric string is expected\)/i.test(joined)) {
    return 'Не удалось открыть объявление. Попробуйте снова.'
  }

  return joined || fallback
}

function validateAnnouncementForm(form: AnnouncementFormState): AnnouncementFieldErrors {
  const errors: AnnouncementFieldErrors = {}
  const fromName = form.fromCity?.name.trim() ?? ''
  const toName = form.toCity?.name.trim() ?? ''

  if (!fromName) {
    errors.fromCity = 'Выберите город отправления.'
  }

  if (!toName) {
    errors.toCity = 'Выберите город назначения.'
  }

  if (fromName && toName) {
    const sameCityById =
      form.fromCity?.id != null &&
      form.toCity?.id != null &&
      form.fromCity.id === form.toCity.id
    const sameCityByName = fromName.toLowerCase() === toName.toLowerCase()

    if (sameCityById || sameCityByName) {
      errors.toCity = 'Город назначения должен отличаться от города отправления.'
    }
  }

  if (!form.date.trim()) {
    errors.date = 'Выберите дату поездки.'
  }

  if (!form.time.trim()) {
    errors.time = 'Выберите время отправления.'
  }

  const scheduled = buildLocalDateTime(form.date, form.time)
  const { minDate, maxDate } = getScheduleBounds()

  if (form.date.trim() && form.time.trim() && !scheduled) {
    errors.time = 'Укажите корректное время отправления.'
  }

  if (scheduled && scheduled.getTime() < minDate.getTime()) {
    errors.time = `Время отправления должно быть минимум через ${MIN_ADVANCE_MINUTES} минут.`
  }

  if (scheduled && scheduled.getTime() > maxDate.getTime()) {
    errors.date = `Объявление можно создать максимум на ${MAX_DAYS_AHEAD} дней вперёд.`
  }

  const price = Number(form.pricePerSeat)
  if (!form.pricePerSeat.trim()) {
    errors.pricePerSeat = 'Укажите цену за место.'
  } else if (!Number.isFinite(price)) {
    errors.pricePerSeat = 'Цена должна быть числом.'
  } else if (price < 500 || price > 100000) {
    errors.pricePerSeat = 'Цена должна быть от 500 до 100 000 ₸.'
  }

  const seats = Number(form.seatsAvailable)
  if (!form.seatsAvailable.trim()) {
    errors.seatsAvailable = 'Укажите количество мест.'
  } else if (!Number.isInteger(seats)) {
    errors.seatsAvailable = 'Количество мест должно быть целым числом.'
  } else if (seats < 1 || seats > 8) {
    errors.seatsAvailable = 'Количество мест должно быть от 1 до 8.'
  }

  if (form.comment.length > MAX_COMMENT_LENGTH) {
    errors.comment = `Комментарий должен быть не длиннее ${MAX_COMMENT_LENGTH} символов.`
  }

  if (!form.acceptsPassengers && !form.acceptsParcels) {
    errors.accepts = 'Выберите хотя бы один тип перевозки.'
  }

  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return <p className="mt-1 text-xs text-red-700">{message}</p>
}

function CityFieldButton({
  label,
  placeholder,
  value,
  error,
  onClick,
}: {
  label: string
  placeholder: string
  value: string
  error?: string
  onClick: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-sm outline-none transition',
          error ? 'border-red-300' : 'border-border hover:border-accent/40 focus:border-accent',
        )}
      >
        <span className={cn('min-w-0 truncate', value ? 'text-ink' : 'text-muted')}>
          {value || placeholder}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </button>
      <FieldError message={error} />
    </label>
  )
}

export default function DriverAnnouncementEditorPage() {
  const { driverAnnouncementEditorId, driverAnnouncements, isDriverActionLoading } = useAppState()
  const actions = useAppActions()
  const normalizedEditorId = driverAnnouncementEditorId
    ? normalizeAnnouncementId(driverAnnouncementEditorId)
    : null
  const cachedAnnouncement = useMemo(
    () =>
      normalizedEditorId
        ? driverAnnouncements.find((item) => item.id === normalizedEditorId) ?? null
        : null,
    [driverAnnouncements, normalizedEditorId],
  )
  const [form, setForm] = useState<AnnouncementFormState>(() =>
    cachedAnnouncement ? announcementToForm(cachedAnnouncement) : createEmptyForm(),
  )
  const [fieldErrors, setFieldErrors] = useState<AnnouncementFieldErrors>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(
    () => Boolean(driverAnnouncementEditorId && !cachedAnnouncement),
  )
  const [cityPickerTarget, setCityPickerTarget] = useState<CityPickerTarget | null>(null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<RideLocation[]>([])
  const [isSearchingCities, setIsSearchingCities] = useState(false)
  const [citySearchError, setCitySearchError] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const cityRequestRef = useRef(0)

  const compactDateOptions = useMemo(() => getCompactDateOptions(), [])
  const extendedDateOptions = useMemo(() => getDateOptions().slice(3), [])
  const selectedCity =
    cityPickerTarget === 'from' ? form.fromCity : cityPickerTarget === 'to' ? form.toCity : null
  const hasCityQuery = cityQuery.trim().length >= 2
  const visibleCityResults = hasCityQuery ? cityResults : []
  const visibleCitySearchError = hasCityQuery ? citySearchError : null
  const invalidEditorIdMessage =
    driverAnnouncementEditorId && !normalizedEditorId
      ? 'Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.'
      : null
  const summaryScheduledAt = buildScheduledAt(form.date, form.time)
  const shouldShowSummary =
    Boolean(form.fromCity?.name.trim()) &&
    Boolean(form.toCity?.name.trim()) &&
    Boolean(summaryScheduledAt)
  const summaryMeta = [
    summaryScheduledAt ? formatShortDateTime(summaryScheduledAt) : '',
    form.pricePerSeat.trim() ? formatKzt(Number(form.pricePerSeat)) : '',
    form.seatsAvailable.trim() ? `${form.seatsAvailable.trim()} мест` : '',
  ].filter(Boolean)

  useEffect(() => {
    if (!driverAnnouncementEditorId || cachedAnnouncement) {
      return
    }

    if (!normalizedEditorId) {
      return
    }

    let cancelled = false
    void getDriverAnnouncement(normalizedEditorId)
      .then((item) => {
        if (cancelled) return
        setForm(announcementToForm(item))
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(resolveAnnouncementErrorMessage(error, 'Не удалось загрузить объявление.'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAnnouncement(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cachedAnnouncement, driverAnnouncementEditorId, normalizedEditorId])

  useEffect(() => {
    if (!cityPickerTarget) {
      cityRequestRef.current += 1
      return
    }

    const trimmedQuery = cityQuery.trim()
    if (trimmedQuery.length < 2) {
      cityRequestRef.current += 1
      return
    }

    const requestId = ++cityRequestRef.current
    const timer = window.setTimeout(() => {
      setIsSearchingCities(true)
      setCitySearchError(null)

      void searchRideLocations(trimmedQuery, 10)
        .then((items) => {
          if (cityRequestRef.current !== requestId) return
          setCityResults(items)
        })
        .catch((error) => {
          if (cityRequestRef.current !== requestId) return
          setCityResults([])
          setCitySearchError(
            error instanceof Error && error.message.trim()
              ? error.message
              : 'Не удалось загрузить города.',
          )
        })
        .finally(() => {
          if (cityRequestRef.current !== requestId) return
          setIsSearchingCities(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [cityPickerTarget, cityQuery])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const updateForm = <K extends keyof AnnouncementFormState>(
    field: K,
    value: AnnouncementFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
  }

  const openCityPicker = (target: CityPickerTarget) => {
    setCityPickerTarget(target)
    setCityQuery(target === 'from' ? form.fromCity?.name ?? '' : form.toCity?.name ?? '')
    setCityResults([])
    setCitySearchError(null)
  }

  const closeCityPicker = () => {
    setCityPickerTarget(null)
    setCityQuery('')
    setCityResults([])
    setCitySearchError(null)
    setIsSearchingCities(false)
  }

  const handleCitySelection = (location: RideLocation) => {
    const nextCity: CitySelection = {
      id: location.id,
      name: location.nameRu.trim(),
      regionName: location.regionName?.trim() || undefined,
    }

    if (cityPickerTarget === 'from') {
      setForm((current) => ({ ...current, fromCity: nextCity }))
      setFieldErrors((current) => ({ ...current, fromCity: undefined }))
    } else if (cityPickerTarget === 'to') {
      setForm((current) => ({ ...current, toCity: nextCity }))
      setFieldErrors((current) => ({ ...current, toCity: undefined }))
    }

    setSubmitError(null)
    closeCityPicker()
  }

  const handleClose = () => {
    actions.closeDriverAnnouncementEditor()
  }

  const handleSubmit = async () => {
    const nextErrors = validateAnnouncementForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setSubmitError(null)
      return
    }

    setFieldErrors({})
    setSubmitError(null)
    setSuccessMessage(null)

    const payload = {
      fromText: form.fromCity?.name.trim() ?? '',
      toText: form.toCity?.name.trim() ?? '',
      scheduledAt: buildScheduledAt(form.date, form.time) ?? '',
      pricePerSeat: Number(form.pricePerSeat),
      seatsAvailable: Number(form.seatsAvailable),
      comment: form.comment.trim() || undefined,
      acceptsPassengers: form.acceptsPassengers,
      acceptsParcels: form.acceptsParcels,
    }

    try {
      if (normalizedEditorId) {
        await actions.updateDriverAnnouncement(normalizedEditorId, payload)
      } else {
        await actions.createDriverAnnouncement(payload)
      }

      setSuccessMessage(normalizedEditorId ? 'Объявление обновлено.' : 'Объявление создано.')
      closeTimerRef.current = window.setTimeout(() => {
        void actions.refreshDriverAnnouncements().finally(() => {
          actions.closeDriverAnnouncementEditor()
        })
      }, 500)
    } catch (error) {
      setSubmitError(resolveAnnouncementErrorMessage(error, 'Не удалось сохранить объявление.'))
    }
  }

  if (isLoadingAnnouncement && !invalidEditorIdMessage) {
    return (
      <PageCard
        eyebrow="Водитель"
        title={normalizedEditorId ? 'Редактирование объявления' : 'Создание объявления'}
        description="Загружаем данные объявления."
      >
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
          <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
          Подождите, данные объявления загружаются...
        </div>
      </PageCard>
    )
  }

  if (loadError || invalidEditorIdMessage) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Не удалось открыть объявление"
        description="Попробуйте вернуться к списку и открыть его снова."
      >
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {invalidEditorIdMessage ?? loadError}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к списку
        </button>
      </PageCard>
    )
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        <PageCard
          eyebrow="Водитель"
          title={normalizedEditorId ? 'Редактировать объявление' : 'Создать объявление'}
          description="Маршрут, время, цена и условия поездки"
        >
          {shouldShowSummary && summaryScheduledAt ? (
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
              <p className="font-semibold">
                {formatRoute(form.fromCity?.name ?? '', form.toCity?.name ?? '')}
              </p>
              <p className="mt-1 text-muted">{summaryMeta.join(' · ')}</p>
            </div>
          ) : null}

          <div className="grid gap-3">
            <CityFieldButton
              label="Откуда"
              placeholder="Выберите город отправления"
              value={getCityDisplay(form.fromCity)}
              error={fieldErrors.fromCity}
              onClick={() => openCityPicker('from')}
            />
            <CityFieldButton
              label="Куда"
              placeholder="Выберите город назначения"
              value={getCityDisplay(form.toCity)}
              error={fieldErrors.toCity}
              onClick={() => openCityPicker('to')}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Дата поездки</span>
            <div className="grid grid-cols-2 gap-2">
              {compactDateOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm('date', option.value)}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-left transition',
                    form.date === option.value
                      ? 'border-accent bg-accent/8 text-accent'
                      : 'border-border bg-white text-ink',
                  )}
                >
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className={cn('mt-1 block text-xs', form.date === option.value ? 'text-accent/80' : 'text-muted')}>
                    {option.subtitle}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
                className={cn(
                  'rounded-2xl border px-3 py-3 text-left transition',
                  !compactDateOptions.some((option) => option.value === form.date) && form.date
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-border bg-white text-ink',
                )}
              >
                <span className="block text-sm font-semibold">Другая дата</span>
                <span
                  className={cn(
                    'mt-1 block text-xs',
                    !compactDateOptions.some((option) => option.value === form.date) && form.date
                      ? 'text-accent/80'
                      : 'text-muted',
                  )}
                >
                  {!compactDateOptions.some((option) => option.value === form.date) && form.date
                    ? formatShortDate(new Date(`${form.date}T00:00:00`).toISOString())
                    : 'До 14 дней вперёд'}
                </span>
              </button>
            </div>
            <FieldError message={fieldErrors.date} />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Время отправления</span>
            <input
              type="time"
              value={form.time}
              min={getMinTimeForDate(form.date) || undefined}
              onChange={(event) => updateForm('time', event.target.value)}
              className={cn(
                'w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent',
                fieldErrors.time ? 'border-red-300' : 'border-border',
              )}
            />
            <p className="mt-1 text-xs text-muted">
              Если выбрана сегодняшняя дата, время должно быть минимум через {MIN_ADVANCE_MINUTES} минут.
            </p>
            <FieldError message={fieldErrors.time} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Цена за место</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.pricePerSeat}
                onChange={(event) => updateForm('pricePerSeat', sanitizeDigits(event.target.value))}
                placeholder="Например, 9000"
                className={cn(
                  'w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent',
                  fieldErrors.pricePerSeat ? 'border-red-300' : 'border-border',
                )}
              />
              <FieldError message={fieldErrors.pricePerSeat} />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Свободных мест</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.seatsAvailable}
                onChange={(event) => updateForm('seatsAvailable', sanitizeDigits(event.target.value))}
                placeholder="От 1 до 8"
                className={cn(
                  'w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent',
                  fieldErrors.seatsAvailable ? 'border-red-300' : 'border-border',
                )}
              />
              <FieldError message={fieldErrors.seatsAvailable} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
            <textarea
              value={form.comment}
              onChange={(event) => updateForm('comment', event.target.value)}
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Например, 1 сумка в багажнике, выезд без опозданий"
              className={cn(
                'w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent',
                fieldErrors.comment ? 'border-red-300' : 'border-border',
              )}
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
              <span>Комментарий необязателен</span>
              <span>
                {form.comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <FieldError message={fieldErrors.comment} />
          </label>

          <div className="space-y-3">
            <span className="block text-sm font-medium text-ink">Что вы везёте</span>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white px-4 py-3">
              <div>
                <span className="block text-sm font-medium text-ink">Принимаю пассажиров</span>
                <span className="block text-xs text-muted">Основной вариант для поездки.</span>
              </div>
              <input
                type="checkbox"
                checked={form.acceptsPassengers}
                onChange={(event) => updateForm('acceptsPassengers', event.target.checked)}
                className="h-5 w-5 rounded border-border text-accent focus:ring-accent"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white px-4 py-3">
              <div>
                <span className="block text-sm font-medium text-ink">Принимаю посылки</span>
                <span className="block text-xs text-muted">Можно совмещать с пассажирами.</span>
              </div>
              <input
                type="checkbox"
                checked={form.acceptsParcels}
                onChange={(event) => updateForm('acceptsParcels', event.target.checked)}
                className="h-5 w-5 rounded border-border text-accent focus:ring-accent"
              />
            </label>
            <FieldError message={fieldErrors.accepts} />
          </div>

          {submitError ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mr-2 inline-block h-4 w-4" />
              {successMessage}
            </div>
          ) : null}
        </PageCard>

        <div className="sticky bottom-0 rounded-[28px] border border-border bg-white/95 p-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isDriverActionLoading || successMessage !== null}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <Save className="h-4 w-4" />
              {isDriverActionLoading
                ? 'Сохраняем...'
                : normalizedEditorId
                  ? 'Сохранить изменения'
                  : 'Создать объявление'}
            </button>
          </div>
        </div>
      </div>

      <OverlaySheet
        open={cityPickerTarget != null}
        title={cityPickerTarget === 'from' ? 'Выберите город отправления' : 'Выберите город назначения'}
        onClose={closeCityPicker}
        position="bottom"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Поиск города</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={cityQuery}
                onChange={(event) => setCityQuery(event.target.value)}
                placeholder="Начните вводить город"
                className="w-full rounded-2xl border border-border bg-surface-soft py-3 pl-11 pr-4 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </label>

          {selectedCity ? (
            <div className="rounded-2xl border border-accent/15 bg-accent/6 px-4 py-3 text-sm text-ink">
              <p className="font-medium">Текущий выбор</p>
              <p className="mt-1 text-muted">{getCityDisplay(selectedCity)}</p>
            </div>
          ) : null}

          <div className="max-h-[44dvh] space-y-2 overflow-y-auto pr-1">
            {!hasCityQuery ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                Введите минимум 2 символа для поиска города.
              </div>
            ) : null}

            {hasCityQuery && isSearchingCities ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-4 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Ищем города...
              </div>
            ) : null}

            {visibleCitySearchError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {visibleCitySearchError}
              </div>
            ) : null}

            {hasCityQuery &&
            !isSearchingCities &&
            !visibleCitySearchError &&
            visibleCityResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                Ничего не найдено. Попробуйте другой запрос.
              </div>
            ) : null}

            {visibleCityResults.map((location) => {
              const isSelected = selectedCity?.id === location.id

              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleCitySelection(location)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left transition hover:border-accent/30 hover:bg-accent/4"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-surface-soft text-accent">
                    {isSelected ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {location.displayName || location.nameRu}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {location.nameRu}
                      {location.regionName ? ` · ${location.regionName}` : ''}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </OverlaySheet>

      <OverlaySheet
        open={isDatePickerOpen}
        title="Выберите дату поездки"
        onClose={() => setIsDatePickerOpen(false)}
        position="bottom"
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-accent/15 bg-accent/6 px-4 py-3 text-sm text-ink">
            <p className="font-medium">Доступные даты</p>
            <p className="mt-1 text-muted">Объявление можно создать максимум на 14 дней вперёд.</p>
          </div>

          <div className="max-h-[48dvh] space-y-2 overflow-y-auto pr-1">
            {extendedDateOptions.map((option) => {
              const isSelected = option.value === form.date

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    updateForm('date', option.value)
                    setIsDatePickerOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition',
                    isSelected
                      ? 'border-accent bg-accent/8 text-accent'
                      : 'border-border bg-white text-ink',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-surface-soft text-accent">
                      {isSelected ? <Check className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.title}</span>
                      <span className="mt-1 block text-xs text-muted">{option.subtitle}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </OverlaySheet>
    </>
  )
}
