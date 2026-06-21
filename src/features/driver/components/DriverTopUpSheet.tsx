import { useMemo, useState } from 'react'

import { cn } from '../../../lib/cn'
import { formatKzt, formatTopUpMethodLabel, formatTopUpStatusLabel } from '../../../lib/format'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import type { TopUpRequest } from '../../../types/domain'

const methods = [
  { id: 'KASPI_TRANSFER', label: 'Kaspi перевод' },
  { id: 'KASPI_QR', label: 'Kaspi QR' },
  { id: 'HALYK', label: 'Halyk' },
  { id: 'CASH', label: 'Наличные' },
  { id: 'OTHER', label: 'Другое' },
] as const

const quickAmounts = [2000, 5000, 10000]

function buildInstructions(method: string) {
  switch (method) {
    case 'KASPI_QR':
      return {
        title: 'Kaspi QR',
        text: 'Оплатите по QR-коду и сохраните чек. После оплаты прикрепите файл к заявке.',
      }
    case 'HALYK':
      return {
        title: 'Halyk',
        text: 'Переведите сумму на реквизиты Halyk и загрузите скрин подтверждения.',
      }
    case 'CASH':
      return {
        title: 'Наличные',
        text: 'Если оплата наличными уже принята, прикрепите фото или скрин подтверждения.',
      }
    case 'OTHER':
      return {
        title: 'Другое',
        text: 'Используйте тот способ, который согласован с администратором, и приложите чек.',
      }
    case 'KASPI_TRANSFER':
    case 'KASPI':
    default:
      return {
        title: 'Kaspi перевод',
        text: 'Переведите сумму на Kaspi и прикрепите чек или скрин после оплаты.',
      }
  }
}

function resolveTopUpRequestId(request: TopUpRequest | null | undefined) {
  if (!request) return null
  const numericId = Number(request.id)
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId
  }

  if (import.meta.env.DEV) {
    // Helps spot API shapes where the backend id was not preserved by the mapper.
    console.debug('Top-up request is missing a usable id', request)
  }

  return null
}

