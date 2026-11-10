import { ParamMap, Params } from '@angular/router';
import { localDateString, validDate } from '../../hotel-search/models/hotel-search-criteria.model';
import { normalizeDestination } from '../../models/vietnam-destinations';
export interface BusCriteria {
  from: string;
  to: string;
  departureDate: string;
  returnDate: string | null;
  adults: number;
  infants: number;
}
export const busTimeBands = [
  { id: 'night', label: '00:00 – 06:00', start: 0, end: 6 },
  { id: 'morning', label: '06:00 – 12:00', start: 6, end: 12 },
  { id: 'afternoon', label: '12:00 – 18:00', start: 12, end: 18 },
  { id: 'evening', label: '18:00 – 00:00', start: 18, end: 24 },
] as const;
export interface BusFilters {
  departureBands: string[];
  operators: string[];
}
export interface BusSearchState {
  criteria: BusCriteria;
  filters: BusFilters;
  leg: 'outbound' | 'inbound';
}
export function validateBusCriteria(c: BusCriteria): string {
  if (!c.from.trim() || !c.to.trim()) return 'Vui lòng nhập điểm đi và điểm đến.';
  if (normalizeDestination(c.from) === normalizeDestination(c.to))
    return 'Điểm đi và điểm đến phải khác nhau.';
  if (!validDate(c.departureDate) || c.departureDate < localDateString(new Date()))
    return 'Ngày khởi hành không hợp lệ hoặc đã qua.';
  if (c.returnDate !== null && (!validDate(c.returnDate) || c.returnDate < c.departureDate))
    return 'Ngày về phải bằng hoặc sau ngày đi.';
  if (
    !Number.isInteger(c.adults) ||
    c.adults < 1 ||
    c.adults > 4 ||
    !Number.isInteger(c.infants) ||
    c.infants < 0 ||
    c.infants > c.adults
  )
    return 'Chọn từ 1–4 người lớn; số em bé không vượt quá người lớn.';
  return '';
}
export function readBusSearch(p: ParamMap): BusSearchState {
  const list = (key: string) => [...new Set((p.get(key) || '').split('|').filter(Boolean))];
  const returnDate = p.get('returnDate') || null;
  return {
    criteria: {
      from: p.get('from') || '',
      to: p.get('to') || '',
      departureDate: p.get('departureDate') || '',
      returnDate,
      adults: Number(p.get('adults') ?? 1),
      infants: Number(p.get('infants') ?? 0),
    },
    leg: returnDate && p.get('leg') === 'inbound' ? 'inbound' : 'outbound',
    filters: {
      operators: list('operators'),
      departureBands: list('departureBands').filter((id) =>
        busTimeBands.some((band) => band.id === id),
      ),
    },
  };
}
export function busSearchParams(state: BusSearchState): Params {
  return {
    ...state.criteria,
    from: state.criteria.from.trim(),
    to: state.criteria.to.trim(),
    leg: state.leg,
    operators: state.filters.operators.length ? state.filters.operators.join('|') : null,
    departureBands: state.filters.departureBands.length
      ? state.filters.departureBands.join('|')
      : null,
  };
}
export function shiftBusDate(value: string, offset: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
