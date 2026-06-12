import { BadgeCheck, CircleAlert, ShieldCheck, UserCog } from 'lucide-react'

import { formatKzt } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

export default function DriverProfilePage() {
  const { driverVerificationStatus, driverProfile, driverApplicationDraft } = useAppState()
  const actions = useAppActions()
  const documentRows: Array<[string, boolean]> = [
    ['ВУ лицевая', driverApplicationDraft.documents.driverLicenseFront],
    ['ВУ обратная', driverApplicationDraft.documents.driverLicenseBack],
    ['Техпаспорт', driverApplicationDraft.documents.vehicleRegistration],
    ['Фото авто', driverApplicationDraft.documents.carFrontPhoto],
  ]

  if (driverVerificationStatus === 'NOT_STARTED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль водителя"
        description="Регистрация ещё не начата."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">Статус заявки: NOT_STARTED</p>
        </div>
        <button
          type="button"
          onClick={actions.startDriverRegistration}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Стать водителем
        </button>
      </PageCard>
    )
  }

  if (driverVerificationStatus === 'PENDING_REVIEW') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Заявка на проверке"
        description="Профиль пока недоступен до решения модератора."
      >
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-sm font-semibold text-ink">Статус заявки</p>
          <p className="mt-1 text-sm text-muted">PENDING_REVIEW</p>
        </div>
        <button
          type="button"
          onClick={actions.returnToPassengerMode}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          Вернуться в пассажирский режим
        </button>
      </PageCard>
    )
  }

  if (driverVerificationStatus === 'NEEDS_CHANGES') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Нужно исправить данные"
        description="Модератор попросил обновить заявку."
      >
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Причина</p>
            <p className="mt-1 text-sm">{driverApplicationDraft.moderatorComment || 'Не указана'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={actions.editDriverApplicationAfterChanges}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Исправить данные
        </button>
      </PageCard>
    )
  }

  if (driverVerificationStatus === 'BLOCKED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Доступ заблокирован"
        description="Водительский профиль ограничен."
      >
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Причина</p>
            <p className="mt-1 text-sm">{driverApplicationDraft.moderatorComment || 'Блокировка в демо-режиме'}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => actions.setScreen('support')}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Связаться с поддержкой
          </button>
          <button
            type="button"
            onClick={actions.returnToPassengerMode}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Вернуться в пассажирский режим
          </button>
        </div>
      </PageCard>
    )
  }

  if (driverVerificationStatus === 'APPROVED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль водителя"
        description="Полные данные подтверждённого водителя."
      >
        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-ink">
                {driverProfile?.fullName || driverApplicationDraft.fullName}
              </p>
              <p className="text-sm text-muted">
                {driverProfile?.phone || driverApplicationDraft.phone}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Город</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {driverProfile?.city || driverApplicationDraft.city}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Авто</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {driverProfile?.vehicle?.brand || driverApplicationDraft.vehicleBrand}{' '}
              {driverProfile?.vehicle?.model || driverApplicationDraft.vehicleModel}
            </p>
            <p className="mt-1 text-sm text-muted">
              {driverProfile?.vehicle?.plate || driverApplicationDraft.vehiclePlate}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Рейтинг</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {driverProfile?.rating ?? 5}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Поездки</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {driverProfile?.tripsCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Баланс</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverProfile?.balance ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Документы</p>
            <p className="mt-2 text-sm font-semibold text-ink">Статус проверен</p>
            <div className="mt-3 space-y-2 text-xs text-muted">
              {documentRows.map(([label, uploaded]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                  <span>{label}</span>
                  <span>{uploaded ? 'Загружено' : 'Нет'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageCard>
    )
  }

  return (
    <PageCard
      eyebrow="Водитель"
      title="Профиль"
      description="Текущий статус вашей заявки."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <UserCog className="h-5 w-5 text-accent" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            DriverVerificationStatus
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {driverVerificationStatus}
          </p>
        </div>
      </div>
    </PageCard>
  )
}
