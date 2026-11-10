export const accommodationTypes = ['Tất cả', 'Khách sạn', 'Biệt thự', 'Căn hộ', 'Homestay', 'Quán trọ Ryokan'] as const;
export const hotelAmenityGroups = [
  { title: 'Tiện nghi phổ biến', items: [
    { id: 'wifi', label: 'Wi-Fi' }, { id: 'pool', label: 'Hồ bơi' },
    { id: 'privatePool', label: 'Hồ bơi riêng' }, { id: 'parking', label: 'Bãi đỗ xe' },
    { id: 'breakfast', label: 'Có ăn sáng' }, { id: 'reception', label: 'Quầy lễ tân' },
    { id: 'earlyCheckIn', label: 'Nhận phòng sớm' }, { id: 'airportShuttle', label: 'Đưa đón sân bay' },
    { id: 'lateCheckOut', label: 'Dịch vụ trả phòng muộn' } ] },
  { title: 'Tiện nghi độc đáo', items: [
    { id: 'shopping', label: 'Khu vực mua sắm' }, { id: 'bar', label: 'Bar & Pub' },
    { id: 'entertainment', label: 'Khu vực giải trí' }, { id: 'indoorSport', label: 'Thể thao trong nhà' },
    { id: 'golf', label: 'Chơi golf' }, { id: 'mountainView', label: 'View núi' } ] },
  { title: 'Tiện nghi phòng', items: [
    { id: 'hairdryer', label: 'Máy sấy tóc' }, { id: 'familyRoom', label: 'Phòng gia đình' },
    { id: 'fridge', label: 'Tủ lạnh' }, { id: 'nonSmoking', label: 'Phòng cấm hút thuốc' },
    { id: 'bathtub', label: 'Bồn tắm' } ] }
] as const;
export type AccommodationType = (typeof accommodationTypes)[number];
export interface HotelFilter {
  accommodation: AccommodationType;
  minPrice: number | null;
  maxPrice: number | null;
  stars: number[];
  minRating: number | null;
  amenities: string[];
  freeCancellation: boolean;
  payAtProperty: boolean;
  area: string;
  dealsOnly: boolean;
}
export function defaultHotelFilters(): HotelFilter {
  return {
    accommodation: 'Tất cả',
    minPrice: null,
    maxPrice: null,
    stars: [],
    minRating: null,
    amenities: [],
    freeCancellation: false,
    payAtProperty: false,
    area: '',
    dealsOnly: false,
  };
}
