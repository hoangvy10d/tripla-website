import { HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth-service';
import { injectLiveHttp } from './live-http';

export interface BookingCartItem {
  id: string;
  _id?: string;
  hotel_id: string;
  room_id: string;
  hotel_name: string;
  hotel_slug?: string;
  room_name: string;
  unit_price: number;
  quantity: number;
  check_in: string;
  check_out: string;
  nights: number;
  line_total: number;
  availableStock: number;
  total_units?: number;
  image_url?: string;
}

export interface CartApiResponse {
  success: boolean;
  items?: BookingCartItem[];
  totalQuantity?: number;
  grandTotal?: number;
  errorCode?: string;
  availableStock?: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingCartService {
  private readonly http = injectLiveHttp();
  private readonly authService = inject(AuthService);
  private readonly apiBase = 'http://localhost:3000/api/v1';
  private readonly sessionKeyStorage = 'tripla_cart_session';

  readonly items = signal<BookingCartItem[]>([]);
  readonly totalQuantity = computed(() =>
    this.items().reduce((sum, it) => sum + Number(it.quantity || 0), 0)
  );
  readonly grandTotal = computed(() =>
    this.items().reduce((sum, it) => sum + Number(it.line_total || 0), 0)
  );
  readonly cartError = signal<string>('');
  readonly cartSuccess = signal<string>('');

  getSessionKey(): string {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
        let key = window.localStorage.getItem(this.sessionKeyStorage);
        if (!key) {
          key = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          window.localStorage.setItem(this.sessionKeyStorage, key);
        }
        return key;
      }
    } catch {
      // Fallback below
    }
    return 'guest-cart-session';
  }

  private headers(): HttpHeaders {
    const authHeaders = this.authService.getAuthHeaders();
    return new HttpHeaders({
      ...authHeaders,
      'x-cart-session': this.getSessionKey()
    });
  }

  clearMessages(): void {
    this.cartError.set('');
    this.cartSuccess.set('');
  }

  checkRoomAvailability(
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Observable<{ success: boolean; availableStock?: number; total_units?: number }> {
    if (!this.http || !roomId) {
      return of({ success: true, availableStock: 5, total_units: 5 });
    }
    return this.http
      .get<{ success: boolean; availableStock?: number; total_units?: number }>(
        `${this.apiBase}/rooms/${encodeURIComponent(roomId)}/availability`,
        {
          params: { check_in: checkIn, check_out: checkOut }
        }
      )
      .pipe(catchError(() => of({ success: false })));
  }

  getCart(): Observable<CartApiResponse> {
    if (!this.http) {
      return of({
        success: true,
        items: this.items(),
        totalQuantity: this.totalQuantity(),
        grandTotal: this.grandTotal()
      });
    }
    return this.http
      .get<CartApiResponse>(`${this.apiBase}/cart`, { headers: this.headers() })
      .pipe(
        tap((res) => {
          if (res?.success && Array.isArray(res.items)) {
            this.items.set(res.items);
          }
        }),
        catchError(() => of({ success: false, items: this.items() }))
      );
  }

  addToCart(input: {
    hotel_id: string;
    hotel_name?: string;
    hotel_slug?: string;
    room_id: string;
    room_name?: string;
    unit_price: number;
    quantity?: number;
    check_in: string;
    check_out: string;
    availableStock?: number;
  }): Observable<CartApiResponse> {
    this.clearMessages();
    const qty = Math.max(1, Number(input.quantity || 1));

    if (!this.http) {
      const currentList = [...this.items()];
      const idx = currentList.findIndex(
        (it) =>
          it.room_id === input.room_id &&
          it.check_in === input.check_in &&
          it.check_out === input.check_out
      );
      const existingQty = idx >= 0 ? currentList[idx].quantity : 0;
      const limit = Number(input.availableStock ?? 5);
      const desired = existingQty + qty;
      if (desired > limit) {
        const msg = `Chỉ còn ${limit} phòng trống cho ngày đã chọn (yêu cầu ${desired} phòng).`;
        this.cartError.set(msg);
        return of({ success: false, errorCode: 'EXCEEDS_AVAILABLE_STOCK', availableStock: limit, message: msg });
      }
      const nights = Math.max(
        1,
        Math.round((Date.parse(input.check_out) - Date.parse(input.check_in)) / 86400000) || 1
      );
      if (idx >= 0) {
        currentList[idx] = {
          ...currentList[idx],
          quantity: desired,
          line_total: desired * currentList[idx].unit_price * nights
        };
      } else {
        currentList.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          hotel_id: input.hotel_id,
          hotel_name: input.hotel_name || 'Khách sạn TRIPLA',
          hotel_slug: input.hotel_slug,
          room_id: input.room_id,
          room_name: input.room_name || 'Phòng tiêu chuẩn',
          unit_price: input.unit_price,
          quantity: qty,
          check_in: input.check_in,
          check_out: input.check_out,
          nights,
          line_total: qty * input.unit_price * nights,
          availableStock: limit
        });
      }
      this.items.set(currentList);
      this.cartSuccess.set(`Đã thêm "${input.room_name || 'phòng'}" vào giỏ đặt phòng.`);
      return of({ success: true, items: currentList });
    }

    return this.http
      .post<CartApiResponse>(
        `${this.apiBase}/cart`,
        {
          hotel_id: input.hotel_id,
          room_id: input.room_id,
          quantity: qty,
          check_in: input.check_in,
          check_out: input.check_out,
          session_key: this.getSessionKey()
        },
        { headers: this.headers() }
      )
      .pipe(
        tap((res) => {
          if (res?.success && Array.isArray(res.items)) {
            this.items.set(res.items);
            this.cartSuccess.set(`Đã thêm "${input.room_name || 'phòng'}" vào giỏ đặt phòng.`);
          } else if (res?.message) {
            this.cartError.set(res.message);
          }
        }),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            'Số lượng yêu cầu vượt quá số phòng còn trống cho ngày đã chọn.';
          this.cartError.set(msg);
          return of({
            success: false,
            errorCode: err?.error?.errorCode || 'EXCEEDS_AVAILABLE_STOCK',
            availableStock: err?.error?.availableStock,
            message: msg
          });
        })
      );
  }

  updateCartItem(itemId: string, quantity: number): Observable<CartApiResponse> {
    this.clearMessages();
    if (!this.http) {
      const currentList = [...this.items()];
      const idx = currentList.findIndex((it) => it.id === itemId);
      if (idx < 0) return of({ success: false, message: 'Không tìm thấy mục trong giỏ.' });
      if (quantity <= 0) {
        currentList.splice(idx, 1);
        this.items.set(currentList);
        return of({ success: true, items: currentList });
      }
      const stockLimit = Number(currentList[idx].availableStock ?? 5);
      if (quantity > stockLimit) {
        const msg = `Vượt quá số phòng còn trống (${stockLimit} phòng) cho ngày đã chọn.`;
        this.cartError.set(msg);
        return of({ success: false, errorCode: 'EXCEEDS_AVAILABLE_STOCK', availableStock: stockLimit, message: msg });
      }
      currentList[idx] = {
        ...currentList[idx],
        quantity,
        line_total: quantity * currentList[idx].unit_price * currentList[idx].nights
      };
      this.items.set(currentList);
      return of({ success: true, items: currentList });
    }

    return this.http
      .put<CartApiResponse>(
        `${this.apiBase}/cart/${encodeURIComponent(itemId)}`,
        { quantity },
        { headers: this.headers() }
      )
      .pipe(
        tap((res) => {
          if (res?.success && Array.isArray(res.items)) {
            this.items.set(res.items);
          } else if (res?.message) {
            this.cartError.set(res.message);
          }
        }),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            'Số lượng phòng vượt quá số lượng khả dụng trong khoảng ngày đã chọn.';
          this.cartError.set(msg);
          return of({
            success: false,
            errorCode: err?.error?.errorCode || 'EXCEEDS_AVAILABLE_STOCK',
            availableStock: err?.error?.availableStock,
            message: msg
          });
        })
      );
  }

  removeCartItem(itemId: string): Observable<CartApiResponse> {
    this.clearMessages();
    if (!this.http) {
      const next = this.items().filter((it) => it.id !== itemId);
      this.items.set(next);
      return of({ success: true, items: next });
    }

    return this.http
      .delete<CartApiResponse>(`${this.apiBase}/cart/${encodeURIComponent(itemId)}`, {
        headers: this.headers()
      })
      .pipe(
        tap((res) => {
          if (res?.success && Array.isArray(res.items)) {
            this.items.set(res.items);
          }
        }),
        catchError((err) => {
          const msg = err?.error?.message || 'Không xóa được phòng khỏi giỏ.';
          this.cartError.set(msg);
          return of({ success: false, message: msg });
        })
      );
  }

  checkoutCart(paymentMethod = 'e_wallet'): Observable<{ success: boolean; booking_code?: string; message?: string }> {
    this.clearMessages();
    if (!this.http) {
      const code = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
      this.items.set([]);
      return of({ success: true, booking_code: code });
    }
    return this.http
      .post<{ success: boolean; booking_code?: string; message?: string }>(
        `${this.apiBase}/cart/checkout`,
        { payment_method: paymentMethod },
        { headers: this.headers() }
      )
      .pipe(
        tap((res) => {
          if (res?.success) {
            this.items.set([]);
          } else if (res?.message) {
            this.cartError.set(res.message);
          }
        }),
        catchError((err) => {
          const msg = err?.error?.message || 'Không thể hoàn tất đặt phòng từ giỏ.';
          this.cartError.set(msg);
          return of({ success: false, message: msg });
        })
      );
  }
}

