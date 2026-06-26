import { useState } from 'react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { BackendAuthError } from '../../../shared/api/backend'
import {
  isPassengerProfileComplete,
  toRidePassengerProfile,
  updatePassengerMe,
} from '../api/passenger.api'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

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
  const [city, setCity] = useState(() => passengerProfile?.city || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleContinue = async () => {
    const normalizedName = name.trim()
    const normalizedCity = city.trim()

    if (!normalizedName || !normalizedCity) {
      setError('Заполните имя и город, чтобы создать заявку.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      const response = await updatePassengerMe({
        name: normalizedName,
      })

      const profile = toRidePassengerProfile(response, verifiedPhone || passengerProfile?.phone || '')
      const mergedProfile = {
        ...profile,
        city: normalizedCity || profile.city,
      }

      actions.setVerifiedPhone(mergedProfile.phone || verifiedPhone)
      actions.setPassengerProfile(mergedProfile)
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
      setIsSaving(false)
    }
  }

  return (
    <OverlaySheet
      open={isPassengerOnboardingOpen}
      title={isProfileComplete ? 'Редактирование профиля' : 'Заполните профиль'}
      onClose={actions.closePassengerOnboarding}
      position="center"
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Имя</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Введите имя"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Город</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Например, Алматы"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <p className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
          Фото можно добавить позже
        </p>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-60"
          disabled={isSaving || !isPassengerProfileComplete({ name, city })}
        >
          {isSaving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </OverlaySheet>
  )
}
