import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type SiteFooterVariant = 'full' | 'compact';

export interface FooterLinkItem {
  label: string;
  route: string;
  fragment?: string;
}

export const TRIPLA_FOOTER_ECOSYSTEM: readonly FooterLinkItem[] = [
  { label: 'Trang chủ', route: '/home' },
  { label: 'TripShorts', route: '/tripshort' },
  { label: 'Trip Planning', route: '/trip-planning' },
  { label: 'Bản đồ khám phá', route: '/map' },
  { label: 'Creator Studio', route: '/creator' },
  { label: 'Về TRIPLA', route: '/about' },
];

export const TRIPLA_FOOTER_SERVICES: readonly FooterLinkItem[] = [
  { label: 'Cổng đặt chỗ TripShop', route: '/trip-shop' },
  { label: 'Khách sạn & Khu nghỉ dưỡng', route: '/hotel-search' },
  { label: 'Vé máy bay', route: '/flight-search-results' },
  { label: 'Xe khách & Limousine', route: '/bus-search' },
  { label: 'Hoạt động & Trải nghiệm', route: '/activity-search' },
  { label: 'Hồ sơ du khách', route: '/profile' },
];

export const TRIPLA_FOOTER_COMPACT_LINKS: readonly FooterLinkItem[] = [
  { label: 'Trang chủ', route: '/home' },
  { label: 'TripShorts', route: '/tripshort' },
  { label: 'TripShop', route: '/trip-shop' },
  { label: 'Trip Planning', route: '/trip-planning' },
  { label: 'Bản đồ', route: '/map' },
  { label: 'Hồ sơ', route: '/profile' },
];

export const TRIPLA_FOOTER_LEGAL: readonly FooterLinkItem[] = [
  { label: 'Điều khoản dịch vụ', route: '/policies', fragment: 'dieu-khoan' },
  { label: 'Chính sách bảo mật', route: '/policies', fragment: 'bao-mat' },
  { label: 'Chính sách & Hoàn hủy', route: '/policies', fragment: 'thanh-toan' },
];

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooterComponent {
  readonly variant = input<SiteFooterVariant>('full');
  readonly compactLabel = input<string>('Nghệ thuật du lịch thượng lưu');

  readonly ecosystemLinks = TRIPLA_FOOTER_ECOSYSTEM;
  readonly serviceLinks = TRIPLA_FOOTER_SERVICES;
  readonly compactLinks = TRIPLA_FOOTER_COMPACT_LINKS;
  readonly legalLinks = TRIPLA_FOOTER_LEGAL;

  readonly hotline = '1900 8888';
  readonly email = 'concierge@tripla.travel';
  readonly hubs = 'TP.HCM · Hà Nội · Phú Quốc · Vĩnh Hy · Đà Lạt';
}

