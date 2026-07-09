import { ArrowLeft, Building2, BusFront, Clock3, Hash, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getBusTrip } from '../../features/bus'
import type { BusTripDetail } from '../../features/bus'
import { formatBusDateTime, formatKzPlateNumber, formatKzt, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

function formatBusTripStatus(status: string) {
  switch (status) {
    case 'PLANNED':
    case 'SCHEDULED':
      return 'По расписанию'
    case 'BOARDING':
      return 'Посадка'
    case 'DEPARTED':
      return 'В пути'
    case 'ARRIVED':
      return 'Прибыл'
    case 'CANCELLED':
      return 'Отменён'
    default:
      return status || 'Статус неизвестен'
  }
}

function formatBusTripPrice(trip: BusTripDetail) {
  if (trip.minPrice != null && trip.basePrice != null && trip.minPrice !== trip.basePrice) {
    return `от ${formatKzt(trip.minPrice)}`
  }

  if (trip.minPrice != null && trip.basePrice == null) {
    return `от ${formatKzt(trip.minPrice)}`
  }

  if (trip.price != null) {
    return formatKzt(trip.price)
  }

  return 'Уточняется'
}

function getBusIdentityLabel(trip: BusTripDetail) {
  const plate = formatKzPlateNumber(trip.vehicle?.plateNumber)
  const model = trip.vehicle?.model?.trim() || ''

  if (plate && model) {
    return `${plate} · ${model}`
  }

  return plate || model || trip.vehicle?.name || 'Не указано'
}

export default function BusTripDetailPage() {
  const { selectedBusTripId } = useAppState()
  const actions = useAppActions()
  const [trip, setTrip] = useState<BusTripDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedBusTripId) {
      return
    }

    let isMounted = true

    const loadTrip = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextTrip = await getBusTrip(selectedBusTripId)
        if (!isMounted) return
        setTrip(nextTrip)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить детали рейса.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTrip()

    return () => {
      isMounted = false
    }
  }, [selectedBusTripId])

  if (!selectedBusTripId) {
    return (
      <PageCard
        eyebrow="Автобусы"
        title="Рейс не выбран"
        description="Вернитесь к списку, чтобы открыть детали нужного рейса."
      >
        <button
          type="button"
          onClick={() => actions.setScreen('busTrips')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          К списку рейсов
        </button>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => actions.setScreen('busTrips')}
        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к рейсам
      </button>

      {isLoading ? (
        <div className="rounded-[28px] border border-border bg-white p-6 text-center text-sm text-muted shadow-sm">
          Загружаем детали рейса...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">Не удалось загрузить рейс</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!isLoading && !error && trip ? (
        <>
          <PageCard
            eyebrow="Рейс"
            title={trip.tripNumber ? `Рейс №${trip.tripNumber}` : trip.routeName}
            description={formatRoute(trip.fromCityName, trip.toCityName)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-center gap-2 text-muted">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Отправление</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatBusDateTime(trip.departureAt)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-center gap-2 text-muted">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Прибытие</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatBusDateTime(trip.arrivalAt)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-center gap-2 text-muted">
                  <Hash className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Рейс</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{trip.tripNumber ? `№${trip.tripNumber}` : `ID ${trip.id}`}</p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-center gap-2 text-muted">
                  <Ticket className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Цена</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formatBusTripPrice(trip)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-center gap-2 text-muted">
                  <BusFront className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Автобус</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{getBusIdentityLabel(trip)}</p>
                {trip.vehicle?.name && trip.vehicle.name !== getBusIdentityLabel(trip) ? (
                  <p className="mt-1 text-xs text-muted">{trip.vehicle.name}</p>
                ) : null}
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-center gap-2 text-muted">
                  <Building2 className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Перевозчик</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{trip.vehicle?.companyName || '—'}</p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-muted">
                  <BusFront className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Статус рейса</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{formatBusTripStatus(trip.status)}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Доступные места</p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {trip.availableSeats != null ? `${trip.availableSeats} доступно` : 'Нет данных'}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => actions.openBusSeats(trip.id)}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
              >
                Посмотреть места
              </button>
              <button
                type="button"
                disabled
                className="rounded-2xl border border-border bg-slate-100 px-4 py-3 text-sm font-semibold text-muted"
              >
                Бронирование скоро
              </button>
            </div>
          </PageCard>

          <PageCard
            eyebrow="Остановки"
            title="Станции маршрута"
            description="Показываем станции и расписание по данным bus-client."
          >
            {trip.stations.length > 0 ? (
              <div className="space-y-3">
                {trip.stations.map((station, index) => (
                  <div key={station.id} className="rounded-2xl bg-surface-soft p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-accent">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{station.name}</p>
                        {station.cityName ? <p className="mt-1 text-sm text-muted">{station.cityName}</p> : null}
                        {station.address ? <p className="mt-1 text-sm text-muted">{station.address}</p> : null}
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <p className="text-xs text-muted">
                            Прибытие: {formatBusDateTime(station.arrivalAt)}
                          </p>
                          <p className="text-xs text-muted">
                            Отправление: {formatBusDateTime(station.departureAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted">
                Станции для этого рейса пока не пришли с backend.
              </div>
            )}
          </PageCard>
        </>
      ) : null}
    </div>
  )
}
