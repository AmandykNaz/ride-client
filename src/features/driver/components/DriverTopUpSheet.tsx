import { useMemo, useState } from 'react'

import { cn } from '../../../lib/cn'
import { formatKzt } from '../../../lib/format'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

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

export function DriverTopUpSheet() {
  const { isTopUpFormOpen, topUpForm, isDriverTopUpSubmitting, driverWalletError } = useAppState()
  const actions = useAppActions()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [receiptInputKey, setReceiptInputKey] = useState(0)

  const instructions = useMemo(() => buildInstructions(topUpForm.method), [topUpForm.method])

  const handleClose = () => {
    setError('')
    setSuccess('')
    setReceiptInputKey((value) => value + 1)
    actions.closeTopUpForm()
  }

  const handleSubmit = async () => {
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
    setSuccess('')

    try {
      await actions.submitTopUpRequest()
      setSuccess('Заявка отправлена на проверку.')
      setReceiptInputKey((value) => value + 1)
      actions.updateTopUpForm({
        amount: '',
        providerRef: '',
        comment: '',
        proofFilePath: '',
        receiptFile: null,
      })
    } catch {
      setError('Не удалось отправить заявку. Попробуйте ещё раз.')
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
            Инструкция
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">{instructions.title}</p>
          <p className="mt-1 text-sm text-muted">{instructions.text}</p>
          <p className="mt-3 text-sm text-ink">
            Выберите метод оплаты, затем загрузите чек. После отправки заявка получит публичный код.
          </p>
        </div>

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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Чек / скрин оплаты</span>
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

        {driverWalletError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {driverWalletError}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
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
            {isDriverTopUpSubmitting ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </div>
    </OverlaySheet>
  )
}
