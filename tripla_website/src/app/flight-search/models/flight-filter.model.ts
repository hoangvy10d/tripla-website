import { ParamMap, Params } from '@angular/router';
import { Flight } from './flight.model';
export type FlightSort = 'cheapest' | 'shortest' | 'earliest' | 'latest';
export type TimeBand = 'morning' | 'noon' | 'afternoon' | 'night';
export interface FlightFilter {
  airlines: string[];
  stops: number[];
  departureBands: TimeBand[];
  arrivalBands: TimeBand[];
  carryOn: boolean;
  checkedBaggage: boolean;
}
export const timeBands: { id: TimeBand; label: string }[] = [
  { id: 'morning', label: 'Sáng · 00:00–11:59' },
  { id: 'noon', label: 'Trưa · 12:00–13:59' },
  { id: 'afternoon', label: 'Chiều · 14:00–17:59' },
  { id: 'night', label: 'Tối · 18:00–23:59' },
];
export const sortOptions: { id: FlightSort; label: string }[] = [
  { id: 'cheapest', label: 'Giá thấp nhất' },
  { id: 'shortest', label: 'Thời gian bay ngắn nhất' },
  { id: 'earliest', label: 'Khởi hành sớm nhất' },
  { id: 'latest', label: 'Khởi hành muộn nhất' },
];
export function defaultFlightFilters(): FlightFilter {
  return {
    airlines: [],
    stops: [],
    departureBands: [],
    arrivalBands: [],
    carryOn: false,
    checkedBaggage: false,
  };
}
const values = (p: ParamMap, key: string) => [
  ...new Set((p.get(key) || '').split(',').filter(Boolean)),
];
export function readFlightFilters(p: ParamMap): FlightFilter {
  return {
    airlines: values(p, 'airlines'),
    stops: values(p, 'stops')
      .map(Number)
      .filter((n) => [0, 1, 2].includes(n)),
    departureBands: values(p, 'departureBands').filter((v) =>
      timeBands.some((b) => b.id === v),
    ) as TimeBand[],
    arrivalBands: values(p, 'arrivalBands').filter((v) =>
      timeBands.some((b) => b.id === v),
    ) as TimeBand[],
    carryOn: p.get('carryOn') === 'true',
    checkedBaggage: p.get('checkedBaggage') === 'true',
  };
}
export function readFlightSort(p: ParamMap): FlightSort {
  return sortOptions.find((s) => s.id === p.get('sort'))?.id || 'cheapest';
}
export function flightFilterParams(f: FlightFilter, sort: FlightSort): Params {
  return {
    airlines: f.airlines.join(',') || null,
    stops: f.stops.join(',') || null,
    departureBands: f.departureBands.join(',') || null,
    arrivalBands: f.arrivalBands.join(',') || null,
    carryOn: f.carryOn ? 'true' : null,
    checkedBaggage: f.checkedBaggage ? 'true' : null,
    sort,
  };
}
// Provider timestamps must include an offset and represent the local airport wall clock.
function hour(value: string): number {
  return Number(value.slice(11, 13));
}
function band(value: string): TimeBand {
  const h = hour(value);
  return h < 12 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : 'night';
}
function clock(value: string): number {
  return hour(value) * 60 + Number(value.slice(14, 16));
}
export function filterAndSortFlights(
  flights: readonly Flight[],
  f: FlightFilter,
  sort: FlightSort,
): Flight[] {
  const selected = flights.filter(
    (v) =>
      (!f.airlines.length || f.airlines.includes(v.airlineCode)) &&
      (!f.stops.length || f.stops.includes(Math.min(v.stops, 2))) &&
      (!f.departureBands.length || f.departureBands.includes(band(v.departureAt))) &&
      (!f.arrivalBands.length || f.arrivalBands.includes(band(v.arrivalAt))) &&
      (!f.carryOn || v.carryOnIncluded === true) &&
      (!f.checkedBaggage || v.checkedBaggageIncluded === true),
  );
  return selected.sort((a, b) =>
    sort === 'cheapest'
      ? (a.price ?? Infinity) - (b.price ?? Infinity)
      : sort === 'shortest'
        ? a.durationMinutes - b.durationMinutes
        : sort === 'earliest'
          ? clock(a.departureAt) - clock(b.departureAt)
          : clock(b.departureAt) - clock(a.departureAt),
  );
}
