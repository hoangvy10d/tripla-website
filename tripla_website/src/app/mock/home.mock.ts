import { TripCard, StatPill } from '../models/home.model';

export const MOCK_STAT_PILLS: StatPill[] = [
  { id: 'villa', icon: 'villa', value: '500+', label: 'Điểm Đến Thượng Lưu', isActive: true },
  { id: 'ai', icon: 'neurology', value: 'AI Concierge', label: 'Lộ Trình Cá Nhân Hoá' },
  { id: 'star', icon: 'star', value: '5.0 Sao', label: 'Tiêu Chuẩn Độc Quyền' }
];

export const MOCK_TRIP_CARDS: TripCard[] = [
  {
    id: 'trip-1',
    title: 'Amanoi Resort & Spa',
    subtitle: 'Kỳ nghỉ biệt thự hướng biển riêng tư',
    location: 'Vĩnh Hy, Ninh Thuận',
    price: 35000000,
    rating: 4.9,
    reviewCount: 128,
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
    tagText: 'Tuyến Chọn Đặc Biệt',
    isSelected: false
  },
  {
    id: 'trip-2',
    title: 'Six Senses Con Dao',
    subtitle: 'Thiên đường nghỉ dưỡng ốc đảo',
    location: 'Côn Đảo, Bà Rịa - Vũng Tàu',
    price: 42000000,
    rating: 5.0,
    reviewCount: 96,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    tagText: 'Độc Bản Privé',
    isSelected: false
  },
  {
    id: 'trip-3',
    title: 'Four Seasons The Nam Hai',
    subtitle: 'Biệt thự hồ bơi kết nối di sản',
    location: 'Hội An, Quảng Nam',
    price: 28000000,
    rating: 4.8,
    reviewCount: 210,
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    tagText: 'Nổi Bật Mùa Hè',
    isSelected: false
  }
];