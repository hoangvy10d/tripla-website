import { ParamMap, Params } from '@angular/router';
import { accommodationTypes, defaultHotelFilters, HotelFilter, hotelAmenityGroups } from './hotel-filter.model';

export interface HotelSearchCriteria {
  service: 'hotel';
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
}
export interface HotelSearchState {
  criteria: HotelSearchCriteria;
  filters: HotelFilter;
}
export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function hotelNights(criteria: HotelSearchCriteria): number {
  return validDate(criteria.checkIn) && validDate(criteria.checkOut)
    ? Math.round((Date.parse(criteria.checkOut) - Date.parse(criteria.checkIn)) / 86400000)
    : 0;
}
export function validateHotelCriteria(
  c: HotelSearchCriteria,
  today = localDateString(new Date()),
): string | null {
  if (!c.location.trim()) return 'Vui lòng nhập hoặc chọn điểm đến.';
  if (!validDate(c.checkIn) || !validDate(c.checkOut))
    return 'Vui lòng chọn ngày nhận và trả phòng hợp lệ.';
  if (c.checkIn < today) return 'Ngày nhận phòng không được trước hôm nay.';
  if (c.checkOut <= c.checkIn) return 'Ngày trả phòng phải sau ngày nhận phòng.';
  if (
    !Number.isInteger(c.adults) ||
    c.adults < 1 ||
    c.adults > 30 ||
    !Number.isInteger(c.children) ||
    c.children < 0 ||
    c.children > 10 ||
    !Number.isInteger(c.rooms) ||
    c.rooms < 1 ||
    c.rooms > 10
  )
    return 'Số khách hoặc số phòng không hợp lệ.';
  return null;
}
const list = (params: ParamMap, key: string) => [
  ...new Set((params.get(key) || '').split(',').filter(Boolean)),
];
function nullableNumber(value: string | null, max = Number.MAX_SAFE_INTEGER): number | null {
  if (value === null || !String(value).trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
}
export function readHotelSearch(params: ParamMap): HotelSearchState {
  const filters = defaultHotelFilters();
  const type = params.get('accommodation');
  filters.accommodation = accommodationTypes.find((item) => item === type) || 'Tất cả';
  filters.minPrice = nullableNumber(params.get('minPrice'));
  filters.maxPrice = nullableNumber(params.get('maxPrice'));
  if (filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice)
    filters.maxPrice = null;
  filters.minRating = nullableNumber(params.get('minRating'), 10);
  filters.stars = list(params, 'stars')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  filters.amenities = list(params, 'amenities').filter((item) =>
    hotelAmenityGroups.some(group => group.items.some(amenity => amenity.id === item)),
  );
  filters.freeCancellation = params.get('freeCancellation') === 'true';
  filters.payAtProperty = params.get('payAtProperty') === 'true';
  filters.area = (params.get('area') || '').trim();
  filters.dealsOnly = params.get('dealsOnly') === 'true';
  return {
    criteria: {
      service: 'hotel',
      location: params.get('location') || '',
      checkIn: params.get('checkIn') || '',
      checkOut: params.get('checkOut') || '',
      adults: Number(params.get('adults') ?? 2),
      children: Number(params.get('children') ?? 0),
      rooms: Number(params.get('rooms') ?? 1),
    },
    filters,
  };
}
export function hotelSearchParams(c: HotelSearchCriteria, f: HotelFilter): Params {
  return {
    service: 'hotel',
    dealsOnly: f.dealsOnly ? 'true' : null,
    location: c.location.trim(),
    checkIn: c.checkIn,
    checkOut: c.checkOut,
    adults: c.adults,
    children: c.children,
    rooms: c.rooms,
    accommodation: f.accommodation,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    stars: f.stars.length ? f.stars.join(',') : null,
    minRating: f.minRating,
    amenities: f.amenities.length ? f.amenities.join(',') : null,
    freeCancellation: f.freeCancellation ? 'true' : null,
    payAtProperty: f.payAtProperty ? 'true' : null,
    area: f.area || null,
  };
}
