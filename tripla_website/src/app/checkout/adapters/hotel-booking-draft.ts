import { Hotel, HotelRoom } from '../../hotel-search/models/hotel.model';
import {
  HotelSearchCriteria,
  hotelNights,
  hotelSearchParams,
  validateHotelCriteria,
} from '../../hotel-search/models/hotel-search-criteria.model';
import { HotelFilter, defaultHotelFilters } from '../../hotel-search/models/hotel-filter.model';
import { HotelBookingDraft } from '../models/booking-draft.model';
import { emptyContact, emptyHotelGuest } from '../models/checkout.model';
export interface HotelBookingInput {
  hotel: Hotel;
  room: HotelRoom;
  criteria: HotelSearchCriteria;
  filters?: HotelFilter;
  source: 'demo' | 'catalog';
  rateId?: string;
}
export function hotelSelectionProblem(input: HotelBookingInput): string {
  const { hotel, room, criteria } = input;
  const error = validateHotelCriteria(criteria);
  if (error) return error;
  if (
    !hotel.id?.trim() ||
    !hotel.name?.trim() ||
    !room.id?.trim() ||
    !room.name?.trim() ||
    !hotel.rooms?.some((item) => item.id === room.id)
  )
    return 'Vui lòng chọn phòng thuộc khách sạn này.';
  if (
    !Number.isInteger(room.guests) ||
    room.guests < 1 ||
    room.guests * criteria.rooms < criteria.adults + criteria.children
  )
    return 'Số khách vượt sức chứa của loại phòng đã chọn. Hãy điều chỉnh số phòng hoặc số khách.';
  if (input.source === 'catalog' && !input.rateId?.trim())
    return 'Chưa có mã gói giá từ nhà cung cấp.';
  return '';
}
export function buildHotelBookingDraft(
  input: HotelBookingInput,
  now = Date.now(),
): HotelBookingDraft {
  const problem = hotelSelectionProblem(input);
  if (problem) throw new Error(problem);
  const { hotel, room, criteria } = input;
  const nights = hotelNights(criteria),
    quantity = criteria.rooms * nights;
  const hasPrice = Number.isFinite(room.pricePerNight) && room.pricePerNight >= 0;
  return {
    id: crypto.randomUUID(),
    type: 'hotel',
    source: input.source,
    status: 'editing',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 60000).toISOString(),
    selection: {
      hotelId: hotel.id,
      hotelName: hotel.name,
      address: hotel.address,
      imageUrl: hotel.imageUrl,
      roomId: room.id,
      roomName: room.name,
      rateId: input.rateId,
      capacityPerRoom: room.guests,
      criteria: { ...criteria },
    },
    returnQuery: {
      ...hotelSearchParams(criteria, input.filters || defaultHotelFilters()),
      demo: input.source === 'demo' ? 'true' : null,
    },
    pricing: hasPrice
      ? {
          status: 'estimate',
          currency: hotel.currency || 'VND',
          lines: [
            {
              label: `${criteria.rooms} phòng × ${nights} đêm`,
              kind: 'base',
              quantity,
              unitAmount: room.pricePerNight,
              amount: room.pricePerNight * quantity,
            },
          ],
          missingItems: ['Thuế', 'Phí dịch vụ', 'Xác nhận giá và phòng trống'],
        }
      : { status: 'unavailable' },
    form: { contact: emptyContact(), hotel: emptyHotelGuest() },
  };
}

export function hotelDraftProblem(draft: HotelBookingDraft): string {
  const s = draft.selection;
  if (!s || !s.criteria) return 'Thiếu thông tin lựa chọn khách sạn.';
  const error = validateHotelCriteria(s.criteria);
  if (error) return error;
  if (
    !s.hotelId?.trim() ||
    !s.roomId?.trim() ||
    !s.hotelName?.trim() ||
    !s.roomName?.trim() ||
    !Number.isInteger(s.capacityPerRoom) ||
    s.capacityPerRoom < 1 ||
    s.capacityPerRoom * s.criteria.rooms < s.criteria.adults + s.criteria.children ||
    (draft.source === 'catalog' && !s.rateId?.trim())
  )
    return 'Lựa chọn khách sạn/phòng chưa đầy đủ.';
  return '';
}
