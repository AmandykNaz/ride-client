import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { BackendAuthError } from '../../../shared/api/backend'
import { normalizeRidePhone, requestRideOtp, verifyRideOtp } from '../../ride-auth/api/ride-auth.api'
import { toRidePassengerProfile } from '../api/passenger.api'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

export function PhoneVerifySheet() {
  const { isPhoneVerifySheetOpen, verifiedPhone, pendingPassengerFlow } = useAppState()
  const actions = useAppActions()
  const [phone, setPhone] = useState(verifiedPhone || '+7 ')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState('')
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)

  const handleRequestOtp = async () => {
    const normalizedPhone = normalizeRidePhone(phone)

    if (!normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    setError('')
    setIsRequestingOtp(true)

    try {
      const response = await requestRideOtp(normalizedPhone)
      setOtpRequested(true)
      setDevCode(response.devCode || response.message || '')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось отправить SMS-код.',
      )
    } finally {
      setIsRequestingOtp(false)
    }
  }

  const handleSubmit = async () => {
    const normalizedPhone = normalizeRidePhone(phone)
    const normalizedCode = code.trim()

    if (!normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    if (!normalizedCode) {
      setError('Введите SMS-код.')
      return
    }

    if (!otpRequested) {
      setError('Сначала запросите код.')
      return
    }

    setError('')
    setIsVerifying(true)

    try {
      const response = await verifyRideOtp(normalizedPhone, normalizedCode)
      const customer = response.customer ?? response.passenger ?? response.user
      const profile = customer ? toRidePassengerProfile(customer, normalizedPhone) : null

      actions.setVerifiedPhone(normalizedPhone)

      if (profile) {
        actions.setPassengerProfile(profile)
      } else {
        actions.setPassengerStatus('PHONE_VERIFIED')
      }

      actions.closePhoneVerifySheet()

      if (!profile || !profile.name || !profile.city) {
        actions.openPassengerOnboarding()
        return
      }

      if (pendingPassengerFlow === 'parcel') {
        actions.startParcelSearch()
        return
      }

      if (pendingPassengerFlow === 'ride') {
        actions.startRideSearch()
      }
    } catch (verifyError) {
      if (verifyError instanceof BackendAuthError) {
        actions.logout()
        return
      }

      setError(
        verifyError instanceof Error ? verifyError.message : 'Не удалось подтвердить код.',
      )
    } finally {
      setIsVerifying(false)
    }
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
            onChange={(event) => {
              setPhone(event.target.value)
              setOtpRequested(false)
              setDevCode('')
              setError('')
            }}
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

        {devCode || otpRequested ? (
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{devCode ? `Dev-код: ${devCode}` : 'Код отправлен. Проверьте SMS.'}</p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={actions.closePhoneVerifySheet}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            disabled={isRequestingOtp || isVerifying}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleRequestOtp}
            className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent"
            disabled={isRequestingOtp || isVerifying}
          >
            {isRequestingOtp ? 'Отправка...' : 'Отправить код'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          disabled={isRequestingOtp || isVerifying}
        >
          {isVerifying ? 'Проверяем...' : 'Подтвердить и продолжить'}
        </button>
      </div>
    </OverlaySheet>
  )
}
