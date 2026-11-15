import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth-service';

type AdminTab = 'overview' | 'data' | 'bookings' | 'community';
type DataCategory = 'locations' | 'hotels' | 'buses';

interface AdminRow {
  id: string;
  name: string;
  sub: string;
  price: number;
  image?: string;
  raw?: any;
}

export interface ProviderOption {
  _id: string;
  provider_id: string;
  business_name: string;
  business_license?: string;
  verification_status: string;
}

export interface TopCustomerItem {
  rank: number;
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  avatar?: string;
  membershipTier?: string;
  total_spending: number;
  completed_bookings: number;
}

interface HotelFormState {
  hotel_name: string;
  provider_id: string;
  address: string;
  city: string;
  description: string;
  price_per_night: number;
  star_rating: number;
  initial_stock: number;
  image_url: string;
}

interface LocationFormState {
  name: string;
  location_category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  entry_fee: number;
  location_description: string;
  image_url: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private readonly apiBase = '/api/v1';

  @ViewChild('topCustomersCanvas') topCustomersCanvas?: ElementRef<HTMLCanvasElement>;

  activeTab: AdminTab = 'overview';
  dataCategory: DataCategory = 'locations';
  isLoading = true;
  errorMessage: string | null = null;
  toastMessage: string | null = null;

  stats = { usersCount: 0, totalRevenue: 0, contentsCount: 0, bookingsCount: 0, pendingReportsCount: 0 };
  users: any[] = [];
  bookings: any[] = [];
  locations: any[] = [];
  hotels: any[] = [];
  rooms: any[] = [];
  busTrips: any[] = [];
  contents: any[] = [];
  reports: any[] = [];

  // Q18: Moderation filter state
  reportStatusFilter = 'all';

  // Q19: Bookings pagination & search/filter state
  bookingKeyword = '';
  bookingStatusFilter = 'all';
  bookingPage = 1;
  bookingLimit = 10;
  bookingTotal = 0;
  bookingTotalPages = 1;

  // Q20: Location Categories & Add/Edit Location Modal
  locationCategories: Array<{ value: string; label: string }> = [
    { value: 'attraction', label: 'Điểm tham quan (attraction)' },
    { value: 'restaurant', label: 'Nhà hàng / Ẩm thực (restaurant)' },
    { value: 'cafe', label: 'Quán cà phê (cafe)' },
    { value: 'shopping', label: 'Mua sắm (shopping)' },
    { value: 'nature', label: 'Thiên nhiên (nature)' },
    { value: 'other', label: 'Khác (other)' }
  ];
  locationCategoryFilter = 'all';
  isLocationModalOpen = false;
  isSavingLocation = false;
  editingLocationId: string | null = null;
  locationFormError: string | null = null;
  locationForm: LocationFormState = this.emptyLocationForm();

  approvedProviders: ProviderOption[] = [];
  topCustomers: TopCustomerItem[] = [];
  totalCheckedOutBookings = 0;

  isHotelModalOpen = false;
  isSavingHotel = false;
  editingHotelId: string | null = null;
  hotelFormError: string | null = null;
  hotelForm: HotelFormState = this.emptyHotelForm();

  editingRow: AdminRow | null = null;
  editName = '';
  editPrice = 0;
  searchText = '';

