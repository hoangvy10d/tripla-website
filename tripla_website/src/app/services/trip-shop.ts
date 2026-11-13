import { Injectable } from '@angular/core';
import { Observable, of, concat, EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { injectLiveHttp } from './live-http';
import {
  NavItem,
  ValueProposition,
  FlashDeal,
  Destination,
  LuxuryStay
} from '../models/trip-shop.model';

const FALLBACK_FLASH_DEALS: FlashDeal[] = [
  {
    id: 'deal-1',
    name: 'Vinpearl Luxury Đà Nẵng',
    location: 'Bãi biển Non Nước, Đà Nẵng',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDiI6Thunbr9OSoCL32VsJei88LGHA-AQWI3nLdlGb4buoiD-tusk2f5voQ6ylrV-4ps6gvqPXZXBnEgVMbxZlIScMC3eTvX38IsFrFL2zWQyTJ0GPSrrfiE_gJgUMwmRhBeP9BztKHxT-U8uAZBvR6Qa2WbAR8qWcb1XO1oW1mV031zc5xObzvaymp2AQquzWcOzjd1nsH3E2XzF7Cxio6c8f_xaOs-Jp8EMtfWPiv',
    originalPrice: 5800000,
    discountPrice: 3190000,
    discountPercent: 45,
    remainingRooms: 2,
    soldPercent: 82,
    rating: 9.4,
    ratingText: 'Xuất sắc',
    reviewCount: 412
  },
  {
    id: 'deal-2',
    name: 'Amanoi Resort Vĩnh Hy',
    location: 'Vịnh Vĩnh Hy, Ninh Thuận',
    imageUrl:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85',
    originalPrice: 28000000,
    discountPrice: 19600000,
    discountPercent: 30,
    remainingRooms: 5,
    soldPercent: 68,
    rating: 9.9,
    ratingText: 'Đẳng cấp thế giới',
    reviewCount: 230,
    tag: 'Siêu Sang 6★'
  },
  {
    id: 'deal-3',
    name: 'InterContinental Danang Sun Peninsula',
    location: 'Bán Đảo Sơn Trà, Đà Nẵng',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    originalPrice: 14500000,
    discountPrice: 9425000,
    discountPercent: 35,
    remainingRooms: 3,
    soldPercent: 90,
    rating: 9.7,
    ratingText: 'Tuyệt hảo',
    reviewCount: 890,
    tag: 'Bill Bensley Design'
  },
  {
    id: 'deal-4',
    name: 'Premier Village Phu Quoc Resort',
    location: 'Mũi Ông Đội, Phú Quốc',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAVvLp2g9O-_3pXHxRUBr3bo5UgxhEzcI89Czi2mDpk8oHf1gr46WZIMHYBVyhRPNeflH7qvQHklCG8xWGM0bki8EP_YiNQ9VEaVZFXP6F7Z_mI6vfWzMlppQ4jzowGAK7Y82p5DEovrcVdCAIFusMGUMNqcx8RLmSt2RxjrpCLZlOw1T2ehdK80eJ963c-tNMLU7bEyOjA9wiRY3JBrHCpYxbX98QNtNjb-z1ZF121',
    originalPrice: 8200000,
    discountPrice: 4920000,
    discountPercent: 40,
    remainingRooms: 4,
    soldPercent: 75,
    rating: 9.5,
    ratingText: 'Xuất sắc',
    reviewCount: 740,
    tag: 'Bán chạy'
  }
];

const FALLBACK_DESTINATIONS: Destination[] = [
  {
    id: 'dest-1',
    name: 'Phú Quốc',
    subtitle: '1,420 chỗ nghỉ biệt lập & resort 5 sao',
    startingPrice: 850000,
    imageUrl:
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=80',
    badge: 'Top 1 Biển Đảo',
    isLargeHero: true
  },
  {
    id: 'dest-2',
    name: 'Đà Nẵng & Hội An',
    subtitle: '2,150 khách sạn & biệt thự ven sông',
    startingPrice: 620000,
    imageUrl:
      'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1000&q=80',
    badge: 'Văn Hóa & Kỳ Quan'
  },
  {
    id: 'dest-3',
    name: 'Tràng An - Ninh Bình',
    subtitle: '890 khu sinh thái & ecolodge xanh',
    startingPrice: 550000,
    imageUrl: '/images/tranganedit.jpeg',
    badge: 'Di Sản UNESCO'
  },
  {
    id: 'dest-4',
    name: 'Đà Lạt Mộng Mơ',
    subtitle: '1,840 homestay & biệt thự sương mù',
    startingPrice: 490000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-3bdLfXEXJgLgrv_Z8Ug2tkP2ts2tPbL0UiypnyCPFqx820acJnEWLW5M06EWVWx6RbzwA0m_T-AQxAOfjK5p7RZ1Nxx34vFiVHdVqlYgMQ6f_Nb7Daj2W11lIy-bwCGmCclxTk3TpTah4hLtPscT84woygkswkkmXwS5KN7hS_B3zvtEotjdek-3sk-Plc6hxoa7Krdw2O12nXJEP5jkHmAj1hQIv5exmq9rY90K',
    badge: 'Khí Hậu Ôn Hòa'
  },
  {
    id: 'dest-5',
    name: 'Bali, Indonesia',
    subtitle: '3,200 biệt thự nhiệt đới & spa',
    startingPrice: 1200000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCtWwrmSzt6nulJdle_cvM2Lb3R9Kbeg1rDja78QYCBsOdBOLJiYra2sGnpBcgt2loHBTbAsUnXG3X3zOOd7AunRVeexnGZBbE65qI4sGL5viAf90t-lRqB0EO-gZlpPSV5Gi8aVzsWNUqDUKEUA99UqOLMKXOgZ7fPQ4aZG2lxc2YqY1oCPaBGOA0pntw5FVp2LwS2uhe6Gyqy_WjsiiYhzh3zL6dzYNyDHN5rZx33',
    badge: 'Thiên Đường Resort'
  },
  {
    id: 'dest-6',
    name: 'Tokyo, Nhật Bản',
    subtitle: '4,500 khách sạn trung tâm & ryokan',
    startingPrice: 2100000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAQ1lcSqGTxSkkw-ywsTvYaGQmTVIMUaIHAp-2TufTuwTLIoJ9OIEqfLGvZZPCbjrfgQu_HuUxxw2fOOFfu9kfalj5eqFNLMCJOVo4_2-jLrn4oTkZHBx9w6Pufpp2ouvTEVM1L334eMKbi6NO1mkX0mEVYtLK6BANAWT39EIjgGXAzsEqAypi1vqE5z1V9U2DgvbI3WIJA4--1L4dCZJUcbTJWkh5s09UNRJmxEeNG',
    badge: 'Hiện Đại & Độc Đáo'
  }
];

const FALLBACK_LUXURY_STAYS: LuxuryStay[] = [
  {
    id: 'stay-1',
    name: 'JW Marriott Phu Quoc Emerald Bay Resort & Spa',
    location: 'Bãi Khem, An Thới, Phú Quốc (Cách bãi biển 50m)',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAWlJ4XNqc8bL9tcSsWGsKyFCA-mYP5CPjOUt9--R7ik5-Y4PCfATzoNeuMIGPZgXVjDI1h03P5MicRa5jE9e7J92R8rcuIzIyTI1gDiBiE5VOzCdHi4LKNJhThF6W-JyWKYndVBEze-TVwUB_LpjUUVceXGyroWYg3df0dLVLSJZ3SS08aJRnb6uTJnLrFujHU4dOaJ3jCCI2skliYp9pts_D_LdDizLerFK6HUN07',
    rating: 9.6,
    ratingText: 'Tuyệt Hảo',
    reviewCount: 1280,
    description:
      'Thiết kế độc bản mang phong cách trường đại học Lamarck huyền thoại thế kỷ 20, sở hữu hồ bơi vỏ sò mang tính biểu tượng và bờ cát trắng mịn Bãi Khem.',
    category: 'resort',
    roomType: 'Phòng Emerald Bay King • 1 giường đôi cực lớn',
    originalPrice: 9500000,
    discountPrice: 6850000,
    perks: ['Miễn phí hủy trước 48h', 'Đã bao gồm buffet sáng 5 sao'],
    specialOffer: 'Ưu Đãi Hôm Nay: Tặng Voucher Spa 500k',
    videoCount: 18,
    isBestSeller: true
  },
  {
    id: 'stay-2',
    name: 'InterContinental Danang Sun Peninsula Resort',
    location: 'Bán đảo Sơn Trà, Đà Nẵng',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    rating: 9.8,
    ratingText: 'Xuất Sắc Tuyệt Đối',
    reviewCount: 940,
    description:
      'Ẩn mình tại sườn đồi thoai thoải hướng biển Đông, 4 tầng kiến trúc Thiên Đường, Bầu Trời, Trái Đất và Biển Cả mang lại kỳ nghỉ riêng tư tuyệt đối.',
    category: 'villa',
    roomType: 'Resort Classic Oceanview • Ban công rộng 15m²',
    originalPrice: 14800000,
    discountPrice: 11200000,
    perks: ['Miễn phí xe đưa đón riêng', 'Nhà hàng Michelin La Maison 1888'],
    specialOffer: 'Ưu Đãi Cuối Tuần: Giảm 20% Dịch Vụ Ẩm Thực',
    videoCount: 24,
    isTopLuxury: true
  }
];

@Injectable({
  providedIn: 'root'
})
export class TripShopService {
  private readonly http = injectLiveHttp();
  private readonly API_URL = 'http://localhost:3000/api/v1/venues';

  getNavItems(): Observable<NavItem[]> {
    return of([
      { id: '1', label: 'Khám Phá', path: 'kham-pha', isActive: true },
      { id: '2', label: 'TripShorts', path: 'tripshorts', isActive: false },
      { id: '3', label: 'TripShop', path: 'tripshop', isActive: false },
      { id: '4', label: 'Về TRIPLA', path: 've-tripla', isActive: false }
    ]);
  }

  getValueProps(): Observable<ValueProposition[]> {
    return of([
      {
        icon: 'verified',
        title: 'Cam Kết Giá Tốt Nhất',
        subtitle: 'Hoàn chênh lệch nếu tìm thấy rẻ hơn',
        accentColor: 'amber'
      },
      {
        icon: 'shield',
        title: 'Bảo Mật & Đa Kênh',
        subtitle: 'Mã hóa 256-bit chuẩn PCI-DSS',
        accentColor: 'orange'
      },
      {
        icon: 'support_agent',
        title: 'Hỗ Trợ Tiếng Việt 24/7',
        subtitle: 'Đội ngũ Concierge chăm sóc tận tâm',
        accentColor: 'amber'
      },
      {
        icon: 'workspace_premium',
        title: 'TripShop VIP Club',
        subtitle: 'Tích lũy đến 10% cho kỳ nghỉ sau',
        accentColor: 'orange'
      }
    ]);
  }

  getFlashDeals(): Observable<FlashDeal[]> {
    if (!this.http) {
      return of(FALLBACK_FLASH_DEALS);
    }
    const api$ = this.http.get<any>(`${this.API_URL}?section=flash-deals`).pipe(
      map((res) => {
        const list = res?.tripShopCatalog?.flashDeals;
        return Array.isArray(list) && list.length > 0 ? (list as FlashDeal[]) : FALLBACK_FLASH_DEALS;
      }),
      catchError(() => EMPTY)
    );
    return concat(of(FALLBACK_FLASH_DEALS), api$);
  }

  getDestinations(): Observable<Destination[]> {
    if (!this.http) {
      return of(FALLBACK_DESTINATIONS);
    }
    const api$ = this.http.get<any>(`${this.API_URL}?section=destinations`).pipe(
      map((res) => {
        const list = res?.tripShopCatalog?.destinations;
        return Array.isArray(list) && list.length > 0
          ? (list as Destination[])
          : FALLBACK_DESTINATIONS;
      }),
      catchError(() => EMPTY)
    );
    return concat(of(FALLBACK_DESTINATIONS), api$);
  }

  getLuxuryStays(): Observable<LuxuryStay[]> {
    if (!this.http) {
      return of(FALLBACK_LUXURY_STAYS);
    }
    const api$ = this.http.get<any>(`${this.API_URL}?section=luxury-stays`).pipe(
      map((res) => {
        const list = res?.tripShopCatalog?.luxuryStays;
        return Array.isArray(list) && list.length > 0
          ? (list as LuxuryStay[])
          : FALLBACK_LUXURY_STAYS;
      }),
      catchError(() => EMPTY)
    );
    return concat(of(FALLBACK_LUXURY_STAYS), api$);
  }
}
