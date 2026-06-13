import { backendGet, backendPost } from '../../../shared/api/backend'
import type {
  CreateDriverTopUpRequestPayload,
  DriverTopUpRequest,
  DriverTopUpRequestsResponse,
  DriverWallet,
  DriverWalletTransaction,
  DriverWalletTransactionsResponse,
} from './driver-wallet.types'

type BackendRecord = Record<string, unknown>

function isRecord(value: unknown): value is BackendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function getList(value: unknown) {
  if (Array.isArray(value)) return value

  if (isRecord(value)) {
    const lists = [value.items, value.results, value.data, value.transactions, value.topUpRequests]
    for (const candidate of lists) {
      if (Array.isArray(candidate)) return candidate
    }
  }

  return []
}

function firstRecord(...values: unknown[]) {
  return values.find(isRecord) as BackendRecord | undefined
}

function normalizeWalletMethod(value: unknown): DriverTopUpRequest['method'] {
  const normalized = asString(value).toUpperCase()

  if (normalized === 'KASPI' || normalized === 'KASPI_TRANSFER') return 'KASPI_TRANSFER'
  if (normalized === 'BANK_TRANSFER' || normalized === 'BANK') return 'BANK_TRANSFER'
  if (normalized === 'CASH') return 'CASH'
  if (normalized === 'OTHER') return 'OTHER'

  return asString(value) as DriverTopUpRequest['method']
}

function mapWallet(raw: unknown): DriverWallet {
  const record = isRecord(raw) ? raw : {}
  const minimumBalance = asNumber(record.minimumBalance ?? record.minBalance ?? record.min_balance, 0)
  const balance = asNumber(record.balance, 0)
  const isBlocked = Boolean(record.isBlocked ?? record.is_blocked)
  const missingAmount = asNumber(
    record.missingAmount ?? record.missing_amount ?? Math.max(0, minimumBalance - balance),
    Math.max(0, minimumBalance - balance),
  )
  const canGoOnline =
    typeof record.canGoOnline === 'boolean'
      ? record.canGoOnline
      : typeof record.can_go_online === 'boolean'
        ? record.can_go_online
        : balance >= minimumBalance && !isBlocked

  return {
    id: asString(record.id),
    balance,
    minimumBalance,
    currency: asString(record.currency ?? record.currencyCode ?? record.currency_code, 'KZT'),
    canGoOnline,
    missingAmount,
    isBlocked,
    blockedReason: asString(record.blockedReason ?? record.blocked_reason),
    raw,
  }
}

function mapWalletTransaction(raw: unknown): DriverWalletTransaction {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asString(record.id, crypto.randomUUID?.() ?? `txn-${Date.now()}`),
    type: asString(record.type ?? record.transactionType ?? record.transaction_type),
    status: asString(record.status, 'APPROVED'),
    amount: asNumber(record.amount),
    balanceBefore:
      typeof record.balanceBefore === 'number'
        ? record.balanceBefore
        : typeof record.balance_before === 'number'
          ? record.balance_before
          : undefined,
    balanceAfter:
      typeof record.balanceAfter === 'number'
        ? record.balanceAfter
        : typeof record.balance_after === 'number'
          ? record.balance_after
          : undefined,
    description: asString(record.description ?? record.title ?? record.message),
    comment: asString(record.comment ?? record.note),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    raw,
  }
}

function mapTopUpRequest(raw: unknown): DriverTopUpRequest {
  const record = isRecord(raw) ? raw : {}

  return {
    id: asString(record.id, crypto.randomUUID?.() ?? `topup-${Date.now()}`),
    amount: asNumber(record.amount),
    method: normalizeWalletMethod(record.method ?? record.paymentMethod ?? record.payment_method),
    status: asString(record.status, 'PENDING_REVIEW'),
    providerRef: asString(record.providerRef ?? record.provider_ref),
    referenceNumber: asString(record.referenceNumber ?? record.reference_number),
    comment: asString(record.comment ?? record.message ?? record.note),
    proofFilePath: asString(record.proofFilePath ?? record.proof_file_path),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    reviewedAt: asString(record.reviewedAt ?? record.reviewed_at),
    rejectionReason: asString(record.rejectionReason ?? record.rejectReason ?? record.rejection_reason),
    raw,
  }
}

function mapTransactionsResponse(raw: unknown): DriverWalletTransactionsResponse {
  const record = isRecord(raw) ? raw : undefined
  const list = getList(raw)

  return {
    items: list.map(mapWalletTransaction),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    skip: record && typeof record.skip === 'number' ? record.skip : undefined,
    take: record && typeof record.take === 'number' ? record.take : undefined,
    raw,
  }
}

function mapTopUpRequestsResponse(raw: unknown): DriverTopUpRequestsResponse {
  const record = isRecord(raw) ? raw : undefined
  const list = getList(raw)

  return {
    items: list.map(mapTopUpRequest),
    total: record && typeof record.total === 'number' ? record.total : undefined,
    skip: record && typeof record.skip === 'number' ? record.skip : undefined,
    take: record && typeof record.take === 'number' ? record.take : undefined,
    raw,
  }
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return ''

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function normalizeTopUpPayload(payload: CreateDriverTopUpRequestPayload) {
  return {
    ...payload,
    method: payload.method === 'KASPI' ? 'KASPI_TRANSFER' : payload.method,
  }
}

export async function getDriverWallet(): Promise<DriverWallet> {
  const response = await backendGet<unknown>('/ride/driver/wallet')
  return mapWallet(response)
}

export async function getDriverWalletTransactions(
  params?: { take?: number; skip?: number },
): Promise<DriverWalletTransactionsResponse> {
  const response = await backendGet<unknown>(
    `/ride/driver/wallet/transactions${buildQuery(params)}`,
  )
  return mapTransactionsResponse(response)
}

export async function createDriverTopUpRequest(
  payload: CreateDriverTopUpRequestPayload,
): Promise<DriverTopUpRequest> {
  const response = await backendPost<unknown>(
    '/ride/driver/wallet/top-up-requests',
    normalizeTopUpPayload(payload),
  )
  const record = isRecord(response) ? firstRecord(response.data, response.request, response.item) ?? response : response
  return mapTopUpRequest(record)
}

export async function getDriverTopUpRequests(
  params?: { take?: number; skip?: number },
): Promise<DriverTopUpRequestsResponse> {
  const response = await backendGet<unknown>(
    `/ride/driver/wallet/top-up-requests${buildQuery(params)}`,
  )
  return mapTopUpRequestsResponse(response)
}
