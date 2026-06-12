import { BusFront } from 'lucide-react'

import { PageCard } from '../shared/ui/PageCard'

export default function BusesComingSoonPage() {
  return (
    <PageCard
      eyebrow="Сервис"
      title="Автобусы скоро"
      description="Отдельный раздел для автобусных маршрутов. На этом шаге только аккуратная заглушка."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <BusFront className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Скоро добавим автобусные рейсы</p>
      </div>
    </PageCard>
  )
}
