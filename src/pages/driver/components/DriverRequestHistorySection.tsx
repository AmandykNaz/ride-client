import { ShieldAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { formatKzt, formatRideRequestStatusLabel, formatShortDateTime, getVehicleDisplayParts } from '../../../lib/format'
import { getDriverRequestHistory } from '../../../features/driver/api/driver.api'
import type { RideDriverRequestHistoryItem } from '../../../features/driver/api/driver.types'
import {
  createDriverRideRequestReview,
  getDriverMyRideRequestReview,
} from '../../../features/ride-safety/api/ride-reviews.api'
import type { RideReview } from '../../../features/ride-safety/api/ride-reviews.types'
import { useAppActions } from '../../../providers/AppStateProvider'
import { BackendApiError, BackendAuthError } from '../../../shared/api/backend'
import { RideRequestReviewSheet } from '../../../features/ride-safety/components/RideRequestReviewSheet'

type DriverRequestHistorySectionProps = {
  historyReloadKey?: number
  onRetry?: () => Promise<void> | void
  title?: string
  description?: string
}

type HistoryStatus = 'loading' | 'success' | 'error'

export function DriverRequestHistorySection({
  historyReloadKey = 0,
  onRetry,
  title = 'История заявок',
  description = 'Последние контакты и заявки после открытия контактов.',
}: DriverRequestHistorySectionProps) {
  const [historySearch, setHistorySearch] = useState('')
  const [historyItems, setHistoryItems] = useState<RideDriverRequestHistoryItem[]>([])
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('loading')
  const [historyError, setHistoryError] = useState('')
  const [retryLoading, setRetryLoading] = useState(false)
  const [reviewsByRequestId, setReviewsByRequestId] = useState<Record<string, RideReview | null>>({})
  const [reviewSheetRequestId, setReviewSheetRequestId] = useState<string | null>(null)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const actions = useAppActions()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setHistoryStatus('loading')
      setHistoryError('')

      try {
        const result = await getDriverRequestHistory({
          search: historySearch.trim() || undefined,
          take: 10,
          skip: 0,
        })

        if (!cancelled) {
          setHistoryItems(result.items)
          setHistoryStatus('success')
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(resolveHistoryErrorMessage(error))
          setHistoryItems([])
          setHistoryStatus('error')
        }
      } finally {
        if (!cancelled) {
          setRetryLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [historyReloadKey, historySearch])

  useEffect(() => {
    const pendingItems = historyItems.filter((item) => reviewsByRequestId[item.requestId] === undefined)
    if (pendingItems.length === 0) return

    let cancelled = false

    const load = async () => {
      const entries = await Promise.all(
        pendingItems.map(async (item) => {
          try {
            const result = await getDriverMyRideRequestReview(item.requestId)
            return [item.requestId, result.review] as const
          } catch {
            return [item.requestId, null] as const
          }
        }),
      )

      if (!cancelled) {
        setReviewsByRequestId((current) => {
          const next = { ...current }
          for (const [requestId, review] of entries) {
            next[requestId] = review
          }
          return next
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [historyItems, reviewsByRequestId])

  const reviewSheetItem = historyItems.find((item) => item.requestId === reviewSheetRequestId) ?? null

  const handleOpenReviewSheet = (requestId: string) => {
    setReviewSheetRequestId(requestId)
    setReviewError(null)
    setReviewSuccess(false)
  }

  const handleCloseReviewSheet = () => {
    setReviewSheetRequestId(null)
    setReviewError(null)
    setReviewSuccess(false)
    setReviewSubmitting(false)
  }

  const handleSubmitReview = async ({ rating, comment }: { rating: number; comment?: string }) => {
    if (!reviewSheetItem) return

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const created = await createDriverRideRequestReview(reviewSheetItem.requestId, {
        rating,
        comment,
        contactUnlockId: reviewSheetItem.contactUnlockId,
      })

      setReviewsByRequestId((current) => ({
        ...current,
        [reviewSheetItem.requestId]: created,
      }))
      handleCloseReviewSheet()
    } catch (error) {
      setReviewError(resolveReviewErrorMessage(error))
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleRetry = async () => {
    if (!onRetry) return

    setRetryLoading(true)

    try {
      await onRetry()
    } finally {
      setRetryLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-surface-soft p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{title}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <label className="block sm:w-72">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Поиск
          </span>
          <input
            type="search"
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
            placeholder="Маршрут, пассажир или ID"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
          />
        </label>
      </div>

      {historyStatus === 'loading' ? (
        <p className="mt-4 text-sm text-muted">Загружаем историю...</p>
      ) : historyStatus === 'error' ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white px-4 py-5">
          <p className="text-sm text-rose-700">{historyError}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={retryLoading}
              className="mt-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Повторить
            </button>
          ) : null}
        </div>
      ) : historyItems.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white px-4 py-5 text-sm text-muted">
          История появится после открытия контактов.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {historyItems.map((item) => (
            <article
              key={`${item.requestId}:${item.contactOpenedAt ?? item.createdAt ?? ''}`}
              className="rounded-3xl border border-border/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                    Заявка #{item.requestId}
                  </p>
                  {item.orderId ? (
                    <p className="mt-1 text-xs text-muted">Order #{item.orderId}</p>
                  ) : null}
                </div>
                <div className="max-w-full rounded-2xl bg-surface-soft px-3 py-2 text-xs font-semibold leading-snug text-ink sm:max-w-[220px]">
                  {formatRideRequestStatusLabel(item.status)}
                </div>
              </div>

              <p className="mt-3 text-sm font-semibold leading-6 text-ink sm:text-[15px]">
                {(item.originText || 'Не указано')} → {(item.destinationText || 'Не указано')}
              </p>

              <div className="mt-4 space-y-3">
                <HistoryField label="Пассажир" value={item.passengerName || 'Не указан'} />
                {item.passengerPhone ? (
                  <HistoryField label="Телефон пассажира" value={item.passengerPhone} />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <HistoryField label="Результат звонка" value={getCallOutcomeLabel(item.callOutcome)} />
                  <HistoryField label="Открыта" value={formatHistoryDate(item.contactOpenedAt || item.createdAt)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <HistoryField label="Авто" value={<VehicleHistoryValue vehicle={item} />} />
                  <HistoryField
                    label="Цена клиента"
                    value={typeof item.requestedPrice === 'number' ? formatKzt(item.requestedPrice) : 'Не указана'}
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    actions.openRideComplaintSheet({
                      targetType: 'REQUEST_CONTACT',
                      requestId: item.requestId,
                      contactUnlockId: item.contactUnlockId,
                      reporterRole: 'DRIVER',
                      title: item.passengerName || 'Пассажир',
                      route: `${item.originText || 'Не указано'} → ${item.destinationText || 'Не указано'}`,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  <ShieldAlert className="h-4 w-4 text-accent" />
                  Пожаловаться
                </button>

                {reviewsByRequestId[item.requestId] ? (
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                    Ваша оценка: {reviewsByRequestId[item.requestId]?.rating ?? '—'}/5
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenReviewSheet(item.requestId)}
                    className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
                  >
                    Оценить пассажира
                  </button>
                )}

                {item.callOutcomeNote ? (
                  <div className="rounded-2xl bg-surface-soft px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Комментарий</p>
                    <p className="mt-1 text-sm leading-6 text-ink">{item.callOutcomeNote}</p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <RideRequestReviewSheet
        key={reviewSheetItem?.requestId ?? 'closed'}
        open={reviewSheetItem != null}
        title="Оценить пассажира"
        subjectName={reviewSheetItem?.passengerName ?? 'Пассажир'}
        route={reviewSheetItem ? `${itemRoute(reviewSheetItem)}` : null}
        priceLabel={
          reviewSheetItem && typeof reviewSheetItem.requestedPrice === 'number'
            ? formatKzt(reviewSheetItem.requestedPrice)
            : null
        }
        submitLabel="Сохранить оценку"
        submitting={reviewSubmitting}
        error={reviewError}
        success={reviewSuccess}
        successMessage="Оценка сохранена."
        onSubmit={handleSubmitReview}
        onClose={handleCloseReviewSheet}
      />
    </div>
  )
}

function itemRoute(item: RideDriverRequestHistoryItem) {
  return `${item.originText || 'Не указано'} → ${item.destinationText || 'Не указано'}`
}

function getCallOutcomeLabel(outcome?: string | null) {
  switch (String(outcome ?? '').trim().toUpperCase()) {
    case 'AGREED_OFFLINE':
      return 'Договорились'
    case 'NO_ANSWER':
      return 'Не дозвонился'
    case 'DECLINED':
      return 'Неактуально'
    case 'OTHER':
      return 'Другое'
    default:
      return 'Не указан'
  }
}

function resolveHistoryErrorMessage(error: unknown) {
  if (error instanceof BackendAuthError) {
    return 'Войдите заново.'
  }

  if (error instanceof BackendApiError) {
    if (error.status === 404) {
      return 'Endpoint истории не найден: /ride/driver/requests/history'
    }

    if (error.status === 500) {
      return 'Не удалось загрузить историю.'
    }

    if (!error.status && error.code === 'NETWORK_ERROR') {
      return 'Backend недоступен. Проверьте VITE_API_BASE_URL и запущен ли backend.'
    }

    return error.message || 'Не удалось загрузить историю.'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось загрузить историю.'
}

function resolveReviewErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    const message = error.message.trim()

    if (message === 'Driver profile not found') {
      return 'Не удалось определить профиль водителя. Обновите экран или войдите заново.'
    }

    if (message === 'Passenger profile not found') {
      return 'Не удалось определить профиль пассажира. Обновите экран или войдите заново.'
    }

    if (message) {
      return message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось сохранить оценку.'
}

function VehicleHistoryValue({
  vehicle,
}: {
  vehicle?:
    | {
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
      }
    | null
}) {
  const { vehicleName, plateNumber, colorName } = getVehicleDisplayParts(vehicle)

  if (vehicleName && plateNumber) {
    return (
      <span className="block">
        <span className="block">{vehicleName}</span>
        <span className="mt-1 block">{plateNumber}</span>
        {colorName ? <span className="mt-1 block">Цвет: {colorName}</span> : null}
      </span>
    )
  }

  if (vehicleName || plateNumber || colorName) {
    return (
      <span className="block">
        <span className="block">{vehicleName || plateNumber || 'Авто не указано'}</span>
        {vehicleName && plateNumber ? null : plateNumber && vehicleName !== plateNumber ? (
          <span className="mt-1 block">{plateNumber}</span>
        ) : null}
        {colorName ? <span className="mt-1 block">Цвет: {colorName}</span> : null}
      </span>
    )
  }

  return <span>Авто не указано</span>
}

function HistoryField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-soft px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <div className="mt-1 break-words text-sm leading-6 text-ink">{value}</div>
    </div>
  )
}

function formatHistoryDate(value?: string) {
  return formatShortDateTime(value)
}
