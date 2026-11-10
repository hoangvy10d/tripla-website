import { Hotel } from '../models/hotel.model';
import { normalizeDestination } from '../../models/vietnam-destinations';

// Preview fixtures only; replace at the results-page boundary when the API is ready.
export const demoHotels: readonly Hotel[] = [
  { id: 'demo-pine', name: 'Nhà Bên Rừng', address: 'Đà Lạt, Lâm Đồng', stars: 4,
    rating: 9.2, reviewCount: 128, pricePerNight: 850000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Bữa sáng', 'Sân vườn'], freeCancellation: true },
  { id: 'demo-garden', name: 'An Nhiên Garden Stay', address: 'Đà Lạt, Lâm Đồng', stars: 3,
    rating: 8.7, reviewCount: 86, pricePerNight: 620000, currency: 'VND',
    amenities: ['Wi-Fi', 'Bãi đỗ xe', 'Sân vườn'] },
  { id: 'demo-coast', name: 'Gió Biển Retreat', address: 'Đà Nẵng', stars: 4,
    rating: 9.1, reviewCount: 204, pricePerNight: 1250000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Hồ bơi', 'Bữa sáng'], freeCancellation: true },
  { id: 'demo-island', name: 'Đảo Xanh Resort', address: 'Phú Quốc, An Giang', stars: 5,
    rating: 9.4, reviewCount: 312, pricePerNight: 2100000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Hồ bơi', 'Spa'], freeCancellation: true }
].map(hotel => ({ ...hotel,
  description: 'Một chốn dừng chân thư thái, nơi bạn có thể chậm lại và tận hưởng kỳ nghỉ theo cách riêng. Nội dung và hình ảnh chỉ dùng để minh họa giao diện.',
  images: ['/resort-night-bg.png', '/images/Grassland.jpeg', '/images/trangan.jpg'],
  policies: ['Nhận phòng từ 14:00, trả phòng trước 12:00 (minh họa).',
    'Giá minh họa cho một phòng mỗi đêm, chưa gồm thuế và phí.',
    'Điều kiện hủy và thanh toán sẽ được xác nhận theo từng gói giá từ nhà cung cấp.'],
  rooms: [
    { id: `${hotel.id}-standard`, name: 'Phòng Tiêu chuẩn', size: 28, bed: '1 giường đôi', guests: 2,
      pricePerNight: hotel.pricePerNight, breakfast: false },
    { id: `${hotel.id}-deluxe`, name: 'Phòng Deluxe có ban công', size: 38, bed: '1 giường King', guests: 2,
      pricePerNight: hotel.pricePerNight + 350000, breakfast: true }
  ]
}));

export function findDemoHotels(location: string): Hotel[] {
  const query = normalizeDestination(location);
  return query ? demoHotels.filter(hotel => normalizeDestination(hotel.address).includes(query)) : [];
}
