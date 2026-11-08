import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { 
  NavItem, 
  ValueProposition, 
  FlashDeal, 
  Destination, 
  LuxuryStay 
} from '../models/trip-shop.model';

@Injectable({
  providedIn: 'root'
})
export class TripShopService {
  private readonly API_URL = 'https://api.tripla.vn/v1/tripshop';

  constructor(private http: HttpClient) {}

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
      { icon: 'verified', title: 'Cam Kết Giá Tốt Nhất', subtitle: 'Hoàn chênh lệch nếu tìm thấy rẻ hơn', accentColor: 'amber' },
      { icon: 'shield', title: 'Bảo Mật & Đa Kênh', subtitle: 'Mã hóa 256-bit chuẩn PCI-DSS', accentColor: 'orange' },
      { icon: 'support_agent', title: 'Hỗ Trợ Tiếng Việt 24/7', subtitle: 'Đội ngũ Concierge chăm sóc tận tâm', accentColor: 'amber' },
      { icon: 'workspace_premium', title: 'TripShop VIP Club', subtitle: 'Tích lũy đến 10% cho kỳ nghỉ sau', accentColor: 'orange' }
    ]);
  }

  getFlashDeals(): Observable<FlashDeal[]> {
    return of([
      {
        id: 'deal-1',
        name: 'Vinpearl Luxury Đà Nẵng',
        location: 'Bãi biển Non Nước, Đà Nẵng',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiI6Thunbr9OSoCL32VsJei88LGHA-AQWI3nLdlGb4buoiD-tusk2f5voQ6ylrV-4ps6gvqPXZXBnEgVMbxZlIScMC3eTvX38IsFrFL2zWQyTJ0GPSrrfiE_gJgUMwmRhBeP9BztKHxT-U8uAZBvR6Qa2WbAR8qWcb1XO1oW1mV031zc5xObzvaymp2AQquzWcOzjd1nsH3E2XzF7Cxio6c8f_xaOs-Jp8EMtfWPiv',
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
        imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1XjggCUTePCBGcs-zWwqfxMfmyQ4KG8WUcZawWvkMWuqe9bz8Ktpasi0Z4mo98A3yqiKLqbdwYzNwZLuGe6W1zKgu68Q-T09qkqb3arQiZO80cN3gibDm6DEqmGaK13fpY0-tQ0DcuaY1bKTh4MPp15Z_YdGaErU3czAu3x53ehgFD6qn2vKhQ0391zk1zZcM-3RZoNZjky05nG-g2EUfihXCjIcOVu1dRHyMfaItG-uw',
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
        imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UdgkLRryhZr-5_WOj84InTsqCIuOFlfh-25IsGdGLW7lnc5DS_yUzOcbC_kokDj4aegM41cIdltRTkC188-5IyDG2--91wPk7wnCB4XqJtBeFLC5WW3iI3rRTkdKpOfHQOE3kTLcXkpeJ5PAKcnukwVhbYp_6G7J0Ou_Ec0dniWne5yJen2T2objNXDastxvMRaqMh8JqJr8w0_wXAZlB_sDldNDmLpImGTUitDPNZmQ',
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
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVvLp2g9O-_3pXHxRUBr3bo5UgxhEzcI89Czi2mDpk8oHf1gr46WZIMHYBVyhRPNeflH7qvQHklCG8xWGM0bki8EP_YiNQ9VEaVZFXP6F7Z_mI6vfWzMlppQ4jzowGAK7Y82p5DEovrcVdCAIFusMGUMNqcx8RLmSt2RxjrpCLZlOw1T2ehdK80eJ963c-tNMLU7bEyOjA9wiRY3JBrHCpYxbX98QNtNjb-z1ZF121',
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
    ]);
  }

  getDestinations(): Observable<Destination[]> {
    return of([
      {
        id: 'dest-1',
        name: 'Phú Quốc',
        subtitle: '1,420 chỗ nghỉ biệt lập & resort 5 sao',
        startingPrice: 850000,
        imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1XjggCUTePCBGcs-zWwqfxMfmyQ4KG8WUcZawWvkMWuqe9bz8Ktpasi0Z4mo98A3yqiKLqbdwYzNwZLuGe6W1zKgu68Q-T09qkqb3arQiZO80cN3gibDm6DEqmGaK13fpY0-tQ0DcuaY1bKTh4MPp15Z_YdGaErU3czAu3x53ehgFD6qn2vKhQ0391zk1zZcM-3RZoNZjky05nG-g2EUfihXCjIcOVu1dRHyMfaItG-uw',
        badge: 'Top 1 Biển Đảo',
        isLargeHero: true
      },
      {
        id: 'dest-2',
        name: 'Đà Nẵng & Hội An',
        subtitle: '2,150 khách sạn & biệt thự ven sông',
        startingPrice: 620000,
        imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UdgkLRryhZr-5_WOj84InTsqCIuOFlfh-25IsGdGLW7lnc5DS_yUzOcbC_kokDj4aegM41cIdltRTkC188-5IyDG2--91wPk7wnCB4XqJtBeFLC5WW3iI3rRTkdKpOfHQOE3kTLcXkpeJ5PAKcnukwVhbYp_6G7J0Ou_Ec0dniWne5yJen2T2objNXDastxvMRaqMh8JqJr8w0_wXAZlB_sDldNDmLpImGTUitDPNZmQ',
        badge: 'Văn Hóa & Kỳ Quan'
      },
      {
        id: 'dest-3',
        name: 'Tràng An - Ninh Bình',
        subtitle: '890 khu sinh thái & ecolodge xanh',
        startingPrice: 550000,
        imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UaK9J6CVajrf4toLYgx5ssP318PMkuzREc6_33D1zpcDS9BWDdV_Dy0vBmbP7Y0EbXhAM5opzEKUicajO4xX7je1cfk4QrI713A6UpzOGkf2rp8kR4cVH6ExMcdw8SpEE0wvb-_1IA9aS8bzRKBfaZm-soCLaddALBaivA2sQmOD2P3eOW-isflgccUay62oqPv0pqUzGiOewXU5URYNcDD5H8mMiGr5vcEsPSEDdGWw',
        badge: 'Di Sản UNESCO'
      },
      {
        id: 'dest-4',
        name: 'Đà Lạt Mộng Mơ',
        subtitle: '1,840 homestay & biệt thự sương mù',
        startingPrice: 490000,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-3bdLfXEXJgLgrv_Z8Ug2tkP2ts2tPbL0UiypnyCPFqx820acJnEWLW5M06EWVWx6RbzwA0m_T-AQxAOfjK5p7RZ1Nxx34vFiVHdVqlYgMQ6f_Nb7Daj2W11lIy-bwCGmCclxTk3TpTah4hLtPscT84woygkswkkmXwS5KN7hS_B3zvtEotjdek-3sk-Plc6hxoa7Krdw2O12nXJEP5jkHmAj1hQIv5exmq9rY90K',
        badge: 'Khí Hậu Ôn Hòa'
      },
      {
        id: 'dest-5',
        name: 'Bali, Indonesia',
        subtitle: '3,200 biệt thự nhiệt đới & spa',
        startingPrice: 1200000,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtWwrmSzt6nulJdle_cvM2Lb3R9Kbeg1rDja78QYCBsOdBOLJiYra2sGnpBcgt2loHBTbAsUnXG3X3zOOd7AunRVeexnGZBbE65qI4sGL5viAf90t-lRqB0EO-gZlpPSV5Gi8aVzsWNUqDUKEUA99UqOLMKXOgZ7fPQ4aZG2lxc2YqY1oCPaBGOA0pntw5FVp2LwS2uhe6Gyqy_WjsiiYhzh3zL6dzYNyDHN5rZx33',
        badge: 'Thiên Đường Resort'
      },
      {
        id: 'dest-6',
        name: 'Tokyo, Nhật Bản',
        subtitle: '4,500 khách sạn trung tâm & ryokan',
        startingPrice: 2100000,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQ1lcSqGTxSkkw-ywsTvYaGQmTVIMUaIHAp-2TufTuwTLIoJ9OIEqfLGvZZPCbjrfgQu_HuUxxw2fOOFfu9kfalj5eqFNLMCJOVo4_2-jLrn4oTkZHBx9w6Pufpp2ouvTEVM1L334eMKbi6NO1mkX0mEVYtLK6BANAWT39EIjgGXAzsEqAypi1vqE5z1V9U2DgvbI3WIJA4--1L4dCZJUcbTJWkh5s09UNRJmxEeNG',
        badge: 'Hiện Đại & Độc Đáo'
      }
    ]);
  }

  getLuxuryStays(): Observable<LuxuryStay[]> {
    return of([
      {
        id: 'stay-1',
        name: 'JW Marriott Phu Quoc Emerald Bay Resort & Spa',
        location: 'Bãi Khem, An Thới, Phú Quốc (Cách bãi biển 50m)',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWlJ4XNqc8bL9tcSsWGsKyFCA-mYP5CPjOUt9--R7ik5-Y4PCfATzoNeuMIGPZgXVjDI1h03P5MicRa5jE9e7J92R8rcuIzIyTI1gDiBiE5VOzCdHi4LKNJhThF6W-JyWKYndVBEze-TVwUB_LpjUUVceXGyroWYg3df0dLVLSJZ3SS08aJRnb6uTJnLrFujHU4dOaJ3jCCI2skliYp9pts_D_LdDizLerFK6HUN07',
        rating: 9.6,
        ratingText: 'Tuyệt Hảo',
        reviewCount: 1280,
        description: 'Thiết kế độc bản mang phong cách trường đại học Lamarck huyền thoại thế kỷ 20, sở hữu hồ bơi vỏ sò mang tính biểu tượng và bờ cát trắng mịn Bãi Khem.',
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
        imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UdgkLRryhZr-5_WOj84InTsqCIuOFlfh-25IsGdGLW7lnc5DS_yUzOcbC_kokDj4aegM41cIdltRTkC188-5IyDG2--91wPk7wnCB4XqJtBeFLC5WW3iI3rRTkdKpOfHQOE3kTLcXkpeJ5PAKcnukwVhbYp_6G7J0Ou_Ec0dniWne5yJen2T2objNXDastxvMRaqMh8JqJr8w0_wXAZlB_sDldNDmLpImGTUitDPNZmQ',
        rating: 9.8,
        ratingText: 'Xuất Sắc Tuyệt Đối',
        reviewCount: 940,
        description: 'Ẩn mình tại sườn đồi thoai thoải hướng biển Đông, 4 tầng kiến trúc Thiên Đường, Bầu Trời, Trái Đất và Biển Cả mang lại kỳ nghỉ riêng tư tuyệt đối.',
        category: 'villa',
        roomType: 'Resort Classic Oceanview • Ban công rộng 15m²',
        originalPrice: 14800000,
        discountPrice: 11200000,
        perks: ['Miễn phí xe đưa đón riêng', 'Nhà hàng Michelin La Maison 1888'],
        specialOffer: 'Ưu Đãi Cuối Tuần: Giảm 20% Dịch Vụ Ẩm Thực',
        videoCount: 24,
        isTopLuxury: true
      }
    ]);
  }
}