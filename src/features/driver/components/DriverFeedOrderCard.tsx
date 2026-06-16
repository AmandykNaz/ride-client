import { Clock3, MessageSquareQuote, Phone, Route, Sparkles, Truck } from 'lucide-react'

import { cn } from '../../../lib/cn'
import { formatKzt, formatParcelSizeLabel, formatRoute } from '../../../lib/format'
import type { DriverCounterOffer, DriverFeedOrder } from '../../../types/domain'

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

type DriverFeedOrderCardProps = {
  order: DriverFeedOrder
  counterOffer?: DriverCounterOffer
  onAccept: () => void
  onOpenCounterOffer: () => void
}

export function DriverFeedOrderCard({
  order,
  counterOffer,
  onAccept,
  onOpenCounterOffer,
}: DriverFeedOrderCardProps) {
  const isOfferPending = counterOffer?.status === 'pending'
  const isAccepted = order.status === 'accepted'
  const badgeLabel = getOrderBadgeLabel(order)

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
            {order.date} · {order.time}
          </p>
        </div>

        <div className="grid gap-2 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Цена клиента</span>
            <span className="font-semibold">{formatKzt(order.requestedPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Клиент</span>
            <span className="font-semibold">{order.clientName}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Телефон</span>
            <span className="font-semibold">{maskPhone(order.clientPhone)}</span>
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
              <Phone className="h-4 w-4" />
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

        {isAccepted ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Заказ уже принят
          </div>
        ) : isOfferPending ? (
          <div className="space-y-2">
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Ваше предложение отправлено
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            >
              Принять за {formatKzt(order.requestedPrice)}
            </button>
            <button
              type="button"
              onClick={onOpenCounterOffer}
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
