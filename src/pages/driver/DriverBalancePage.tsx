import { useState, type MouseEvent } from 'react'

import { ArrowDownLeft, ArrowUpRight, Lock, RefreshCw } from 'lucide-react'

import { cn } from '../../lib/cn'
import {
  formatKzt,
  formatWalletManualCreditReasonLabel,
  formatWalletTransactionDescription,
  formatTopUpMethodLabel,
  formatTopUpStatusLabel,
  getTopUpStatusTone,
  formatWalletTransactionStatusLabel,
  formatWalletTransactionTypeLabel,
} from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { DriverTopUpSheet } from '../../features/driver/components/DriverTopUpSheet'
import type { TopUpRequest } from '../../types/domain'
import { DriverBlockedStateCard } from './components/DriverBlockedStateCard'
import { DriverRecheckCard } from './components/DriverRecheckCard'

function formatDateTime(createdAt: string) {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

function resolveTopUpRequestId(request: { id: string | number }) {
  const numericId = Number(request.id)
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null
}

function getTopUpRequestDisplayCode(request: { id: string | number; publicCode?: string }) {
  if (request.publicCode) {
    return request.publicCode
  }

  const numericId = Number(request.id)
  return Number.isFinite(numericId) && numericId > 0
    ? `AJ-TP-${String(numericId).padStart(6, '0')}`
    : `Заявка #${String(request.id)}`
}

function formatOptionalDateTime(value?: string | null) {
  if (!value) return null
  return formatDateTime(value)
}

function getWalletTransactionSubtitle(transaction: {
  type?: string | null
  publicCode?: string | null
  referenceNumber?: string | null
  sourceTopUpRequestId?: string | number | null
  description?: string | null
  comment?: string | null
}) {
  if (transaction.type === 'TOP_UP_APPROVED') {
    const code = transaction.publicCode || transaction.referenceNumber
    return code ? `Пополнение по заявке ${String(code)}` : 'Подтверждённое пополнение по заявке'
  }

  if (transaction.type === 'MANUAL_ADJUSTMENT') {
    return 'Администратор пополнил баланс'
  }

  return (
    formatWalletTransactionDescription(transaction.description || transaction.comment || null, transaction) ||
    'Операция'
  )
}

function isTechnicalTopUpComment(value?: string | null) {
  const text = value?.trim()
  if (!text) return false

  return /^approved top-up request #\d+$/i.test(text) || /^top-up request #\d+ approved$/i.test(text)
}

function stopCardClick(event: MouseEvent) {
  event.stopPropagation()
}

type TopUpDetailSheetProps = {
  request: TopUpRequest | null
  isSubmitting: boolean
  onClose: () => void
  onCancel: (requestId: number) => void
}

function TopUpDetailSheet({ request, isSubmitting, onClose, onCancel }: TopUpDetailSheetProps) {
  if (!request) return null

  const requestId = resolveTopUpRequestId(request)
  const canCancel = request.status === 'PENDING_UPLOAD' || request.status === 'PENDING_REVIEW'
  const statusLabel = formatTopUpStatusLabel(request.status)
  const isCancelable = canCancel && Boolean(requestId)
  const rejectionReason = request.reviewReason?.trim() || request.rejectionReason?.trim() || ''

  return (
    <OverlaySheet open title="Детали заявки" onClose={onClose} position="bottom">
      <div className="space-y-4">
        <div className="rounded-3xl border border-border bg-surface-soft p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Код заявки
              </p>
              <p className="mt-1 text-base font-semibold text-ink">
                {getTopUpRequestDisplayCode(request)}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                getTopUpStatusTone(request.status) === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : getTopUpStatusTone(request.status) === 'danger'
                    ? 'bg-red-100 text-red-800'
                    : getTopUpStatusTone(request.status) === 'neutral'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-amber-100 text-amber-800',
              )}
            >
              {statusLabel}
            </span>
          </div>
          {(request.status === 'PENDING_UPLOAD' || request.status === 'PENDING_REVIEW') ? (
            <p className="mt-3 text-sm text-muted">
              Баланс изменится только после подтверждения администратором.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-3xl border border-border bg-white p-4 text-sm text-ink">
          <DetailRow label="Сумма" value={formatKzt(request.amount)} />
          <DetailRow label="Метод" value={formatTopUpMethodLabel(request.method)} />
          <DetailRow label="Номер перевода / чека" value={request.providerRef || request.referenceNumber} />
          <DetailRow label="Комментарий" value={request.comment} />
          <DetailRow label="Файл чека" value={request.receiptFileName} />
          <DetailRow label="Создано" value={formatOptionalDateTime(request.createdAt)} />
          {request.status === 'APPROVED' && (request.confirmedAt || request.reviewedAt) ? (
            <DetailRow
              label="Подтверждено"
              value={formatDateTime(request.confirmedAt || request.reviewedAt || '')}
            />
          ) : null}
          {request.status === 'REJECTED' && request.reviewedAt ? (
            <DetailRow label="Отклонено" value={formatDateTime(request.reviewedAt)} />
          ) : null}
          {request.status === 'REJECTED' && rejectionReason ? (
            <DetailRow label="Причина отказа" value={rejectionReason} />
          ) : null}
          {request.status === 'CANCELLED' && request.cancelledAt ? (
            <DetailRow label="Отменено" value={formatDateTime(request.cancelledAt)} />
          ) : null}
          {request.status === 'CANCELLED' && !request.cancelledAt ? (
            <p className="text-xs text-muted">Время отмены не получено</p>
          ) : null}
          {request.status === 'CANCELLED' && request.cancelledBy ? (
            <DetailRow label="Кем отменено" value={request.cancelledBy} />
          ) : null}
          {request.status === 'CANCELLED' && request.cancelReason ? (
            <DetailRow label="Причина отмены" value={request.cancelReason} />
          ) : null}
        </div>

        {isCancelable ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                if (!requestId) return
                void onCancel(requestId)
              }}
              disabled={isSubmitting}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Отменить заявку
            </button>
            <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
              Можно отменить, пока заявка не подтверждена.
            </div>
          </div>
        ) : null}
      </div>
    </OverlaySheet>
  )
}

