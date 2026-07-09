import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getBusTripSeats } from '../../features/bus'
import type { BusSeat } from '../../features/bus'
import { BusSeatMapMobile } from '../../features/bus/components/BusSeatMapMobile'
import { BackendApiError } from '../../shared/api/backend'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

export default function BusSeatsPage() {
  const { selectedBusTripId } = useAppState()
  const actions = useAppActions()
  const [seats, setSeats] = useState<BusSeat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  const [seatMapMissing, setSeatMapMissing] = useState(false)

  useEffect(() => {
    if (!selectedBusTripId) {
      return
    }

    let isMounted = true

    const loadSeats = async () => {
      setIsLoading(true)
      setError(null)
      setSeatMapMissing(false)

      try {
        const response = await getBusTripSeats(selectedBusTripId)
        if (!isMounted) return
        setSelectedSeatId(null)
        setSeats(response.seats)
      } catch (loadError) {
        if (!isMounted) return

        if (
          loadError instanceof BackendApiError &&
          loadError.status === 400 &&
          loadError.message.toLowerCase().includes('seatmap')
        ) {
          setSeatMapMissing(true)
          setSeats([])
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить схему мест.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSeats()

    return () => {
      isMounted = false
    }
  }, [selectedBusTripId])

  const orderedSeats = useMemo(
    () =>
      [...seats].sort((left, right) => {
        const leftRow = left.row ?? Number.MAX_SAFE_INTEGER
        const rightRow = right.row ?? Number.MAX_SAFE_INTEGER

        if (leftRow !== rightRow) return leftRow - rightRow

        const leftColumn = left.column ?? Number.MAX_SAFE_INTEGER
        const rightColumn = right.column ?? Number.MAX_SAFE_INTEGER

        return leftColumn - rightColumn
      }),
    [seats],
  )

  const seatFloors = useMemo(() => {
    const grouped = new Map<string, BusSeat[]>()

    orderedSeats.forEach((seat) => {
      const key = seat.floor?.trim() || 'main'
      const existing = grouped.get(key) ?? []
      existing.push(seat)
      grouped.set(key, existing)
    })

    return Array.from(grouped.entries()).map(([floor, floorSeats]) => ({
      floor,
      seats: floorSeats,
    }))
  }, [orderedSeats])

  if (!selectedBusTripId) {
    return (
      <PageCard
        eyebrow="Автобусы"
        title="Рейс не выбран"
        description="Сначала откройте карточку рейса, затем схему мест."
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
        onClick={() => actions.setScreen('busTripDetail')}
        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к рейсу
      </button>

      <PageCard
        eyebrow="Места"
        title="Схема автобуса"
        description="Места доступны только для просмотра. Свободные места можно выбрать визуально, без HOLD и оплаты."
      >
        <p className="text-sm text-muted">
          Удержанные и занятые места недоступны для нажатия. Если backend отдаёт несколько уровней, каждый этаж
          показывается отдельно.
        </p>
      </PageCard>

      {isLoading ? (
        <div className="rounded-[28px] border border-border bg-white p-6 text-center text-sm text-muted shadow-sm">
          Загружаем схему мест...
        </div>
      ) : null}

      {seatMapMissing ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Схема мест пока недоступна</p>
          <p className="mt-1">Для этого рейса backend вернул, что seat map отсутствует.</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">Не удалось загрузить места</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!isLoading && !seatMapMissing && !error && orderedSeats.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-border bg-white p-6 text-center text-sm text-muted shadow-sm">
          Для этого рейса места не найдены.
        </div>
      ) : null}

      {!isLoading && !seatMapMissing && !error && orderedSeats.length > 0 ? (
        <PageCard
          eyebrow="Preview"
          title="Просмотр мест"
          description="Layout сделан в read-only режиме и опирается только на passenger-safe bus-client данные."
        >
          <div className="space-y-5">
            {seatFloors.map((floorGroup) => (
              <div key={floorGroup.floor} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {floorGroup.floor === 'main' ? 'Салон' : `Уровень: ${floorGroup.floor}`}
                  </p>
                  <p className="text-xs text-muted">{floorGroup.seats.length} мест</p>
                </div>

                <BusSeatMapMobile
                  seats={floorGroup.seats}
                  selectedSeatId={selectedSeatId}
                  onSeatSelect={setSelectedSeatId}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled
            className="w-full rounded-2xl border border-border bg-slate-100 px-4 py-3 text-sm font-semibold text-muted"
          >
            Бронирование скоро
          </button>
        </PageCard>
      ) : null}
    </div>
  )
}
