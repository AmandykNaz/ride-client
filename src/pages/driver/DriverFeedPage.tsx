import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleGauge, Lock, Sparkles } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt, formatRoute, isPrivateRideType } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { DriverCounterOfferSheet } from '../../features/driver/components/DriverCounterOfferSheet'
import { DriverFeedOrderCard } from '../../features/driver/components/DriverFeedOrderCard'
import type { DriverCallOutcome, DriverCounterOffer, DriverFeedOrder } from '../../types/domain'
import { getDriverAccessState, getDriverWalletShortfall } from '../../features/driver/driver-status'
import { DriverBlockedStateCard } from './components/DriverBlockedStateCard'
import { DriverRecheckCard } from './components/DriverRecheckCard'

type FeedFilter = 'all' | 'ride' | 'parcel' | 'full'

const filterChips: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'ride', label: 'Межгород' },
  { id: 'parcel', label: 'Посылки' },
  { id: 'full', label: 'Весь салон' },
]

function matchesFilter(order: DriverFeedOrder, filter: FeedFilter) {
  if (filter === 'all') return true
  if (filter === 'ride') return order.category === 'ride'
  if (filter === 'parcel') return order.category === 'parcel'
  return order.category === 'ride' && isPrivateRideType(order.rideType)
}

function getCallOutcomeLabel(outcome: DriverCallOutcome) {
  switch (outcome) {
    case 'AGREED_OFFLINE':
      return 'Договорились'
    case 'NO_ANSWER':
      return 'Не дозвонился'
    case 'DECLINED':
      return 'Неактуально'
    case 'OTHER':
      return 'Другое'
    default:
      return 'Результат звонка'
  }
}

