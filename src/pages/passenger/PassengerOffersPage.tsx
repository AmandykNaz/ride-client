import { useEffect, useRef, useState } from 'react'
import { Clock3, Sparkles } from 'lucide-react'

import { formatKzt, formatRoute } from '../../lib/format'
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
  const refreshRideSnapshotRef = useRef(actions.refreshPassengerRideSnapshot)
  const activeRideRequestId = activeRideRequest?.id ?? null
  const activeRideRequestStatus = activeRideRequest?.status ?? null

  useEffect(() => {
    refreshRideSnapshotRef.current = actions.refreshPassengerRideSnapshot
  }, [actions.refreshPassengerRideSnapshot])

  useEffect(() => {
    if (!activeRideRequestId || activeRideRequestStatus === 'CANCELLED') return

    let cancelled = false
    const refresh = () => {
      if (cancelled) return
      void refreshRideSnapshotRef.current()
    }

    refresh()
    const timer = window.setInterval(refresh, 7000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeRideRequestId, activeRideRequestStatus])

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
        eyebrow="Активная заявка"
        title={formatRoute(activeRideRequest.from, activeRideRequest.to)}
        description="Мы ищем подходящего водителя и показываем доступные предложения."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Статус
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{activeRideRequest.status}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Таймер поиска
            </p>
            <SearchTimer key={activeRideRequest.id} requestId={activeRideRequest.id} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted">
          <span>
            {isRideOffersLoading ? 'Обновляем предложения...' : `Предложений: ${driverOffers.length}`}
          </span>
          <button
            type="button"
            onClick={() => actions.cancelActiveRide()}
            className="rounded-2xl border border-border bg-white px-3 py-2 text-sm font-semibold text-ink"
            disabled={isRideActionLoading}
          >
            Отменить заявку
          </button>
        </div>
      </PageCard>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3">
        <Sparkles className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">
          Маршрут: {formatRoute(rideDraft.from, rideDraft.to)}
        </p>
      </div>

      <div className="space-y-3">
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
                onClick={() => actions.acceptOffer(offer.id)}
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
                onClick={() => actions.rejectRideOffer(offer.id)}
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
