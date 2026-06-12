import { Wallet } from 'lucide-react'

import { PageCard } from '../../shared/ui/PageCard'

export default function DriverBalancePage() {
  return (
    <PageCard
      eyebrow="Водитель"
      title="Баланс"
      description="Экран для будущих операций по балансу, комиссиям и выплатам."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <Wallet className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Финансовая логика подключится позже</p>
      </div>
    </PageCard>
  )
}
