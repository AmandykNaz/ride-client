import { BadgeCheck, CircleAlert, LogOut, ShieldCheck, UserCog } from 'lucide-react'

import { formatKzPlateNumber, formatKzt } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import {
  getDriverAccessState,
  getDriverApplicationReason,
  getDriverVerificationStatusLabel,
  getDriverWalletShortfall,
} from '../../features/driver/driver-status'
import { DriverApplicationHistoryCard } from './components/DriverApplicationHistoryCard'
import { DriverBlockedStateCard } from './components/DriverBlockedStateCard'
import { DriverRecheckCard } from './components/DriverRecheckCard'

const documentDefinitions = [
  ['DRIVER_LICENSE_FRONT', 'ВУ лицевая'],
  ['DRIVER_LICENSE_BACK', 'ВУ обратная'],
  ['VEHICLE_REGISTRATION', 'Техпаспорт'],
  ['CAR_FRONT_PHOTO', 'Фото авто'],
  ['CAR_BACK_PHOTO', 'Фото авто сзади'],
  ['INTERIOR_PHOTO', 'Фото салона'],
  ['TRUNK_PHOTO', 'Фото багажника'],
] as const

export default function DriverProfilePage() {
  const {
    passengerStatus,
    driverVerificationStatus,
    driverProfile,
    activeRecheck,
    driverApplicationDraft,
    driverWallet,
    driverAccess,
  } = useAppState()
  const actions = useAppActions()
  const accessState = getDriverAccessState(driverVerificationStatus, driverWallet, driverAccess)
  const verificationStatusLabel = getDriverVerificationStatusLabel(driverVerificationStatus)
  const walletShortfall = getDriverWalletShortfall(driverWallet)
  const applicationReason = getDriverApplicationReason(driverApplicationDraft, driverVerificationStatus)
  const blockedReason =
    driverProfile?.blockedReason?.trim() ||
    driverWallet?.blockedReason?.trim() ||
    'Профиль водителя заблокирован модератором.'
  const subscriptionLocked = driverAccess?.monetizationMode === 'ACCESS_SUBSCRIPTION' && !driverAccess?.hasAccess
  const resolvedCity =
    driverProfile?.city?.trim() ||
    driverProfile?.cityName?.trim() ||
    driverApplicationDraft.city?.trim() ||
    'Не указан'
  const profileDocuments = driverProfile?.documents ?? []
  const applicationDocuments = driverApplicationDraft.documents ?? []
  const resolvedDocuments = profileDocuments.length > 0 ? profileDocuments : applicationDocuments
  const hasDocumentProof = resolvedDocuments.length > 0
  const isApprovedProfile = accessState === 'APPROVED_READY' || accessState === 'APPROVED_LOW_BALANCE'
  const documentStatusText = hasDocumentProof
    ? 'Загружено и проверено'
    : isApprovedProfile
      ? 'Документы проверены администратором'
      : 'Документы не загружены'
  const documentRows = resolvedDocuments.length > 0
    ? documentDefinitions.map(([type, label]) => {
        const document = resolvedDocuments.find((item) => item.type === type)
        const uploaded = Boolean(document?.filePath?.trim())
        const status = uploaded ? (isApprovedProfile ? 'Проверено' : 'Загружено') : 'Не загружено'
        return [label, status, document?.filePath ?? ''] as const
      })
    : []
  const logoutButton = (
    <button
      type="button"
      onClick={actions.logout}
      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
    >
      <LogOut className="h-4 w-4" />
      Выйти
    </button>
  )

  if (accessState === 'NOT_STARTED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль водителя"
        description="Регистрация ещё не начата."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">
            {driverProfile
              ? `Статус заявки: ${verificationStatusLabel}`
              : 'Профиль водителя не найден. Можно подать заявку.'}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {passengerStatus === 'GUEST' ? (
            <button
              type="button"
              onClick={() => actions.openAuthSheet()}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
            >
              Войти как водитель
            </button>
          ) : null}
          <button
            type="button"
            onClick={actions.startDriverRegistration}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Стать водителем
          </button>
        </div>
        {logoutButton}
      </PageCard>
    )
  }

  if (accessState === 'DRAFT') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Заявка не завершена"
        description="Вы начали регистрацию водителя, но ещё не отправили заявку на проверку."
      >
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Вы начали регистрацию водителя, но ещё не отправили заявку на проверку.
          </p>
        </div>
        <button
          type="button"
          onClick={() => actions.setScreen('driverRegistration')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Продолжить регистрацию
        </button>
        {logoutButton}
      </PageCard>
    )
  }

  if (accessState === 'PENDING_REVIEW') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="На проверке"
        description="Профиль пока недоступен до решения модератора."
      >
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-sm font-semibold text-ink">Статус заявки</p>
          <p className="mt-1 text-sm text-muted">{verificationStatusLabel}</p>
        </div>
        <DriverApplicationHistoryCard history={driverApplicationDraft.history ?? []} limit={5} />
        <button
          type="button"
          onClick={actions.returnToPassengerMode}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          Вернуться в пассажирский режим
        </button>
        {logoutButton}
      </PageCard>
    )
  }

  if (accessState === 'NEEDS_CHANGES') {
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
            <p className="mt-1 text-sm">{applicationReason || 'Не указана'}</p>
          </div>
        </div>
        <DriverApplicationHistoryCard history={driverApplicationDraft.history ?? []} limit={5} />
        <button
          type="button"
          onClick={actions.editDriverApplicationAfterChanges}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Исправить заявку
        </button>
        {logoutButton}
      </PageCard>
    )
  }

  if (accessState === 'BLOCKED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль водителя заблокирован"
        description="Доступ к водительскому профилю ограничен модератором."
      >
        <DriverBlockedStateCard reason={blockedReason} />
        {logoutButton}
      </PageCard>
    )
  }

  if (accessState === 'SUSPENDED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль приостановлен"
        description="Доступ к водительскому профилю временно ограничен."
      >
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Статус заявки</p>
            <p className="mt-1 text-sm">{verificationStatusLabel}</p>
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
        {logoutButton}
      </PageCard>
    )
  }

  if (accessState === 'APPROVED_READY' || accessState === 'APPROVED_LOW_BALANCE') {
    return (
      <div className="space-y-4">
        {activeRecheck ? (
          <DriverRecheckCard
            recheck={activeRecheck}
            onRefresh={() => actions.refreshDriverSnapshot()}
          />
        ) : null}

        <PageCard
          eyebrow="Водитель"
          title="Профиль водителя"
          description={
            accessState === 'APPROVED_LOW_BALANCE'
              ? subscriptionLocked
                ? 'Чтобы отправлять предложения пассажирам, купите тариф.'
                : `Профиль одобрен, но для выхода на линию нужно пополнить баланс минимум до ${formatKzt(driverWallet.minBalance)}.`
              : 'Полные данные подтверждённого водителя.'
          }
        >
          {accessState === 'APPROVED_LOW_BALANCE' ? (
            subscriptionLocked ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Нет активного доступа</p>
                <p className="mt-1">
                  {driverAccess?.reason?.trim() || 'Купите тариф, чтобы продолжить работу.'}
                </p>
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Профиль одобрен</p>
                <p className="mt-1">
                  Пополните баланс минимум до {formatKzt(driverWallet.minBalance)}.
                </p>
                <p className="mt-1">Не хватает {formatKzt(walletShortfall)}.</p>
              </div>
            )
          ) : null}

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
                {resolvedCity}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Авто</p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {driverProfile?.vehicle?.brand || driverApplicationDraft.vehicleBrand}{' '}
                {driverProfile?.vehicle?.model || driverApplicationDraft.vehicleModel}
              </p>
              <p className="mt-1 text-sm text-muted">
                {formatKzPlateNumber(driverProfile?.vehicle?.plate || driverApplicationDraft.vehiclePlate)}
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
                {formatKzt(driverWallet.balance)}
              </p>
              {accessState === 'APPROVED_LOW_BALANCE' ? (
                <p className="mt-1 text-xs text-amber-800">
                  Пополните до {formatKzt(driverWallet.minBalance)}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-surface-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Документы</p>
              <p className="mt-2 text-sm font-semibold text-ink">{documentStatusText}</p>
              {documentRows.length > 0 ? (
                <div className="mt-3 space-y-2 text-xs text-muted">
                  {documentRows.map(([label, status, filePath]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                      <span>{label}</span>
                      <span>{status}{filePath ? ` · ${filePath}` : ''}</span>
                    </div>
                  ))}
                </div>
              ) : isApprovedProfile ? (
                <p className="mt-3 text-xs text-muted">Документы проверены администратором.</p>
              ) : (
                <p className="mt-3 text-xs text-muted">Загруженные документы не найдены.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">История заявок</p>
            <p className="mt-1 text-sm text-muted">
              История открытых контактов доступна в разделе “Мои заказы”.
            </p>
            <button
              type="button"
              onClick={() => actions.setScreen('driverMyOrders')}
              className="mt-4 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Открыть мои заказы
            </button>
          </div>
          {logoutButton}
        </PageCard>
      </div>
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
            Статус заявки
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {verificationStatusLabel}
          </p>
        </div>
      </div>
      {logoutButton}
    </PageCard>
  )
}
