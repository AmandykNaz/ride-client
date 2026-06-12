import { Sparkles } from 'lucide-react'

import { PageCard } from '../../shared/ui/PageCard'

export default function DriverFeedPage() {
  return (
    <PageCard
      eyebrow="Водитель"
      title="Лента заказов"
      description="Позже здесь появятся карточки заказов, фильтры и быстрые действия."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <Sparkles className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Пока это чистая заглушка ленты</p>
      </div>
    </PageCard>
  )
}
