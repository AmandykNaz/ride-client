export type RideComplaint = {
  id: string
  targetType?: 'ORDER' | 'REQUEST_CONTACT'
  orderId?: string
  requestId?: string
  contactUnlockId?: string
  complainantRole?: 'PASSENGER' | 'DRIVER' | string
  category: string
  message: string
  status: string
  createdAt: string
  updatedAt?: string
  reviewedAt?: string
  raw?: unknown
}

export type CreateRideComplaintPayload = {
  category: string
  message?: string
}

export type CreateRideRequestComplaintPayload = {
  reasonCode: string
  message?: string
  contactUnlockId?: string
}

export type RideComplaintsListResponse = {
  items: RideComplaint[]
  total?: number
  skip?: number
  take?: number
  raw?: unknown
}
