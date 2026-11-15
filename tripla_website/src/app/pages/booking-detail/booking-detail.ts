import { CommonModule } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { injectLiveHttp } from '../../services/live-http';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';

interface BookingDetailItem {
  room_id: string;
  room_name: string;
  quantity: number;
  unit_price: number;
  nights?: number;
  discount?: number;
  subtotal: number;
}

interface BookingDetailRecord {
  _id: string;
  booking_code: string;
  created_at: string;
  booking_status: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number;
  discount?: number;
  hotel: {
    hotel_name: string;
    address: string;
    hotel_slug?: string;
  };
  items: BookingDetailItem[];
  payment?: {
    payment_method?: string;
    payment_status?: string;
    transaction_id?: string;
    paid_at?: string;
  } | null;
}

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <div class="bd-shell">
      <div class="bd-header-wrap">
        <app-site-header
          variant="checkout"
          positionMode="static"
          subBrand="Chi tiết đặt phòng"
          backLabel="← Hồ sơ đặt chỗ"
          backRoute="/profile"
        >
          <a header-actions class="bd-find-link" routerLink="/hotel-search">Tìm khách sạn</a>
        </app-site-header>
      </div>

      <main class="bd-main">
        @if (loading) {
          <div class="bd-card" role="status">Đang tải chi tiết đơn đặt phòng...</div>
        } @else if (error) {
          <div class="bd-card bd-error" role="alert">
            <h1>Không thể hiển thị đơn đặt phòng</h1>
            <p>{{ error }}</p>
            <div class="bd-actions">
              @if (!authService.currentUser()) {
                <button type="button" class="bd-btn primary" (click)="openLoginAndReload()">
                  Đăng nhập tài khoản Du khách
                </button>
              }
              <a class="bd-btn secondary" routerLink="/profile">Quay lại Hồ sơ</a>
            </div>
          </div>
        } @else if (booking) {
          <section class="bd-card">
            <div class="bd-top">
              <div>
                <span class="bd-eyebrow">CHI TIẾT ĐƠN ĐẶT PHÒNG (BOOKING DETAIL)</span>
                <h1>Mã đơn #{{ booking.booking_code }}</h1>
                <p class="bd-date">Ngày đặt: {{ booking.created_at | date: 'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <div class="bd-badges">
                <span class="bd-status" [attr.data-status]="booking.booking_status">
                  {{ statusLabel(booking.booking_status) }}
                </span>
                @if (booking.payment?.payment_status) {
                  <span class="bd-pay">
                    Thanh toán: {{ booking.payment?.payment_status }}
                  </span>
                }
              </div>
            </div>

            <div class="bd-hotel-box">
              <div>
                <h2>{{ booking.hotel.hotel_name }}</h2>
                <p>📍 {{ booking.hotel.address }}</p>
              </div>
              <div class="bd-dates">
                <div><span>Nhận phòng (Check-in)</span><strong>{{ booking.check_in | date: 'dd/MM/yyyy' }}</strong></div>
                <div><span>Trả phòng (Check-out)</span><strong>{{ booking.check_out | date: 'dd/MM/yyyy' }}</strong></div>
                <div><span>Thời gian</span><strong>{{ booking.nights }} đêm</strong></div>
              </div>
            </div>

            <h3 class="bd-sub">Danh sách hạng phòng đã đặt</h3>
            <div class="bd-table-wrap">
              <table class="bd-table">
                <thead>
                  <tr>
                    <th>Tên hạng phòng</th>
                    <th class="num">Số lượng</th>
                    <th class="num">Đơn giá / đêm</th>
                    <th class="num">Số đêm</th>
                    <th class="num">Giảm giá</th>
                    <th class="num">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of booking.items; track $index) {
                    <tr>
                      <td><strong>{{ item.room_name }}</strong></td>
                      <td class="num">{{ item.quantity }}</td>
                      <td class="num">{{ formatVnd(item.unit_price) }}</td>
                      <td class="num">{{ item.nights || booking.nights }}</td>
                      <td class="num">{{ formatVnd(item.discount || 0) }}</td>
                      <td class="num"><strong>{{ formatVnd(item.subtotal) }}</strong></td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" class="num"><strong>Tổng thanh toán đơn hàng</strong></td>
                    <td class="num"><strong class="bd-total">{{ formatVnd(booking.total_price) }}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        }
      </main>
      <app-site-footer variant="compact" compactLabel="E-Voucher &amp; Tra cứu đặt chỗ" />
    </div>
  `,
  styles: [`
    .bd-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(155deg, #f3f3e9 0%, #e7edda 100%);
      color: #173b32;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
    }
    .bd-header-wrap {
      width: 100%;
      max-width: 1080px;
      margin: 0 auto;
      padding: 18px 24px 0;
    }
    .bd-find-link {
      color: #30624b;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 99px;
      border: 1px solid rgba(23, 59, 50, 0.14);
      background: rgba(255, 255, 255, 0.72);
    }
    .bd-find-link:hover {
      background: #e7edda;
    }
    .bd-main {
      width: 100%;
      flex: 1 0 auto;
      max-width: 1080px;
      margin: 0 auto;
      padding: 10px 24px 56px;
    }
    .bd-card {
      background: #fffef9;
      border: 1px solid #d8e1ce;
      border-radius: 22px;
      padding: 28px;
      box-shadow: 0 18px 40px -24px rgba(23, 59, 50, 0.25);
    }
    .bd-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5ebd9;
    }
    .bd-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #30624b;
    }
    h1 {
      margin: 6px 0 4px;
      font-size: 26px;
      font-weight: 700;
    }
    .bd-date {
      margin: 0;
      font-size: 13px;
      color: #5c6d5d;
    }
    .bd-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bd-status,
    .bd-pay {
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: #dfecb6;
      color: #173b32;
    }
    .bd-status[data-status='cancelled'] {
      background: #fee2e2;
      color: #991b1b;
    }
    .bd-status[data-status='pending'] {
      background: #fef3c7;
      color: #92400e;
    }
    .bd-hotel-box {
      margin-top: 20px;
      padding: 18px 20px;
      border-radius: 16px;
      background: #f3f6ec;
      border: 1px solid #dce4d0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .bd-hotel-box h2 {
      margin: 0 0 6px;
      font-size: 19px;
    }
    .bd-hotel-box p {
      margin: 0;
      font-size: 13px;
      color: #4f6353;
    }
    .bd-dates {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .bd-dates > div {
      display: grid;
      gap: 3px;
      font-size: 12px;
      color: #5c6d5d;
    }
    .bd-dates strong {
      font-size: 14px;
      color: #173b32;
    }
    .bd-sub {
      margin: 24px 0 12px;
      font-size: 16px;
      font-weight: 700;
    }
    .bd-table-wrap {
      overflow-x: auto;
    }
    .bd-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .bd-table th,
    .bd-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e6ecdb;
      text-align: left;
    }
    .bd-table th {
      background: #eef2e5;
      color: #30624b;
      font-weight: 700;
    }
    .bd-table .num {
      text-align: right;
    }
    .bd-total {
      font-size: 18px;
      color: #173b32;
    }
    .bd-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    .bd-btn {
      padding: 10px 18px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #30624b;
      text-decoration: none;
    }
    .bd-btn.primary {
      background: #173b32;
      color: #fff;
    }
    .bd-btn.secondary {
      background: transparent;
      color: #173b32;
    }
  `]
})
export class BookingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = injectLiveHttp();
  readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = '/api/v1';

  loading = true;
  error = '';
  booking: BookingDetailRecord | null = null;
  private currentCode = '';

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && this.currentCode && !this.booking && this.error) {
        this.fetchDetail();
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.currentCode = params.get('bookingCode') || '';
      this.fetchDetail();
    });
  }

  openLoginAndReload(): void {
    this.authService.openAuthModal();
  }

  fetchDetail(): void {
    if (!this.currentCode) {
      this.loading = false;
      this.error = 'Thiếu mã đơn đặt phòng.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.http) {
      this.loading = false;
      this.error = 'Chưa kết nối API chi tiết đơn.';
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.error = '';
    const headers = new HttpHeaders(this.authService.getAuthHeaders());
    this.http
      .get<{ success: boolean; booking?: BookingDetailRecord; message?: string }>(
        `${this.apiBase}/bookings/detail/${encodeURIComponent(this.currentCode)}`,
        { headers }
      )
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.success && res.booking) {
            this.booking = res.booking;
          } else {
            this.error = res?.message || 'Không tìm thấy đơn đặt phòng.';
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.error?.message ||
            (err?.status === 401
              ? 'Vui lòng đăng nhập tài khoản Du khách để xem chi tiết đơn đặt phòng của bạn.'
              : 'Không thể tải thông tin đơn đặt phòng.');
          this.cdr.markForCheck();
        }
      });
  }

  statusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'Đã xác nhận (Confirmed)';
    if (s === 'pending') return 'Chờ xử lý (Pending)';
    if (s === 'checked_in') return 'Đã nhận phòng';
    if (s === 'checked_out') return 'Đã hoàn thành (Checked-out)';
    if (s === 'cancelled') return 'Đã hủy (Cancelled)';
    return status;
  }

  formatVnd(val: number): string {
    return `${(Number(val) || 0).toLocaleString('vi-VN')} ₫`;
  }
}
