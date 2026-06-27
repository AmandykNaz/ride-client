import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, LoaderCircle, MapPin, Search } from 'lucide-react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { BackendAuthError } from '../../../shared/api/backend'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import { searchRideLocations } from '../api/passenger-locations.api'
import { getPassengerCityDisplay, isPassengerProfileComplete, toRidePassengerProfile, updatePassengerMe } from '../api/passenger.api'
import type { RideLocation } from '../api/passenger-locations.types'

function formatLocationTitle(location: RideLocation) {
  return location.displayName || location.nameRu
}

function buildCityLabel(name: string, regionName?: string | null) {
  const trimmedName = name.trim()
  const trimmedRegion = regionName?.trim() || ''

  if (!trimmedName) return ''
  if (!trimmedRegion) return trimmedName

  return `${trimmedName} · ${trimmedRegion}`
}

export function PassengerOnboardingModal() {
  const {
    isPassengerOnboardingOpen,
    verifiedPhone,
    pendingPassengerFlow,
    passengerProfile,
  } = useAppState()
  const actions = useAppActions()
  const isProfileComplete = isPassengerProfileComplete(passengerProfile)
  const [name, setName] = useState(() => passengerProfile?.name || '')
  const [selectedCityId, setSelectedCityId] = useState<number | null>(passengerProfile?.cityId ?? null)
  const [selectedCityName, setSelectedCityName] = useState(() => passengerProfile?.cityName || passengerProfile?.city || '')
  const [selectedCityRegionName, setSelectedCityRegionName] = useState(() => passengerProfile?.cityRegionName || '')
  const [cityQuery, setCityQuery] = useState(() => passengerProfile?.cityName || passengerProfile?.city || '')
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(() => !passengerProfile?.cityId)
  const [results, setResults] = useState<RideLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const requestRef = useRef(0)

  const resetSearchState = (profile = passengerProfile) => {
    setName(profile?.name || '')
    setSelectedCityId(profile?.cityId ?? null)
    setSelectedCityName(profile?.cityName || profile?.city || '')
    setSelectedCityRegionName(profile?.cityRegionName || '')
    setCityQuery(profile?.cityName || profile?.city || '')
    setIsCityPickerOpen(!profile?.cityId)
    setResults([])
    setIsSearching(false)
    setSearchError(null)
    setError('')
    requestRef.current += 1
  }

  useEffect(() => {
    if (!isPassengerOnboardingOpen || !isCityPickerOpen) {
      requestRef.current += 1
      return
    }

    const trimmedQuery = cityQuery.trim()
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
        .catch((searchErr) => {
          if (requestRef.current !== requestId) return
          setResults([])
          setSearchError(searchErr instanceof Error ? searchErr.message : 'Не удалось загрузить города.')
        })
        .finally(() => {
          if (requestRef.current !== requestId) return
          setIsSearching(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [cityQuery, isCityPickerOpen, isPassengerOnboardingOpen])

  const handleCitySelection = (location: RideLocation) => {
    setSelectedCityId(location.id)
    setSelectedCityName(location.nameRu.trim())
    setSelectedCityRegionName(location.regionName?.trim() || '')
    setCityQuery(location.nameRu.trim())
    setIsCityPickerOpen(false)
    setSearchError(null)
  }

  const handleContinue = async () => {
    const normalizedName = name.trim()

    if (!normalizedName || !selectedCityId) {
      setError('Заполните имя и выберите город.')
      return
    }

    setError('')
    setIsSaving(true)
    let savedSuccessfully = false

    try {
      const response = await updatePassengerMe({
        name: normalizedName,
        cityId: selectedCityId,
      })

      const profile = toRidePassengerProfile(response, verifiedPhone || passengerProfile?.phone || '')

      actions.setVerifiedPhone(profile.phone || verifiedPhone)
      actions.setPassengerProfile(profile)
      resetSearchState(profile)
      setIsSaving(false)
      savedSuccessfully = true
      actions.closePassengerOnboarding()

      if (pendingPassengerFlow === 'parcel') {
        actions.startParcelSearch()
        return
      }

      if (pendingPassengerFlow === 'ride') {
        actions.startRideSearch()
      }
    } catch (saveError) {
      if (saveError instanceof BackendAuthError) {
        actions.logout()
        return
      }

      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить профиль.')
    } finally {
      if (!savedSuccessfully) {
        setIsSaving(false)
      }
    }
  }

  const selectedCityDisplay =
    buildCityLabel(selectedCityName, selectedCityRegionName) || getPassengerCityDisplay(passengerProfile)
  const canSave = Boolean(name.trim() && selectedCityId)

  return (
    <OverlaySheet
      open={isPassengerOnboardingOpen}
      title={isProfileComplete ? 'Редактирование профиля' : 'Заполните профиль'}
      onClose={actions.closePassengerOnboarding}
      position="center"
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Имя</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Введите имя"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-ink">Город</span>

          {selectedCityDisplay && !isCityPickerOpen ? (
            <div className="rounded-2xl border border-accent/15 bg-accent/6 px-4 py-3 text-sm text-ink">
              <p className="font-medium">{selectedCityDisplay}</p>
              <button
                type="button"
                onClick={() => setIsCityPickerOpen(true)}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white px-3 py-1 text-xs font-semibold text-accent"
              >
                Изменить город
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCityPickerOpen(true)}
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-left text-sm text-muted outline-none transition hover:border-accent/30 focus:border-accent"
            >
              {selectedCityDisplay || 'Выберите город'}
            </button>
          )}

          {isCityPickerOpen ? (
            <div className="space-y-4 rounded-3xl border border-border bg-white p-4">
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Поиск города</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      value={cityQuery}
                      onChange={(event) => setCityQuery(event.target.value)}
                      placeholder="Начните вводить город"
                      className="w-full rounded-2xl border border-border bg-surface-soft py-3 pl-11 pr-4 text-sm outline-none transition focus:border-accent"
                    />
                  </div>
                </label>

                {selectedCityDisplay ? (
                  <div className="rounded-2xl border border-accent/15 bg-accent/6 px-4 py-3 text-sm text-ink">
                    <p className="font-medium">Текущий выбор</p>
                    <p className="mt-1 text-muted">{selectedCityDisplay}</p>
                  </div>
                ) : null}
              </div>

              <div className="max-h-[34dvh] space-y-2 overflow-y-auto pr-1">
                {cityQuery.trim().length < 2 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                    Введите минимум 2 символа для поиска.
                  </div>
                ) : null}

                {cityQuery.trim().length >= 2 && isSearching ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Ищем города...
                  </div>
                ) : null}

                {cityQuery.trim().length >= 2 && searchError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {searchError}
                  </div>
                ) : null}

                {cityQuery.trim().length >= 2 && !isSearching && !searchError && results.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-4 text-sm text-muted">
                    Ничего не найдено. Попробуйте другой запрос.
                  </div>
                ) : null}

                {cityQuery.trim().length >= 2
                  ? results.map((location) => {
                      const isSelected = selectedCityId === location.id

                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => handleCitySelection(location)}
                          className="flex w-full items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left transition hover:border-accent/30 hover:bg-accent/4"
                        >
                          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-surface-soft text-accent">
                            {isSelected ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {formatLocationTitle(location)}
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

              <button
                type="button"
                onClick={() => setIsCityPickerOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Свернуть поиск
              </button>
            </div>
          ) : null}
        </div>

        <p className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
          Фото можно добавить позже
        </p>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-60"
          disabled={isSaving || !canSave}
        >
          {isSaving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </OverlaySheet>
  )
}
