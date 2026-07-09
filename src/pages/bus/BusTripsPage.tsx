import { ArrowLeft, Building2, BusFront, CalendarDays, Clock3, Hash, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'

import { searchBusTrips } from '../../features/bus'
import type { BusTripSummary } from '../../features/bus'
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

function formatBusTripPrice(trip: BusTripSummary) {
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

function getBusIdentityLabel(trip: BusTripSummary) {
  const plate = formatKzPlateNumber(trip.vehicle?.plateNumber)
  const model = trip.vehicle?.model?.trim() || ''

  if (plate && model) {
    return `${plate} · ${model}`
  }

  return plate || model || trip.vehicle?.name || 'Не указано'
}

export default function BusTripsPage() {
  const { busSearchNavigation } = useAppState()
  const actions = useAppActions()
  const [trips, setTrips] = useState<BusTripSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!busSearchNavigation) {
      return
    }

    let isMounted = true

    const loadTrips = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextTrips = await searchBusTrips(busSearchNavigation)
        if (!isMounted) return
        setTrips(nextTrips)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить рейсы.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTrips()

    return () => {
      isMounted = false
    }
  }, [busSearchNavigation])

  if (!busSearchNavigation) {
    return (
      <PageCard
        eyebrow="Автобусы"
        title="Нет параметров поиска"
        description="Сначала выберите города и дату, затем откройте список рейсов."
      >
        <button
          type="button"
          onClick={actions.openBusSearch}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Перейти к поиску
        </button>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageCard
        eyebrow="Результаты"
        title="Автобусные рейсы"
        description={`${busSearchNavigation.fromCityName || 'Не указано'} → ${busSearchNavigation.toCityName || 'Не указано'} · ${busSearchNavigation.date}`}
      >
        <button
          type="button"
          onClick={actions.openBusSearch}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Изменить поиск
        </button>
      </PageCard>

      {isLoading ? (
        <div className="rounded-[28px] border border-border bg-white p-6 text-center text-sm text-muted shadow-sm">
          Ищем доступные рейсы...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">Не удалось загрузить рейсы</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!isLoading && !error && trips.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-border bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-ink">Рейсы не найдены</p>
          <p className="mt-2 text-sm text-muted">Попробуйте другую дату или соседний город отправления.</p>
        </div>
      ) : null}

      {!isLoading && !error && trips.length > 0 ? (
        <div className="space-y-3">
          {trips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => actions.openBusTripDetail(trip.id)}
              className="w-full rounded-[28px] border border-border bg-white p-4 text-left shadow-sm transition hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                    {trip.tripNumber ? `Рейс №${trip.tripNumber}` : 'Маршрут'}
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">
                    {formatRoute(trip.fromCityName, trip.toCityName)}
                  </p>
                  {trip.vehicle?.companyName ? (
                    <p className="mt-1 text-sm text-muted">{trip.vehicle.companyName}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {formatBusTripStatus(trip.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Отправление</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {formatBusDateTime(trip.departureAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Прибытие</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {formatBusDateTime(trip.arrivalAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Ticket className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Цена</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-accent">
                    {formatBusTripPrice(trip)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Hash className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Рейс</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {trip.tripNumber ? `№${trip.tripNumber}` : `ID ${trip.id}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <BusFront className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Автобус</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {getBusIdentityLabel(trip)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Перевозчик</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{trip.vehicle?.companyName || '—'}</p>
                </div>
                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2 text-muted">
                    <BusFront className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Свободные места</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {trip.availableSeats != null ? `${trip.availableSeats} доступно` : 'Нет данных'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
