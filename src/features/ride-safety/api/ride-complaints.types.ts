export type RideComplaint = {
  id: string
  orderId?: string
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
  message: string
}

export type RideComplaintsListResponse = {
  items: RideComplaint[]
  total?: number
  skip?: number
  take?: number
  raw?: unknown
}
