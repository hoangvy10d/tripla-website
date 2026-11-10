export interface BusTrip {
  id: string;
  operatorId: string;
  operatorName: string;
  vehicle: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  pickup: string;
  dropoff: string;
  price: number;
  currency: string;
  amenities: string[];
}
export interface BusSeat {
  id: string;
  label: string;
  deck: number;
  available: boolean;
}
export interface BusDetails {
  trip: BusTrip;
  seats: BusSeat[];
  licensePlate?: string;
}