  readonly statusOptions = [
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'checked_in', label: 'Đã nhận phòng' },
    { value: 'checked_out', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' }
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  private emptyHotelForm(): HotelFormState {
    return {
      hotel_name: '',
      provider_id: '',
      address: '',
      city: 'Đà Nẵng',
      description: '',
      price_per_night: 3500000,
      star_rating: 5,
      initial_stock: 5,
      image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
    };
  }

  private emptyLocationForm(): LocationFormState {
    return {
      name: '',
      location_category: 'attraction',
      address: '',
      city: 'Đà Nẵng',
      latitude: 16.0544,
      longitude: 108.2208,
      entry_fee: 0,
      location_description: '',
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900'
    };
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(this.authService.getAuthHeaders());
  }

  private handleAuthError(err: any): boolean {
    if (err?.status === 401 || err?.status === 403) {
      this.showToast('Phiên quản trị hết hạn hoặc cần quyền Admin.');
      this.router.navigate(['/admin/login']);
      return true;
    }
    return false;
  }

  get adminDisplayName(): string {
    const u = this.authService.currentUser();
    return u?.fullName || u?.email || 'Quản trị viên TRIPLA';
  }

  logoutAdmin(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.http
      .get<any>(`${this.apiBase}/admin/dashboard`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          this.stats = {
            usersCount: Number(res.stats?.usersCount || 0),
            totalRevenue: Number(res.stats?.totalRevenue || 0),
            contentsCount: Number(res.stats?.contentsCount || 0),
            bookingsCount: Number(res.stats?.bookingsCount || 0),
            pendingReportsCount: Number(
              res.stats?.pendingReportsCount ??
                (res.reports || []).filter((r: any) => String(r.status || 'pending') === 'pending').length
            )
          };
          this.users = res.users || [];
          this.bookings = res.bookings || [];
          this.bookingTotal = this.bookings.length;
          this.bookingTotalPages = Math.max(1, Math.ceil(this.bookingTotal / this.bookingLimit));
          this.locations = res.locations || [];
          this.hotels = res.hotels || [];
          this.rooms = res.rooms || [];
          this.busTrips = res.busTrips || [];
          this.contents = res.contents || [];
          this.reports = res.reports || [];
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          if (!this.handleAuthError(err)) {
            this.errorMessage =
              err?.error?.message ||
              'Không kết nối được server (http://localhost:3000). Hãy chạy "npm start" trong my-server-mongodb.';
          }
          this.cdr.markForCheck();
        }
      });

