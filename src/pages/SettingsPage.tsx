import { SlidersHorizontal } from 'lucide-react'

import { PageCard } from '../shared/ui/PageCard'

export default function SettingsPage() {
  return (
    <PageCard
      eyebrow="Сервис"
      title="Настройки"
      description="Глобальные настройки приложения, языка, уведомлений и режима работы."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <SlidersHorizontal className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Пока это просто каркас настроек</p>
      </div>
    </PageCard>
  )
}
