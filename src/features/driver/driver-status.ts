import type { DriverApplicationDraft, DriverVerificationStatus, DriverWallet } from '../../types/domain'

export type DriverAccessState =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'NEEDS_CHANGES'
  | 'BLOCKED'
  | 'SUSPENDED'
  | 'APPROVED_LOW_BALANCE'
  | 'APPROVED_READY'

export function getDriverVerificationStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? '').trim().toUpperCase()

  if (normalized === 'NOT_STARTED') return 'Регистрация ещё не начата'
  if (normalized === 'DRAFT') return 'Заявка не завершена'
  if (normalized === 'PENDING_REVIEW') return 'На проверке'
  if (normalized === 'NEEDS_CHANGES') return 'Нужно исправить заявку'
  if (normalized === 'APPROVED') return 'Профиль одобрен'
  if (normalized === 'BLOCKED') return 'Заявка заблокирована'
  if (normalized === 'SUSPENDED') return 'Профиль приостановлен'

  return status ?? 'Статус неизвестен'
}

export function canDriverGoOnline(wallet: Pick<DriverWallet, 'balance' | 'minBalance' | 'isBlocked' | 'canGoOnline'> | null | undefined) {
  if (!wallet) return false
  if (wallet.isBlocked) return false
  if (typeof wallet.canGoOnline === 'boolean') return wallet.canGoOnline
  return wallet.balance >= wallet.minBalance
}

export function getDriverWalletShortfall(wallet: Pick<DriverWallet, 'balance' | 'minBalance'> | null | undefined) {
  if (!wallet) return 0
  return Math.max(0, wallet.minBalance - wallet.balance)
}

export function getDriverAccessState(
  verificationStatus: DriverVerificationStatus,
  wallet: Pick<DriverWallet, 'balance' | 'minBalance' | 'isBlocked' | 'canGoOnline'> | null | undefined,
): DriverAccessState {
  if (verificationStatus === 'NOT_STARTED') return 'NOT_STARTED'
  if (verificationStatus === 'DRAFT') return 'DRAFT'
  if (verificationStatus === 'PENDING_REVIEW') return 'PENDING_REVIEW'
  if (verificationStatus === 'NEEDS_CHANGES') return 'NEEDS_CHANGES'
  if (verificationStatus === 'BLOCKED') return 'BLOCKED'
  if (verificationStatus === 'SUSPENDED') return 'SUSPENDED'

  return canDriverGoOnline(wallet) ? 'APPROVED_READY' : 'APPROVED_LOW_BALANCE'
}

export function getDriverApplicationReason(
  application: Pick<
    DriverApplicationDraft,
    'blockedReason' | 'changesRequestedReason' | 'rejectionReason' | 'moderatorComment'
  > | null | undefined,
  status: string | null | undefined,
) {
  const normalized = String(status ?? '').trim().toUpperCase()

  if (normalized === 'BLOCKED') {
    return application?.blockedReason?.trim() || application?.moderatorComment?.trim() || null
  }

  if (normalized === 'NEEDS_CHANGES') {
    return application?.changesRequestedReason?.trim() || application?.moderatorComment?.trim() || null
  }

  if (normalized === 'REJECTED') {
    return application?.rejectionReason?.trim() || application?.moderatorComment?.trim() || null
  }

  return application?.moderatorComment?.trim() || null
}
