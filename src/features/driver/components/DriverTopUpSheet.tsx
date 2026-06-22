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

function formatCancellationDate(value?: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function DriverTopUpSheet() {
  const { driverTopUpRequests, isTopUpFormOpen, topUpForm, isDriverTopUpSubmitting } = useAppState()
  const actions = useAppActions()
  const [error, setError] = useState('')
  const [completedTopUp, setCompletedTopUp] = useState<{
    requestId: number
    publicCode?: string
    statusLabel: string
  } | null>(null)
  const [cancelledTopUp, setCancelledTopUp] = useState<{
    requestId: number
    publicCode?: string
    statusLabel: string
    cancelledAt?: string | null
  } | null>(null)
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
  const activeTopUpRequest =
    driverTopUpRequests.find((request) => request.status === 'PENDING_UPLOAD' || request.status === 'PENDING_REVIEW') ?? null
  const currentUploadRequest = activeUploadRequest ?? activeTopUpRequest
  const isPendingUploadRequest = currentUploadRequest?.status === 'PENDING_UPLOAD'
  const isPendingReviewRequest = currentUploadRequest?.status === 'PENDING_REVIEW'
  const hasActiveRequest = Boolean(currentUploadRequest)
  const isCompleted = Boolean(completedTopUp)
  const isCancelled = Boolean(cancelledTopUp)
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
    setCompletedTopUp(null)
    setCancelledTopUp(null)
    setSubmission(null)
    setIsRetryingReceipt(false)
    setActiveUploadRequest(null)
    setReceiptInputKey((value) => value + 1)
    void actions.refreshDriverWallet()
    void actions.refreshDriverTopUpRequests()
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
      setCompletedTopUp({
        requestId,
        publicCode: uploaded.publicCode ?? request.publicCode,
        statusLabel: formatTopUpStatusLabel(uploaded.status),
      })
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
      setCompletedTopUp(
        result.receiptUploaded
          ? {
              requestId: result.requestId,
              publicCode: result.request.publicCode,
              statusLabel: 'На проверке',
            }
          : null,
      )
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
    if (isCompleted || isCancelled) {
      handleClose()
      return
    }

    if (isPendingUploadRequest) {
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
    if (isCompleted || isCancelled) {
      return
    }

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

  const handleCancelCurrentRequest = async () => {
    if (!currentUploadRequest) {
      setError('Активная заявка не найдена.')
      return
    }

    const requestId = resolveTopUpRequestId(currentUploadRequest)
    if (!requestId) {
      setError('Не удалось определить номер заявки для отмены.')
      return
    }

    setError('')
    setRetryError('')

    try {
      const cancelled = await actions.cancelTopUpRequest(requestId)
      setCancelledTopUp({
        requestId,
        publicCode: cancelled.publicCode ?? currentUploadRequest.publicCode,
        statusLabel: formatTopUpStatusLabel(cancelled.status),
        cancelledAt: cancelled.cancelledAt ?? cancelled.updatedAt,
      })
      setCompletedTopUp(null)
      setSubmission(null)
      setActiveUploadRequest(null)
      setReceiptInputKey((value) => value + 1)
      actions.updateTopUpForm({ receiptFile: null })
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : 'Не удалось отменить заявку.'
      setError(message)
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
            {isCompleted ? 'Успешно' : isCancelled ? 'Отменено' : hasActiveRequest ? 'Активная заявка' : 'Инструкция'}
          </p>
          {isCompleted && completedTopUp ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">Чек загружен</p>
              <p className="mt-1 text-sm text-muted">
                Код заявки: {completedTopUp.publicCode || `AJ-TP-${String(completedTopUp.requestId).padStart(6, '0')}`}
              </p>
              <p className="mt-1 text-sm text-muted">Статус: {completedTopUp.statusLabel}</p>
              <p className="mt-3 text-sm text-ink">
                Заявка отправлена администратору. Баланс изменится после подтверждения.
              </p>
            </>
          ) : isCancelled && cancelledTopUp ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">Заявка отменена</p>
              <p className="mt-1 text-sm text-muted">
                Код заявки: {cancelledTopUp.publicCode || `AJ-TP-${String(cancelledTopUp.requestId).padStart(6, '0')}`}
              </p>
              <p className="mt-1 text-sm text-muted">Статус: {cancelledTopUp.statusLabel}</p>
              {cancelledTopUp.cancelledAt ? (
                <p className="mt-1 text-sm text-muted">Отменено: {formatCancellationDate(cancelledTopUp.cancelledAt)}</p>
              ) : null}
              <p className="mt-3 text-sm text-ink">Новую заявку можно создать сразу после отмены.</p>
            </>
          ) : isPendingUploadRequest && currentUploadRequest ? (
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
          ) : isPendingReviewRequest && currentUploadRequest ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">
                Заявка {currentUploadRequest.publicCode ?? `AJ-TP-${String(currentUploadRequest.id).padStart(6, '0')}`} уже на проверке
              </p>
              <p className="mt-1 text-sm text-muted">{formatKzt(currentUploadRequest.amount)} · {formatTopUpMethodLabel(currentUploadRequest.method)}</p>
              <p className="mt-1 text-sm text-muted">
                {currentUploadRequest.providerRef || currentUploadRequest.referenceNumber || 'Номер перевода / чека не указан'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {currentUploadRequest.comment || 'Комментарий не указан'}
              </p>
              <p className="mt-3 text-sm text-ink">Можно только отменить заявку и создать новую позже.</p>
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

        {!hasActiveRequest && !isCompleted && !isCancelled ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={isCompleted}
                  onClick={() => actions.updateTopUpForm({ amount: String(amount) })}
                  className={cn(
                    'rounded-2xl px-3 py-3 text-xs font-semibold transition',
                    isCompleted && 'cursor-not-allowed opacity-60',
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
                    disabled={isCompleted}
                    onClick={() => actions.updateTopUpForm({ method: method.id })}
                    className={cn(
                      'rounded-2xl px-3 py-3 text-xs font-semibold transition',
                      isCompleted && 'cursor-not-allowed opacity-60',
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
                disabled={isCompleted}
                value={topUpForm.amount}
                onChange={(event) => actions.updateTopUpForm({ amount: event.target.value })}
                className={cn(
                  'w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent',
                  isCompleted && 'cursor-not-allowed opacity-60',
                )}
                placeholder="Например 5000"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Номер перевода / чека</span>
              <input
                disabled={isCompleted}
                value={topUpForm.providerRef}
                onChange={(event) => actions.updateTopUpForm({ providerRef: event.target.value })}
                className={cn(
                  'w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent',
                  isCompleted && 'cursor-not-allowed opacity-60',
                )}
                placeholder="Необязательно"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
              <textarea
                disabled={isCompleted}
                value={topUpForm.comment}
                onChange={(event) => actions.updateTopUpForm({ comment: event.target.value })}
                rows={3}
                className={cn(
                  'w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent',
                  isCompleted && 'cursor-not-allowed opacity-60',
                )}
                placeholder="Например, пополнение через Kaspi"
              />
            </label>
          </>
        ) : isPendingUploadRequest && !isCompleted && !isCancelled ? (
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
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  void handleCancelCurrentRequest()
                }}
                disabled={isDriverTopUpSubmitting}
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отменить
              </button>
            </div>
          </div>
        ) : isPendingReviewRequest && !isCompleted && !isCancelled ? (
          <div className="rounded-3xl border border-border bg-white p-4">
            <p className="text-sm font-semibold text-ink">Заявка на проверке</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>Сумма: {currentUploadRequest ? formatKzt(currentUploadRequest.amount) : '—'}</p>
              <p>Метод: {currentUploadRequest ? formatTopUpMethodLabel(currentUploadRequest.method) : '—'}</p>
              <p>Номер перевода / чека: {currentUploadRequest?.providerRef || currentUploadRequest?.referenceNumber || '—'}</p>
              <p>Комментарий: {currentUploadRequest?.comment || '—'}</p>
              <p>Статус: {activeUploadStatusLabel || '—'}</p>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  void handleCancelCurrentRequest()
                }}
                disabled={isDriverTopUpSubmitting}
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отменить заявку
              </button>
            </div>
          </div>
        ) : null}

        {!isCompleted && !isCancelled && (!hasActiveRequest || isPendingUploadRequest) ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              {isPendingUploadRequest ? 'Чек для загрузки' : 'Чек / скрин оплаты'}
            </span>
            <input
              key={receiptInputKey}
              type="file"
              accept="image/*,application/pdf"
              disabled={isCompleted}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                actions.updateTopUpForm({ receiptFile: file })
              }}
              className={cn(
                'w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-accent',
                isCompleted && 'cursor-not-allowed opacity-60',
              )}
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
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            {retryError && import.meta.env.DEV ? (
              <p className="mt-2 text-xs text-red-600/80">Деталь: {retryError}</p>
            ) : null}
            {!isCompleted && !isCancelled && submission && !submission.receiptUploaded ? (
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

        {submission && !isCompleted && !isCancelled ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="font-semibold">{submission.mode === 'upload' ? 'Чек загружен' : 'Заявка создана'}</p>
            <p>Код заявки: {submission.publicCode || `AJ-TP-${String(submission.requestId).padStart(6, '0')}`}</p>
            <p>{submission.receiptUploaded ? 'Чек загружен' : 'Чек ожидает повторной загрузки'}</p>
            <p>Статус: {submission.statusLabel}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {isCompleted || isCancelled ? (
            <button
              type="button"
              onClick={handleClose}
              className="col-span-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            >
              Закрыть
            </button>
          ) : isPendingReviewRequest ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCancelCurrentRequest()
                }}
                disabled={isDriverTopUpSubmitting}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отменить заявку
              </button>
            </>
          ) : isPendingUploadRequest ? (
            <>
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
                {isDriverTopUpSubmitting ? 'Загружаем чек...' : 'Загрузить чек'}
              </button>
            </>
          ) : (
            <>
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
                {isDriverTopUpSubmitting ? 'Отправляем...' : 'Отправить'}
              </button>
            </>
          )}
        </div>
      </div>
    </OverlaySheet>
  )
}
