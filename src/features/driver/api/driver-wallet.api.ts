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

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNullableRecord(value: unknown) {
  return isRecord(value) ? value : null
}

function asIdString(value: unknown, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
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

function unwrapWalletResponse(raw: unknown) {
  if (isRecord(raw) && isRecord(raw.wallet)) {
    return raw.wallet
  }

  return raw
}

function normalizeWalletMethod(value: unknown): DriverTopUpRequest['method'] {
  const normalized = asString(value).toUpperCase()

  if (normalized === 'KASPI') return 'KASPI'
  if (normalized === 'KASPI_TRANSFER' || normalized === 'KASPI_QR') return normalized
  if (normalized === 'HALYK') return 'HALYK'
  if (normalized === 'BANK_TRANSFER' || normalized === 'BANK') return 'OTHER'
  if (normalized === 'CASH') return 'CASH'
  if (normalized === 'OTHER') return 'OTHER'

  return 'OTHER'
}

function normalizeTopUpMethod(value: unknown): DriverTopUpRequest['method'] {
  return normalizeWalletMethod(value)
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
  const metadata = asNullableRecord(record.metadata ?? record.meta)

  return {
    id: asString(record.id, crypto.randomUUID?.() ?? `txn-${Date.now()}`),
    type: asString(record.type ?? record.transactionType ?? record.transaction_type),
    status: asString(record.status, 'APPROVED'),
    amount: asNumber(record.amount),
    title: asString(record.title ?? record.name ?? record.label),
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
    publicCode: asString(record.publicCode ?? record.public_code),
    sourceType: asString(record.sourceType ?? record.source_type),
    sourceId:
      typeof record.sourceId === 'number'
        ? record.sourceId
        : typeof record.source_id === 'number'
          ? record.source_id
          : undefined,
    provider: asString(record.provider ?? null),
    externalPaymentId: asString(record.externalPaymentId ?? record.external_payment_id),
    providerPayload: isRecord(record.providerPayload) ? record.providerPayload : (record.provider_payload as Record<string, unknown> | null | undefined) ?? null,
    description: asString(record.description ?? record.title ?? record.message ?? metadata?.description),
    comment: asString(record.comment ?? record.note ?? metadata?.comment ?? metadata?.note),
    reason: asString(record.reason ?? metadata?.reason),
    referenceNumber: asString(record.referenceNumber ?? record.reference_number ?? metadata?.referenceNumber ?? metadata?.reference_number),
    actorName: asString(record.actorName ?? record.actor_name ?? metadata?.actorName ?? metadata?.actor_name),
    actorEmail: asString(record.actorEmail ?? record.actor_email ?? metadata?.actorEmail ?? metadata?.actor_email),
    metadata,
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    raw,
  }
}

function mapTopUpRequest(raw: unknown): DriverTopUpRequest {
  const record = isRecord(raw) ? raw : {}
  const id = asIdString(record.id ?? record.requestId ?? record.request_id)

  return {
    id: id || crypto.randomUUID?.() || `topup-${Date.now()}`,
    amount: asNumber(record.amount),
    method: normalizeWalletMethod(record.method ?? record.paymentMethod ?? record.payment_method),
    status: asString(record.status, 'PENDING_UPLOAD'),
    publicCode: asString(record.publicCode ?? record.public_code),
    providerRef: asString(record.providerRef ?? record.provider_ref),
    referenceNumber: asString(record.referenceNumber ?? record.reference_number),
    comment: asString(record.comment ?? record.message ?? record.note),
    proofFilePath: asString(record.proofFilePath ?? record.proof_file_path),
    receiptFilePath: asString(record.receiptFilePath ?? record.receipt_file_path),
    receiptFileName: asString(record.receiptFileName ?? record.receipt_file_name),
    receiptMimeType: asString(record.receiptMimeType ?? record.receipt_mime_type),
    receiptSizeBytes:
      typeof record.receiptSizeBytes === 'number'
        ? record.receiptSizeBytes
        : typeof record.receipt_size_bytes === 'number'
          ? record.receipt_size_bytes
          : undefined,
    provider: asString(record.provider ?? null),
    externalPaymentId: asString(record.externalPaymentId ?? record.external_payment_id),
    providerPayload: isRecord(record.providerPayload) ? record.providerPayload : (record.provider_payload as Record<string, unknown> | null | undefined) ?? null,
    matchedAt: asNullableString(record.matchedAt ?? record.matched_at),
    confirmedAt: asNullableString(record.confirmedAt ?? record.confirmed_at),
    cancelledAt: asNullableString(record.cancelledAt ?? record.cancelled_at),
    cancelledBy: asNullableString(record.cancelledBy ?? record.cancelled_by),
    cancelReason: asNullableString(record.cancelReason ?? record.cancel_reason),
    reviewReason: asNullableString(record.reviewReason ?? record.review_reason ?? record.rejectionReason ?? record.rejection_reason),
    createdAt: asString(record.createdAt ?? record.created_at, new Date().toISOString()),
    updatedAt: asString(record.updatedAt ?? record.updated_at, asString(record.createdAt ?? record.created_at, new Date().toISOString())),
    reviewedAt: asNullableString(record.reviewedAt ?? record.reviewed_at),
    rejectionReason: asNullableString(record.rejectionReason ?? record.rejectReason ?? record.rejection_reason),
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
    method: normalizeTopUpMethod(payload.method),
  }
}

export async function getDriverWallet(): Promise<DriverWallet> {
  const response = await backendGet<unknown>('/ride/driver/wallet')
  return mapWallet(unwrapWalletResponse(response))
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

export async function uploadTopUpReceipt(topUpRequestId: number, file: File): Promise<DriverTopUpRequest> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await backendPost<unknown>(
    `/ride/driver/wallet/${String(topUpRequestId)}/receipt`,
    formData,
  )
  const record = isRecord(response) ? firstRecord(response.data, response.request, response.item) ?? response : response
  return mapTopUpRequest(record)
}

export async function cancelTopUpRequest(topUpRequestId: number): Promise<DriverTopUpRequest> {
  const response = await backendPost<unknown>(
    `/ride/driver/wallet/top-up-requests/${String(topUpRequestId)}/cancel`,
    {},
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
