import { Hotel } from '../models/hotel.model';
import { normalizeDestination } from '../../models/vietnam-destinations';

const enrichHotel = (hotel: Hotel): Hotel => ({
  ...hotel,
  description: 'Khu nghỉ dưỡng và khách sạn tuyển chọn bởi TRIPLA, kết hợp không gian kiến trúc bản địa và dịch vụ chuẩn quốc tế.',
  images: [hotel.imageUrl || '/resort-night-bg.png', '/images/Grassland.jpeg', '/images/trangan.jpg'],
  policies: ['Nhận phòng từ 14:00, trả phòng trước 12:00.',
    'Miễn phí hủy phòng trước 48 giờ nhận phòng.',
    'Bao gồm thức uống chào mừng và hỗ trợ nhận phòng sớm theo tình trạng phòng trống.'],
  rooms: [
    { id: `${hotel.id}-standard`, name: 'Phòng Tiêu chuẩn / Ocean Pavilion', size: 42, bed: '1 giường đôi lớn', guests: 2,
      pricePerNight: hotel.pricePerNight ?? 0, breakfast: true },
    { id: `${hotel.id}-deluxe`, name: 'Biệt thự Hồ bơi / Deluxe Suite có ban công', size: 68, bed: '1 giường King', guests: 2,
      pricePerNight: (hotel.pricePerNight || 0) + Math.round((hotel.pricePerNight || 0) * 0.28), breakfast: true }
  ]
});

export const demoHotels: readonly Hotel[] = [
  { id: 'demo-pine', name: 'Nhà Bên Rừng', address: 'Đà Lạt, Lâm Đồng', stars: 4,
    rating: 9.2, reviewCount: 128, pricePerNight: 850000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Bữa sáng', 'Sân vườn'], freeCancellation: true },
  { id: 'demo-garden', name: 'An Nhiên Garden Stay', address: 'Đà Lạt, Lâm Đồng', stars: 3,
    rating: 8.7, reviewCount: 86, pricePerNight: 620000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Bãi đỗ xe', 'Sân vườn'] },
  { id: 'demo-coast', name: 'Gió Biển Retreat', address: 'Đà Nẵng', stars: 4,
    rating: 9.1, reviewCount: 204, pricePerNight: 1250000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Hồ bơi', 'Bữa sáng'], freeCancellation: true },
  { id: 'demo-island', name: 'Đảo Xanh Resort', address: 'Phú Quốc, An Giang', stars: 5,
    rating: 9.4, reviewCount: 312, pricePerNight: 2100000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Hồ bơi', 'Spa'], freeCancellation: true },
].map(enrichHotel);

export const offlineCatalogHotels: readonly Hotel[] = [
  { id: 'hotel-amanoi-vinh-hy', name: 'Amanoi Resort Vĩnh Hy', address: 'Vịnh Vĩnh Hy, Ninh Thuận', stars: 5,
    rating: 9.9, reviewCount: 328, pricePerNight: 25000000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi riêng', 'Spa 6 sao', 'Bữa sáng', 'Đưa đón sân bay'], freeCancellation: true },
  { id: 'hotel-capella-hanoi', name: 'Capella Hanoi Opera Boutique', address: 'Hoàn Kiếm, Hà Nội', stars: 5,
    rating: 9.8, reviewCount: 289, pricePerNight: 8900000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi', 'Spa', 'Bữa sáng'], freeCancellation: true },
  { id: 'hotel-coupole-sapa', name: 'Hotel de la Coupole - MGallery Sapa', address: 'Sa Pa, Lào Cai', stars: 5,
    rating: 9.6, reviewCount: 518, pricePerNight: 5400000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi nước nóng', 'Spa', 'Bữa sáng'], freeCancellation: true },
  { id: 'hotel-six-senses-nhatrang', name: 'Six Senses Ninh Van Bay', address: 'Vịnh Ninh Vân, Nha Trang, Khánh Hòa', stars: 5,
    rating: 9.8, reviewCount: 412, pricePerNight: 15500000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi riêng', 'Spa', 'Bữa sáng', 'Tàu cao tốc đưa đón'], freeCancellation: true },
].map(enrichHotel);

export function findDemoHotels(location: string): Hotel[] {
  const query = normalizeDestination(location);
  if (!query) return [];
  return demoHotels.filter(hotel =>
    normalizeDestination(`${hotel.name} ${hotel.address}`).includes(query)
  );
}