type TransactionDetailSheetProps = {
  transaction: {
    id: string
    type?: string | null
    status?: string | null
    amount?: number | null
    publicCode?: string | null
    reason?: string | null
    referenceNumber?: string | null
    comment?: string | null
    actorName?: string | null
    actorEmail?: string | null
    description?: string | null
    balanceBefore?: number | null
    balanceAfter?: number | null
    createdAt?: string | null
  } | null
  onClose: () => void
}

function TransactionDetailSheet({ transaction, onClose }: TransactionDetailSheetProps) {
  if (!transaction) return null

  const code = transaction.publicCode || transaction.id
  const title = formatWalletTransactionTypeLabel(transaction.type)
  const shortDescription = getWalletTransactionSubtitle(transaction)
  const comment = transaction.comment?.trim() || ''
  const isManual = String(transaction.type ?? '').trim().toUpperCase() === 'MANUAL_ADJUSTMENT'
  const isTopUp = String(transaction.type ?? '').trim().toUpperCase() === 'TOP_UP_APPROVED'
  const showComment = isManual ? Boolean(comment) : isTopUp ? comment && !isTechnicalTopUpComment(comment) : Boolean(comment)

  return (
    <OverlaySheet open title="Детали транзакции" onClose={onClose} position="bottom">
      <div className="space-y-4">
        <div className="rounded-3xl border border-border bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Код транзакции
          </p>
          <p className="mt-1 text-base font-semibold text-ink">{code}</p>
          <p className="mt-2 text-sm text-muted">{shortDescription}</p>
        </div>

        <div className="grid gap-3 rounded-3xl border border-border bg-white p-4 text-sm text-ink">
          <DetailRow label="Название" value={title} />
          <DetailRow label="Сумма" value={formatKzt(Math.abs(transaction.amount ?? 0))} />
          <DetailRow label="Статус" value={formatWalletTransactionStatusLabel(transaction.status)} />
          <DetailRow label="Дата" value={transaction.createdAt ? formatDateTime(transaction.createdAt) : null} />
          <DetailRow
            label="Баланс до"
            value={transaction.balanceBefore === undefined || transaction.balanceBefore === null ? '—' : formatKzt(transaction.balanceBefore)}
          />
          <DetailRow
            label="Баланс после"
            value={transaction.balanceAfter === undefined || transaction.balanceAfter === null ? '—' : formatKzt(transaction.balanceAfter)}
          />
          {transaction.reason ? (
            <DetailRow label="Причина" value={formatWalletManualCreditReasonLabel(transaction.reason)} />
          ) : null}
          {transaction.referenceNumber ? <DetailRow label="Номер / ссылка" value={transaction.referenceNumber} /> : null}
          {showComment ? <DetailRow label="Комментарий" value={isManual && comment ? comment : transaction.comment?.trim() || null} /> : null}
          {isManual ? <DetailRow label="Кем выполнено" value="Администратор" /> : null}
        </div>
      </div>
    </OverlaySheet>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  )
}

