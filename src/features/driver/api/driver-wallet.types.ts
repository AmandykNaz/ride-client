import type { WalletTransactionStatus, WalletTransactionType } from '../../../types/domain'

export type DriverWallet = {
  id?: string
  balance: number
  minimumBalance: number
  currency: string
  canGoOnline: boolean
  missingAmount: number
  isBlocked: boolean
  blockedReason?: string
  raw?: unknown
}

export type DriverWalletTransaction = {
  id: string
  type: WalletTransactionType | string
  status: WalletTransactionStatus | string
  amount: number
  balanceBefore?: number
  balanceAfter?: number
  description?: string
  comment?: string
  createdAt: string
  raw?: unknown
}

export type DriverTopUpRequestMethod =
  | 'KASPI'
  | 'HALYK'
  | 'CASH'
  | 'OTHER'

export type DriverTopUpRequest = {
  id: string
  amount: number
  method: DriverTopUpRequestMethod | string
  status: string
  providerRef?: string
  referenceNumber?: string
  comment?: string
  proofFilePath?: string
  createdAt: string
  reviewedAt?: string
  rejectionReason?: string
  raw?: unknown
}

export type CreateDriverTopUpRequestPayload = {
  amount: number
  method: DriverTopUpRequestMethod
  providerRef?: string
  comment?: string
  proofFilePath?: string
}

export type DriverWalletTransactionsResponse = {
  items: DriverWalletTransaction[]
  total?: number
  skip?: number
  take?: number
  raw?: unknown
}

export type DriverTopUpRequestsResponse = {
  items: DriverTopUpRequest[]
  total?: number
  skip?: number
  take?: number
  raw?: unknown
}
