export type RideReview = {
  id: string
  orderId?: string
  rating: number
  comment?: string
  authorRole?: string
  createdAt: string
  updatedAt?: string
  raw?: unknown
}

export type RideReviewSummary = {
  averageRating: number
  reviewsCount: number
  raw?: unknown
}

export type CreateRideReviewPayload = {
  rating: number
  comment?: string
}

export type RideReviewsListResponse = {
  items: RideReview[]
  total?: number
  skip?: number
  take?: number
  raw?: unknown
}
