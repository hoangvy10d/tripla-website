import { ParamMap, Params } from '@angular/router';
import { localDateString, validDate } from '../../hotel-search/models/hotel-search-criteria.model';
export { localDateString };
export interface Airport {
  code: string;
  city: string;
  name: string;
}
export const airports: Airport[] = [
  { code: 'SGN', city: 'Sài Gòn (TP HCM)', name: 'Tân Sơn Nhất' },
  { code: 'HAN', city: 'Hà Nội', name: 'Nội Bài' },
  { code: 'DAD', city: 'Đà Nẵng', name: 'Đà Nẵng' },
  { code: 'PQC', city: 'Phú Quốc', name: 'Phú Quốc' },
  { code: 'DLI', city: 'Đà Lạt', name: 'Liên Khương' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi' },
];
export const cabinClasses = ['Phổ thông', 'Phổ thông đặc biệt', 'Thương gia', 'Hạng nhất'] as const;
export type CabinClass = (typeof cabinClasses)[number];
export interface FlightSearchCriteria {
  service: 'flight';
  tripType: 'one-way' | 'round-trip';
  from: Airport;
  to: Airport;
  departureDate: string;
  returnDate: string | null;
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
}
export function validateFlightCriteria(
  c: FlightSearchCriteria,
  today = localDateString(new Date()),
): string | null {
  if (!/^[A-Z]{3}$/.test(c.from.code) || !/^[A-Z]{3}$/.test(c.to.code))
    return 'Vui lòng chọn sân bay đi và sân bay đến.';
  if (c.from.code === c.to.code) return 'Sân bay đi và đến phải khác nhau.';
  if (!validDate(c.departureDate) || c.departureDate < today)
    return 'Ngày khởi hành không hợp lệ hoặc đã qua.';
  if (
    c.tripType === 'round-trip' &&
    (!c.returnDate || !validDate(c.returnDate) || c.returnDate < c.departureDate)
  )
    return 'Ngày về phải bằng hoặc sau ngày đi.';
  if (!['one-way', 'round-trip'].includes(c.tripType) || !cabinClasses.includes(c.cabin))
    return 'Loại hành trình hoặc hạng vé không hợp lệ.';
  if (
    !Number.isInteger(c.adults) ||
    c.adults < 1 ||
    !Number.isInteger(c.children) ||
    c.children < 0 ||
    c.adults + c.children > 9 ||
    !Number.isInteger(c.infants) ||
    c.infants < 0 ||
    c.infants > c.adults
  )
    return 'Tối đa 9 người lớn/trẻ em; số em bé không vượt quá người lớn.';
  return null;
}
function readAirport(p: ParamMap, key: string): Airport {
  const code = (p.get(key) || '').toUpperCase();
  return {
    code,
    city: p.get(key + 'City') || airports.find((a) => a.code === code)?.city || code,
    name: p.get(key + 'Name') || airports.find((a) => a.code === code)?.name || code,
  };
}
export function readFlightCriteria(p: ParamMap): FlightSearchCriteria {
  return {
    service: 'flight',
    tripType: (p.get('tripType') || 'one-way') as FlightSearchCriteria['tripType'],
    from: readAirport(p, 'from'),
    to: readAirport(p, 'to'),
    departureDate: p.get('departureDate') || '',
    returnDate: p.get('tripType') === 'round-trip' ? p.get('returnDate') : null,
    adults: Number(p.get('adults') ?? 1),
    children: Number(p.get('children') ?? 0),
    infants: Number(p.get('infants') ?? 0),
    cabin: (p.get('cabin') || 'Phổ thông') as CabinClass,
  };
}
export function flightCriteriaParams(c: FlightSearchCriteria): Params {
  return {
    service: 'flight',
    tripType: c.tripType,
    from: c.from.code,
    fromCity: c.from.city,
    fromName: c.from.name,
    to: c.to.code,
    toCity: c.to.city,
    toName: c.to.name,
    departureDate: c.departureDate,
    returnDate: c.tripType === 'round-trip' ? c.returnDate : null,
    adults: c.adults,
    children: c.children,
    infants: c.infants,
    cabin: c.cabin,
  };
}
