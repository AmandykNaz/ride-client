import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, LoaderCircle, MapPin, Search } from 'lucide-react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import { searchRideLocations } from '../api/passenger-locations.api'
import type { RideLocation } from '../api/passenger-locations.types'

type LocationTarget = 'origin' | 'destination'
type LocationStep = 'city' | 'address'

function buildLocationText(cityName: string, address: string) {
  const trimmedCity = cityName.trim()
  const trimmedAddress = address.trim()

  if (!trimmedCity) return ''
  if (!trimmedAddress) return trimmedCity

  return `${trimmedCity}, ${trimmedAddress}`
}

function getTargetLabels(target: LocationTarget) {
  if (target === 'origin') {
    return {
      cityTitle: 'Из какого города?',
      addressTitle: 'Адрес посадки',
      actionLabel: 'Откуда',
    }
  }

  return {
    cityTitle: 'В какой город?',
    addressTitle: 'Адрес прибытия',
    actionLabel: 'Куда',
  }
}

function formatLocationTitle(location: RideLocation) {
  return location.displayName || location.nameRu
}

export function PassengerRideLocationSheet() {
  const { isRideLocationSheetOpen, rideLocationSheetTarget, rideDraft } = useAppState()
  const actions = useAppActions()
  const target = rideLocationSheetTarget
  const [results, setResults] = useState<RideLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [step, setStep] = useState<LocationStep>('city')
  const [query, setQuery] = useState(() =>
    target === 'origin' ? rideDraft.originCityName ?? '' : rideDraft.destinationCityName ?? '',
  )
  const [address, setAddress] = useState(() =>
    target === 'origin' ? rideDraft.originAddress ?? '' : rideDraft.destinationAddress ?? '',
  )
  const requestRef = useRef(0)

  const labels = useMemo(
    () => (target ? getTargetLabels(target) : getTargetLabels('origin')),
    [target],
  )

  const currentCityId =
    target === 'origin' ? rideDraft.originCityId : rideDraft.destinationCityId
  const currentCityName =
    target === 'origin' ? rideDraft.originCityName ?? '' : rideDraft.destinationCityName ?? ''
  const currentRegionName =
    target === 'origin' ? rideDraft.originRegionName ?? '' : rideDraft.destinationRegionName ?? ''
  const hasActiveSearch = step === 'city' && query.trim().length >= 2

  useEffect(() => {
    if (!isRideLocationSheetOpen || !target || step !== 'city') {
      requestRef.current += 1
      return
    }

    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) {
      requestRef.current += 1
      return
    }

    const requestId = ++requestRef.current
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      setSearchError(null)

      void searchRideLocations(trimmedQuery, 10)
        .then((items) => {
          if (requestRef.current !== requestId) return
          setResults(items)
        })
        .catch((error) => {
          if (requestRef.current !== requestId) return
          setResults([])
          setSearchError(error instanceof Error ? error.message : 'Не удалось загрузить города.')
        })
        .finally(() => {
          if (requestRef.current !== requestId) return
          setIsSearching(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isRideLocationSheetOpen, query, step, target])

  const handleClose = () => {
    actions.closeRideLocationSheet()
  }

  const applyCitySelection = (location: RideLocation) => {
    if (!target) return

    const isSameCity = currentCityId === location.id
    const nextAddress = isSameCity ? address : ''
    const cityName = location.nameRu.trim()
    const regionName = location.regionName?.trim() || ''
    const nextDisplayName = formatLocationTitle(location)
    const combinedText = buildLocationText(cityName, nextAddress)

    if (target === 'origin') {
      actions.updateRideDraft({
        originCityId: location.id,
        originCityName: cityName,
        originRegionName: regionName || undefined,
        originAddress: nextAddress,
        from: combinedText,
      })
    } else {
      actions.updateRideDraft({
        destinationCityId: location.id,
        destinationCityName: cityName,
        destinationRegionName: regionName || undefined,
        destinationAddress: nextAddress,
        to: combinedText,
      })
    }

    setQuery(nextDisplayName || cityName)
    setAddress(nextAddress)
    setStep('address')
  }

  const handleDone = () => {
    if (!target) return

    const normalizedAddress = address.trim()
    const cityName = currentCityName.trim()
    const combinedText = buildLocationText(cityName, normalizedAddress)

    if (target === 'origin') {
      actions.updateRideDraft({
        originAddress: normalizedAddress,
        from: combinedText,
      })
    } else {
      actions.updateRideDraft({
        destinationAddress: normalizedAddress,
        to: combinedText,
      })
    }

    handleClose()
  }

  const title = step === 'city' ? labels.cityTitle : labels.addressTitle

  if (!isRideLocationSheetOpen || !target) {
    return null
  }

  return (
    <OverlaySheet open title={title} onClose={handleClose} position="bottom">
      {step === 'city' ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Поиск города</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Начните вводить город"
                className="w-full rounded-2xl border border-border bg-surface-soft py-3 pl-11 pr-4 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </label>

          {currentCityName ? (
            <div className="rounded-2xl border border-accent/15 bg-accent/6 px-4 py-3 text-sm text-ink">
              <p className="font-medium">Текущий выбор</p>
              <p className="mt-1 text-muted">
                {currentCityName}
                {currentRegionName ? ` · ${currentRegionName}` : ''}
              </p>
            </div>
          ) : null}

          <div className="max-h-[42dvh] space-y-2 overflow-y-auto pr-1">
            {hasActiveSearch && isSearching ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-4 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Ищем города...
              </div>
            ) : null}

            {hasActiveSearch && searchError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {searchError}
              </div>
            ) : null}

            {hasActiveSearch && !isSearching && !searchError && results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                Ничего не найдено. Попробуйте другой запрос.
              </div>
            ) : null}

            {!hasActiveSearch ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                Введите минимум 2 символа для поиска.
              </div>
            ) : null}

            {hasActiveSearch
              ? results.map((location) => {
              const isSelected =
                currentCityId === location.id &&
                currentCityName.trim() === location.nameRu.trim()

              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => applyCitySelection(location)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left transition hover:border-accent/30 hover:bg-accent/4"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-surface-soft text-accent">
                    {isSelected ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {location.displayName || location.nameRu}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {location.nameRu}
                      {location.regionName ? ` · ${location.regionName}` : ''}
                    </span>
                  </span>
                </button>
              )
            })
              : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep('city')}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Изменить город
          </button>

          {currentCityName ? (
            <div className="rounded-2xl border border-accent/15 bg-accent/6 px-4 py-3 text-sm text-ink">
              <p className="font-medium">{labels.actionLabel}</p>
              <p className="mt-1 text-muted">
                {currentCityName}
                {currentRegionName ? ` · ${currentRegionName}` : ''}
              </p>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Адрес</span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Улица, дом, микрорайон"
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            />
          </label>

          <button
            type="button"
            disabled
            className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-3 text-sm text-muted"
          >
            <span>Выбрать на карте</span>
            <span>Карта скоро</span>
          </button>

          <button
            type="button"
            onClick={handleDone}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Готово
          </button>
        </div>
      )}
    </OverlaySheet>
  )
}
