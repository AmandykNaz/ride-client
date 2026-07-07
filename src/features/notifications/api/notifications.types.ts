export type RideNotificationActionPayload = Record<string, unknown> | null

export type RideNotification = {
  id: string
  type: string
  title: string
  body?: string | null
  actionType?: string | null
  actionPayload?: RideNotificationActionPayload
  metadata?: Record<string, unknown> | null
  readAt?: string | null
  createdAt: string
  isRead: boolean
  raw?: unknown
}

export type ListRideNotificationsParams = {
  take?: number
  skip?: number
  unreadOnly?: boolean
}

export type RideNotificationsListResponse = {
  items: RideNotification[]
  total?: number
  skip?: number
  take?: number
  raw?: unknown
}

export type RideUnreadNotificationsCountResponse = {
  unreadCount: number
  raw?: unknown
}
