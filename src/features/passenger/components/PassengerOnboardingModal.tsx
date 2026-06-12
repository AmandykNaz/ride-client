import { useState } from 'react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

export function PassengerOnboardingModal() {
  const { isPassengerOnboardingOpen, verifiedPhone } = useAppState()
  const actions = useAppActions()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')

  const handleContinue = () => {
    if (!name.trim() || !city.trim()) return

    actions.setPassengerProfile({
      id: `passenger-${Date.now()}`,
      name: name.trim(),
      phone: verifiedPhone,
      city: city.trim(),
      rating: 5,
      tripsCount: 0,
    })
    actions.closePassengerOnboarding()
    actions.startRideSearch()
  }

  return (
    <OverlaySheet
      open={isPassengerOnboardingOpen}
      title="Мини-профиль пассажира"
      onClose={actions.closePassengerOnboarding}
      position="center"
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Ваше имя</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Алия"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Город</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Алматы"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <p className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
          Фото можно добавить позже
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Продолжить
        </button>
      </div>
    </OverlaySheet>
  )
}
