import { useState } from 'react'
import { AlertCircle, KeyRound, LogIn, MailQuestion, ShieldCheck } from 'lucide-react'

import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { BackendApiError, BackendAuthError } from '../../../shared/api/backend'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import {
  loginRide,
  normalizeRidePhone,
  requestRideOtp,
  requestRidePasswordResetOtp,
  resetRidePassword,
  setRidePassword,
  verifyRideOtp,
} from '../../ride-auth/api/ride-auth.api'
import { isPassengerProfileComplete, toRidePassengerProfile } from '../api/passenger.api'

type AuthMode = 'login' | 'otp' | 'create-password' | 'reset-password'
type RideFlow = 'ride' | 'parcel' | 'login' | 'driverRegistrationStart' | 'driverRegistrationResume'

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
      />
    </label>
  )
}

export function PhoneVerifySheet() {
  const { isPhoneVerifySheetOpen, verifiedPhone, pendingPassengerFlow } = useAppState()
  const actions = useAppActions()

  const initialFlow: RideFlow =
    pendingPassengerFlow === 'parcel'
      ? 'parcel'
      : pendingPassengerFlow === 'driverRegistrationStart' || pendingPassengerFlow === 'driverRegistrationResume'
        ? 'login'
        : pendingPassengerFlow === 'login'
          ? 'login'
          : 'ride'

  const [mode, setMode] = useState<AuthMode>(initialFlow === 'login' ? 'login' : 'otp')
  const [phone, setPhone] = useState(verifiedPhone || '+7 ')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [devCode, setDevCode] = useState('')
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)
  const [passwordResetOtpRequested, setPasswordResetOtpRequested] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [pendingFlow, setPendingFlow] = useState<RideFlow>(initialFlow)

  const normalizedPhone = normalizeRidePhone(phone)

  const isInvalidLoginError = (error: unknown) =>
    error instanceof BackendAuthError ||
    (error instanceof BackendApiError && (error.status === 401 || error.status === 404))

  const finishAuthenticatedSession = async (phoneValue: string, flow: RideFlow) => {
    const authState = await actions.refreshAuthenticatedSession(phoneValue, flow)
    actions.setVerifiedPhone(phoneValue)

    if (flow === 'driverRegistrationStart') {
      actions.closePhoneVerifySheet()
      actions.startDriverRegistration()
      return
    }

    if (flow === 'driverRegistrationResume') {
      actions.closePhoneVerifySheet()
      actions.setRole('driver', 'driverRegistration')
      return
    }

    if (flow === 'login') {
      actions.closePhoneVerifySheet()
      return
    }

    if (!isPassengerProfileComplete(authState.passengerProfile)) {
      actions.closePhoneVerifySheet()
      actions.openPassengerOnboarding()
      return
    }

    actions.closePhoneVerifySheet()

    if (flow === 'parcel') {
      actions.startParcelSearch()
      return
    }

    actions.startRideSearch()
  }

  const handleRequestOtp = async () => {
    if (!normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    setError('')
    setNotice('')
    setIsRequestingOtp(true)

    try {
      if (mode === 'reset-password') {
        const response = await requestRidePasswordResetOtp(normalizedPhone)
        setPasswordResetOtpRequested(true)
        setDevCode(response.devCode || response.message || '')
        setNotice('Код для восстановления отправлен.')
      } else {
        const response = await requestRideOtp(normalizedPhone)
        setOtpRequested(true)
        setDevCode(response.devCode || response.message || '')
        setNotice('Код отправлен.')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить SMS-код.')
    } finally {
      setIsRequestingOtp(false)
    }
  }

  const handleLogin = async () => {
    if (!normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    if (!password.trim()) {
      setError('Введите пароль.')
      return
    }

    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const response = await loginRide(normalizedPhone, password)
      const customer = response.customer ?? response.user ?? response.passenger

      if (customer?.passwordConfigured === false) {
        setPendingPhone(normalizedPhone)
        setPendingFlow('login')
        setMode('create-password')
        setNotice('Пароль ещё не создан. Создайте его после входа по SMS.')
        return
      }

      const profile = customer ? toRidePassengerProfile(customer, normalizedPhone) : null
      if (profile) {
        actions.setPassengerProfile(profile)
      }

      await finishAuthenticatedSession(normalizedPhone, 'login')
    } catch (loginError) {
      if (isInvalidLoginError(loginError)) {
        setError('Неверный телефон или пароль.')
        return
      }

      setError(loginError instanceof Error ? loginError.message : 'Не удалось войти по паролю.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    if (!code.trim()) {
      setError('Введите SMS-код.')
      return
    }

    if (!otpRequested) {
      setError('Сначала запросите код.')
      return
    }

    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const response = await verifyRideOtp(normalizedPhone, code.trim())
      const customer = response.customer ?? response.passenger ?? response.user
      const profile = customer ? toRidePassengerProfile(customer, normalizedPhone) : null

      if (profile) {
        actions.setPassengerProfile(profile)
      }

      if (customer?.passwordConfigured === false) {
        setPendingPhone(normalizedPhone)
        setPendingFlow(
          pendingPassengerFlow === 'parcel'
            ? 'parcel'
            : pendingPassengerFlow === 'driverRegistrationStart' || pendingPassengerFlow === 'driverRegistrationResume'
              ? pendingPassengerFlow
              : pendingPassengerFlow === 'login'
                ? 'login'
                : 'ride',
        )
        setMode('create-password')
        setNotice('Создайте пароль, чтобы следующий вход был по телефону и паролю.')
        return
      }

      await finishAuthenticatedSession(normalizedPhone, pendingFlow)
    } catch (verifyError) {
      if (verifyError instanceof BackendAuthError) {
        actions.logout()
        return
      }

      setError(verifyError instanceof Error ? verifyError.message : 'Не удалось подтвердить код.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetPassword = async () => {
    if (!password.trim()) {
      setError('Введите пароль.')
      return
    }

    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов.')
      return
    }

    if (password !== repeatPassword) {
      setError('Пароли не совпадают.')
      return
    }

    if (!pendingPhone && !normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const phoneValue = pendingPhone || normalizedPhone
      await setRidePassword(password)
      await finishAuthenticatedSession(phoneValue, pendingFlow)
    } catch (passwordError) {
      if (passwordError instanceof BackendAuthError) {
        actions.logout()
        return
      }

      setError(passwordError instanceof Error ? passwordError.message : 'Не удалось сохранить пароль.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!normalizedPhone) {
      setError('Введите номер телефона.')
      return
    }

    if (!passwordResetOtpRequested) {
      setError('Сначала запросите код.')
      return
    }

    if (!code.trim()) {
      setError('Введите SMS-код.')
      return
    }

    if (!password.trim()) {
      setError('Введите новый пароль.')
      return
    }

    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов.')
      return
    }

    if (password !== repeatPassword) {
      setError('Пароли не совпадают.')
      return
    }

    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const response = await resetRidePassword(normalizedPhone, code.trim(), password)
      const customer = response.customer ?? response.user ?? response.passenger
      const profile = customer ? toRidePassengerProfile(customer, normalizedPhone) : null

      if (profile) {
        actions.setPassengerProfile(profile)
      }

      await finishAuthenticatedSession(normalizedPhone, 'login')
    } catch (resetError) {
      if (resetError instanceof BackendAuthError) {
        actions.logout()
        return
      }

      setError(resetError instanceof Error ? resetError.message : 'Не удалось сбросить пароль.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loginTab = (
    <button
      type="button"
      onClick={() => setMode('login')}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        mode === 'login' ? 'bg-accent text-white' : 'bg-surface-soft text-muted'
      }`}
    >
      Пароль
    </button>
  )

  const otpTab = (
    <button
      type="button"
      onClick={() => setMode('otp')}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        mode === 'otp' ? 'bg-accent text-white' : 'bg-surface-soft text-muted'
      }`}
    >
      SMS-код
    </button>
  )

  return (
    <OverlaySheet
      open={isPhoneVerifySheetOpen}
      title={
        mode === 'login'
          ? 'Вход в AmanJol Ride'
          : mode === 'reset-password'
            ? 'Восстановление пароля'
            : mode === 'create-password'
              ? 'Создайте пароль'
              : 'Подтверждение телефона'
      }
      onClose={actions.closePhoneVerifySheet}
      position="bottom"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {loginTab}
          {otpTab}
          <button
            type="button"
            onClick={() => setMode('reset-password')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'reset-password' || mode === 'create-password'
                ? 'bg-accent text-white'
                : 'bg-surface-soft text-muted'
            }`}
          >
            Восстановить
          </button>
        </div>

        {(mode === 'login' || mode === 'otp' || mode === 'reset-password') && (
          <TextField
            label="Телефон"
            value={phone}
            onChange={(value) => {
              setPhone(value)
              setOtpRequested(false)
              setPasswordResetOtpRequested(false)
              setDevCode('')
              setError('')
              setNotice('')
            }}
            placeholder="+7 700 000 00 00"
          />
        )}

        {mode === 'login' ? (
          <>
            <PasswordField
              label="Пароль"
              value={password}
              onChange={(value) => setPassword(value)}
              placeholder="Ваш пароль"
            />

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() => setMode('otp')}
                className="inline-flex items-center gap-2 font-semibold text-accent"
              >
                <MailQuestion className="h-4 w-4" />
                Войти по SMS-коду
              </button>

              <button
                type="button"
                onClick={() => setMode('reset-password')}
                className="inline-flex items-center gap-2 font-semibold text-muted"
              >
                <KeyRound className="h-4 w-4" />
                Забыли пароль?
              </button>
            </div>

            {notice ? (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{notice}</p>
              </div>
            ) : null}

            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={actions.closePhoneVerifySheet}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleLogin}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
                disabled={isSubmitting}
              >
                <LogIn className="h-4 w-4" />
                {isSubmitting ? 'Входим...' : 'Войти'}
              </button>
            </div>
          </>
        ) : null}

        {mode === 'otp' ? (
          <>
            <TextField
              label="SMS-код"
              value={code}
              onChange={(value) => setCode(value)}
              type="text"
              placeholder="1234"
            />

            {devCode || otpRequested ? (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{devCode ? `Dev-код: ${devCode}` : 'Код отправлен. Проверьте SMS.'}</p>
              </div>
            ) : null}

            {notice ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={actions.closePhoneVerifySheet}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                disabled={isRequestingOtp || isSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent"
                disabled={isRequestingOtp || isSubmitting}
              >
                {isRequestingOtp ? 'Отправка...' : 'Отправить код'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
              disabled={isRequestingOtp || isSubmitting}
            >
              {isSubmitting ? 'Проверяем...' : 'Подтвердить и продолжить'}
            </button>
          </>
        ) : null}

        {mode === 'create-password' ? (
          <>
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <p>Пароль ещё не создан. После сохранения вы сможете входить по телефону и паролю.</p>
              </div>
            </div>

            <PasswordField
              label="Новый пароль"
              value={password}
              onChange={(value) => setPassword(value)}
              placeholder="Минимум 8 символов"
            />
            <PasswordField
              label="Повторите пароль"
              value={repeatPassword}
              onChange={(value) => setRepeatPassword(value)}
              placeholder="Повторите пароль"
            />

            {notice ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={actions.closePhoneVerifySheet}
                className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                disabled={isSubmitting}
              >
                Позже
              </button>
              <button
                type="button"
                onClick={handleSetPassword}
                className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Сохраняем...' : 'Сохранить пароль'}
              </button>
            </div>
          </>
        ) : null}

        {mode === 'reset-password' ? (
          <>
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-accent" />
                <p>Запросите код на телефон, затем задайте новый пароль.</p>
              </div>
            </div>

            <TextField
              label="SMS-код"
              value={code}
              onChange={(value) => setCode(value)}
              placeholder="1234"
            />
            <PasswordField
              label="Новый пароль"
              value={password}
              onChange={(value) => setPassword(value)}
              placeholder="Минимум 8 символов"
            />
            <PasswordField
              label="Повторите пароль"
              value={repeatPassword}
              onChange={(value) => setRepeatPassword(value)}
              placeholder="Повторите пароль"
            />

            {devCode || passwordResetOtpRequested ? (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{devCode ? `Dev-код: ${devCode}` : 'Код отправлен. Проверьте SMS.'}</p>
              </div>
            ) : null}

            {notice ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={actions.closePhoneVerifySheet}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                disabled={isRequestingOtp || isSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent"
                disabled={isRequestingOtp || isSubmitting}
              >
                {isRequestingOtp ? 'Отправка...' : 'Отправить код'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetPassword}
              className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
              disabled={isRequestingOtp || isSubmitting}
            >
              {isSubmitting ? 'Сохраняем...' : 'Сбросить пароль'}
            </button>
          </>
        ) : null}
      </div>
    </OverlaySheet>
  )
}
