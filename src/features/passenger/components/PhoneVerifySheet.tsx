import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

export function PhoneVerifySheet() {
  const { isPhoneVerifySheetOpen, verifiedPhone } = useAppState()
  const actions = useAppActions()
  const [phone, setPhone] = useState(verifiedPhone || '+7 ')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (code.trim() !== '1234') {
      setError('Неверный код. Для демо используйте 1234.')
      return
    }

    actions.setVerifiedPhone(phone.trim())
    actions.setPassengerStatus('PHONE_VERIFIED')
    actions.openPassengerOnboarding()
    setError('')
  }

  return (
    <OverlaySheet
      open={isPhoneVerifySheetOpen}
      title="Подтверждение телефона"
      onClose={actions.closePhoneVerifySheet}
      position="bottom"
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Телефон</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 700 000 00 00"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">SMS-код</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            placeholder="1234"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>

        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Демо-код: 1234</p>
        </div>

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={actions.closePhoneVerifySheet}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Подтвердить и продолжить
          </button>
        </div>
      </div>
    </OverlaySheet>
  )
}
