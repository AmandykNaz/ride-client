import { useEffect, useMemo, useRef, useState } from 'react'
import { CarFront, Clock3, Phone, ShieldAlert } from 'lucide-react'

import {
  formatCountdown,
  formatKzt,
  formatRideRequestWhenLabel,
  formatShortDateTime,
  formatVehicleParts,
  formatVehicleLabel,
} from '../../lib/format'
import { cn } from '../../lib/cn'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { DriverAvatar } from '../../shared/ui/DriverAvatar'
import type { DriverCallOutcome } from '../../types/domain'

function formatContactUnlockOutcomeLabel(outcome?: DriverCallOutcome) {
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
      return 'Ожидаем результат звонка'
  }
}

function VehicleSummary({
  vehicle,
  fallback,
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
  fallback: string
}) {
  const { vehicleName, plateNumber, colorName } = formatVehicleParts(vehicle)

  if (vehicleName && plateNumber) {
    return (
      <>
        <p>{vehicleName}</p>
        <p>{plateNumber}</p>
        {colorName ? <p>Цвет: {colorName}</p> : null}
      </>
    )
  }

  if (vehicleName || plateNumber || colorName) {
    return (
      <>
        <p>{vehicleName || plateNumber || fallback}</p>
        {vehicleName && plateNumber ? null : plateNumber && vehicleName !== plateNumber ? <p>{plateNumber}</p> : null}
        {colorName ? <p>Цвет: {colorName}</p> : null}
      </>
    )
  }

  return <p>{fallback}</p>
}

const CANCEL_REASONS = [
  { code: 'CHANGE_PRICE', label: 'Хочу изменить цену' },
  { code: 'NO_LONGER_RELEVANT', label: 'Поездка больше не актуальна' },
  { code: 'NO_DRIVER_OFFERS', label: 'Нет предложений от водителей' },
  { code: 'CHANGE_TIME', label: 'Хочу изменить время отправления' },
  { code: 'WRONG_ADDRESS', label: 'Неверный адрес' },
] as const

