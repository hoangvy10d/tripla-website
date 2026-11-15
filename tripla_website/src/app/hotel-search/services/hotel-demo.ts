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
  { id: 'demo-island', name: 'Đảo Xanh Resort', address: 'Phú Quốc, Kiên Giang', stars: 5,
    rating: 9.4, reviewCount: 312, pricePerNight: 2100000, currency: 'VND',
    imageUrl: '/resort-night-bg.png', amenities: ['Wi-Fi', 'Hồ bơi', 'Spa'], freeCancellation: true },
  { id: 'demo-vungtau-imperial', name: 'The Imperial Hotel Vũng Tàu', address: '159 Thùy Vân, Phường Thắng Tam, TP. Vũng Tàu', stars: 5,
    rating: 9.3, reviewCount: 420, pricePerNight: 2450000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi riêng', 'Bãi biển riêng', 'Bữa sáng', 'Spa'], freeCancellation: true },
  { id: 'demo-hoian-anantara', name: 'Anantara Hoi An Resort', address: '01 Phạm Hồng Thái, Cẩm Châu, TP. Hội An', stars: 5,
    rating: 9.7, reviewCount: 390, pricePerNight: 4800000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi', 'Du thuyền sông', 'Bữa sáng', 'Spa'], freeCancellation: true },
  { id: 'demo-ninhbinh-emeralda', name: 'Emeralda Resort Ninh Bình', address: 'Đầm Vân Long, Gia Vân, Gia Viễn, Ninh Bình', stars: 5,
    rating: 9.4, reviewCount: 510, pricePerNight: 2300000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi vô cực', 'Spa', 'Bữa sáng'], freeCancellation: true },
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
  { id: 'hotel-vinpearl-halong', name: 'Vinpearl Resort & Spa Hạ Long', address: 'Đảo Rều, Bãi Cháy, TP. Hạ Long, Quảng Ninh', stars: 5,
    rating: 9.5, reviewCount: 650, pricePerNight: 2850000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi 4 mùa', 'Bãi tắm riêng', 'Bữa sáng buffet', 'Spa'], freeCancellation: true },
  { id: 'hotel-bangioc-resort', name: 'Sài Gòn - Bản Giốc Resort', address: 'Xóm Bản Giốc, Đàm Thủy, Trùng Khánh, Cao Bằng', stars: 4,
    rating: 9.1, reviewCount: 215, pricePerNight: 1200000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'View Thác Bản Giốc', 'Nhà hàng đặc sản', 'Bữa sáng', 'Thuê xe máy'], freeCancellation: true },
  { id: 'hotel-phongnha-lakehouse', name: 'Phong Nha Lake House Resort', address: 'Khương Hà, Bố Trạch, Quảng Bình', stars: 4,
    rating: 9.3, reviewCount: 310, pricePerNight: 1450000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi hướng hồ', 'Kayak miễn phí', 'Bữa sáng', 'Tour Sơn Đoòng'], freeCancellation: true },
  { id: 'hotel-switzerland-victoria', name: 'Victoria Jungfrau Grand Hotel & Spa', address: 'Höheweg 41, 3800 Interlaken, Thụy Sĩ (Switzerland)', stars: 5,
    rating: 9.8, reviewCount: 520, pricePerNight: 14200000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Spa 5500m²', 'View dãy Alps', 'Hồ bơi nước khoáng nóng', 'Nhà hàng Michelin'], freeCancellation: true },
  { id: 'hotel-canada-fairmont', name: 'The Fairmont Chateau Lake Louise', address: '111 Lake Louise Dr, Banff National Park, Icefields Parkway, Canada', stars: 5,
    rating: 9.9, reviewCount: 840, pricePerNight: 16800000, currency: 'VND',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'View hồ Lake Louise', 'Trượt tuyết thế giới', 'Spa cao cấp', 'Chèo kayak'], freeCancellation: true },
].map(enrichHotel);

export function findDemoHotels(location: string): Hotel[] {
  const query = normalizeDestination(location);
  if (!query) return [];
  const allPool = [...demoHotels, ...offlineCatalogHotels];
  return allPool.filter(hotel =>
    normalizeDestination(`${hotel.name} ${hotel.address}`).includes(query)
  );
}
