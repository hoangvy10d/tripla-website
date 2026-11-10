import { BookingPricing } from './booking-pricing.model';
import {
  HotelCheckoutValues,
  FlightCheckoutValues,
  ActivityCheckoutValues,
  BusCheckoutValues,
} from './checkout.model';
import { Flight, FlightFare } from '../../flight-search/models/flight.model';
import { FlightSearchCriteria } from '../../flight-search/models/flight-search-criteria.model';
import { BusSearchState } from '../../bus-search/models/bus-search.model';
import { HotelSearchCriteria } from '../../hotel-search/models/hotel-search-criteria.model';
export const bookingTypes = ['hotel', 'flight', 'activity', 'bus'] as const;
export type BookingType = (typeof bookingTypes)[number];
interface DraftBase<T extends BookingType> {
  id: string;
  type: T;
  source: 'demo' | 'catalog';
  createdAt: string;
  expiresAt: string;
  status: 'editing' | 'details-complete';
  pricing: BookingPricing;
  returnQuery: Record<string, string | number | null>;
}
export interface HotelBookingDraft extends DraftBase<'hotel'> {
  selection: {
    hotelId: string;
    hotelName: string;
    address: string;
    imageUrl?: string;
    roomId: string;
    roomName: string;
    rateId?: string;
    capacityPerRoom: number;
    criteria: HotelSearchCriteria;
    cancellationPolicy?: string;
  };
  returnQuery: Record<string, string | number | null>;
  form: HotelCheckoutValues;
}
export interface FlightBookingDraft extends DraftBase<'flight'> {
  form: FlightCheckoutValues;
  selection: {
    outboundId: string;
    inboundId?: string;
    airline: string;
    from: string;
    to: string;
    departureAt: string;
    arrivalAt: string;
    adults: number;
    children: number;
    infants: number;
    cabin: string;
    fareIds: string[];
    criteria: FlightSearchCriteria;
    outbound: Flight;
    inbound?: Flight;
    fares: { outbound: FlightFare; inbound?: FlightFare };
    requirements: { dateOfBirth: boolean; nationality: boolean };
  };
}
export interface ActivityBookingDraft extends DraftBase<'activity'> {
  form: ActivityCheckoutValues;
  selection: {
    activityId: string;
    activityName: string;
    ticketId: string;
    ticketName: string;
    visitDate: string;
    quantity: number;
    requiresParticipants: boolean;
  };
}
export interface BusBookingDraft extends DraftBase<'bus'> {
  form: BusCheckoutValues;
  selection: {
    journeyId: string;
    operator: string;
    from: string;
    to: string;
    departureAt: string;
    seatIds: string[];
    pickup: string;
    dropoff: string;
    passengers: number;
    seats: { id: string; label: string }[];
    infants: number;
    searchState: BusSearchState;
  };
}
export type BookingDraft =
  HotelBookingDraft | FlightBookingDraft | ActivityBookingDraft | BusBookingDraft;
