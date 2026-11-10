export interface Flight {
  id: string;
  airlineCode: string;
  airlineName: string;
  airlineLogo?: string;
  flightNumber?: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  carryOnIncluded?: boolean;
  checkedBaggageIncluded?: boolean;
  baggageDescription?: string;
  price?: number;
  currency?: string;
  originalPrice?: number;
  priceBasis?: 'adult' | 'all-passengers';
  taxesIncluded?: boolean;
  promotions?: { id: string; label: string }[];
  offerExpiresAt?: string;
  departureAirportName?: string;
  arrivalAirportName?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  aircraft?: string;
  fares?: FlightFare[];
}
export interface FlightFare {
  id: string;
  name: string;
  cabin: string;
  price: number;
  currency: string;
  carryOn?: string;
  checkedBaggage?: string;
  changePolicy?: string;
  refundPolicy?: string;
  vatPolicy?: string;
  notes?: string[];
}
export interface FlightSelection {
  outbound: Flight | null;
  inbound: Flight | null;
}
export interface FlightSearchData {
  outbound: Flight[];
  inbound: Flight[];
}