    this.loadProviders();
    this.loadTopCustomers();
  }

  loadProviders(): void {
    this.http
      .get<any>(`${this.apiBase}/admin/providers?status=approved`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.providers) ? res.providers : [];
          this.approvedProviders = list.filter(
            (p: ProviderOption) => String(p.verification_status || '').toLowerCase() === 'approved'
          );
          this.cdr.markForCheck();
        },
        error: () => {
          // Non-fatal; fallback stays empty until loaded
        }
      });
  }

  loadTopCustomers(): void {
    this.http
      .get<any>(`${this.apiBase}/admin/top-customers`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          this.topCustomers = Array.isArray(res?.items) ? res.items : [];
          this.totalCheckedOutBookings = Number(res?.totalCheckedOutBookings || 0);
          this.cdr.markForCheck();
          queueMicrotask(() => this.drawTopCustomersChart());
        },
        error: () => {
          this.topCustomers = [];
          this.cdr.markForCheck();
        }
      });
  }

  get maxCustomerSpending(): number {
    return Math.max(1, ...this.topCustomers.map((c) => Number(c.total_spending || 0)));
  }

  drawTopCustomersChart(): void {
    try {
      const canvas = this.topCustomersCanvas?.nativeElement;
      if (!canvas || !this.topCustomers.length) return;
      const ctx = canvas.getContext?.('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const maxVal = this.maxCustomerSpending;
      const barAreaLeft = 175;
      const barAreaRight = 100;
      const barMaxW = Math.max(80, width - barAreaLeft - barAreaRight);
      const rowH = Math.floor((height - 20) / Math.max(1, this.topCustomers.length));

      this.topCustomers.forEach((cust, idx) => {
        const y = 14 + idx * rowH;
        const barW = Math.max(8, Math.round((Number(cust.total_spending || 0) / maxVal) * barMaxW));

        ctx.fillStyle = '#0f172a';
        ctx.font = '600 12px system-ui, -apple-system, sans-serif';
        const label = `#${cust.rank} ${cust.full_name}`.slice(0, 22);
        ctx.fillText(label, 8, y + 18);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(barAreaLeft, y + 4, barMaxW, 20);

        ctx.fillStyle = idx === 0 ? '#059669' : '#2563eb';
        ctx.fillRect(barAreaLeft, y + 4, barW, 20);

        ctx.fillStyle = '#334155';
        ctx.font = '700 11px system-ui, -apple-system, sans-serif';
        const mText = `${Math.round(Number(cust.total_spending || 0) / 1000000)}M ₫`;
        ctx.fillText(mText, barAreaLeft + barW + 8, y + 18);
      });
    } catch {
      // Ignore canvas rendering errors in non-DOM test runners
    }
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'overview') {
      queueMicrotask(() => this.drawTopCustomersChart());
    }
  }

  setCategory(cat: DataCategory): void {
    this.dataCategory = cat;
    this.editingRow = null;
  }

  get dataRows(): AdminRow[] {
    let rows: AdminRow[] = [];
    if (this.dataCategory === 'locations') {
      const catFilter = this.locationCategoryFilter;
      const filteredLocs =
        catFilter && catFilter !== 'all'
          ? this.locations.filter((l) => String(l.location_category || '').toLowerCase() === catFilter)
          : this.locations;
      rows = filteredLocs.map((l) => ({
        id: String(l._id),
        name: l.name || l.title,
        sub: `${l.location_category || l.category || 'attraction'} • ${l.address || l.city || ''}`,
        price: Number(l.entry_fee ?? l.price) || 0,
        image: l.image_url || l.images?.[0],
        raw: l
      }));
    } else if (this.dataCategory === 'hotels') {
      rows = this.hotels.map((h) => {
        const hotelRooms = this.rooms.filter(
          (r) => String(r.hotel_id?._id || r.hotel_id || '') === String(h._id)
        );
        const totalStock =
          hotelRooms.length > 0
            ? hotelRooms.reduce((sum, r) => sum + Number(r.stock ?? 0), 0)
            : Number(h.total_rooms ?? 0);
        const providerName =
          h.provider_id?.business_name ||
          this.approvedProviders.find((p) => String(p._id) === String(h.provider_id))?.business_name ||
          'Chưa gán NCC';
        return {
          id: String(h._id),
          name: h.hotel_name || h.name,
          sub: `${h.star_rating || 5}★ • NCC: ${providerName} • Tồn phòng: ${totalStock} • ${h.address || h.city || ''}`,
          price: Number(h.price_per_night || h.pricePerNight) || 0,
          image: h.image_url || h.images?.[0],
          raw: h
        };
      });
    } else {
      rows = this.busTrips.map((b) => ({
        id: String(b._id || b.id),
        name: b.operatorName || b.operator || 'Nhà xe',
        sub: `${b.fromCity || b.from || ''} → ${b.toCity || b.to || ''} • ${b.departureTime || ''}`,
        price: Number(b.priceVnd || b.price) || 0,
        image: b.image || b.imageUrl
      }));
    }
    const q = this.searchText.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(q)) : rows;
  }

  get pendingBookings(): number {
    return this.bookings.filter((b) => (b.booking_status || '').toLowerCase() === 'pending').length;
  }

  get recentBookings(): any[] {
    return this.bookings.slice(0, 6);
  }

  // Q7: Hotel Add / Edit Modal (with Approved Providers dropdown)
  openAddHotelModal(): void {
    this.editingHotelId = null;
    this.hotelFormError = null;
    this.hotelForm = {
      ...this.emptyHotelForm(),
      provider_id: this.approvedProviders[0]?.provider_id || ''
    };
    if (!this.approvedProviders.length) {
      this.loadProviders();
    }
    this.isHotelModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditHotelModal(hotel: any): void {
    this.editingHotelId = String(hotel._id);
    this.hotelFormError = null;
    this.hotelForm = {
      hotel_name: hotel.hotel_name || hotel.name || '',
      provider_id: String(
        hotel.provider_id?._id || hotel.provider_id || this.approvedProviders[0]?.provider_id || ''
      ),
      address: hotel.address || '',
      city: hotel.city || hotel.area || 'Việt Nam',
      description: hotel.description || '',
      price_per_night: Number(hotel.price_per_night || hotel.pricePerNight || 3500000),
      star_rating: Number(hotel.star_rating || hotel.stars || 5),
      initial_stock: Number(hotel.total_rooms || 5),
      image_url: hotel.image_url || hotel.images?.[0] || ''
    };
    this.isHotelModalOpen = true;
    this.cdr.markForCheck();
  }

  closeHotelModal(): void {
    this.isHotelModalOpen = false;
    this.editingHotelId = null;
    this.hotelFormError = null;
    this.cdr.markForCheck();
  }

  saveHotelForm(): void {
    if (!this.hotelForm.hotel_name.trim() || !this.hotelForm.address.trim() || !this.hotelForm.provider_id.trim()) {
      this.hotelFormError = 'Vui lòng nhập đầy đủ Tên khách sạn, Địa chỉ và chọn Nhà cung cấp (Approved).';
      this.cdr.markForCheck();
      return;
    }

    this.isSavingHotel = true;
    this.hotelFormError = null;

    const payload = {
      hotel_name: this.hotelForm.hotel_name.trim(),
      provider_id: this.hotelForm.provider_id.trim(),
      address: this.hotelForm.address.trim(),
      city: this.hotelForm.city.trim() || 'Việt Nam',
      description: this.hotelForm.description.trim(),
      price_per_night: Number(this.hotelForm.price_per_night) || 0,
      star_rating: Number(this.hotelForm.star_rating) || 5,
      initial_stock: Number(this.hotelForm.initial_stock) || 5,
      image_url: this.hotelForm.image_url.trim()
    };

    const request$ = this.editingHotelId
      ? this.http.put<any>(`${this.apiBase}/admin/hotels/${this.editingHotelId}`, payload, {
          headers: this.authHeaders()
        })
      : this.http.post<any>(`${this.apiBase}/admin/hotels`, payload, {
          headers: this.authHeaders()
        });

    request$.subscribe({
      next: (res) => {
        this.isSavingHotel = false;
        const savedName = res?.hotel?.hotel_name || payload.hotel_name;
        this.showToast(
          this.editingHotelId ? `Đã cập nhật khách sạn "${savedName}".` : `Đã thêm khách sạn "${savedName}".`
        );
        this.closeHotelModal();
        this.loadDashboard();
      },
      error: (err) => {
        this.isSavingHotel = false;
        if (this.handleAuthError(err)) return;
        this.hotelFormError = err?.error?.message || 'Lưu khách sạn thất bại.';
        this.showToast(this.hotelFormError!);
        this.cdr.markForCheck();
      }
    });
  }

  startEdit(row: AdminRow): void {
    if (this.dataCategory === 'hotels' && row.raw) {
      this.openEditHotelModal(row.raw);
      return;
    }
    if (this.dataCategory === 'locations' && row.raw) {
      this.openEditLocationModal(row.raw);
      return;
    }
    this.editingRow = row;
    this.editName = row.name;
    this.editPrice = row.price;
  }

  cancelEdit(): void {
    this.editingRow = null;
  }

  saveEdit(): void {
    if (!this.editingRow) return;
    const row = this.editingRow;
    this.http
      .put<any>(
        `${this.apiBase}/admin/items/${this.dataCategory}/${row.id}`,
        {
          name: this.editName,
          price: Number(this.editPrice)
        },
        { headers: this.authHeaders() }
      )
      .subscribe({
        next: () => {
          this.showToast(`Đã cập nhật "${this.editName}" vào MongoDB.`);
          this.editingRow = null;
          this.loadDashboard();
        },
        error: (err) => {
          if (!this.handleAuthError(err)) this.showToast(err?.error?.message || 'Cập nhật thất bại.');
        }
      });
  }

  deleteItem(row: AdminRow): void {
    if (!confirm(`Xóa vĩnh viễn "${row.name}" khỏi cơ sở dữ liệu?`)) return;
    const url =
      this.dataCategory === 'hotels'
        ? `${this.apiBase}/admin/hotels/${row.id}`
        : this.dataCategory === 'locations'
          ? `${this.apiBase}/admin/locations/${row.id}`
          : `${this.apiBase}/admin/items/${this.dataCategory}/${row.id}`;

    this.http.delete<any>(url, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        const cascadeMsg = res?.cascadeRoomsDeleted
          ? ` (đã xóa kèm ${res.cascadeRoomsDeleted} phòng)`
          : this.dataCategory === 'locations'
            ? ` (đã xóa ${res?.deletedWishlists ?? 0} wishlist, gỡ ${res?.clearedLocationTags ?? 0} tag & ${res?.clearedPlanDetails ?? 0} chặng)`
            : '';
        this.showToast(`Đã xóa "${row.name}"${cascadeMsg}.`);
        this.loadDashboard();
      },
      error: (err) => {
        if (this.handleAuthError(err)) return;
        const msg = err?.error?.message || 'Xóa thất bại.';
        this.errorMessage = err?.status === 409 ? msg : this.errorMessage;
        this.showToast(msg);
        this.cdr.markForCheck();
      }
    });
  }

  updateBookingStatus(booking: any, status: string): void {
    this.http
      .put<any>(
        `${this.apiBase}/admin/bookings/${booking._id}/status`,
        { booking_status: status },
        { headers: this.authHeaders() }
      )
      .subscribe({
        next: (res) => {
          booking.booking_status = res?.booking?.booking_status || status;

          // Update local room stock immediately from releasedRooms (Q8)
          const released = Array.isArray(res?.releasedRooms) ? res.releasedRooms : [];
          released.forEach((rel: any) => {
            const roomTarget = this.rooms.find((r) => String(r._id) === String(rel.room_id));
            if (roomTarget) {
              roomTarget.stock = rel.newStock;
            }
          });

          const releaseSummary = released.length
            ? ` • Hoàn kho: ${released
                .map((r: any) => `+${r.releasedQuantity} ${r.room_name} (tồn ${r.newStock})`)
                .join(', ')}`
            : '';
          const refundSummary = res?.paymentRefunded ? ' • Đã hoàn tiền' : '';

          this.showToast(
            `Đơn #${booking.booking_code || booking.bookingCode} → ${this.statusLabel(status)}${releaseSummary}${refundSummary}`
          );

          if (status === 'checked_out' || released.length > 0) {
            this.loadTopCustomers();
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthError(err)) {
            this.showToast(err?.error?.message || 'Không cập nhật được trạng thái.');
          }
        }
      });
  }

  deleteContent(content: any): void {
    if (!confirm(`Gỡ bài đăng "${content.content_title || content.title}"?`)) return;
    this.http
      .delete<any>(`${this.apiBase}/admin/contents/${content._id}`, { headers: this.authHeaders() })
      .subscribe({
        next: () => {
          this.contents = this.contents.filter((c) => String(c._id) !== String(content._id));
          this.reports = this.reports.map((r) =>
            String(r.content_id?._id || r.content_id) === String(content._id) && String(r.status || 'pending') === 'pending'
              ? { ...r, status: 'resolved' }
              : r
          );
          this.stats.contentsCount = this.contents.length;
          this.stats.pendingReportsCount = this.reports.filter((r) => String(r.status || 'pending') === 'pending').length;
          this.showToast('Đã gỡ nội dung vi phạm và cập nhật trạng thái báo cáo.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthError(err)) this.showToast(err?.error?.message || 'Gỡ nội dung thất bại.');
        }
      });
  }

  // Q18: Moderation methods
  filterReports(status: string): void {
    this.reportStatusFilter = status;
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    this.http.get<any>(`${this.apiBase}/admin/reports${qs}`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.items)) {
          this.reports = res.items;
          if (status === 'all') {
            this.stats.pendingReportsCount = this.reports.filter((r) => String(r.status || 'pending') === 'pending').length;
          }
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (!this.handleAuthError(err)) this.showToast('Không tải được danh sách báo cáo.');
      }
    });
  }

  updateReportStatus(report: any, status: 'resolved' | 'dismissed' | 'pending'): void {
    this.http
      .put<any>(`${this.apiBase}/admin/reports/${report._id}`, { status }, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          const updated = res?.report;
          this.reports = this.reports.map((r) =>
            String(r._id) === String(report._id) ? { ...r, ...(updated || {}), status } : r
          );
          this.stats.pendingReportsCount = this.reports.filter((r) => String(r.status || 'pending') === 'pending').length;
          this.showToast(`Đã cập nhật báo cáo → ${status}.`);
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthError(err)) this.showToast(err?.error?.message || 'Cập nhật báo cáo thất bại.');
        }
      });
  }

  deleteReportedContent(report: any): void {
    const contentId = report?.content_id?._id || report?.content_id;
    const title = report?.content_id?.content_title || 'nội dung vi phạm';
    if (!contentId) {
      this.updateReportStatus(report, 'resolved');
      return;
    }
    this.deleteContent({ _id: String(contentId), content_title: title });
  }

  // Q19: Admin stats & paginated booking list
  loadAdminStats(): void {
    this.http.get<any>(`${this.apiBase}/admin/stats`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        if (res?.success && res.stats) {
          this.stats = {
            usersCount: Number(res.stats.usersCount ?? this.stats.usersCount),
            totalRevenue: Number(res.stats.revenue ?? this.stats.totalRevenue),
            contentsCount: Number(res.stats.contentsCount ?? this.stats.contentsCount),
            bookingsCount: Number(res.stats.bookingsCount ?? this.stats.bookingsCount),
            pendingReportsCount: Number(res.stats.pendingReportsCount ?? 0)
          };
          this.showToast(`KPI đã đồng bộ: Doanh thu ${this.formatVnd(this.stats.totalRevenue)}`);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (!this.handleAuthError(err)) this.showToast('Không đồng bộ được KPI thống kê.');
      }
    });
  }

  loadAdminBookings(page = this.bookingPage): void {
    const nextPage = Math.max(1, page);
    const params = new URLSearchParams();
    if (this.bookingKeyword.trim()) params.set('keyword', this.bookingKeyword.trim());
    if (this.bookingStatusFilter && this.bookingStatusFilter !== 'all') params.set('status', this.bookingStatusFilter);
    params.set('page', String(nextPage));
    params.set('limit', String(this.bookingLimit));

    this.http
      .get<any>(`${this.apiBase}/admin/bookings?${params.toString()}`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          if (res?.success && Array.isArray(res.items)) {
            this.bookings = res.items;
            this.bookingPage = Number(res.page || nextPage);
            this.bookingTotal = Number(res.total || res.items.length);
            this.bookingTotalPages = Number(res.totalPages || 1);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthError(err)) this.showToast('Không tải được danh sách đặt chỗ.');
        }
      });
  }

  applyBookingFilter(): void {
    this.loadAdminBookings(1);
  }

  prevBookingPage(): void {
    if (this.bookingPage > 1) this.loadAdminBookings(this.bookingPage - 1);
  }

  nextBookingPage(): void {
    if (this.bookingPage < this.bookingTotalPages) this.loadAdminBookings(this.bookingPage + 1);
  }

  // Q20: Location CRUD & categories
  loadLocationCategories(): void {
    this.http.get<any>(`${this.apiBase}/location-categories`).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.categories)) {
          this.locationCategories = res.categories;
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadAdminLocations(): void {
    const params = new URLSearchParams();
    if (this.searchText.trim()) params.set('keyword', this.searchText.trim());
    if (this.locationCategoryFilter && this.locationCategoryFilter !== 'all') {
      params.set('category', this.locationCategoryFilter);
    }
    this.http
      .get<any>(`${this.apiBase}/admin/locations?${params.toString()}`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          if (res?.success && Array.isArray(res.items)) {
            this.locations = res.items;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthError(err)) this.showToast('Không tải được danh sách địa điểm.');
        }
      });
  }

  openAddLocationModal(): void {
    this.editingLocationId = null;
    this.locationFormError = null;
    this.locationForm = this.emptyLocationForm();
    this.loadLocationCategories();
    this.isLocationModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditLocationModal(loc: any): void {
    this.editingLocationId = String(loc._id);
    this.locationFormError = null;
    this.locationForm = {
      name: loc.name || '',
      location_category: loc.location_category || 'attraction',
      address: loc.address || '',
      city: loc.city || '',
      latitude: Number(loc.latitude ?? loc.geo?.coordinates?.[1] ?? 16.0544),
      longitude: Number(loc.longitude ?? loc.geo?.coordinates?.[0] ?? 108.2208),
      entry_fee: Number(loc.entry_fee ?? 0),
      location_description: loc.location_description || '',
      image_url: loc.image_url || ''
    };
    this.isLocationModalOpen = true;
    this.cdr.markForCheck();
  }

  closeLocationModal(): void {
    this.isLocationModalOpen = false;
    this.editingLocationId = null;
    this.locationFormError = null;
    this.cdr.markForCheck();
  }

  saveLocationForm(): void {
    const lat = Number(this.locationForm.latitude);
    const lng = Number(this.locationForm.longitude);
    if (!this.locationForm.name.trim() || !this.locationForm.address.trim()) {
      this.locationFormError = 'Vui lòng nhập đầy đủ Tên địa điểm và Địa chỉ.';
      this.cdr.markForCheck();
      return;
    }
    if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180) {
      this.locationFormError = 'Tọa độ phải hợp lệ: Vĩ độ (-90..90), Kinh độ (-180..180).';
      this.cdr.markForCheck();
      return;
    }

    this.isSavingLocation = true;
    this.locationFormError = null;
    const payload = {
      name: this.locationForm.name.trim(),
      location_category: this.locationForm.location_category || 'attraction',
      address: this.locationForm.address.trim(),
      city: this.locationForm.city.trim(),
      latitude: lat,
      longitude: lng,
      entry_fee: Math.max(0, Number(this.locationForm.entry_fee) || 0),
      location_description: this.locationForm.location_description.trim(),
      image_url: this.locationForm.image_url.trim()
    };

    const req$ = this.editingLocationId
      ? this.http.put<any>(`${this.apiBase}/admin/locations/${this.editingLocationId}`, payload, {
          headers: this.authHeaders()
        })
      : this.http.post<any>(`${this.apiBase}/admin/locations`, payload, {
          headers: this.authHeaders()
        });

    req$.subscribe({
      next: (res) => {
        this.isSavingLocation = false;
        const savedName = res?.location?.name || payload.name;
        this.showToast(
          this.editingLocationId ? `Đã cập nhật địa điểm "${savedName}".` : `Đã thêm địa điểm "${savedName}".`
        );
        this.closeLocationModal();
        this.loadDashboard();
      },
      error: (err) => {
        this.isSavingLocation = false;
        if (this.handleAuthError(err)) return;
        this.locationFormError = err?.error?.message || 'Lưu địa điểm thất bại.';
        this.showToast(this.locationFormError!);
        this.cdr.markForCheck();
      }
    });
  }

  statusLabel(status: string): string {
    return this.statusOptions.find((s) => s.value === (status || '').toLowerCase())?.label || status || 'Đã xác nhận';
  }

  bookingTitle(b: any): string {
    return b.title || b.hotel_id?.hotel_name || b.location_id?.name || 'Đặt chỗ TRIPLA';
  }

  formatVnd(val: number): string {
    return `${(Number(val) || 0).toLocaleString('vi-VN')} ₫`;
  }

  creatorName(c: any): string {
    return c.user_id?.full_name || c.author || 'Creator';
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 3000);
  }
}
