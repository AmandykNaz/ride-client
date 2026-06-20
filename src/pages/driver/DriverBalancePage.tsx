import { ArrowDownLeft, ArrowUpRight, Lock, RefreshCw } from 'lucide-react'

import { cn } from '../../lib/cn'
import {
  formatKzt,
  formatWalletTransactionDescription,
  formatTopUpMethodLabel,
  formatTopUpStatusLabel,
  formatWalletTransactionStatusLabel,
  formatWalletTransactionTypeLabel,
} from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { DriverTopUpSheet } from '../../features/driver/components/DriverTopUpSheet'
import { DriverBlockedStateCard } from './components/DriverBlockedStateCard'

function formatDateTime(createdAt: string) {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

export default function DriverBalancePage() {
  const {
    driverVerificationStatus,
    driverWallet,
    driverWalletTransactions,
    driverTopUpRequests,
    isDriverWalletLoading,
    isDriverTopUpSubmitting,
    driverWalletError,
  } = useAppState()
  const actions = useAppActions()

  if (driverVerificationStatus !== 'APPROVED') {
    const blockedReason =
      driverWallet.blockedReason?.trim() ||
      'Профиль водителя заблокирован модератором.'

    return (
      <PageCard
        eyebrow="Водитель"
        title={driverVerificationStatus === 'BLOCKED' ? 'Профиль водителя заблокирован' : 'Баланс'}
        description={driverVerificationStatus === 'BLOCKED' ? 'Доступ к кошельку ограничен.' : 'Доступно после проверки водителя.'}
      >
        {driverVerificationStatus === 'BLOCKED' ? (
          <DriverBlockedStateCard reason={blockedReason} />
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
              <Lock className="h-5 w-5 text-accent" />
              <p className="text-sm text-ink">Баланс будет доступен после подтверждения заявки.</p>
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
          </>
        )}
      </PageCard>
    )
  }

  const accessGranted = Boolean(driverWallet.canGoOnline)
  const missingAmount =
    typeof driverWallet.missingAmount === 'number'
      ? driverWallet.missingAmount
      : Math.max(0, driverWallet.minBalance - driverWallet.balance)
  const pendingTopUps = driverTopUpRequests.filter((request) => request.status === 'PENDING_REVIEW')

  return (
    <div className="space-y-4">
      <PageCard
        eyebrow="Водитель"
        title="Кошелёк"
        description="Реальный баланс, транзакции и заявки на пополнение."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Текущий баланс
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
              {formatKzt(driverWallet.balance)}
            </p>
            <p className="mt-1 text-xs text-muted">{driverWallet.currency || 'KZT'}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Минимальный баланс
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
              {formatKzt(driverWallet.minBalance)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {accessGranted ? 'Можно выходить онлайн' : `Не хватает ${formatKzt(missingAmount)}`}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl p-4 text-sm font-semibold',
            accessGranted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800',
          )}
        >
          {driverWallet.isBlocked
            ? 'Кошелёк заблокирован'
            : accessGranted
              ? 'Доступ к заказам активен'
              : 'Доступ к заказам ограничен'}
        </div>

        {driverWallet.isBlocked && driverWallet.blockedReason ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {driverWallet.blockedReason}
          </div>
        ) : null}

        {!driverWallet.isBlocked && !accessGranted ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Баланс ниже минимального</p>
            <p className="mt-1">
              Пополните баланс на {formatKzt(missingAmount)}, чтобы снова выходить онлайн.
            </p>
          </div>
        ) : null}

        {driverWallet.canGoOnline === false && !driverWallet.isBlocked ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            Кошелёк пока не позволяет выйти онлайн. Пополните баланс или дождитесь обработки заявки.
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={actions.openTopUpForm}
            disabled={isDriverTopUpSubmitting}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Пополнить баланс
          </button>
          <button
            type="button"
            onClick={() => {
              void actions.refreshDriverWallet()
              void actions.refreshDriverWalletTransactions()
              void actions.refreshDriverTopUpRequests()
            }}
            disabled={isDriverWalletLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', isDriverWalletLoading && 'animate-spin')} />
            Обновить
          </button>
        </div>

        {driverWalletError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {driverWalletError}
          </div>
        ) : null}
      </PageCard>

      <PageCard
        eyebrow="Проверка"
        title="Заявки на пополнение"
        description="Реальные заявки, отправленные на проверку."
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
                    <p className="mt-1 text-sm text-muted">{formatTopUpMethodLabel(request.method)}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {formatTopUpStatusLabel(request.status)}
                  </span>
                </div>
                  <div className="mt-3 grid gap-1 text-sm text-muted">
                    <p>Номер перевода / чека: {request.providerRef || request.referenceNumber || '—'}</p>
                    <p>Комментарий: {request.comment || '—'}</p>
                    <p>Дата: {formatDateTime(request.createdAt)}</p>
                    {request.reviewedAt ? <p>Проверено: {formatDateTime(request.reviewedAt)}</p> : null}
                    {request.rejectionReason ? <p>Причина отказа: {request.rejectionReason}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <PageCard
        eyebrow="История"
        title="Транзакции"
        description="Списания и пополнения по кошельку."
      >
        {isDriverWalletLoading ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Загружаем транзакции...
          </div>
        ) : driverWalletTransactions.length === 0 ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Пока нет операций.
          </div>
        ) : (
          <div className="space-y-3">
            {driverWalletTransactions.map((transaction) => {
              const isPositive = transaction.amount >= 0

              return (
                <article key={transaction.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'grid h-10 w-10 place-items-center rounded-2xl',
                          isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                        )}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {formatWalletTransactionTypeLabel(transaction.type)}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {formatWalletTransactionDescription(
                            transaction.description || transaction.comment || null,
                            transaction,
                          )}
                        </p>
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

                  <div className="mt-3 grid gap-1 text-xs text-muted sm:grid-cols-3">
                    <span>
                      До: {transaction.balanceBefore === undefined ? '—' : formatKzt(transaction.balanceBefore)}
                    </span>
                    <span>
                      После: {transaction.balanceAfter === undefined ? '—' : formatKzt(transaction.balanceAfter)}
                    </span>
                    <span>{formatDateTime(transaction.createdAt)}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>Статус: {formatWalletTransactionStatusLabel(transaction.status)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </PageCard>

      <div className="rounded-[28px] border border-dashed border-border bg-white p-4 text-sm text-muted">
        <p className="font-semibold text-ink">Примечания по кошельку</p>
        <p className="mt-2">
          Баланс меняется после подтверждения заявки в бэк-офисе, а не сразу после создания заявки на пополнение.
        </p>
      </div>

      <DriverTopUpSheet />
    </div>
  )
}
