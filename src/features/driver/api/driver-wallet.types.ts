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
  publicCode?: string
  sourceType?: string
  sourceId?: number
  provider?: string
  externalPaymentId?: string
  providerPayload?: Record<string, unknown> | null
  description?: string
  comment?: string
  createdAt: string
  raw?: unknown
}

export type DriverTopUpRequestMethod =
  | 'KASPI'
  | 'KASPI_TRANSFER'
  | 'KASPI_QR'
  | 'HALYK'
  | 'CASH'
  | 'OTHER'

export type DriverTopUpRequest = {
  id: string
  amount: number
  method: DriverTopUpRequestMethod | string
  status: string
  publicCode?: string
  providerRef?: string
  referenceNumber?: string
  comment?: string
  proofFilePath?: string
  receiptFilePath?: string
  receiptFileName?: string
  receiptMimeType?: string
  receiptSizeBytes?: number
  provider?: string
  externalPaymentId?: string
  providerPayload?: Record<string, unknown> | null
  matchedAt?: string
  confirmedAt?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  rejectionReason?: string
  raw?: unknown
}

export type CreateDriverTopUpRequestPayload = {
  amount: number
  method: DriverTopUpRequestMethod
  providerRef?: string
  comment?: string
}

export type UploadDriverTopUpReceiptPayload = {
  topUpRequestId: string | number
  file: File
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