export function DriverTopUpSheet() {
  const { driverTopUpRequests, isTopUpFormOpen, topUpForm, isDriverTopUpSubmitting } = useAppState()
  const actions = useAppActions()
  const [error, setError] = useState('')
  const [submission, setSubmission] = useState<{
    requestId: number
    publicCode?: string
    receiptUploaded: boolean
    mode: 'create' | 'upload'
    statusLabel: string
  } | null>(null)
  const [retryError, setRetryError] = useState('')
  const [isRetryingReceipt, setIsRetryingReceipt] = useState(false)
  const [receiptInputKey, setReceiptInputKey] = useState(0)
  const [activeUploadRequest, setActiveUploadRequest] = useState<TopUpRequest | null>(null)

  const instructions = useMemo(() => buildInstructions(topUpForm.method), [topUpForm.method])
  const pendingUploadRequest = driverTopUpRequests.find((request) => request.status === 'PENDING_UPLOAD') ?? null
  const currentUploadRequest = activeUploadRequest ?? pendingUploadRequest
  const isUploadMode = currentUploadRequest?.status === 'PENDING_UPLOAD'
  const activeUploadStatusLabel = currentUploadRequest ? formatTopUpStatusLabel(currentUploadRequest.status) : ''

  const resetForm = () => {
    setReceiptInputKey((value) => value + 1)
    actions.updateTopUpForm({
      amount: '',
      providerRef: '',
      comment: '',
      receiptFile: null,
    })
  }

  const sanitizeErrorMessage = (message: string) => {
    if (!message) return 'Не удалось отправить заявку.'
    if (/should not exist/i.test(message) || /receiptFile/i.test(message)) {
      return 'Не удалось отправить заявку. Проверьте данные формы.'
    }
    return message
  }

  const handleClose = () => {
    setError('')
    setRetryError('')
    setSubmission(null)
    setIsRetryingReceipt(false)
    setActiveUploadRequest(null)
    setReceiptInputKey((value) => value + 1)
    actions.closeTopUpForm()
  }

  const handleReceiptUpload = async (request: TopUpRequest) => {
    if (!topUpForm.receiptFile) {
      setError('Прикрепите чек или скрин оплаты.')
      return
    }

    const requestId = resolveTopUpRequestId(request)
    if (!requestId) {
      setError('Не удалось определить номер заявки для загрузки чека.')
      return
    }

    setError('')
    setRetryError('')

    try {
      const uploaded = await actions.uploadTopUpReceipt(requestId, topUpForm.receiptFile)
      setActiveUploadRequest(uploaded)
      setSubmission({
        requestId,
        publicCode: uploaded.publicCode ?? request.publicCode,
        receiptUploaded: true,
        mode: 'upload',
        statusLabel: formatTopUpStatusLabel(uploaded.status),
      })
      resetForm()
    } catch (retrySubmitError) {
      const message =
        retrySubmitError instanceof Error ? retrySubmitError.message : 'Не удалось загрузить чек.'
      setError('Чек не загрузился. Попробуйте ещё раз.')
      if (import.meta.env.DEV) {
        setRetryError(message)
      }
      setSubmission({
        requestId,
        publicCode: request.publicCode,
        receiptUploaded: false,
        mode: 'upload',
        statusLabel: formatTopUpStatusLabel(request.status),
      })
    }
  }

  const handleCreateSubmit = async () => {
    const amount = Number(topUpForm.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Введите корректную сумму.')
      return
    }

    if (!topUpForm.receiptFile) {
      setError('Прикрепите чек или скрин оплаты.')
      return
    }

    setError('')
    setRetryError('')
    setSubmission(null)

    try {
      const result = await actions.submitTopUpRequest()
      setSubmission({
        requestId: result.requestId,
        publicCode: result.request.publicCode,
        receiptUploaded: result.receiptUploaded,
        mode: 'create',
        statusLabel: result.receiptUploaded ? 'На проверке' : 'Ожидает чек',
      })

      if (result.receiptUploaded) {
        setActiveUploadRequest(null)
        resetForm()
      } else if (result.receiptUploadError) {
        setActiveUploadRequest(result.request)
        setError('Заявка создана, но чек не загрузился. Попробуйте загрузить чек повторно.')
        if (import.meta.env.DEV) {
          setRetryError(result.receiptUploadError)
        }
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Не удалось отправить заявку.'
      setError(sanitizeErrorMessage(message))
      if (import.meta.env.DEV && submitError instanceof Error && submitError.message !== sanitizeErrorMessage(submitError.message)) {
        setRetryError(submitError.message)
      }
    }
  }

  const handleSubmit = async () => {
    if (isUploadMode) {
      if (!currentUploadRequest) {
        setError('Активная заявка не найдена.')
        return
      }
      await handleReceiptUpload(currentUploadRequest)
      return
    }

    setIsRetryingReceipt(true)
    try {
      await handleCreateSubmit()
    } finally {
      setIsRetryingReceipt(false)
    }
  }

  const handleRetryReceiptUpload = async () => {
    if (!submission || !topUpForm.receiptFile) {
      setRetryError('Чек для повторной загрузки не найден.')
      return
    }

    setIsRetryingReceipt(true)
    setError('')
    setRetryError('')

    try {
      if (submission.mode === 'upload' && currentUploadRequest) {
        await handleReceiptUpload(currentUploadRequest)
        return
      }

      const uploaded = await actions.uploadTopUpReceipt(submission.requestId, topUpForm.receiptFile)
      setSubmission({
        requestId: submission.requestId,
        publicCode: uploaded.publicCode ?? submission.publicCode,
        receiptUploaded: true,
        mode: submission.mode,
        statusLabel: formatTopUpStatusLabel(uploaded.status),
      })
      resetForm()
    } catch (retrySubmitError) {
      const message =
        retrySubmitError instanceof Error ? retrySubmitError.message : 'Не удалось загрузить чек.'
      setError('Чек не загрузился. Попробуйте ещё раз.')
      if (import.meta.env.DEV) {
        setRetryError(message)
      }
    } finally {
      setIsRetryingReceipt(false)
    }
  }

  return (
    <OverlaySheet
      open={isTopUpFormOpen}
      title="Пополнение баланса"
      onClose={handleClose}
      position="bottom"
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-border bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {isUploadMode ? 'Активная заявка' : 'Инструкция'}
          </p>
          {isUploadMode && currentUploadRequest ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">
                У вас уже есть заявка {currentUploadRequest.publicCode ?? `AJ-TP-${String(currentUploadRequest.id).padStart(6, '0')}`}
              </p>
              <p className="mt-1 text-sm text-muted">{formatKzt(currentUploadRequest.amount)} · {formatTopUpMethodLabel(currentUploadRequest.method)}</p>
              <p className="mt-1 text-sm text-muted">
                {currentUploadRequest.providerRef || currentUploadRequest.referenceNumber || 'Номер перевода / чека не указан'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {currentUploadRequest.comment || 'Комментарий не указан'}
              </p>
              <p className="mt-3 text-sm text-ink">Загрузите чек для отправки на проверку.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">{instructions.title}</p>
              <p className="mt-1 text-sm text-muted">{instructions.text}</p>
              <p className="mt-3 text-sm text-ink">
                Выберите метод оплаты, затем загрузите чек. После отправки заявка получит публичный код.
              </p>
            </>
          )}
        </div>

        {!isUploadMode ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => actions.updateTopUpForm({ amount: String(amount) })}
                  className={cn(
                    'rounded-2xl px-3 py-3 text-xs font-semibold transition',
                    topUpForm.amount === String(amount)
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-surface-soft text-ink',
                  )}
                >
                  {formatKzt(amount)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {methods.map((method) => {
                const isActive = topUpForm.method === method.id

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => actions.updateTopUpForm({ method: method.id })}
                    className={cn(
                      'rounded-2xl px-3 py-3 text-xs font-semibold transition',
                      isActive
                        ? 'bg-accent text-white shadow-lg shadow-accent/20'
                        : 'bg-surface-soft text-ink',
                    )}
                  >
                    {method.label}
                  </button>
                )
              })}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Сумма</span>
              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={topUpForm.amount}
                onChange={(event) => actions.updateTopUpForm({ amount: event.target.value })}
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Например 5000"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Номер перевода / чека</span>
              <input
                value={topUpForm.providerRef}
                onChange={(event) => actions.updateTopUpForm({ providerRef: event.target.value })}
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Необязательно"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
              <textarea
                value={topUpForm.comment}
                onChange={(event) => actions.updateTopUpForm({ comment: event.target.value })}
                rows={3}
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Например, пополнение через Kaspi"
              />
            </label>
          </>
        ) : (
          <div className="rounded-3xl border border-border bg-white p-4">
            <p className="text-sm font-semibold text-ink">Текущая заявка</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>Сумма: {currentUploadRequest ? formatKzt(currentUploadRequest.amount) : '—'}</p>
              <p>Метод: {currentUploadRequest ? formatTopUpMethodLabel(currentUploadRequest.method) : '—'}</p>
              <p>Номер перевода / чека: {currentUploadRequest?.providerRef || currentUploadRequest?.referenceNumber || '—'}</p>
              <p>Комментарий: {currentUploadRequest?.comment || '—'}</p>
              <p>Статус: {activeUploadStatusLabel || '—'}</p>
              <p>Чек: не загружен</p>
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            {isUploadMode ? 'Чек для загрузки' : 'Чек / скрин оплаты'}
          </span>
          <input
            key={receiptInputKey}
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              actions.updateTopUpForm({ receiptFile: file })
            }}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-accent"
          />
          <span className="mt-1 block text-xs text-muted">
            Обязательный файл для отправки заявки. Форматы: JPG, PNG, WEBP, PDF.
          </span>
          {topUpForm.receiptFile ? (
            <span className="mt-1 block text-xs text-ink">
              Выбран файл: {topUpForm.receiptFile.name}
            </span>
          ) : null}
        </label>

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            {retryError && import.meta.env.DEV ? (
              <p className="mt-2 text-xs text-red-600/80">Деталь: {retryError}</p>
            ) : null}
            {submission && !submission.receiptUploaded ? (
              <button
                type="button"
                onClick={handleRetryReceiptUpload}
                disabled={isRetryingReceipt || isDriverTopUpSubmitting}
                className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRetryingReceipt || isDriverTopUpSubmitting ? 'Загружаем чек...' : 'Загрузить чек повторно'}
              </button>
            ) : null}
          </div>
        ) : null}

        {submission ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="font-semibold">{submission.mode === 'upload' ? 'Чек загружен' : 'Заявка создана'}</p>
            <p>Код заявки: {submission.publicCode || `AJ-TP-${String(submission.requestId).padStart(6, '0')}`}</p>
            <p>{submission.receiptUploaded ? 'Чек загружен' : 'Чек ожидает повторной загрузки'}</p>
            <p>Статус: {submission.statusLabel}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDriverTopUpSubmitting}
            className={cn(
              'rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20',
              isDriverTopUpSubmitting && 'cursor-not-allowed opacity-60',
            )}
          >
            {isDriverTopUpSubmitting
              ? isUploadMode
                ? 'Загружаем чек...'
                : 'Отправляем...'
              : isUploadMode
                ? 'Загрузить чек'
                : 'Отправить'}
          </button>
        </div>
      </div>
    </OverlaySheet>
  )
}
