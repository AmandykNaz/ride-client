export type RideDriverAnnouncementStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED' | 'COMPLETED'

export type RideDriverAnnouncementDriver = {
  id?: string
  fullName?: string | null
  phone?: string | null
  avatarUrl?: string | null
  ratingAvg?: number | null
  ratingCount?: number | null
  raw?: unknown
}

export type RideDriverAnnouncementVehicle = {
  id?: string
  label?: string | null
  brand?: string | null
  model?: string | null
  name?: string | null
  plate?: string | null
  plateNumber?: string | null
  color?: string | null
  colorName?: string | null
  seats?: number | string | null
  seatsCount?: number | null
  raw?: unknown
}

export type RideDriverAnnouncement = {
  id: string
  status: RideDriverAnnouncementStatus | string
  fromText: string
  toText: string
  scheduledAt: string
  pricePerSeat: number
  currency?: string | null
  seatsAvailable: number
  comment?: string | null
  acceptsPassengers: boolean
  acceptsParcels: boolean
  driver?: RideDriverAnnouncementDriver | null
  vehicle?: RideDriverAnnouncementVehicle | null
  contactOpened?: boolean
  publishedAt?: string | null
  cancelledAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  raw?: unknown
}

export type RidePassengerAnnouncementContactOpen = {
  announcementId: string
  driverProfileId?: string | null
  driverName?: string | null
  driverPhone: string
  avatarUrl?: string | null
  vehicle?: RideDriverAnnouncementVehicle | null
  contactOpened: boolean
  openedAt: string
  raw?: unknown
}

export type CreateDriverAnnouncementPayload = {
  fromText: string
  toText: string
  scheduledAt: string
  pricePerSeat: number | string
  seatsAvailable: number | string
  comment?: string
  acceptsPassengers: boolean
  acceptsParcels: boolean
}

export type UpdateDriverAnnouncementPayload = {
  fromText?: string
  toText?: string
  scheduledAt?: string
  pricePerSeat?: number | string
  seatsAvailable?: number | string
  comment?: string
  acceptsPassengers?: boolean
  acceptsParcels?: boolean
}

export type UpdateDriverAnnouncementStatusPayload = {
  status: RideDriverAnnouncementStatus
}

export type GetDriverAnnouncementsParams = {
  status?: RideDriverAnnouncementStatus
  q?: string
  take?: number
  skip?: number
}
