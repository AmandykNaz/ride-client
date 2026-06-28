import { useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'

import {
  formatCountdown,
  formatKzt,
  formatRideRequestWhenLabel,
} from '../../lib/format'
import { cn } from '../../lib/cn'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

export default function PassengerOffersPage() {
  const {
    activeRideRequest,
    driverOffers,
    rideDraft,
    rideFlowError,
    isRideOffersLoading,
    isRideActionLoading,
  } = useAppState()
  const actions = useAppActions()
  const loadOffersRef = useRef(actions.loadActiveRequestOffers)
  const offersListRef = useRef<HTMLDivElement | null>(null)
  const activeRideRequestId = activeRideRequest?.id ?? null
  const activeRideRequestBackendId =
    activeRideRequest && /^\d+$/.test((activeRideRequest.backendId ?? activeRideRequest.id).trim())
      ? (activeRideRequest.backendId ?? activeRideRequest.id).trim()
      : null
  const activeRideRequestStatus = activeRideRequest?.status ?? null
  const requestPrice = Number.isFinite(Number(rideDraft.price)) && Number(rideDraft.price) > 0
    ? Number(rideDraft.price)
    : activeRideRequest?.price ?? 0
  const requestTypeLabel = rideDraft.type === 'full' ? 'Весь салон' : 'С попутчиками'

  useEffect(() => {
    loadOffersRef.current = actions.loadActiveRequestOffers
  }, [actions.loadActiveRequestOffers])

  useEffect(() => {
    if (
      !activeRideRequestId ||
      !activeRideRequestBackendId ||
      (activeRideRequestStatus !== 'SEARCHING' && activeRideRequestStatus !== 'OFFERED')
    ) {
      if (activeRideRequestId && !activeRideRequestBackendId) {
        console.warn('[ride] PassengerOffersPage: skipping polling for non-numeric request id', activeRideRequestId)
      }
      return
    }

    let cancelled = false
    const refresh = () => {
      if (cancelled) return
      void loadOffersRef.current()
    }

    refresh()
    const timer = window.setInterval(refresh, 7000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeRideRequestBackendId, activeRideRequestId, activeRideRequestStatus])

  if (!activeRideRequest) {
    return (
      <PageCard
        eyebrow="Пассажир"
        title="Поиск водителя"
        description="Здесь появятся предложения после создания заявки."
      >
        <button
          type="button"
          onClick={() => actions.setScreen('passengerOrder')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к заявке
        </button>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      {rideFlowError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rideFlowError}
        </div>
      ) : null}

      <PageCard
        eyebrow="Заявка на поиск водителя"
        title="Ищем водителей."
        description="Ожидайте предложений."
      >
        <ActiveRideRequestSummaryCard
          key={`${activeRideRequestBackendId ?? activeRideRequest.id}:${activeRideRequest.createdAt}:${activeRideRequest.expiresAt ?? ''}`}
          request={activeRideRequest}
          requestPrice={requestPrice}
          requestTypeLabel={requestTypeLabel}
          driverOffersCount={driverOffers.length}
          isRideOffersLoading={isRideOffersLoading}
          isRideActionLoading={isRideActionLoading}
          onCancel={() => actions.cancelActiveRide()}
          onAdjustPrice={(nextPrice) => actions.updateRideDraft({ price: String(Math.max(0, nextPrice)) })}
          onViewOffers={() => offersListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </PageCard>

      <div ref={offersListRef} className="space-y-3">
        {driverOffers.map((offer) => {
          return (
            <article
              key={offer.id}
              className="rounded-[28px] border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{offer.driverName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {offer.carModel} · {offer.carColor} · {offer.plate}
                  </p>
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {offer.rating}★ · {offer.tripsCount} поездок
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-soft p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                    ETA
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {offer.etaMinutes} минут
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                    Цена
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {offer.isCustomOffer ? (
                      <>
                        <span className="text-sm text-slate-400 line-through">
                          {formatKzt(offer.originalPrice)}
                        </span>
                        <span className="text-sm font-semibold text-accent">
                          {formatKzt(offer.offeredPrice)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-ink">
                        {formatKzt(offer.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {offer.isCustomOffer ? (
                <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                    Водитель предложил свою цену
                  </p>
                  <p className="mt-1 text-sm text-ink">{offer.comment}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">{offer.comment}</p>
              )}

              <button
                type="button"
                onClick={() => actions.acceptActiveRideOffer(offer.id)}
                className={cn(
                  'mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-60',
                  offer.isCustomOffer ? 'bg-amber-500' : 'bg-accent',
                )}
                disabled={isRideActionLoading}
              >
                {isRideActionLoading ? 'Обрабатываем...' : offer.isCustomOffer ? 'Принять предложение' : 'Выбрать водителя'}
              </button>
              <button
                type="button"
                onClick={() => actions.rejectActiveRideOffer(offer.id)}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60"
                disabled={isRideActionLoading}
              >
                Отклонить
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function ActiveRideRequestSummaryCard({
  request,
  requestPrice,
  requestTypeLabel,
  driverOffersCount,
  isRideOffersLoading,
  isRideActionLoading,
  onCancel,
  onAdjustPrice,
  onViewOffers,
}: {
  request: {
    id: string
    createdAt: string
    expiresAt?: string
    status: string
    from: string
    to: string
    originText?: string
    destinationText?: string
    price: number
    timingMode?: 'immediate' | 'scheduled'
    date: string
    time: string
    scheduledDate?: string
    scheduledTime?: string
  }
  requestPrice: number
  requestTypeLabel: string
  driverOffersCount: number
  isRideOffersLoading: boolean
  isRideActionLoading: boolean
  onCancel: () => void
  onAdjustPrice: (price: number) => void
  onViewOffers: () => void
}) {
  const { remainingSeconds, isExpired, extendSearch } = useRideSearchTimer(request)
  const fromValue = request.originText || request.from
  const toValue = request.destinationText || request.to
  const activeStep = driverOffersCount > 0 ? 3 : 2

  return (
    <div className="space-y-4">
      <CompactProgress activeStep={activeStep} isExpired={isExpired} />

      <div className="rounded-[28px] border border-border bg-surface-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-ink">
              {formatKzt(requestPrice)} · {formatRideRequestWhenLabel(request)}
            </p>
            <span className="mt-2 inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-ink">
              {requestTypeLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <RoutePoint label="Откуда" value={fromValue} />
          <RoutePoint label="Куда" value={toValue} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-border bg-white px-4 py-3">
          <p className="text-sm font-semibold text-ink">Предложений: {driverOffersCount}</p>
          {driverOffersCount > 0 ? (
            <button
              type="button"
              onClick={onViewOffers}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Посмотреть предложения
            </button>
          ) : (
            <p className="text-sm text-muted">Ищем подходящих водителей</p>
          )}
        </div>

        <CompactSearchTimer
          remainingSeconds={remainingSeconds}
          isExpired={isExpired}
          isRideOffersLoading={isRideOffersLoading}
          onCancel={onCancel}
          onExtend={extendSearch}
        />
      </div>

      <div className="sticky bottom-3 z-20">
        {isExpired ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-3 shadow-lg shadow-slate-900/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Время поиска истекло</p>
                <p className="text-xs text-amber-900/80">Можно продлить поиск или отменить заявку</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    extendSearch()
                  }}
                  className="rounded-2xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Продлить поиск
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-2xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900"
                  disabled={isRideActionLoading}
                >
                  Отменить заявку
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-border bg-white p-3 shadow-lg shadow-slate-900/5">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <button
                type="button"
                onClick={() => onAdjustPrice(Math.max(0, requestPrice - 100))}
                className="flex h-11 items-center justify-center rounded-2xl border border-border bg-surface-soft px-3 text-sm font-semibold text-ink"
              >
                -100
              </button>
              <div className="rounded-2xl bg-surface-soft px-4 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Цена
                </p>
                <p className="mt-1 text-base font-semibold text-ink">{formatKzt(requestPrice)}</p>
              </div>
              <button
                type="button"
                onClick={() => onAdjustPrice(requestPrice + 100)}
                className="flex h-11 items-center justify-center rounded-2xl border border-border bg-surface-soft px-3 text-sm font-semibold text-ink"
              >
                +100
              </button>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              disabled={isRideActionLoading}
            >
              Отменить заявку
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CompactProgress({
  activeStep,
  isExpired,
}: {
  activeStep: number
  isExpired: boolean
}) {
  const steps = ['Заявка', 'Поиск', 'Предложения', 'Заказ']
  const progress = isExpired ? 1 : activeStep === 2 ? 0.55 : activeStep === 3 ? 0.82 : 1

  return (
    <div className="space-y-2">
      <div className="h-1 w-full rounded-full bg-slate-100">
        <div
          className="h-1 rounded-full bg-accent transition-all"
          style={{ width: `${Math.max(18, progress * 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {steps.map((step, index) => (
          <span
            key={step}
            className={cn(
              index + 1 <= activeStep ? 'text-ink' : '',
              isExpired && index === 1 ? 'text-accent' : '',
            )}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}

function RoutePoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-border bg-white px-4 py-3">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-ink">{value}</p>
      </div>
    </div>
  )
}

function CompactSearchTimer({
  remainingSeconds,
  isExpired,
  isRideOffersLoading,
  onCancel,
  onExtend,
}: {
  remainingSeconds: number
  isExpired: boolean
  isRideOffersLoading: boolean
  onCancel: () => void
  onExtend: () => void
}) {
  if (isExpired) {
    return (
      <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Время поиска истекло</p>
        <p className="mt-1 text-sm">Можно продлить поиск или отменить заявку</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExtend}
            className="rounded-2xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Продлить поиск
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900"
          >
            Отменить заявку
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Clock3 className="h-4 w-4 text-accent" />
        <span>Поиск активен ещё {formatCountdown(remainingSeconds)}</span>
      </div>
      <span className="text-xs text-muted">{isRideOffersLoading ? 'Обновляем...' : 'В процессе'}</span>
    </div>
  )
}

function useRideSearchTimer(request: {
  createdAt: string
  expiresAt?: string
  status: string
}) {
  const [deadlineAt, setDeadlineAt] = useState(() => getInitialDeadline(request))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const remainingSeconds = Math.max(0, Math.floor((deadlineAt - now) / 1000))
  const isExpired = request.status === 'EXPIRED' || remainingSeconds <= 0

  const extendSearch = () => {
    setDeadlineAt(Date.now() + 30 * 60 * 1000)
    setNow(Date.now())
  }

  return {
    remainingSeconds,
    isExpired,
    extendSearch,
  }
}

function getInitialDeadline(request: { createdAt: string; expiresAt?: string }) {
  if (request.expiresAt) {
    const expiresAt = new Date(request.expiresAt).getTime()
    if (!Number.isNaN(expiresAt)) return expiresAt
  }

  const createdAt = new Date(request.createdAt).getTime()
  if (!Number.isNaN(createdAt)) {
    return createdAt + 30 * 60 * 1000
  }

  return Date.now() + 30 * 60 * 1000
}
