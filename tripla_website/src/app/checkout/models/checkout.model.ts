export interface CheckoutContact {
  fullName: string;
  email: string;
  callingCode: string;
  phone: string;
}
export interface HotelGuestDetails {
  firstName: string;
  lastName: string;
  bookingForSomeoneElse: boolean;
  nonSmoking: boolean;
  highFloor: boolean;
  connectingRooms: boolean;
  specialRequests: string;
}
export interface HotelCheckoutValues {
  contact: CheckoutContact;
  hotel: HotelGuestDetails;
}
export interface FlightPassenger {
  type: 'adult' | 'child' | 'infant';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
}
export interface FlightCheckoutValues {
  contact: CheckoutContact;
  flight: { passengers: FlightPassenger[] };
}
export interface ActivityCheckoutValues {
  contact: CheckoutContact;
  activity: { purchaserAttending: boolean; participants: { fullName: string }[]; notes: string };
}
export interface BusCheckoutValues {
  contact: CheckoutContact;
  bus: {
    passengers: { seatId: string; fullName: string; phone: string }[];
    pickup: string;
    dropoff: string;
  };
}
export type CheckoutValues =
  HotelCheckoutValues | FlightCheckoutValues | ActivityCheckoutValues | BusCheckoutValues;
export const emptyContact = (): CheckoutContact => ({
  fullName: '',
  email: '',
  callingCode: '+84',
  phone: '',
});
export const emptyHotelGuest = (): HotelGuestDetails => ({
  firstName: '',
  lastName: '',
  bookingForSomeoneElse: false,
  nonSmoking: false,
  highFloor: false,
  connectingRooms: false,
  specialRequests: '',
});

export type CheckoutProblem =
  | 'unknown-type'
  | 'missing'
  | 'type-mismatch'
  | 'expired'
  | 'invalid-selection'
  | 'not-implemented';
