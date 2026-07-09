import { BusFront, Check, ChevronRight, RefreshCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getBusCities } from '../../features/bus'
import type { BusCity } from '../../features/bus'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { PageCard } from '../../shared/ui/PageCard'

function getTodayIsoDate() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function FieldLabel({ children }: { children: string }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">{children}</p>
}

function CityFieldButton({
  label,
  value,
  onClick,
  error = false,
}: {
  label: string
  value?: string
  onClick: () => void
  error?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-4 text-left transition ${
        error ? 'border-red-300 bg-red-50' : 'border-border bg-white hover:border-accent/40'
      }`}
    >
      <div className="min-w-0">
        <FieldLabel>{label}</FieldLabel>
        <p className={`truncate text-base font-semibold ${value ? 'text-ink' : 'text-muted'}`}>
          {value || 'Выберите город'}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </button>
  )
}

function CityPickerSheet({
  open,
  title,
  cities,
  selectedCityId,
  excludedCityId,
  onClose,
  onSelect,
}: {
  open: boolean
  title: string
  cities: BusCity[]
  selectedCityId: string
  excludedCityId?: string
  onClose: () => void
  onSelect: (city: BusCity) => void
}) {
  const [query, setQuery] = useState('')

  const filteredCities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return cities.filter((city) => {
      if (excludedCityId && city.id === excludedCityId) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return city.label.toLowerCase().includes(normalizedQuery) || city.name.toLowerCase().includes(normalizedQuery)
    })
  }, [cities, excludedCityId, query])

  return (
    <OverlaySheet open={open} title={title} onClose={onClose} position="bottom">
      <div className="space-y-3">
        <label className="flex items-center gap-3 rounded-[22px] border border-border bg-surface-soft px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск города"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>

        <div className="space-y-2">
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => {
              const isSelected = city.id === selectedCityId

              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => onSelect(city)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-4 text-left transition ${
                    isSelected ? 'border-accent bg-accent/8' : 'border-border bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{city.name}</p>
                    {city.regionName ? <p className="mt-1 truncate text-sm text-muted">{city.regionName}</p> : null}
                  </div>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
                </button>
              )
            })
          ) : (
            <div className="rounded-[22px] border border-dashed border-border bg-white p-4 text-sm text-muted">
              Города не найдены
            </div>
          )}
        </div>
      </div>
    </OverlaySheet>
  )
}

export default function BusSearchPage() {
  const { busSearchNavigation } = useAppState()
  const actions = useAppActions()
  const [cities, setCities] = useState<BusCity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCityId, setFromCityId] = useState(busSearchNavigation?.fromCityId ?? '')
  const [toCityId, setToCityId] = useState(busSearchNavigation?.toCityId ?? '')
  const [date, setDate] = useState(busSearchNavigation?.date ?? getTodayIsoDate())
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadCities = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextCities = await getBusCities()
        if (!isMounted) return
        setCities(nextCities)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить города.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCities()

    return () => {
      isMounted = false
    }
  }, [])

  const sameCitiesError = fromCityId && toCityId && fromCityId === toCityId ? 'Выберите разные города' : ''
  const validationError = sameCitiesError || (!fromCityId || !toCityId || !date ? 'Заполните все поля.' : '')
  const canSearch = !isLoading && !validationError

  const selectedLabels = useMemo(() => {
    const byId = new Map(cities.map((city) => [city.id, city.label]))

    return {
      from: byId.get(fromCityId) ?? '',
      to: byId.get(toCityId) ?? '',
    }
  }, [cities, fromCityId, toCityId])

  return (
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageCard
        eyebrow="Автобусы"
        title="Автобусные рейсы"
        description="Только просмотр расписания, деталей рейса и схемы мест. Бронирование подключим позже."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white">
            <BusFront className="h-5 w-5 text-accent" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Пассажирский автобусный каталог</p>
            <p className="mt-1 text-sm text-muted">Выберите маршрут и дату, чтобы посмотреть доступные рейсы.</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Не удалось загрузить города</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Обновить экран
            </button>
          </div>
        ) : null}

        <div className="space-y-4">
          <CityFieldButton
            label="Откуда"
            value={selectedLabels.from}
            error={Boolean(sameCitiesError)}
            onClick={() => !isLoading && setActivePicker('from')}
          />

          <CityFieldButton
            label="Куда"
            value={selectedLabels.to}
            error={Boolean(sameCitiesError)}
            onClick={() => !isLoading && setActivePicker('to')}
          />

          <div>
            <FieldLabel>Дата</FieldLabel>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-[22px] border border-border bg-white px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </div>
        </div>

        {selectedLabels.from || selectedLabels.to ? (
          <div className="rounded-[24px] border border-dashed border-border bg-slate-50 px-4 py-3 text-sm text-muted">
            {selectedLabels.from || 'Не выбрано'} <ChevronRight className="mx-1 inline h-4 w-4" />
            {selectedLabels.to || 'Не выбрано'}
          </div>
        ) : null}

        <div>
          <button
            type="button"
            disabled={!canSearch}
            onClick={() =>
              actions.openBusTrips({
                fromCityId,
                toCityId,
                date,
                fromCityName: selectedLabels.from,
                toCityName: selectedLabels.to,
              })
            }
            className="w-full rounded-[22px] bg-accent px-4 py-4 text-base font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Загружаем города...' : 'Найти рейсы'}
          </button>
          {validationError ? <p className="mt-2 px-1 text-sm font-medium text-red-600">{validationError}</p> : null}
        </div>
      </PageCard>

      <CityPickerSheet
        key={`from-${activePicker === 'from' ? 'open' : 'closed'}`}
        open={activePicker === 'from'}
        title="Город отправления"
        cities={cities}
        selectedCityId={fromCityId}
        excludedCityId={toCityId || undefined}
        onClose={() => setActivePicker(null)}
        onSelect={(city) => {
          setFromCityId(city.id)
          setActivePicker(null)
        }}
      />

      <CityPickerSheet
        key={`to-${activePicker === 'to' ? 'open' : 'closed'}`}
        open={activePicker === 'to'}
        title="Город прибытия"
        cities={cities}
        selectedCityId={toCityId}
        excludedCityId={fromCityId || undefined}
        onClose={() => setActivePicker(null)}
        onSelect={(city) => {
          setToCityId(city.id)
          setActivePicker(null)
        }}
      />
    </div>
  )
}