export default function DriverBalancePage() {
  const {
    driverVerificationStatus,
    driverWallet,
    driverWalletTransactions,
    driverTopUpRequests,
    activeRecheck,
    isDriverWalletLoading,
    isDriverTopUpSubmitting,
    driverWalletError,
  } = useAppState()
  const actions = useAppActions()
  const [selectedTopUpRequestId, setSelectedTopUpRequestId] = useState<string | null>(null)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
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
  const recentTopUps = driverTopUpRequests.slice(0, 5)
  const selectedTopUpRequest =
    selectedTopUpRequestId
      ? driverTopUpRequests.find((request) => request.id === selectedTopUpRequestId) ?? null
      : null
  const selectedTransaction =
    selectedTransactionId
      ? driverWalletTransactions.find((transaction) => transaction.id === selectedTransactionId) ?? null
      : null

  return (
    <div className="space-y-4">
      {activeRecheck ? (
        <DriverRecheckCard
          recheck={activeRecheck}
          compact
          onRefresh={() => actions.refreshDriverSnapshot()}
          onOpenDetails={() => actions.setScreen('driverProfile')}
        />
      ) : null}

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
        description="Последние заявки на пополнение и их статус."
      >
        {recentTopUps.length === 0 ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Пока нет заявок на проверке.
          </div>
        ) : (
          <div className="space-y-3">
            {recentTopUps.map((request) => (
              <div
                key={request.id}
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                aria-expanded={selectedTopUpRequestId === request.id}
                onClick={() => setSelectedTopUpRequestId(request.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setSelectedTopUpRequestId(request.id)
                }}
                className={cn(
                  'cursor-pointer rounded-2xl bg-surface-soft p-4 transition',
                  'hover:bg-surface-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                      {getTopUpRequestDisplayCode(request)}
                    </p>
                    <p className="text-base font-semibold text-ink">{formatKzt(request.amount)}</p>
                    <p className="mt-1 text-sm text-muted">{formatTopUpMethodLabel(request.method)}</p>
                    {request.status === 'PENDING_UPLOAD' ? (
                      <p className="mt-2 text-sm font-medium text-amber-800">
                        Заявка создана. Загрузите чек, чтобы отправить её на проверку.
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      getTopUpStatusTone(request.status) === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : getTopUpStatusTone(request.status) === 'danger'
                          ? 'bg-red-100 text-red-800'
                          : getTopUpStatusTone(request.status) === 'neutral'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {formatTopUpStatusLabel(request.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-muted">
                  <p>Номер перевода / чека: {request.providerRef || request.referenceNumber || '—'}</p>
                  <p>Комментарий: {request.comment || '—'}</p>
                  <p>Чек: {request.receiptFileName || (request.receiptFilePath ? 'Прикреплён' : 'Не загружен')}</p>
                  <p>Создано: {formatDateTime(request.createdAt)}</p>
                  {request.status === 'CANCELLED' && request.cancelledAt ? (
                    <p>Отменено: {formatDateTime(request.cancelledAt)}</p>
                  ) : null}
                  {request.status === 'APPROVED' && (request.confirmedAt || request.reviewedAt) ? (
                    <p>Подтверждено: {formatDateTime(request.confirmedAt || request.reviewedAt || '')}</p>
                  ) : null}
                  {request.status === 'REJECTED' && request.reviewedAt ? (
                    <p>Отклонено: {formatDateTime(request.reviewedAt)}</p>
                  ) : null}
                  {request.status === 'REJECTED' && (request.reviewReason || request.rejectionReason) ? (
                    <p>Причина отказа: {request.reviewReason || request.rejectionReason}</p>
                  ) : null}
                </div>
                {request.status === 'PENDING_UPLOAD' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        stopCardClick(event)
                        actions.openTopUpForm()
                      }}
                      disabled={isDriverTopUpSubmitting}
                      className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Загрузить чек
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        stopCardClick(event)
                        const requestId = resolveTopUpRequestId(request)
                        if (!requestId) return
                        void actions.cancelTopUpRequest(requestId)
                      }}
                      disabled={isDriverTopUpSubmitting}
                      className="rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Отменить
                    </button>
                  </div>
                ) : request.status === 'PENDING_REVIEW' ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        stopCardClick(event)
                        const requestId = resolveTopUpRequestId(request)
                        if (!requestId) return
                        void actions.cancelTopUpRequest(requestId)
                      }}
                      disabled={isDriverTopUpSubmitting}
                      className="rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Отменить заявку
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <TopUpDetailSheet
        request={selectedTopUpRequest}
        isSubmitting={isDriverTopUpSubmitting}
        onClose={() => setSelectedTopUpRequestId(null)}
        onCancel={async (requestId) => {
          await actions.cancelTopUpRequest(requestId)
        }}
      />

      <TransactionDetailSheet
        transaction={selectedTransaction}
        onClose={() => setSelectedTransactionId(null)}
      />

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
              const transactionCode = transaction.publicCode || transaction.id

              return (
                <button
                  key={transaction.id}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={selectedTransactionId === transaction.id}
                  onClick={() => setSelectedTransactionId(transaction.id)}
                  className="transaction-card rounded-2xl border border-border bg-white p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
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
                      <div className="min-w-0">
                        {transactionCode ? (
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                            {transactionCode}
                          </p>
                        ) : null}
                        <p className="text-sm font-semibold text-ink">
                          {formatWalletTransactionTypeLabel(transaction.type)}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {getWalletTransactionSubtitle(transaction)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isPositive ? 'text-emerald-700' : 'text-red-700',
                        )}
                      >
                        {isPositive ? '+' : '-'}
                        {formatKzt(Math.abs(transaction.amount))}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatWalletTransactionStatusLabel(transaction.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                    <span>Дата: {formatDateTime(transaction.createdAt)}</span>
                  </div>
                </button>
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