export default function DriverFeedPage() {
  const {
    driverVerificationStatus,
    driverFeedOrders,
    driverCounterOffers,
    driverProfile,
    driverWallet,
    driverAccess,
    activeRecheck,
    driverActiveOrder,
    isDriverFeedLoading,
    isDriverActionLoading,
    driverFlowError,
  } = useAppState()
  const actions = useAppActions()
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [unlockingRequestId, setUnlockingRequestId] = useState<string | null>(null)
  const [counterOfferNotice, setCounterOfferNotice] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null)
  const [selectedCounterOfferRequest, setSelectedCounterOfferRequest] = useState<DriverFeedOrder | null>(null)
  const [counterOfferDraft, setCounterOfferDraft] = useState<{ price: string; comment: string }>({ price: '', comment: '' })
  const [callOutcomeSheet, setCallOutcomeSheet] = useState<{
    request: DriverFeedOrder
    outcome: DriverCallOutcome
    note: string
  } | null>(null)
  const [savingCallOutcomeRequestId, setSavingCallOutcomeRequestId] = useState<string | null>(null)
  const [callOutcomeSheetError, setCallOutcomeSheetError] = useState('')
  const counterOfferNoticeTimerRef = useRef<number | null>(null)
  const accessState = getDriverAccessState(driverVerificationStatus, driverWallet, driverAccess)
  const walletShortfall = getDriverWalletShortfall(driverWallet)
  const blockedReason =
    driverProfile?.blockedReason?.trim() ||
    driverWallet?.blockedReason?.trim() ||
    'Профиль водителя заблокирован модератором.'
  const lowBalance = accessState === 'APPROVED_LOW_BALANCE'
  const subscriptionLocked = driverAccess?.monetizationMode === 'ACCESS_SUBSCRIPTION' && !driverAccess?.hasAccess
  const unlockActionLabel =
    driverAccess?.monetizationMode === 'ACCESS_SUBSCRIPTION' ? 'Купить тариф' : 'Перейти в баланс'
  const visibleOrders = useMemo(
    () =>
      driverFeedOrders
        .filter((order) => order.status === 'available' || order.status === 'offered')
        .filter((order) => matchesFilter(order, feedFilter)),
    [driverFeedOrders, feedFilter],
  )

  const counterOffersByOrderId = useMemo(() => {
    return driverCounterOffers.reduce<Record<string, DriverCounterOffer[]>>((accumulator, offer) => {
      if (!accumulator[offer.orderId]) {
        accumulator[offer.orderId] = []
      }
      accumulator[offer.orderId].push(offer)
      return accumulator
    }, {})
  }, [driverCounterOffers])

  useEffect(() => {
    return () => {
      if (counterOfferNoticeTimerRef.current) {
        window.clearTimeout(counterOfferNoticeTimerRef.current)
      }
    }
  }, [])

  const handleCounterOfferSuccess = ({ order, offer }: { order: DriverFeedOrder; offer: DriverCounterOffer }) => {
    const message = `${formatRoute(order.from, order.to)} · ${formatKzt(offer.offeredPrice)}`
    setSelectedCounterOfferRequest(null)
    setCounterOfferDraft({ price: '', comment: '' })
    setCounterOfferNotice({ kind: 'success', text: message })

    if (counterOfferNoticeTimerRef.current) {
      window.clearTimeout(counterOfferNoticeTimerRef.current)
    }

    counterOfferNoticeTimerRef.current = window.setTimeout(() => {
      setCounterOfferNotice(null)
      counterOfferNoticeTimerRef.current = null
    }, 3000)
  }

  const handleCounterOfferUnavailable = () => {
    setSelectedCounterOfferRequest(null)
    setCounterOfferDraft({ price: '', comment: '' })
    setCounterOfferNotice({
      kind: 'warning',
      text: 'Заявка уже недоступна. Обновили ленту.',
    })

    if (counterOfferNoticeTimerRef.current) {
      window.clearTimeout(counterOfferNoticeTimerRef.current)
    }

    counterOfferNoticeTimerRef.current = window.setTimeout(() => {
      setCounterOfferNotice(null)
      counterOfferNoticeTimerRef.current = null
    }, 3000)
  }

  const handleOpenCounterOffer = (request: DriverFeedOrder) => {
    setSelectedCounterOfferRequest({ ...request })
    setCounterOfferDraft({ price: String(request.requestedPrice), comment: '' })
    actions.openDriverCounterOfferSheet(request.id)
  }

  const handleCloseCounterOffer = () => {
    setSelectedCounterOfferRequest(null)
    setCounterOfferDraft({ price: '', comment: '' })
    actions.closeDriverCounterOfferSheet()
  }

  const handleUnlockContact = async (request: DriverFeedOrder) => {
    setUnlockingRequestId(request.id)

    try {
      await actions.unlockDriverRequestContact(request.id)
    } catch {
      // Error is already normalized and stored in app state.
    } finally {
      setUnlockingRequestId(null)
    }
  }

  const handleCallPassenger = (request: DriverFeedOrder) => {
    const phone = request.clientPhone?.replace(/\s+/g, '') || ''
    if (!phone) return

    window.open(`tel:${phone}`, '_self')
  }

  const handleSaveCallOutcome = async (
    request: DriverFeedOrder,
    outcome: DriverCallOutcome,
    note?: string,
  ) => {
    setSavingCallOutcomeRequestId(request.id)
    setCallOutcomeSheetError('')

    try {
      await actions.setDriverRequestContactOutcome(request.id, outcome, note)
      setCallOutcomeSheet(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить результат звонка.'
      setCallOutcomeSheetError(message)
      throw error
    } finally {
      setSavingCallOutcomeRequestId((current) => (current === request.id ? null : current))
    }
  }

  const handleQuickCallOutcome = async (request: DriverFeedOrder, outcome: DriverCallOutcome) => {
    try {
      await handleSaveCallOutcome(request, outcome)
    } catch {
      // Error is already shown in app state.
    }
  }

  const handleOpenCallOutcomeSheet = (request: DriverFeedOrder, outcome: DriverCallOutcome = 'OTHER') => {
    setCallOutcomeSheet({
      request,
      outcome,
      note: outcome === 'DECLINED' ? request.callOutcomeNote ?? '' : request.callOutcome === outcome ? request.callOutcomeNote ?? '' : '',
    })
    setCallOutcomeSheetError('')
  }

  const handleSubmitCallOutcomeSheet = async () => {
    if (!callOutcomeSheet) return

    const requiresNote =
      callOutcomeSheet.outcome === 'DECLINED' || callOutcomeSheet.outcome === 'OTHER'

    if (requiresNote && !callOutcomeSheet.note.trim()) {
      setCallOutcomeSheetError('Добавьте короткий комментарий.')
      return
    }

    try {
      await handleSaveCallOutcome(
        callOutcomeSheet.request,
        callOutcomeSheet.outcome,
        callOutcomeSheet.note.trim() || undefined,
      )
    } catch {
      // Error is already surfaced above.
    }
  }

  if (
    accessState === 'NOT_STARTED' ||
    accessState === 'DRAFT' ||
    accessState === 'PENDING_REVIEW' ||
    accessState === 'NEEDS_CHANGES' ||
    accessState === 'BLOCKED' ||
    accessState === 'SUSPENDED'
  ) {
    return (
      <PageCard
        eyebrow="Водитель"
        title={accessState === 'BLOCKED' ? 'Профиль водителя заблокирован' : 'Лента заказов'}
        description={accessState === 'BLOCKED' ? 'Доступ к заказам и онлайн-режиму ограничен.' : 'Доступно после проверки водителя.'}
      >
        {accessState === 'BLOCKED' ? (
          <DriverBlockedStateCard reason={blockedReason} />
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
              <Lock className="h-5 w-5 text-accent" />
              <p className="text-sm text-ink">Лента будет доступна после подтверждения заявки.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={
                  accessState === 'NOT_STARTED'
                    ? actions.startDriverRegistration
                    : () => actions.setScreen('driverRegistration')
                }
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
              >
                {accessState === 'DRAFT' ? 'Продолжить регистрацию' : 'Перейти к регистрации'}
              </button>
              <button
                type="button"
                onClick={() => actions.setScreen('driverDashboard')}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                Посмотреть статус заявки
              </button>
            </div>
          </>
        )}
      </PageCard>
    )
  }

  if (lowBalance && !subscriptionLocked) {
    return (
      <div className="space-y-4">
        {activeRecheck ? (
          <DriverRecheckCard
            recheck={activeRecheck}
            compact
            onRefresh={() => actions.refreshDriverSnapshot()}
            onOpenDetails={() => actions.setScreen('driverProfile')}
          />
        ) : null}

        <PageCard
          eyebrow="Водитель"
          title="Профиль одобрен"
          description={`Пополните баланс минимум до ${formatKzt(driverWallet.minBalance)}, чтобы выйти на линию.`}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <Sparkles className="h-5 w-5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Профиль одобрен</p>
              <p className="text-sm">
                Не хватает {formatKzt(walletShortfall)} до минимального баланса.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => actions.setScreen('driverBalance')}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
            >
              Перейти в баланс
            </button>
            <button
              type="button"
              onClick={() => actions.setScreen('driverDashboard')}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              В кабинет
            </button>
          </div>
        </PageCard>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeRecheck ? (
        <DriverRecheckCard
          recheck={activeRecheck}
          compact
          onRefresh={() => actions.refreshDriverSnapshot()}
          onOpenDetails={() => actions.setScreen('driverProfile')}
        />
      ) : null}

      {subscriptionLocked ? (
        <PageCard
          eyebrow="Доступ"
          title="Доступ к заявкам закрыт"
          description="Чтобы отправлять предложения пассажирам, купите тариф."
        >
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              {driverAccess?.reason?.trim() || 'Нет активного доступа'}
            </p>
            <p>Осталось контактов: {driverAccess?.remainingContactUnlocks ?? 0}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => actions.setScreen('driverBalance')}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            >
              Купить тариф
            </button>
            <button
              type="button"
              onClick={() => void actions.refreshDriverAccess()}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Обновить доступ
            </button>
          </div>
        </PageCard>
      ) : null}

      <PageCard
        eyebrow="Водитель"
        title="Лента заказов"
        description="Показываем доступные заказы и предварительный расчет комиссии."
      >
        {counterOfferNotice ? (
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-sm font-semibold',
              counterOfferNotice.kind === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-amber-200 bg-amber-50 text-amber-800',
            )}
          >
            {counterOfferNotice.kind === 'success' ? 'Предложение отправлено: ' : ''}
            {counterOfferNotice.text}
          </div>
        ) : null}

        {driverFlowError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {driverFlowError}
          </div>
        ) : null}

        {isDriverFeedLoading ? (
          <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
            Загружаем ленту заказов...
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Режим
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CircleGauge className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-ink">
                {driverProfile?.isOnline ? 'Онлайн' : 'Офлайн'}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Баланс
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverWallet.balance)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Минимум
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverWallet.minBalance)}
            </p>
          </div>
        </div>

        {driverAccess?.hasAccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Осталось контактов: {driverAccess.remainingContactUnlocks ?? 0}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => {
            const isActive = feedFilter === chip.id

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFeedFilter(chip.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface-soft text-ink hover:bg-slate-50',
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={actions.toggleDriverOnlineStatus}
          disabled={isDriverActionLoading}
          className={cn(
            'w-full rounded-2xl px-4 py-3 text-sm font-semibold',
            driverProfile?.isOnline
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-700',
          isDriverActionLoading && 'cursor-not-allowed opacity-60',
          )}
        >
          {driverProfile?.isOnline ? 'Сейчас онлайн' : 'Сейчас офлайн'}
        </button>
      </PageCard>

      {driverActiveOrder ? (
          <PageCard
          eyebrow="Водитель"
          title="Активный заказ"
          description="Управляйте заказом из отдельного экрана."
        >
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            У вас есть активный заказ. Откройте его из этого экрана.
          </div>
          <button
            type="button"
            onClick={() => actions.setScreen('driverOrders')}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Открыть активный заказ
          </button>
        </PageCard>
      ) : null}

      {!subscriptionLocked ? (
        <div className="space-y-3">
        {visibleOrders.map((order) => (
          <DriverFeedOrderCard
            key={order.id}
            order={order}
            counterOffers={counterOffersByOrderId[order.id]}
            isUnlocking={unlockingRequestId === order.id}
            isSavingCallOutcome={savingCallOutcomeRequestId === order.id}
            unlockUnavailableReason={
              !order.canCallPassenger && (driverAccess?.remainingContactUnlocks ?? 0) <= 0
                ? 'Контакты закончились. Купите тариф.'
                : null
            }
            unlockActionLabel={unlockActionLabel}
            onUnlock={() => void handleUnlockContact(order)}
            onOpenBalance={() => actions.setScreen('driverBalance')}
            onCall={() => handleCallPassenger(order)}
            onOpenCounterOffer={() => handleOpenCounterOffer(order)}
            onSetCallOutcome={(outcome) => void handleQuickCallOutcome(order, outcome)}
            onOpenCallOutcomeModal={(outcome) => handleOpenCallOutcomeSheet(order, outcome)}
          />
        ))}
        </div>
      ) : null}

      {visibleOrders.length === 0 ? (
        <PageCard
          eyebrow="Водитель"
          title="Нет доступных заказов"
          description={driverProfile?.isOnline ? 'Backend пока не вернул новых заявок.' : 'Включите онлайн-режим, чтобы получать новые заявки.'}
        >
          <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="text-sm text-ink">
              {driverProfile?.isOnline
                ? 'Сейчас нет доступных заявок.'
                : 'Сейчас вы офлайн, поэтому лента не пополняется.'}
            </p>
          </div>
        </PageCard>
      ) : null}

      <DriverCounterOfferSheet
        selectedRequest={selectedCounterOfferRequest}
        draftPrice={counterOfferDraft.price}
        draftComment={counterOfferDraft.comment}
        onDraftChange={setCounterOfferDraft}
        onClose={handleCloseCounterOffer}
        onSuccess={handleCounterOfferSuccess}
        onUnavailable={handleCounterOfferUnavailable}
        onRefreshFeed={() => actions.refreshDriverFeed()}
      />

      <OverlaySheet
        open={Boolean(callOutcomeSheet)}
        title={callOutcomeSheet ? getCallOutcomeLabel(callOutcomeSheet.outcome) : 'Результат звонка'}
        onClose={() => {
          setCallOutcomeSheet(null)
          setCallOutcomeSheetError('')
        }}
        position="bottom"
      >
        {callOutcomeSheet ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
              <p className="font-semibold">{formatRoute(callOutcomeSheet.request.from, callOutcomeSheet.request.to)}</p>
              <p className="mt-1 text-muted">
                {callOutcomeSheet.request.clientName || 'Пассажир'}
                {callOutcomeSheet.request.clientPhone ? ` · ${callOutcomeSheet.request.clientPhone}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['AGREED_OFFLINE', 'NO_ANSWER', 'DECLINED', 'OTHER'] as const).map((outcome) => {
                const isActive = callOutcomeSheet.outcome === outcome

                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => {
                      setCallOutcomeSheet((current) => (current ? { ...current, outcome } : current))
                      setCallOutcomeSheetError('')
                    }}
                    className={cn(
                      'rounded-2xl px-3 py-3 text-sm font-semibold transition',
                      isActive ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface-soft text-ink',
                    )}
                  >
                    {getCallOutcomeLabel(outcome)}
                  </button>
                )
              })}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Комментарий
              </span>
              <textarea
                value={callOutcomeSheet.note}
                onChange={(event) => {
                  const note = event.target.value
                  setCallOutcomeSheet((current) => (current ? { ...current, note } : current))
                  setCallOutcomeSheetError('')
                }}
                rows={4}
                placeholder="Например: Договорились на 08:00"
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </label>

            {callOutcomeSheetError ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {callOutcomeSheetError}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCallOutcomeSheet(null)
                  setCallOutcomeSheetError('')
                }}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitCallOutcomeSheet()}
                disabled={savingCallOutcomeRequestId === callOutcomeSheet.request.id}
                className={cn(
                  'rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20',
                  savingCallOutcomeRequestId === callOutcomeSheet.request.id && 'cursor-not-allowed opacity-60',
                )}
              >
                {savingCallOutcomeRequestId === callOutcomeSheet.request.id ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        ) : null}
      </OverlaySheet>
    </div>
  )
}
