import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth-service';

export type SiteNavKey =
  | 'home'
  | 'tripshort'
  | 'trip-shop'
  | 'trip-planning'
  | 'map'
  | 'about'
  | 'profile'
  | 'policies'
  | 'creator'
  | '';

export type SiteHeaderVariant =
  | 'floating'
  | 'hero'
  | 'subpage'
  | 'checkout'
  | 'workspace'
  | 'studio';

export interface SiteNavItem {
  key: Exclude<SiteNavKey, '' | 'profile' | 'policies' | 'creator'>;
  label: string;
  route: string;
}

export const TRIPLA_ECOSYSTEM_NAV: readonly SiteNavItem[] = [
  { key: 'home', label: 'Trang chủ', route: '/home' },
  { key: 'tripshort', label: 'TripShorts', route: '/tripshort' },
  { key: 'trip-shop', label: 'TripShop', route: '/trip-shop' },
  { key: 'trip-planning', label: 'Trip Planning', route: '/trip-planning' },
  { key: 'map', label: 'Bản đồ', route: '/map' },
  { key: 'about', label: 'Về TRIPLA', route: '/about' },
];

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeaderComponent {
  readonly authService = inject(AuthService);

  readonly variant = input<SiteHeaderVariant>('floating');
  readonly activeNav = input<SiteNavKey>('');
  readonly subBrand = input<string>('');
  readonly positionMode = input<'sticky' | 'fixed' | 'absolute' | 'static'>('sticky');
  readonly heroTheme = input<'light' | 'dark'>('light');
  readonly scrolled = input<boolean>(false);

  readonly backLabel = input<string>('');
  readonly backRoute = input<string | any[] | null>(null);
  readonly backQueryParams = input<Record<string, any> | null>(null);
  readonly backPreserveQuery = input<boolean>(false);

  readonly showMainNav = input<boolean>(true);
  readonly showAuthControls = input<boolean>(true);

  readonly navClick = output<SiteNavKey>();

  readonly navItems = TRIPLA_ECOSYSTEM_NAV;
  readonly mobileMenuOpen = signal(false);
  readonly avatarFailed = signal(false);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly userShortName = computed(() => {
    const u = this.currentUser();
    if (!u) return '';
    const raw = String(u.fullName || u.full_name || u.email || 'Du khách').trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    return parts.length > 2 ? parts.slice(-2).join(' ') : raw;
  });

  readonly userInitials = computed(() => {
    const name = this.userShortName();
    if (!name) return 'T';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  onNavItemClick(key: SiteNavKey): void {
    this.mobileMenuOpen.set(false);
    this.navClick.emit(key);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  openLogin(): void {
    this.mobileMenuOpen.set(false);
    this.authService.openAuthModal();
  }

  logout(): void {
    this.mobileMenuOpen.set(false);
    this.authService.logout();
  }
}
