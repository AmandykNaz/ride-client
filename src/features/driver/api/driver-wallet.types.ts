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

export type DriverTariff = {
  id: string
  code: string
  name: string
  description?: string
  price: number
  durationMinutes: number
  includedContactUnlocks: number
  isTrial: boolean
  isActive: boolean
  sortOrder: number
  raw?: unknown
}

export type DriverAccessPass = {
  id: string
  type: 'TRIAL' | 'PAID' | 'MANUAL'
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  tariffName?: string
  startsAt?: string | null
  expiresAt?: string | null
  includedContactUnlocks: number
  usedContactUnlocks: number
  remainingContactUnlocks: number
  raw?: unknown
}

export type DriverAccessSummary = {
  hasAccess: boolean
  monetizationMode: 'ORDER_COMMISSION' | 'ACCESS_SUBSCRIPTION' | 'HYBRID'
  remainingContactUnlocks: number
  reason?: string
  activePass: DriverAccessPass | null
  availableTariffs: DriverTariff[]
  raw?: unknown
}

export type DriverWalletTransaction = {
  id: string
  type: WalletTransactionType | string
  status: WalletTransactionStatus | string
  amount: number
  title?: string
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
  reason?: string
  referenceNumber?: string
  actorName?: string
  actorEmail?: string
  metadata?: Record<string, unknown> | null
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
  matchedAt?: string | null
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReason?: string | null
  reviewReason?: string | null
  createdAt: string
  updatedAt: string
  reviewedAt?: string | null
  rejectionReason?: string | null
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
