import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth-service';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  readonly authService = inject(AuthService);

  private readonly apiBase = 'http://localhost:3000/api/v1';

  activeProfileCode = '';
  isOwnProfile = true;
  activeTab: 'bookings' | 'saved' | 'posts' | 'reviews' | 'notifications' = 'bookings';
  bookingStatusFilter = 'all';
  isLoading = true;
  notFoundError = false;
  toastMessage: string | null = null;

  editProfileOpen = false;
  editFullName = '';
  editPhone = '';
  editLocation = '';
  editBio = '';
  savingProfile = false;

  user: any = null;
  bookings: any[] = [];
  tripPlans: any[] = [];
  myTrips: any[] = [];
  wishlists: any[] = [];
  bookmarkedReels: any[] = [];
  savedTrips: any[] = [];
  comments: any[] = [];
  contents: any[] = [];
  notifications: any[] = [];
  unreadNotificationsCount = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const paramId = params.get('id');
      const current = this.authService.currentUser() as any;
      const resolvedId = paramId || current?.id || current?._id || current?.code || current?.email || 'me';
      this.isOwnProfile =
        !paramId ||
        (!!current &&
          (String(current.id || current._id) === String(paramId) ||
            current.code === paramId ||
            current.email === paramId));
      this.loadProfile(resolvedId, !!paramId);
    });
  }

  loadProfile(idOrCode: string, explicitProfileParam = false): void {
    this.isLoading = true;
    this.notFoundError = false;
    this.activeProfileCode = idOrCode;

    const isAuthed = this.authService.isLoggedIn();
    const headers = this.authService.getAuthHeaders();

    if (isAuthed && !explicitProfileParam) {
      this.authService.fetchMe().subscribe((me) => {
        const resolvedMe = (me as any)?.user ?? me;
        if (resolvedMe && (resolvedMe._id || resolvedMe.id || resolvedMe.email)) {
          this.user = { ...(this.user || {}), ...resolvedMe };
          this.prefillEditFields(this.user);
        }
        this.cdr.markForCheck();
      });
      this.loadMyBookings(this.bookingStatusFilter);
      this.loadMyTripsAndPlans();
      this.loadNotifications();
    }

    const requestOptions = isAuthed ? { headers } : {};
    this.http.get<any>(`${this.apiBase}/users/${encodeURIComponent(idOrCode)}/profile`, requestOptions).subscribe({
      next: (res) => {
        if (res?.success && res.user) {
          this.user =
            isAuthed && !explicitProfileParam && this.user
              ? { ...res.user, ...this.user }
              : res.user;
          this.prefillEditFields(this.user);
          if (!isAuthed || explicitProfileParam) {
            this.bookings = res.bookings || [];
            this.tripPlans = res.tripPlans || [];
            this.myTrips = res.trips || [];
          }
          this.wishlists = res.wishlists || [];
          this.bookmarkedReels = res.bookmarkedReels || [];
          this.savedTrips = res.savedTrips || [];
          this.comments = res.comments || [];
          this.contents = res.contents || [];
        } else {
          this.notFoundError = !this.user;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notFoundError = !this.user;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private prefillEditFields(u: any): void {
    this.editFullName = u?.fullName || u?.full_name || '';
    this.editPhone = u?.phone_number || '';
    this.editLocation = u?.location || '';
    this.editBio = u?.bio || '';
  }

  get userDisplayName(): string {
    return this.user?.full_name || this.user?.fullName || 'Thành viên TRIPLA';
  }

  get userInitials(): string {
    const parts = this.userDisplayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (parts[0] || 'TR').slice(0, 2).toUpperCase();
  }

  get savedTotalCount(): number {
    return (this.wishlists?.length || 0) + (this.bookmarkedReels?.length || 0);
  }

  loadMyBookings(status = this.bookingStatusFilter): void {
    if (!this.authService.isLoggedIn()) return;
    const headers = this.authService.getAuthHeaders();
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    this.http.get<any>(`${this.apiBase}/bookings/my${qs}`, { headers }).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.items)) {
          this.bookings = res.items;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  setBookingStatusFilter(status: string): void {
    this.bookingStatusFilter = status;
    this.loadMyBookings(status);
  }

  loadMyTripsAndPlans(): void {
    if (!this.authService.isLoggedIn()) return;
    const headers = this.authService.getAuthHeaders();
    this.http.get<any>(`${this.apiBase}/trip-plans`, { headers }).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.items)) {
          this.tripPlans = res.items;
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
    this.http.get<any>(`${this.apiBase}/trips/my`, { headers }).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.items)) {
          this.myTrips = res.items;
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadNotifications(): void {
    if (!this.authService.isLoggedIn()) return;
    const headers = this.authService.getAuthHeaders();
    this.http.get<any>(`${this.apiBase}/notifications`, { headers }).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.items)) {
          this.notifications = res.items;
          this.unreadNotificationsCount = Number(
            res.unreadCount ?? res.items.filter((n: any) => !n.is_read).length
          );
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  markNotificationRead(notificationId: string): void {
    if (!notificationId || !this.authService.isLoggedIn()) return;
    const headers = this.authService.getAuthHeaders();
    this.http
      .put<any>(`${this.apiBase}/notifications/${notificationId}/read`, {}, { headers })
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map((n) =>
            String(n._id) === String(notificationId) ? { ...n, is_read: true } : n
          );
          this.unreadNotificationsCount = this.notifications.filter((n) => !n.is_read).length;
          this.cdr.markForCheck();
        },
        error: () => {}
      });
  }

  markAllNotificationsRead(): void {
    if (!this.authService.isLoggedIn()) return;
    const headers = this.authService.getAuthHeaders();
    this.http.put<any>(`${this.apiBase}/notifications/read-all`, {}, { headers }).subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
        this.unreadNotificationsCount = 0;
        this.showToast('Đã đánh dấu tất cả thông báo là đã đọc.');
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  openEditProfile(): void {
    if (!this.isOwnProfile) return;
    this.prefillEditFields(this.user);
    this.editProfileOpen = !this.editProfileOpen;
  }

  saveProfile(): void {
    if (!this.editFullName.trim()) {
      this.showToast('Vui lòng nhập họ và tên.');
      return;
    }
    this.savingProfile = true;
    this.authService
      .updateProfile({
        full_name: this.editFullName.trim(),
        phone_number: this.editPhone.trim(),
        location: this.editLocation.trim(),
        bio: this.editBio.trim()
      })
      .subscribe({
        next: (res) => {
          this.savingProfile = false;
          if (res?.success && res.user) {
            this.user = { ...this.user, ...res.user };
            this.editProfileOpen = false;
            this.showToast('Đã cập nhật thông tin hồ sơ thành công.');
          } else {
            this.showToast(res?.message || 'Không thể cập nhật hồ sơ.');
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.savingProfile = false;
          this.showToast('Không thể cập nhật hồ sơ lúc này.');
          this.cdr.markForCheck();
        }
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/home']);
  }

  canCancelBooking(status: string | undefined): boolean {
    const s = String(status || 'pending').toLowerCase();
    return s === 'pending' || s === 'confirmed';
  }

  bookingStatusLabel(status: string | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'pending':
        return 'Chờ thanh toán';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'checked_in':
        return 'Đang lưu trú';
      case 'checked_out':
        return 'Hoàn tất';
      case 'cancelled':
        return 'Đã hủy';
      case 'no_show':
        return 'Không đến';
      default:
        return status || 'Đã xác nhận';
    }
  }

  switchAccount(code: string): void {
    void this.router.navigate(['/profile', code]);
  }

  setTab(tab: 'bookings' | 'saved' | 'posts' | 'reviews' | 'notifications'): void {
    this.activeTab = tab;
    if (tab === 'notifications' && this.isOwnProfile) {
      this.loadNotifications();
    }
  }

  cancelBooking(bookingCodeOrId: string, title: string): void {
    const headers = this.authService.getAuthHeaders();
    const request$ = this.authService.isLoggedIn()
      ? this.http.put<any>(`${this.apiBase}/bookings/${encodeURIComponent(bookingCodeOrId)}/cancel`, {}, { headers })
      : this.http.patch<any>(`${this.apiBase}/bookings/${bookingCodeOrId}/status`, { booking_status: 'cancelled' });

    request$.subscribe({
      next: (res) => {
        const updated = res?.booking;
        this.bookings = this.bookings.map((b) =>
          String(b._id) === String(bookingCodeOrId) ||
          String(b.booking_code) === String(bookingCodeOrId) ||
          String(b.bookingCode) === String(bookingCodeOrId)
            ? { ...(updated || b), booking_status: 'cancelled', status: 'CANCELLED' }
            : b
        );
        this.loadNotifications();
        this.showToast(`Đã hủy đơn "${title}" và hoàn lại quỹ phòng trống.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.showToast(err?.error?.message || `Không thể hủy đơn "${title}" lúc này.`);
        this.cdr.markForCheck();
      }
    });
  }

  formatVnd(val: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0))}₫`;
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 3200);
  }
}
