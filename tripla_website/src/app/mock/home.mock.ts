import { TripCard, StatPill } from '../models/home.model';

export const MOCK_STAT_PILLS: StatPill[] = [
  { id: 'villa', icon: 'villa', value: '500+', label: 'Điểm Đến Thượng Lưu', isActive: true },
  { id: 'ai', icon: 'neurology', value: 'AI Concierge', label: 'Lộ Trình Cá Nhân Hoá' },
  { id: 'star', icon: 'star', value: '5.0 Sao', label: 'Tiêu Chuẩn Độc Quyền' }
];

export const MOCK_TRIP_CARDS: TripCard[] = [
  {
    id: 'demo-pine',
    hotelSlug: 'nha-ben-rung',
    title: 'Đà Lạt • Nhà Bên Rừng',
    subtitle: 'Homestay • Đà Lạt',
    location: 'Đà Lạt',
    price: 850000,
    rating: 9.2,
    reviewCount: 128,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80',
    tagText: 'Bán chạy',
    isSelected: false
  },
  {
    id: 'demo-garden',
    hotelSlug: 'an-nhien-garden-stay',
    title: 'Đà Lạt • An Nhiên Garden Stay',
    subtitle: 'Nhà nghỉ • Đà Lạt',
    location: 'Đà Lạt',
    price: 620000,
    rating: 8.7,
    reviewCount: 86,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    tagText: 'Độc quyền',
    isSelected: false
  },
  {
    id: 'demo-coast',
    hotelSlug: 'gio-bien-retreat-da-nang',
    title: 'Đà Nẵng • Gió Biển Retreat Đà Nẵng',
    subtitle: 'Khách sạn • Đà Nẵng',
    location: 'Đà Nẵng',
    price: 1250000,
    rating: 9.1,
    reviewCount: 204,
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=80',
    tagText: 'Ưu đãi mùa lễ',
    isSelected: false
  },
  {
    id: 'demo-island',
    hotelSlug: 'dao-xanh-resort-phu-quoc',
    title: 'Phú Quốc • Đảo Xanh Resort Phú Quốc',
    subtitle: 'Khu nghỉ dưỡng • Phú Quốc',
    location: 'Phú Quốc',
    price: 2100000,
    rating: 9.4,
    reviewCount: 312,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
    tagText: 'Nổi bật mùa hè',
    isSelected: false
  },
  {
    id: 'hotel-amanoi-vinh-hy',
    hotelSlug: 'amanoi-ocean-pool-residence',
    title: 'Ninh Thuận • Amanoi Ocean Pool Residence',
    subtitle: 'Khu nghỉ dưỡng 6 sao • Vịnh Vĩnh Hy',
    location: 'Ninh Thuận',
    price: 25000000,
    rating: 9.9,
    reviewCount: 328,
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
    tagText: 'Tuyển chọn đặc biệt',
    isSelected: false
  },
  {
    id: 'hotel-capella-hanoi',
    hotelSlug: 'capella-hanoi',
    title: 'Hà Nội • Capella Hanoi Opera Boutique',
    subtitle: 'Khách sạn boutique • Hoàn Kiếm',
    location: 'Hà Nội',
    price: 8900000,
    rating: 9.8,
    reviewCount: 289,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    tagText: 'Độc bản Privé',
    isSelected: false
  }
];