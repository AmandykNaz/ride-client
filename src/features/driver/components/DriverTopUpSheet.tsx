import { useState } from 'react'

import { cn } from '../../../lib/cn'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

const methods = [
  { id: 'KASPI_TRANSFER', label: 'Kaspi' },
  { id: 'BANK_TRANSFER', label: 'Bank transfer' },
  { id: 'CASH', label: 'Cash' },
  { id: 'OTHER', label: 'Other' },
] as const

export function DriverTopUpSheet() {
  const { isTopUpFormOpen, topUpForm, isDriverTopUpSubmitting, driverWalletError } = useAppState()
  const actions = useAppActions()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleClose = () => {
    setError('')
    setSuccess('')
    actions.closeTopUpForm()
  }

  const handleSubmit = async () => {
    const amount = Number(topUpForm.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Введите корректную сумму.')
      return
    }

    setError('')
    setSuccess('')

    try {
      await actions.submitTopUpRequest()
      setSuccess('Заявка на пополнение отправлена.')
      actions.updateTopUpForm({
        amount: '',
        providerRef: '',
        comment: '',
        proofFilePath: '',
      })
    } catch {
      setError('Не удалось отправить заявку. Попробуйте еще раз.')
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
          <span className="mb-1 block text-sm font-medium text-ink">Provider reference</span>
          <input
            value={topUpForm.providerRef}
            onChange={(event) => actions.updateTopUpForm({ providerRef: event.target.value })}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Номер перевода, чек, reference"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
          <textarea
            value={topUpForm.comment}
            onChange={(event) => actions.updateTopUpForm({ comment: event.target.value })}
            rows={3}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Например, пополнение через Kaspi по номеру карты"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Proof file path</span>
          <input
            value={topUpForm.proofFilePath}
            onChange={(event) => actions.updateTopUpForm({ proofFilePath: event.target.value })}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Путь к файлу или ссылка на чек"
          />
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
            onClick={actions.closeTopUpForm}
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
