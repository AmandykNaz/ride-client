export type BusCity = {
  id: string
  name: string
  regionName?: string | null
  label: string
}

export type BusTripSearchParams = {
  fromCityId: string
  toCityId: string
  date: string
  fromCityName?: string
  toCityName?: string
}

export type BusTripVehicle = {
  name: string
  plateNumber?: string | null
  model?: string | null
  companyName?: string | null
  capacity?: number | null
  color?: string | null
}

export type BusTripStation = {
  id: string
  name: string
  cityName?: string | null
  address?: string | null
  arrivalAt?: string | null
  departureAt?: string | null
  order: number
}

export type BusTripSummary = {
  id: string
  tripNumber?: string | null
  routeName: string
  fromCityName: string
  toCityName: string
  departureAt?: string | null
  arrivalAt?: string | null
  price: number | null
  basePrice: number | null
  minPrice: number | null
  availableSeats: number | null
  status: string
  vehicle: BusTripVehicle | null
}

export type BusTripDetail = BusTripSummary & {
  stations: BusTripStation[]
}

export type BusSeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'UNAVAILABLE' | 'UNKNOWN'

export type BusSeatType =
  | 'SEAT'
  | 'BED'
  | 'SLEEPER'
  | 'AISLE'
  | 'DOOR'
  | 'DRIVER'
  | 'EMPTY'
  | 'UNKNOWN'

export type BusSeat = {
  id: string
  label: string
  row: number | null
  column: number | null
  x: number | null
  y: number | null
  deck?: string | null
  level?: string | null
  floor?: string | null
  type: BusSeatType
  status: BusSeatStatus
  price: number | null
}

export type BusTripSeats = {
  tripId: string
  seats: BusSeat[]
}
