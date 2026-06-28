import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'

import {
  formatCountdown,
  formatKzt,
  formatRideRequestWhenLabel,
} from '../../lib/format'
import { cn } from '../../lib/cn'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'

const CANCEL_REASONS = [
  { code: 'PRICE_CHANGE', label: 'Хочу изменить цену' },
  { code: 'NO_LONGER_RELEVANT', label: 'Поездка больше не актуальна' },
  { code: 'NO_OFFERS', label: 'Нет предложений от водителей' },
  { code: 'TIME_CHANGE', label: 'Хочу изменить время отправления' },
  { code: 'WRONG_ADDRESS', label: 'Неверный адрес' },
] as const

export default function PassengerOffersPage() {
  const {
    activeRideRequest,
    driverOffers,
    rideFlowError,
    isRideOffersLoading,
    isRideActionLoading,
  } = useAppState()
  const actions = useAppActions()
  const loadOffersRef = useRef(actions.loadActiveRequestOffers)
  const offersListRef = useRef<HTMLDivElement | null>(null)
  const cancelRedirectTimerRef = useRef<number | null>(null)
  const [cancelStage, setCancelStage] = useState<'closed' | 'confirm' | 'reason'>('closed')
  const [cancelReasonCode, setCancelReasonCode] = useState<(typeof CANCEL_REASONS)[number]['code'] | 'OTHER' | ''>('')
  const [cancelReasonText, setCancelReasonText] = useState('')
  const [cancelNotice, setCancelNotice] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const canSubmitCancel = cancelReasonCode === 'OTHER' ? cancelReasonText.trim().length > 0 : Boolean(cancelReasonCode)
  const activeRideRequestId = activeRideRequest?.id ?? null
  const activeRideRequestBackendId =
    activeRideRequest && /^\d+$/.test((activeRideRequest.backendId ?? activeRideRequest.id).trim())
      ? (activeRideRequest.backendId ?? activeRideRequest.id).trim()
      : null
  const activeRideRequestStatus = activeRideRequest?.status ?? null
  const requestPrice = activeRideRequest?.price ?? 0
  const requestTypeLabel = activeRideRequest?.type === 'full' ? 'Весь салон' : 'С попутчиками'
  const searchTimer = useRideSearchTimer(activeRideRequest)

  useEffect(() => {
    loadOffersRef.current = actions.loadActiveRequestOffers
  }, [actions.loadActiveRequestOffers])

  useEffect(() => {
    return () => {
      if (cancelRedirectTimerRef.current) {
        window.clearTimeout(cancelRedirectTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (
      !activeRideRequestId ||
      !activeRideRequestBackendId ||
      searchTimer.isExpired ||
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
  }, [activeRideRequestBackendId, activeRideRequestId, activeRideRequestStatus, searchTimer.isExpired])

  const openCancelConfirmation = () => {
    setCancelNotice(null)
    setCancelReasonCode('')
    setCancelReasonText('')
    setCancelStage('confirm')
  }

  const handleProceedToReason = () => {
    setCancelStage('reason')
  }

  const handleCancelConfirmationClose = () => {
    if (isCancelling) return
    setCancelStage('closed')
    setCancelReasonCode('')
    setCancelReasonText('')
  }

  const handleCancelSubmit = async () => {
    if (!activeRideRequestBackendId || isCancelling) return

    setIsCancelling(true)
    try {
      const cancelled = await actions.cancelActiveRide({
        reasonCode: cancelReasonCode || undefined,
        reasonText: cancelReasonText.trim() || undefined,
      })
      if (!cancelled) {
        return
      }
      setCancelStage('closed')
      setCancelReasonCode('')
      setCancelReasonText('')
      setCancelNotice('Заявка отменена')

      if (cancelRedirectTimerRef.current) {
        window.clearTimeout(cancelRedirectTimerRef.current)
      }

      cancelRedirectTimerRef.current = window.setTimeout(() => {
        setCancelNotice(null)
        actions.setPassengerOrdersTab('rides')
        cancelRedirectTimerRef.current = null
      }, 900)
    } finally {
      setIsCancelling(false)
    }
  }

  const openPassengerOrders = () => {
    actions.setPassengerOrdersTab('rides')
  }

  if (!activeRideRequest) {
    return (
      <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {cancelNotice ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {cancelNotice}
          </div>
        ) : null}
        <PageCard
          eyebrow="Пассажир"
          title={cancelNotice ? 'Заявка отменена' : 'Поиск водителя'}
          description={
            cancelNotice
              ? 'Вы можете продолжить поиск или открыть свои заказы.'
              : 'Здесь появятся предложения после создания заявки.'
          }
        >
          <button
            type="button"
            onClick={cancelNotice ? openPassengerOrders : () => actions.setScreen('passengerOrder')}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            {cancelNotice ? 'Мои заказы' : 'Вернуться к заявке'}
          </button>
        </PageCard>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {rideFlowError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rideFlowError}
        </div>
      ) : null}

      <PageCard
        eyebrow="Заявка на поиск водителя"
        title={
          searchTimer.isExpired
            ? 'Время поиска истекло'
            : driverOffers.length > 0
              ? 'Предложения от водителей'
              : 'Ищем подходящих водителей'
        }
        description={
          searchTimer.isExpired
            ? 'Продлите поиск, чтобы водители снова увидели заявку'
            : driverOffers.length > 0
              ? 'Выберите подходящее предложение.'
              : 'Ожидайте предложений.'
        }
      >
        <ActiveRideRequestSummaryCard
          key={`${activeRideRequestBackendId ?? activeRideRequest.id}:${activeRideRequest.createdAt}:${activeRideRequest.expiresAt ?? ''}:${activeRideRequest.searchRemainingSeconds ?? ''}:${activeRideRequest.priceUpdatedAt ?? ''}`}
          request={activeRideRequest}
          requestPrice={requestPrice}
          requestTypeLabel={requestTypeLabel}
          driverOffersCount={driverOffers.length}
          isRideOffersLoading={isRideOffersLoading}
          isRideActionLoading={isRideActionLoading}
          remainingSeconds={searchTimer.remainingSeconds}
          isExpired={searchTimer.isExpired}
          onCancel={openCancelConfirmation}
          onExtend={() => actions.extendPassengerRideRequest()}
          onAdjustPrice={(nextPrice) => actions.updatePassengerRideRequestPrice(nextPrice)}
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

      {cancelNotice ? (
        <div className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-[520px] rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-900/10">
          {cancelNotice}
        </div>
      ) : null}

      <OverlaySheet
        open={cancelStage === 'confirm'}
        title="Хотите отменить заявку?"
        onClose={handleCancelConfirmationClose}
        position="bottom"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Чтобы найти водителя быстрее, можно поднять цену или дождаться предложений.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleCancelConfirmationClose}
              disabled={isCancelling}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
            >
              Продолжить поиск
            </button>
            <button
              type="button"
              onClick={handleProceedToReason}
              disabled={isCancelling}
              className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700"
            >
              Отменить заявку
            </button>
          </div>
        </div>
      </OverlaySheet>

      <OverlaySheet
        open={cancelStage === 'reason'}
        title="Почему вы отменили?"
        onClose={handleCancelConfirmationClose}
        position="bottom"
      >
        <div className="space-y-4">
          <div className="grid gap-2">
            {CANCEL_REASONS.map((reason) => (
              <button
                key={reason.code}
                type="button"
                onClick={() => {
                  setCancelReasonCode(reason.code)
                  setCancelReasonText('')
                }}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                  cancelReasonCode === reason.code
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-border bg-white text-ink',
                )}
              >
                {reason.label}
              </button>
            ))}
              <button
              type="button"
              onClick={() => {
                setCancelReasonCode('OTHER')
              }}
              className={cn(
                'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                cancelReasonCode === 'OTHER'
                  ? 'border-accent bg-accent/8 text-accent'
                  : 'border-border bg-white text-ink',
              )}
            >
              Укажите другую причину
            </button>
          </div>

          {cancelReasonCode === 'OTHER' ? (
            <textarea
              value={cancelReasonText}
              onChange={(event) => setCancelReasonText(event.target.value)}
              placeholder="Опишите причину отмены"
              className="min-h-[96px] w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          ) : null}

          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleCancelSubmit}
              disabled={isCancelling || !canSubmitCancel}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isCancelling ? 'Отменяем...' : 'Отменить заявку'}
            </button>
            <button
              type="button"
              onClick={handleCancelConfirmationClose}
              disabled={isCancelling}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Продолжить поиск
            </button>
          </div>
        </div>
      </OverlaySheet>
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
  remainingSeconds,
  isExpired,
  onCancel,
  onExtend,
  onAdjustPrice,
  onViewOffers,
}: {
  request: {
    id: string
    createdAt: string
    expiresAt?: string
    searchRemainingSeconds?: number
    priceUpdatedAt?: string
    status: string
    from: string
    to: string
    originText?: string
    destinationText?: string
    price: number
    timingMode?: 'NOW' | 'SCHEDULED' | 'immediate' | 'scheduled'
    date: string
    time: string
    scheduledDate?: string
    scheduledTime?: string
    scheduledAt?: string | null
  }
  requestPrice: number
  requestTypeLabel: string
  driverOffersCount: number
  isRideOffersLoading: boolean
  isRideActionLoading: boolean
  remainingSeconds: number
  isExpired: boolean
  onCancel: () => void
  onExtend: () => void
  onAdjustPrice: (price: number) => void
  onViewOffers: () => void
}) {
  const fromValue = request.originText || request.from
  const toValue = request.destinationText || request.to
  const activeStep = request.status === 'CONVERTED_TO_ORDER' ? 4 : driverOffersCount > 0 ? 3 : 2
  const currentPrice = Math.max(100, requestPrice || 0)

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
          isRideActionLoading={isRideActionLoading}
          requestPrice={currentPrice}
          onCancel={onCancel}
          onExtend={onExtend}
          onAdjustPrice={onAdjustPrice}
        />
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
  const progress = isExpired ? 1 : activeStep === 2 ? 0.52 : activeStep === 3 ? 0.8 : 1
  const label =
    activeStep === 4 ? 'Заказ создан' : activeStep === 3 ? 'Предложения' : 'Поиск водителя'

  return (
    <div className="space-y-2">
      <div className="h-1 w-full rounded-full bg-slate-100">
        <div
          className="h-1 rounded-full bg-accent transition-all"
          style={{ width: `${Math.max(18, progress * 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        <span>
          Этап {Math.min(activeStep, 4)} из 4 · {label}
        </span>
        <span className={cn(isExpired ? 'text-amber-700' : 'text-accent')}>
          {isExpired ? 'Истекло' : 'Активно'}
        </span>
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
  isRideActionLoading,
  requestPrice,
  onCancel,
  onExtend,
  onAdjustPrice,
}: {
  remainingSeconds: number
  isExpired: boolean
  isRideOffersLoading: boolean
  isRideActionLoading: boolean
  requestPrice: number
  onCancel: () => void
  onExtend: () => void
  onAdjustPrice: (price: number) => void
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
            disabled={isRideActionLoading}
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
    )
  }

  const nextPriceDown = Math.max(100, requestPrice - 100)
  const nextPriceUp = requestPrice + 100

  return (
    <div className="space-y-3 rounded-[22px] border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Clock3 className="h-4 w-4 text-accent" />
          <span>Поиск активен ещё {formatCountdown(remainingSeconds)}</span>
        </div>
        <span className="text-xs text-muted">{isRideOffersLoading ? 'Обновляем...' : 'В процессе'}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => onAdjustPrice(nextPriceDown)}
          className="flex h-11 items-center justify-center rounded-2xl border border-border bg-surface-soft px-3 text-sm font-semibold text-ink disabled:opacity-60"
          disabled={isRideActionLoading || requestPrice <= 100}
        >
          -100
        </button>
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Цена</p>
          <p className="mt-1 text-base font-semibold text-ink">{formatKzt(requestPrice)}</p>
        </div>
        <button
          type="button"
          onClick={() => onAdjustPrice(nextPriceUp)}
          className="flex h-11 items-center justify-center rounded-2xl border border-border bg-surface-soft px-3 text-sm font-semibold text-ink disabled:opacity-60"
          disabled={isRideActionLoading}
        >
          +100
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl border border-border bg-white px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          disabled={isRideActionLoading}
        >
          Отменить заявку
        </button>
      </div>
    </div>
  )
}

function useRideSearchTimer(request: {
  createdAt: string
  searchRemainingSeconds?: number
  expiresAt?: string
  status: string
  timingMode?: 'NOW' | 'SCHEDULED' | 'immediate' | 'scheduled'
} | null) {
  const deadlineAt = useMemo(() => getInitialDeadline(request), [
    request,
  ])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const remainingSeconds = Math.max(0, Math.floor((deadlineAt - now) / 1000))
  const isExpired = request?.status === 'EXPIRED' || remainingSeconds <= 0

  return {
    remainingSeconds,
    isExpired,
  }
}

function getInitialDeadline(request: { createdAt: string; searchRemainingSeconds?: number; expiresAt?: string } | null) {
  if (!request) {
    return Date.now() + 30 * 60 * 1000
  }

  const remainingSeconds = request.searchRemainingSeconds
  if (typeof remainingSeconds === 'number' && Number.isFinite(remainingSeconds)) {
    return Date.now() + Math.max(0, Math.trunc(remainingSeconds)) * 1000
  }

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
