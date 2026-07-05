import { Clock3, MessageSquareQuote, Phone, Route, Sparkles, Truck } from 'lucide-react'

import { cn } from '../../../lib/cn'
import { formatKzt, formatParcelSizeLabel, formatRoute, formatShortDateTime, formatShortDateTimeParts } from '../../../lib/format'
import type { DriverCallOutcome, DriverCounterOffer, DriverFeedOrder } from '../../../types/domain'

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone

  return `+7 *** *** ${digits.slice(-4, -2)} ${digits.slice(-2)}`
}

function getOrderBadgeLabel(order: DriverFeedOrder) {
  if (order.category === 'parcel') return 'Посылка'
  return order.rideType === 'full' ? 'Весь салон' : 'Межгород'
}

function getOrderAccent(order: DriverFeedOrder) {
  if (order.category === 'parcel') {
    return 'bg-sky-50 text-sky-700'
  }

  return order.rideType === 'full'
    ? 'bg-amber-50 text-amber-700'
    : 'bg-accent/10 text-accent'
}

function formatCallOutcomeLabel(outcome?: DriverCallOutcome) {
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
      return ''
  }
}

function formatCallOutcomeAt(value?: string) {
  return value ? formatShortDateTime(value) : ''
}

type DriverFeedOrderCardProps = {
  order: DriverFeedOrder
  counterOffers?: DriverCounterOffer[]
  isUnlocking?: boolean
  unlockUnavailableReason?: string | null
  onUnlock: () => void
  onCall: () => void
  onOpenCounterOffer: () => void
  isSavingCallOutcome?: boolean
  onSetCallOutcome: (outcome: DriverCallOutcome) => void
  onOpenCallOutcomeModal: (outcome?: DriverCallOutcome) => void
}

