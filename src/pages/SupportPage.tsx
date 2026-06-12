import { Headphones } from 'lucide-react'

import { PageCard } from '../shared/ui/PageCard'

export default function SupportPage() {
  return (
    <PageCard
      eyebrow="Сервис"
      title="Поддержка"
      description="Помощь пользователям, обращения и контакты службы поддержки."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <Headphones className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Поддержка будет добавлена на следующем шаге</p>
      </div>
    </PageCard>
  )
}
