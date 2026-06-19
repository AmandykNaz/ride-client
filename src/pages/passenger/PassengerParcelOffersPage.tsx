import { useEffect, useState } from 'react'
import { Clock3, Package2, Sparkles } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt, formatParcelSizeLabel, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

export default function PassengerParcelOffersPage() {
  const { activeParcelRequest, parcelOffers } = useAppState()
  const actions = useAppActions()
  const isDevParcelFlow = import.meta.env.DEV

  if (!isDevParcelFlow) {
    return (
      <PageCard
        eyebrow="Пассажир"
        title="Посылки скоро"
        description="Сценарий посылок пока не готов к боевому запуску."
      >
        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          Этот экран доступен только в режиме разработки, пока бэкенд для посылок не готов.
        </div>
        <button
          type="button"
          onClick={() => actions.setScreen('passengerParcels')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к разделу
        </button>
      </PageCard>
    )
  }

  if (!activeParcelRequest) {
    return (
      <PageCard
        eyebrow="Пассажир"
        title="Поиск курьера"
        description="Здесь появятся предложения после создания заявки на посылку."
      >
        <button
          type="button"
          onClick={() => actions.setScreen('passengerParcels')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к форме
        </button>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      <PageCard
        eyebrow="Посылка"
        title="Поиск водителя"
        description="Отдельный сценарий для доставки посылки, визуально отличающийся от поездки."
      >
        <div className="rounded-2xl border border-accent/20 bg-accent/8 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <Package2 className="h-5 w-5" />
            Посылка
          </div>
          <p className="mt-2 text-sm text-ink">
            {formatRoute(activeParcelRequest.from, activeParcelRequest.to)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Отправитель
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeParcelRequest.senderName}
            </p>
            <p className="mt-1 text-sm text-muted">{activeParcelRequest.senderPhone}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Получатель
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeParcelRequest.receiverName}
            </p>
            <p className="mt-1 text-sm text-muted">{activeParcelRequest.receiverPhone}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Размер
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatParcelSizeLabel(activeParcelRequest.size)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {activeParcelRequest.weightKg ?? '—'} кг
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Таймер поиска
            </p>
            <SearchTimer key={activeParcelRequest.id} requestId={activeParcelRequest.id} />
          </div>
        </div>
      </PageCard>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3">
        <Sparkles className="h-5 w-5 text-accent" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {activeParcelRequest.description}
          </p>
          <p className="mt-1 text-sm text-muted">{formatKzt(activeParcelRequest.price)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {parcelOffers.map((offer) => (
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
                  Водитель предложил цену
                </p>
                <p className="mt-1 text-sm text-ink">{offer.comment}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">{offer.comment}</p>
            )}

            <button
              type="button"
              onClick={() => actions.acceptParcelOffer(offer.id)}
              className={cn(
                'mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20',
                offer.isCustomOffer ? 'bg-amber-500' : 'bg-accent',
              )}
            >
              {offer.isCustomOffer ? 'Выбрать водителя' : 'Выбрать водителя'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

function SearchTimer({ requestId }: { requestId: string }) {
  const [remainingSeconds, setRemainingSeconds] = useState(45)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [requestId])

  return (
    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink">
      <Clock3 className="h-4 w-4 text-accent" />
      {remainingSeconds}s
    </div>
  )
}
