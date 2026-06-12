import { useState } from 'react'

import { cn } from '../../../lib/cn'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

const methods = [
  { id: 'KASPI', label: 'Kaspi' },
  { id: 'HALYK', label: 'Halyk' },
  { id: 'CASH', label: 'Наличные админу' },
] as const

export function DriverTopUpSheet() {
  const { isTopUpFormOpen, topUpForm } = useAppState()
  const actions = useAppActions()
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const amount = Number(topUpForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Введите корректную сумму.')
      return
    }

    if (!topUpForm.referenceNumber.trim()) {
      setError('Укажите номер платежа.')
      return
    }

    if (!topUpForm.screenshotAttached) {
      setError('Прикрепите скриншот для проверки.')
      return
    }

    actions.submitTopUpRequest()
    setError('')
  }

  return (
    <OverlaySheet
      open={isTopUpFormOpen}
      title="Пополнение баланса"
      onClose={actions.closeTopUpForm}
      position="bottom"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
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
          <span className="mb-1 block text-sm font-medium text-ink">Reference number</span>
          <input
            value={topUpForm.referenceNumber}
            onChange={(event) => actions.updateTopUpForm({ referenceNumber: event.target.value })}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Последние цифры платежа"
          />
        </label>

        <button
          type="button"
          onClick={() =>
            actions.updateTopUpForm({ screenshotAttached: !topUpForm.screenshotAttached })
          }
          className={cn(
            'w-full rounded-2xl px-4 py-3 text-sm font-semibold transition',
            topUpForm.screenshotAttached
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-surface-soft text-ink',
          )}
        >
          {topUpForm.screenshotAttached ? 'Скрин прикреплен' : 'Скрин не прикреплен'}
        </button>

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
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
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Отправить на проверку
          </button>
        </div>
      </div>
    </OverlaySheet>
  )
}
