import { Flight, FlightFare } from '../../flight-search/models/flight.model';
import {
  FlightSearchCriteria,
  flightCriteriaParams,
  validateFlightCriteria,
} from '../../flight-search/models/flight-search-criteria.model';
import { ActivityDetails, ActivityTicket } from '../../activity-search/models/activity.model';
import { BusDetails, BusSeat } from '../../bus-search/models/bus.model';
import {
  BusSearchState,
  busSearchParams,
  validateBusCriteria,
} from '../../bus-search/models/bus-search.model';
import { validDate, localDateString } from '../../hotel-search/models/hotel-search-criteria.model';
import {
  FlightBookingDraft,
  ActivityBookingDraft,
  BusBookingDraft,
  BookingDraft,
} from '../models/booking-draft.model';
import { BookingPricing, PriceLine } from '../models/booking-pricing.model';
import { emptyContact } from '../models/checkout.model';
import {
  createFlightForm,
  createActivityForm,
  createBusForm,
} from '../forms/service-checkout.forms';
import { hotelDraftProblem } from './hotel-booking-draft';
type Source = 'demo' | 'catalog';
const base = (source: Source) => ({
  id: crypto.randomUUID(),
  source,
  status: 'editing' as const,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 1800000).toISOString(),
});
function estimate(currency: string, lines: PriceLine[], missingItems: string[]): BookingPricing {
  return lines.length && lines.every((line) => Number.isFinite(line.amount) && line.amount >= 0)
    ? { status: 'estimate', currency, lines, missingItems }
    : { status: 'unavailable' };
}
export interface FlightBookingInput {
  criteria: FlightSearchCriteria;
  outbound: Flight;
  inbound?: Flight;
  fares: { outbound: FlightFare; inbound?: FlightFare };
  source: Source;
  requirements?: { dateOfBirth: boolean; nationality: boolean };
}
export function buildFlightDraft(input: FlightBookingInput): FlightBookingDraft {
  const { criteria: c, outbound: go, inbound: back, fares } = input;
  if (validateFlightCriteria(c)) throw Error(validateFlightCriteria(c)!);
  const matches = (flight: Flight, from: string, to: string, date: string) =>
    flight.id &&
    flight.from === from &&
    flight.to === to &&
    flight.departureAt.slice(0, 10) === date;
  if (
    !matches(go, c.from.code, c.to.code, c.departureDate) ||
    !fares.outbound.id ||
    (c.tripType === 'round-trip' &&
      (!back || !fares.inbound?.id || !matches(back, c.to.code, c.from.code, c.returnDate!)))
  )
    throw Error('Chọn đủ chuyến và gói vé đúng hành trình trước khi tiếp tục.');
  const legs = [
    { flight: go, fare: fares.outbound, label: 'Chuyến đi' },
    ...(c.tripType === 'round-trip' && back && fares.inbound
      ? [{ flight: back, fare: fares.inbound, label: 'Chuyến về' }]
      : []),
  ];
  if (
    legs.some(
      ({ flight, fare }) =>
        !flight.fares?.some((item) => item.id === fare.id) && fare.id !== flight.id,
    )
  )
    throw Error('Gói giá không thuộc chuyến bay đã chọn.');
  const currency = legs[0].fare.currency;
  const known = legs.every(({ flight, fare }) => fare.currency === currency && !!flight.priceBasis);
  const selection: FlightBookingDraft['selection'] = {
    outboundId: go.id,
    inboundId: c.tripType === 'round-trip' ? back?.id : undefined,
    airline: legs
      .map((item) => item.flight.airlineName)
      .filter((name, i, all) => all.indexOf(name) === i)
      .join(' · '),
    from: go.from,
    to: go.to,
    departureAt: go.departureAt,
    arrivalAt: go.arrivalAt,
    adults: c.adults,
    children: c.children,
    infants: c.infants,
    cabin: c.cabin,
    fareIds: legs.map((item) => item.fare.id),
    criteria: structuredClone(c),
    outbound: structuredClone(go),
    inbound: c.tripType === 'round-trip' ? structuredClone(back) : undefined,
    fares: structuredClone(fares),
    requirements: input.requirements || { dateOfBirth: false, nationality: false },
  };
  return {
    ...base(input.source),
    type: 'flight',
    selection,
    returnQuery: {
      ...flightCriteriaParams(c),
      leg: c.tripType === 'round-trip' ? 'inbound' : 'outbound',
      demo: input.source === 'demo' ? 'true' : null,
    },
    pricing: known
      ? estimate(
          currency,
          legs.map(({ flight, fare, label }) => ({
            kind: 'base',
            label: `${label} · ${flight.priceBasis === 'adult' ? 'vé người lớn' : 'tất cả hành khách'}`,
            amount: fare.price * (flight.priceBasis === 'adult' ? c.adults : 1),
          })),
          [
            'Xác nhận giá và chỗ trống',
            ...(legs.some((item) => item.flight.taxesIncluded !== true) ? ['Thuế và phí'] : []),
            ...(legs.some((item) => item.flight.priceBasis === 'adult') && (c.children || c.infants)
              ? ['Giá trẻ em / em bé']
              : []),
          ],
        )
      : { status: 'unavailable' },
    form: { contact: emptyContact(), flight: createFlightForm(selection).getRawValue() },
  };
}
export interface ActivityBookingInput {
  activity: ActivityDetails;
  ticket: ActivityTicket;
  visitDate: string;
  quantity: number;
  source: Source;
  returnQuery?: Record<string, string | number | null>;
}
export function buildActivityDraft(input: ActivityBookingInput): ActivityBookingDraft {
  const { activity, ticket, visitDate, quantity } = input;
  if (
    !activity.id ||
    !activity.tickets.some((item) => item.id === ticket.id) ||
    !validDate(visitDate) ||
    visitDate < localDateString(new Date()) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 20
  )
    throw Error('Vui lòng chọn địa điểm, gói vé, ngày và số lượng hợp lệ.');
  const selection: ActivityBookingDraft['selection'] = {
    activityId: activity.id,
    activityName: activity.name,
    ticketId: ticket.id,
    ticketName: ticket.name,
    visitDate,
    quantity,
    requiresParticipants: ticket.requiresParticipants === true,
  };
  return {
    ...base(input.source),
    type: 'activity',
    selection,
    returnQuery: input.returnQuery || {},
    pricing: estimate(
      ticket.currency,
      [
        {
          kind: 'base',
          label: `${quantity} vé × đơn giá gói đã chọn`,
          quantity,
          unitAmount: ticket.price,
          amount: ticket.price * quantity,
        },
      ],
      ['Thuế / phí, điều kiện vé và suất trống'],
    ),
    form: { contact: emptyContact(), activity: createActivityForm(selection).getRawValue() },
  };
}
export interface BusBookingInput {
  details: BusDetails;
  state: BusSearchState;
  seats: BusSeat[];
  source: Source;
}
export function buildBusDraft(input: BusBookingInput): BusBookingDraft {
  const { details, state, seats } = input,
    c = state.criteria,
    trip = details.trip,
    inbound = state.leg === 'inbound';
  if (
    validateBusCriteria(c) ||
    seats.length !== c.adults ||
    new Set(seats.map((seat) => seat.id)).size !== seats.length ||
    seats.some((seat) => !details.seats.some((item) => item.id === seat.id && item.available)) ||
    trip.from !== (inbound ? c.to : c.from) ||
    trip.to !== (inbound ? c.from : c.to) ||
    trip.departureAt.slice(0, 10) !== (inbound ? c.returnDate : c.departureDate) ||
    !trip.pickup ||
    !trip.dropoff
  )
    throw Error('Vui lòng chọn đủ ghế còn trống và hành trình hợp lệ.');
  const selection: BusBookingDraft['selection'] = {
    journeyId: trip.id,
    operator: trip.operatorName,
    from: trip.from,
    to: trip.to,
    departureAt: trip.departureAt,
    seatIds: seats.map((seat) => seat.id),
    seats: seats.map((seat) => ({ id: seat.id, label: seat.label })),
    pickup: trip.pickup,
    dropoff: trip.dropoff,
    passengers: c.adults,
    infants: c.infants,
    searchState: structuredClone(state),
  };
  return {
    ...base(input.source),
    type: 'bus',
    selection,
    returnQuery: busSearchParams(state),
    pricing: estimate(
      trip.currency,
      [
        {
          kind: 'base',
          label: `${seats.length} ghế người lớn`,
          quantity: seats.length,
          unitAmount: trip.price,
          amount: trip.price * seats.length,
        },
      ],
      ['Thuế / phí và xác nhận ghế', ...(c.infants ? ['Giá và chính sách em bé'] : [])],
    ),
    form: { contact: emptyContact(), bus: createBusForm(selection).getRawValue() },
  };
}
export function draftSelectionProblem(draft: BookingDraft): string {
  switch (draft.type) {
    case 'hotel':
      return hotelDraftProblem(draft);
    case 'flight': {
      const s = draft.selection;
      return (
        validateFlightCriteria(s.criteria) ||
        (!s.outboundId ||
        !s.fareIds.length ||
        (s.criteria.tripType === 'round-trip' && !s.inboundId)
          ? 'Thiếu chuyến bay hoặc gói giá.'
          : '')
      );
    }
    case 'activity': {
      const s = draft.selection;
      return !s.activityId ||
        !s.ticketId ||
        !validDate(s.visitDate) ||
        s.visitDate < localDateString(new Date()) ||
        !Number.isInteger(s.quantity) ||
        s.quantity < 1 ||
        s.quantity > 20
        ? 'Lựa chọn hoạt động không hợp lệ.'
        : '';
    }
    case 'bus': {
      const s = draft.selection;
      return (
        validateBusCriteria(s.searchState.criteria) ||
        (!s.journeyId ||
        s.seats.length !== s.passengers ||
        s.seats.length !== s.seatIds.length ||
        !s.pickup ||
        !s.dropoff
          ? 'Lựa chọn ghế xe không hợp lệ.'
          : '')
      );
    }
  }
}
