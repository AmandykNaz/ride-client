import { CheckCircle2, MapPinned, Navigation2, PackageSearch, ReceiptText } from 'lucide-react'

import { formatKzt, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

function getNextActionLabel(category: 'ride' | 'parcel', status: string) {
  if (category === 'ride') {
    if (status === 'GOING_TO_CLIENT') return 'Я прибыл'
    if (status === 'ARRIVED') return 'Начать поездку'
    if (status === 'IN_PROGRESS') return 'Завершить поездку'
  }

  if (category === 'parcel') {
    if (status === 'GOING_TO_CLIENT') return 'Я прибыл за посылкой'
    if (status === 'ARRIVED') return 'Забрал посылку'
    if (status === 'IN_PROGRESS') return 'Доставил посылку'
  }

  return 'Продолжить'
}

export default function DriverActiveOrderPage() {
  const {
    driverActiveOrder,
    driverVerificationStatus,
    driverWallet,
    isDriverActionLoading,
    driverFlowError,
  } = useAppState()
  const actions = useAppActions()

  if (driverVerificationStatus !== 'APPROVED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Активный заказ"
        description="Доступен после проверки водителя."
      >
        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          Сначала завершите водительскую проверку, чтобы работать с заказами.
        </div>
      </PageCard>
    )
  }

  if (!driverActiveOrder) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Активный заказ"
        description="Сейчас у вас нет открытого заказа."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <MapPinned className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">Выберите заказ в ленте, чтобы начать работу.</p>
        </div>
        <button
          type="button"
          onClick={() => actions.setScreen('driverFeed')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Открыть ленту заказов
        </button>
      </PageCard>
    )
  }

  const commission = driverActiveOrder.commissionPreview
  const afterCommission = driverActiveOrder.price - commission
  const nextActionLabel = getNextActionLabel(driverActiveOrder.category, driverActiveOrder.status)
  const isCompleted = driverActiveOrder.status === 'COMPLETED'
  const isCancelled = driverActiveOrder.status === 'CANCELLED'
  const balanceBefore = driverActiveOrder.completedBalanceBefore ?? driverWallet.balance + commission
  const balanceAfter = driverActiveOrder.completedBalanceAfter ?? driverWallet.balance

  return (
    <PageCard
      eyebrow="Водитель"
      title="Активный заказ"
      description="Управляйте статусами заказа без списания комиссии."
    >
      {driverFlowError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {driverFlowError}
        </div>
      ) : null}

      <div className="rounded-2xl bg-surface-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Статус
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {driverActiveOrder.status}
            </p>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {driverActiveOrder.category === 'ride' ? 'Поездка' : 'Посылка'}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Маршрут</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-ink">
            {formatRoute(driverActiveOrder.from, driverActiveOrder.to)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Клиент</p>
            <p className="mt-2 text-sm font-semibold text-ink">{driverActiveOrder.clientName}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Телефон</p>
            <p className="mt-2 text-sm font-semibold text-ink">{driverActiveOrder.clientPhone}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Цена</p>
            <p className="mt-2 text-sm font-semibold text-ink">{formatKzt(driverActiveOrder.price)}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Комиссия preview</p>
            <p className="mt-2 text-sm font-semibold text-ink">{formatKzt(commission)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="flex items-center gap-3">
            <ReceiptText className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-ink">До и после комиссии</p>
              <p className="mt-1 text-sm text-muted">
                Получите {formatKzt(driverActiveOrder.price)} до списания комиссии и {formatKzt(afterCommission)} после preview.
              </p>
            </div>
          </div>
        </div>

        {driverActiveOrder.category === 'ride' ? (
          <div className="grid gap-3 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <div className="flex items-center gap-2">
              <Navigation2 className="h-4 w-4 text-accent" />
              <span className="font-semibold">
                {driverActiveOrder.rideType === 'full' ? 'Весь салон' : 'С попутчиками'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <CheckCircle2 className="h-4 w-4" />
              <span>{driverActiveOrder.passengersCount ?? 1} пассажир(а)</span>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-accent" />
              <span className="font-semibold">Размер: {driverActiveOrder.parcelSize}</span>
            </div>
            {driverActiveOrder.parcelDescription ? (
              <p className="text-sm text-muted">{driverActiveOrder.parcelDescription}</p>
            ) : null}
            {driverActiveOrder.receiverName ? (
              <p className="text-sm text-muted">Получатель: {driverActiveOrder.receiverName}</p>
            ) : null}
            {driverActiveOrder.receiverPhone ? (
              <p className="text-sm text-muted">Телефон получателя: {driverActiveOrder.receiverPhone}</p>
            ) : null}
          </div>
        )}

        {isCompleted ? (
          <div className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Заказ завершён</p>
            <p>Комиссия списана с баланса.</p>
            <div className="grid gap-2 rounded-2xl bg-white/70 p-3 text-emerald-900">
              <div className="flex items-center justify-between gap-3">
                <span>Цена заказа</span>
                <span className="font-semibold">{formatKzt(driverActiveOrder.price)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Комиссия 8%</span>
                <span className="font-semibold">-{formatKzt(commission)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Баланс до</span>
                <span className="font-semibold">{formatKzt(balanceBefore)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Баланс после</span>
                <span className="font-semibold">{formatKzt(balanceAfter)}</span>
              </div>
            </div>
            {balanceAfter < driverWallet.minBalance ? (
              <div className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-900">
                Баланс стал ниже минимума.
              </div>
            ) : null}
          </div>
        ) : isCancelled ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Заказ отменён</p>
            <p className="mt-2">Вы можете вернуться в кабинет и открыть новый заказ.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={actions.driverOrderNextStatus}
              disabled={isDriverActionLoading}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            >
              {nextActionLabel}
            </button>
            <button
              type="button"
              onClick={actions.cancelDriverActiveOrder}
              disabled={isDriverActionLoading}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              Отменить заказ
            </button>
          </div>
        )}

        {(isCompleted || isCancelled) && (
          <button
            type="button"
            onClick={actions.clearCompletedDriverOrder}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Вернуться в кабинет
          </button>
        )}
      </div>
    </PageCard>
  )
}
