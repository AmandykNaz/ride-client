import { Lock, Wallet } from 'lucide-react'

import { PageCard } from '../../shared/ui/PageCard'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'

export default function DriverBalancePage() {
  const { driverVerificationStatus } = useAppState()
  const actions = useAppActions()

  if (driverVerificationStatus !== 'APPROVED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Баланс"
        description="Доступно после проверки водителя."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <Lock className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">Баланс будет доступен после approval</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => actions.setScreen('driverRegistration')}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Перейти к регистрации
          </button>
          <button
            type="button"
            onClick={() => actions.setScreen('driverDashboard')}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Посмотреть статус заявки
          </button>
        </div>
      </PageCard>
    )
  }

  return (
    <PageCard
      eyebrow="Водитель"
      title="Баланс"
      description="Баланс и выплаты будут на следующем шаге."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <Wallet className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Пока это чистая заглушка баланса</p>
      </div>
    </PageCard>
  )
}
