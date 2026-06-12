import { ArrowDownLeft, ArrowUpRight, Lock } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { DriverTopUpSheet } from '../../features/driver/components/DriverTopUpSheet'

function formatDateTime(createdAt: string) {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

export default function DriverBalancePage() {
  const { driverVerificationStatus, driverWallet } = useAppState()
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

  const accessGranted = driverWallet.balance >= driverWallet.minBalance
  const pendingTopUps = driverWallet.topUpRequests.filter(
    (request) => request.status === 'PENDING_REVIEW',
  )

  return (
    <div className="space-y-4">
      {pendingTopUps.length > 0 ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Заявка на пополнение отправлена на проверку
        </div>
      ) : null}

      <PageCard
        eyebrow="Водитель"
        title="Wallet"
        description="Пополнение и комиссия работают в демо-режиме."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Текущий баланс
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
              {formatKzt(driverWallet.balance)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Минимальный баланс
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
              {formatKzt(driverWallet.minBalance)}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl p-4 text-sm font-semibold',
            accessGranted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800',
          )}
        >
          {accessGranted ? 'Доступ к заказам активен' : 'Доступ к заказам ограничен'}
        </div>

        {!accessGranted ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Пополните баланс, чтобы видеть заказы.
          </div>
        ) : null}

        <button
          type="button"
          onClick={actions.openTopUpForm}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Пополнить баланс
        </button>
      </PageCard>

      <PageCard
        eyebrow="Проверка"
        title="Пополнения на проверке"
        description="Демо-модерация пополнений без реального backend."
      >
        {pendingTopUps.length === 0 ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Пока нет заявок на проверке.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTopUps.map((request) => (
              <div key={request.id} className="rounded-2xl bg-surface-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{formatKzt(request.amount)}</p>
                    <p className="mt-1 text-sm text-muted">
                      {request.method === 'KASPI'
                        ? 'Kaspi'
                        : request.method === 'HALYK'
                          ? 'Halyk'
                          : 'Наличные админу'}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {request.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-muted">
                  <p>Reference: {request.referenceNumber}</p>
                  <p>Дата: {formatDateTime(request.createdAt)}</p>
                  <p>Скрин: {request.screenshotAttached ? 'Прикреплен' : 'Нет'}</p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => actions.demoApproveTopUpRequest(request.id)}
                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
                  >
                    Одобрить
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.demoRejectTopUpRequest(request.id)}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <PageCard
        eyebrow="История"
        title="Операции"
        description="Комиссия списывается только после завершения заказа."
      >
        {driverWallet.transactions.length === 0 ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Пока нет операций.
          </div>
        ) : (
          <div className="space-y-3">
            {driverWallet.transactions.map((transaction) => {
              const isPositive = transaction.amount >= 0
              const isTopUp = transaction.type === 'TOP_UP_APPROVED'
              const isCommission = transaction.type === 'COMMISSION_CHARGED'
              const isRefund = transaction.type === 'COMMISSION_REFUND'

              return (
                <article key={transaction.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'grid h-10 w-10 place-items-center rounded-2xl',
                          isTopUp || isRefund
                            ? 'bg-emerald-50 text-emerald-700'
                            : isCommission
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{transaction.title}</p>
                        <p className="mt-1 text-sm text-muted">{transaction.description || 'Без описания'}</p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isPositive ? 'text-emerald-700' : 'text-red-700',
                      )}
                    >
                      {isPositive ? '+' : '-'}
                      {formatKzt(Math.abs(transaction.amount))}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{formatDateTime(transaction.createdAt)}</span>
                    <span>{transaction.status}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </PageCard>

      <div className="rounded-[28px] border border-dashed border-border bg-white p-4 text-sm text-muted">
        <p className="font-semibold text-ink">Demo controls</p>
        <p className="mt-2">
          Списание комиссии и одобрение пополнений работают только в mock-режиме этого шага.
        </p>
      </div>

      <DriverTopUpSheet />
    </div>
  )
}