export default function PassengerOffersPage() {
  const {
    activeRideRequest,
    passengerRequestContactUnlocksByRequestId,
    driverOffers,
    rideFlowError,
    isRideOffersLoading,
    isRideActionLoading,
  } = useAppState()
  const actions = useAppActions()
  const loadOffersRef = useRef(actions.loadActiveRequestOffers)
  const offersListRef = useRef<HTMLDivElement | null>(null)
  const [cancelStage, setCancelStage] = useState<'closed' | 'confirm' | 'reason'>('closed')
  const [cancelReasonCode, setCancelReasonCode] = useState<(typeof CANCEL_REASONS)[number]['code'] | 'OTHER' | ''>('')
  const [cancelReasonText, setCancelReasonText] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [selectedContactUnlockId, setSelectedContactUnlockId] = useState<string | null>(null)
  const [closeExternalNote, setCloseExternalNote] = useState('')
  const [isClosingExternally, setIsClosingExternally] = useState(false)
  const [pendingOfferAction, setPendingOfferAction] = useState<{ offerId: string; kind: 'accept' | 'reject' } | null>(null)
  const canSubmitCancel = cancelReasonCode === 'OTHER' ? cancelReasonText.trim().length > 0 : Boolean(cancelReasonCode)
  const activeRideRequestId = activeRideRequest?.id ?? null
  const activeRideRequestBackendId =
    activeRideRequest && /^\d+$/.test((activeRideRequest.backendId ?? activeRideRequest.id).trim())
      ? (activeRideRequest.backendId ?? activeRideRequest.id).trim()
      : null
  const activeRideRequestStatus = activeRideRequest?.status ?? null
  const activeRideRequestLookupId = activeRideRequest?.backendId ?? activeRideRequest?.id ?? ''
  const requestPrice = activeRideRequest?.price ?? 0
  const requestTypeLabel = activeRideRequest?.type === 'full' ? 'Весь салон' : 'С попутчиками'
  const searchTimer = useRideSearchTimer(activeRideRequest)
  const pendingDriverOffers = useMemo(
    () => driverOffers.filter((offer) => offer.status === 'pending'),
    [driverOffers],
  )
  const contactUnlocks = passengerRequestContactUnlocksByRequestId[activeRideRequestLookupId] ?? []
  const totalDriverOffersCount = driverOffers.length
  const activeDriverOffersCount = pendingDriverOffers.length
  const selectedContactUnlock =
    contactUnlocks.find((unlock) => unlock.contactUnlockId === selectedContactUnlockId) ?? null

  const isOfferButtonPending = (offerId: string, kind: 'accept' | 'reject') =>
    pendingOfferAction?.offerId === offerId && pendingOfferAction.kind === kind

  useEffect(() => {
    loadOffersRef.current = actions.loadActiveRequestOffers
  }, [actions.loadActiveRequestOffers])

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
      actions.setPassengerOrdersTab('rides')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleOpenCloseExternalSheet = (contactUnlockId: string) => {
    setSelectedContactUnlockId(contactUnlockId)
    setCloseExternalNote('')
  }

  const handleCloseExternalSheet = () => {
    if (isClosingExternally) return
    setSelectedContactUnlockId(null)
    setCloseExternalNote('')
  }

  const handleCloseExternally = async () => {
    if (!activeRideRequestBackendId || !selectedContactUnlock || isClosingExternally) return

    setIsClosingExternally(true)
    try {
      await actions.closePassengerRequestExternally(
        activeRideRequestBackendId,
        selectedContactUnlock.contactUnlockId,
        closeExternalNote.trim() || undefined,
      )
      setSelectedContactUnlockId(null)
      setCloseExternalNote('')
      actions.setPassengerOrdersTab('rides')
    } finally {
      setIsClosingExternally(false)
    }
  }

  if (!activeRideRequest) {
    return (
      <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
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

      {driverOffers.length > 0 && pendingDriverOffers.length === 0 ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Активных предложений сейчас нет. Исторические отклонённые предложения остаются в списке ниже.
        </div>
      ) : null}

      <PageCard
        eyebrow="Заявка на поиск водителя"
        title={
          searchTimer.isExpired
            ? 'Время поиска истекло'
          : pendingDriverOffers.length > 0
              ? 'Предложения от водителей'
              : driverOffers.length > 0
                ? 'История предложений'
                : 'Ищем подходящих водителей'
        }
        description={
          searchTimer.isExpired
            ? 'Продлите поиск, чтобы водители снова увидели заявку'
            : pendingDriverOffers.length > 0
              ? 'Выберите подходящее предложение.'
              : driverOffers.length > 0
                ? 'Текущие предложения отклонены, но вы можете вернуться к активному поиску.'
                : 'Ожидайте предложений.'
        }
      >
        <ActiveRideRequestSummaryCard
          key={`${activeRideRequestBackendId ?? activeRideRequest.id}:${activeRideRequest.createdAt}:${activeRideRequest.expiresAt ?? ''}:${activeRideRequest.searchRemainingSeconds ?? ''}:${activeRideRequest.priceUpdatedAt ?? ''}`}
          request={activeRideRequest}
          requestPrice={requestPrice}
          requestTypeLabel={requestTypeLabel}
          activeDriverOffersCount={activeDriverOffersCount}
          totalDriverOffersCount={totalDriverOffersCount}
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

      {contactUnlocks.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Ваш контакт открыли водители</h2>
          </div>

          {contactUnlocks.map((unlock) => {
            const vehicleLabel = formatVehicleLabel(unlock, '')
            const { vehicleName, plateNumber, colorName } = formatVehicleParts(unlock)
            const openedAt = formatShortDateTime(unlock.openedAt)
            const outcomeAt = formatShortDateTime(unlock.callOutcomeAt)

            return (
              <article
                key={unlock.contactUnlockId}
                className="rounded-[24px] border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <DriverAvatar name={unlock.driverName} avatarUrl={unlock.driverAvatarUrl} className="h-11 w-11 rounded-2xl" />
                    <div>
                    <p className="text-sm font-semibold text-ink">{unlock.driverName || 'Водитель'}</p>
                    {vehicleLabel ? (
                      <div className="mt-1 text-xs text-muted">
                        {vehicleName ? <p>{vehicleName}</p> : null}
                        {plateNumber ? <p>{plateNumber}</p> : null}
                        {colorName ? <p>Цвет: {colorName}</p> : null}
                      </div>
                    ) : null}
                    </div>
                  </div>
                  {openedAt ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                      {openedAt}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-accent" />
                    <span>{unlock.driverPhone}</span>
                  </div>
                  {vehicleLabel ? (
                    <div className="flex items-center gap-2 text-muted">
                      <CarFront className="h-4 w-4" />
                      <div className="min-w-0">
                        {vehicleName ? <p className="break-words">{vehicleName}</p> : null}
                        {plateNumber ? <p className="break-words">{plateNumber}</p> : null}
                        {colorName ? <p className="break-words">Цвет: {colorName}</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl border border-border bg-white p-4 text-sm text-ink">
                  <p className="font-semibold">Результат звонка</p>
                  <p className="mt-1">{formatContactUnlockOutcomeLabel(unlock.callOutcome)}</p>
                  {outcomeAt ? <p className="mt-1 text-muted">Обновлено: {outcomeAt}</p> : null}
                  {unlock.callOutcomeNote ? <p className="mt-2 text-muted">{unlock.callOutcomeNote}</p> : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCloseExternalSheet(unlock.contactUnlockId)}
                  disabled={isRideActionLoading || isClosingExternally}
                  className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-60"
                >
                  {unlock.callOutcome === 'AGREED_OFFLINE' ? 'Закрыть заявку по договорённости' : 'Закрыть с этим водителем'}
                </button>

                {activeRideRequestBackendId ? (
                  <button
                    type="button"
                    onClick={() =>
                      actions.openRideComplaintSheet({
                        targetType: 'REQUEST_CONTACT',
                        requestId: activeRideRequestBackendId,
                        contactUnlockId: unlock.contactUnlockId,
                        reporterRole: 'PASSENGER',
                        title: unlock.driverName || 'Водитель',
                        route: `${activeRideRequest.originText} → ${activeRideRequest.destinationText}`,
                      })
                    }
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                  >
                    <ShieldAlert className="h-4 w-4 text-accent" />
                    Пожаловаться
                  </button>
                ) : null}
              </article>
            )
          })}
        </section>
      ) : null}

      <div ref={offersListRef} className="space-y-3">
        {driverOffers.map((offer) => {
          const offerBackendId = offer.backendId ?? (/^\d+$/.test(offer.id) ? offer.id : '')
          const acceptPending = isOfferButtonPending(offer.id, 'accept')
          const rejectPending = isOfferButtonPending(offer.id, 'reject')
          const isPendingOffer = offer.status === 'pending'
          const isRejectedOffer = offer.status === 'rejected'
          const isAcceptedOffer = offer.status === 'accepted'
          const { vehicleName, plateNumber, colorName } = formatVehicleParts(offer)

          return (
            <article
              key={offer.id}
              className="rounded-[28px] border border-border bg-white p-4 shadow-sm"
            >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <DriverAvatar name={offer.driverName} avatarUrl={offer.driverAvatarUrl} className="h-11 w-11 rounded-2xl" />
                    <div>
                    <p className="text-sm font-semibold text-ink">{offer.driverName}</p>
                    <div className="mt-1 text-xs text-muted">
                      {vehicleName && plateNumber ? (
                        <>
                          <p>{vehicleName}</p>
                          <p>{plateNumber}</p>
                          {colorName ? <p>Цвет: {colorName}</p> : null}
                        </>
                      ) : (
                        <p>{formatVehicleLabel(offer, 'Авто не указано')}</p>
                      )}
                    </div>
                    </div>
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

              {isPendingOffer ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!offerBackendId) {
                        await actions.loadActiveRequestOffers()
                        return
                      }
                      setPendingOfferAction({ offerId: offer.id, kind: 'accept' })
                      try {
                        await actions.acceptActiveRideOffer(offerBackendId)
                      } finally {
                        setPendingOfferAction((current) =>
                          current?.offerId === offer.id && current.kind === 'accept' ? null : current,
                        )
                      }
                    }}
                    className={cn(
                      'mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-60',
                      offer.isCustomOffer ? 'bg-amber-500' : 'bg-accent',
                    )}
                    disabled={isRideActionLoading || acceptPending || rejectPending}
                  >
                    {acceptPending
                      ? 'Обрабатываем...'
                      : offer.isCustomOffer
                        ? 'Принять предложение'
                        : 'Выбрать водителя'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!offerBackendId) {
                        await actions.loadActiveRequestOffers()
                        return
                      }
                      setPendingOfferAction({ offerId: offer.id, kind: 'reject' })
                      try {
                        await actions.rejectActiveRideOffer(offerBackendId)
                      } finally {
                        setPendingOfferAction((current) =>
                          current?.offerId === offer.id && current.kind === 'reject' ? null : current,
                        )
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60"
                    disabled={isRideActionLoading || acceptPending || rejectPending}
                  >
                    {rejectPending ? 'Отклоняем...' : 'Отклонить'}
                  </button>
                </>
              ) : isRejectedOffer ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">Предложение отклонено</p>
                  <p className="mt-1">
                    {offer.isCustomOffer
                      ? 'Пассажир отклонил ваш counter offer. Можно предложить новую цену, если заявка ещё активна.'
                      : 'Пассажир не выбрал это предложение. Можно ждать новых заявок.'}
                  </p>
                </div>
              ) : isAcceptedOffer ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Предложение принято
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Статус предложения обновляется.
                </div>
              )}
            </article>
          )
        })}
      </div>

      <OverlaySheet
        open={selectedContactUnlock != null}
        title="Закрыть заявку?"
        onClose={handleCloseExternalSheet}
        position="bottom"
      >
        {selectedContactUnlock ? (
          <div className="space-y-4">
            <p className="text-sm text-ink">
              Заявка будет закрыта как договорённость с водителем. Заказ в приложении не создаётся.
            </p>

            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
              <p className="font-semibold">{selectedContactUnlock.driverName || 'Водитель'}</p>
              <div className="mt-1 text-muted">
                <VehicleSummary vehicle={selectedContactUnlock} fallback="Без данных об автомобиле" />
              </div>
              <p className="mt-1 text-muted">{selectedContactUnlock.driverPhone}</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Комментарий, например: договорились на 08:00
              </span>
              <textarea
                value={closeExternalNote}
                onChange={(event) => setCloseExternalNote(event.target.value)}
                rows={4}
                placeholder="Комментарий необязательно"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
            </label>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => void handleCloseExternally()}
                disabled={isClosingExternally}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isClosingExternally ? 'Закрываем...' : 'Закрыть заявку'}
              </button>
              <button
                type="button"
                onClick={handleCloseExternalSheet}
                disabled={isClosingExternally}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}
      </OverlaySheet>

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
  activeDriverOffersCount,
  totalDriverOffersCount,
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
  activeDriverOffersCount: number
  totalDriverOffersCount: number
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
  const activeStep = request.status === 'CONVERTED_TO_ORDER' ? 4 : activeDriverOffersCount > 0 ? 3 : 2
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
          <p className="text-sm font-semibold text-ink">
            {totalDriverOffersCount > activeDriverOffersCount
              ? `Активных: ${activeDriverOffersCount} · Всего: ${totalDriverOffersCount}`
              : `Предложений: ${activeDriverOffersCount}`}
          </p>
          {totalDriverOffersCount > 0 ? (
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