export function DriverFeedOrderCard({
  order,
  counterOffers,
  isUnlocking = false,
  unlockUnavailableReason = null,
  onUnlock,
  onCall,
  onOpenCounterOffer,
  isSavingCallOutcome = false,
  onSetCallOutcome,
  onOpenCallOutcomeModal,
}: DriverFeedOrderCardProps) {
  const currentOffer = counterOffers?.[0] ?? null
  const pendingOffer = counterOffers?.find((offer) => offer.status === 'pending') ?? null
  const isOfferPending = Boolean(pendingOffer)
  const isOfferRejected = !isOfferPending && currentOffer?.status === 'rejected'
  const isAccepted = order.status === 'accepted'
  const badgeLabel = getOrderBadgeLabel(order)
  const unlockedPhone = order.clientPhone?.trim() || ''
  const unlockedPassengerName = order.clientName?.trim() || ''
  const isContactUnlocked = order.category === 'ride' && Boolean(order.canCallPassenger && unlockedPhone)
  const isUnlockDisabled = Boolean(unlockUnavailableReason) && !isContactUnlocked
  const callOutcomeLabel = formatCallOutcomeLabel(order.callOutcome)
  const callOutcomeAt = formatCallOutcomeAt(order.callOutcomeAt)

  return (
    <article className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', getOrderAccent(order))}>
          {order.category === 'parcel' ? <Truck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{badgeLabel}</span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {order.createdMinutesAgo} мин назад
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-lg font-semibold tracking-[-0.02em] text-ink">
            {formatRoute(order.from, order.to)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatShortDateTimeParts(order.date, order.time)}
          </p>
        </div>

        <div className="grid gap-2 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Цена клиента</span>
            <span className="font-semibold">{formatKzt(order.requestedPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Клиент</span>
            <span className="font-semibold">{order.clientName || 'Пассажир'}</span>
          </div>
        </div>

        {order.category === 'ride' ? (
          <div className="grid gap-2 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-accent" />
              <span className="font-semibold">
                {order.rideType === 'full' ? 'Весь салон' : 'С попутчиками'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <Route className="h-4 w-4" />
              <span>{order.passengersCount ?? 1} пассажир(а)</span>
            </div>
            {order.comment ? <p className="text-sm text-muted">{order.comment}</p> : null}
          </div>
        ) : (
          <div className="grid gap-2 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4 text-accent" />
              <span className="font-semibold">
                Размер: {formatParcelSizeLabel(order.parcelSize)}
              </span>
            </div>
            {order.parcelDescription ? (
              <p className="text-sm text-muted">{order.parcelDescription}</p>
            ) : null}
            {order.receiverName ? (
              <p className="text-sm text-muted">Получатель: {order.receiverName}</p>
            ) : null}
            {order.receiverPhone ? (
              <p className="text-sm text-muted">Телефон: {maskPhone(order.receiverPhone)}</p>
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted">
          <Clock3 className="h-4 w-4" />
          <span>Создано {order.createdMinutesAgo} минут назад</span>
        </div>

        {order.category === 'ride' ? (
          isContactUnlocked ? (
            <div className="space-y-3">
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="space-y-1">
                  <p className="font-semibold">Контакт открыт</p>
                  {unlockedPassengerName ? <p>{unlockedPassengerName}</p> : null}
                  <p className="font-semibold">{unlockedPhone}</p>
                </div>
                <button
                  type="button"
                  onClick={onCall}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  <Phone className="h-4 w-4 text-accent" />
                  Позвонить
                </button>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-white p-4 text-sm text-ink">
                <div className="space-y-1">
                  <p className="font-semibold">Результат звонка</p>
                  {order.callOutcome ? (
                    <>
                      <p>{callOutcomeLabel}</p>
                      {callOutcomeAt ? <p className="text-muted">Отмечено: {callOutcomeAt}</p> : null}
                      {order.callOutcomeNote ? <p className="text-muted">{order.callOutcomeNote}</p> : null}
                    </>
                  ) : (
                    <p className="text-muted">Отметьте, чем закончился звонок пассажиру.</p>
                  )}
                </div>

                {order.callOutcome ? (
                  <button
                    type="button"
                    onClick={() => onOpenCallOutcomeModal(order.callOutcome)}
                    disabled={isSavingCallOutcome}
                    className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Изменить результат
                  </button>
                ) : (
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSetCallOutcome('AGREED_OFFLINE')}
                        disabled={isSavingCallOutcome}
                        className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Подтвердить договорённость
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetCallOutcome('NO_ANSWER')}
                        disabled={isSavingCallOutcome}
                        className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Не дозвонился
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenCallOutcomeModal('DECLINED')}
                        disabled={isSavingCallOutcome}
                        className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Неактуально
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCallOutcomeModal('OTHER')}
                        disabled={isSavingCallOutcome}
                        className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Другое
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border bg-white p-4 text-sm text-ink">
              <div className="space-y-1">
                <p className="font-semibold">Контакт закрыт</p>
                <p className="text-muted">
                  {unlockUnavailableReason || 'Откройте контакт по тарифу, чтобы позвонить пассажиру.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onUnlock}
                disabled={isUnlocking || isUnlockDisabled}
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUnlocking ? 'Открываем...' : isUnlockDisabled ? 'Контакты закончились' : 'Открыть контакт'}
              </button>
            </div>
          )
        ) : null}

        {isAccepted ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Заказ уже принят
          </div>
        ) : isOfferPending ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="space-y-1">
              <p className="font-semibold">
                Ваше предложение отправлено: {formatKzt(pendingOffer?.offeredPrice ?? order.requestedPrice)}
              </p>
              {pendingOffer?.comment ? (
                <p className="text-sm text-amber-900/80">Комментарий: {pendingOffer.comment}</p>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                Ожидаем ответа пассажира
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs text-amber-900/80">
              Пока предложение ожидает ответа, новые действия по этой заявке скрыты.
            </div>
          </div>
        ) : isOfferRejected ? (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div>
              <p className="font-semibold">Пассажир отклонил предложение</p>
              <p className="mt-1">
                Можно отправить новую цену, если заявка ещё активна.
              </p>
            </div>
            {currentOffer ? (
              <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs text-red-700/80">
                Последняя цена: {formatKzt(currentOffer.offeredPrice)}
              </div>
            ) : null}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onOpenCounterOffer()
                }}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                Предложить новую цену
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenCounterOffer()
              }}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Предложить свою цену
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
