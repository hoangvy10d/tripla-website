import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { createContactForm, createHotelGuestForm } from '../../forms/hotel-checkout.form';
import {
  createFlightForm,
  createActivityForm,
  createBusForm,
} from '../../forms/service-checkout.forms';
import { CheckoutProblem, CheckoutValues } from '../../models/checkout.model';
import { BookingDraft } from '../../models/booking-draft.model';
import { CheckoutStepper } from '../../components/shared/checkout-stepper/checkout-stepper';
import { CheckoutContactForm } from '../../components/shared/checkout-contact-form/checkout-contact-form';
import { HotelBookingForm } from '../../components/hotel-booking-form/hotel-booking-form';
import { FlightPassengerForm } from '../../components/flight-passenger-form/flight-passenger-form';
import { ActivityBookingForm } from '../../components/activity-booking-form/activity-booking-form';
import { BusPassengerForm } from '../../components/bus-passenger-form/bus-passenger-form';
import { BookingSummary } from '../../components/shared/booking-summary/booking-summary';
import { PriceBreakdown } from '../../components/shared/price-breakdown/price-breakdown';
import { CheckoutActions } from '../../components/shared/checkout-actions/checkout-actions';
import { SavedTrips } from '../../../services/saved-trips';
import { AuthService } from '../../../services/auth-service';
import { BookingCartService } from '../../../services/booking-cart.service';
import { SiteHeaderComponent } from '../../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';
@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CheckoutStepper,
    CheckoutContactForm,
    HotelBookingForm,
    FlightPassengerForm,
    ActivityBookingForm,
    BusPassengerForm,
    BookingSummary,
    PriceBreakdown,
    CheckoutActions,
    SiteHeaderComponent,
    SiteFooterComponent,
  ],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  readonly store = inject(CheckoutStateService);
  readonly tripStore = inject(SavedTrips);
  private readonly http = inject(HttpClient, { optional: true });
  readonly isMongoConnected = signal(!!this.http);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly routeType = signal('');
  private readonly draftId = signal<string | null>(null);
  private readonly authService = inject(AuthService);
  readonly cart = inject(BookingCartService);
  readonly fromCartMode = signal(false);
  readonly cartPlanId = signal<string | null>(null);
  readonly paymentMethod = signal<'bank_transfer' | 'e_wallet' | 'credit_card'>('e_wallet');
  readonly pendingBooking = signal<any | null>(null);
  readonly paymentVoucher = signal<{ booking: any; payment: any } | null>(null);
  readonly paymentError = signal('');
  readonly paymentSubmitting = signal(false);
  readonly submitted = signal(false);
  readonly notice = signal('');
  readonly bookingCode = signal('');
  readonly form = new FormGroup({
    contact: createContactForm(),
    hotel: createHotelGuestForm(),
    flight: createFlightForm(),
    activity: createActivityForm(),
    bus: createBusForm(),
  });
  readonly resolution = computed(() => this.store.resolve(this.routeType(), this.draftId()));
  readonly draft = computed(() => {
    const result = this.resolution();
    return result.ok ? result.draft : null;
  });
  readonly problem = computed(() => {
    const result = this.resolution();
    return result.ok ? null : result.problem;
  });
  readonly recoveryMessage = computed(() => {
    const messages: Record<CheckoutProblem, string> = {
      'unknown-type': 'Loại dịch vụ không được hỗ trợ.',
      missing:
        'Không tìm thấy bản nháp trong phiên này. Nếu vừa tải lại trang, hãy chọn lại dịch vụ để bắt đầu.',
      'type-mismatch': 'Bản nháp không thuộc dịch vụ đang mở.',
      expired: 'Bản nháp đã hết hạn. Vui lòng chọn lại dịch vụ và xác nhận điều kiện đặt chỗ.',
      'invalid-selection':
        'Lựa chọn đặt chỗ chưa hợp lệ. Vui lòng kiểm tra lại sản phẩm, ngày và số lượng.',
      'not-implemented': 'Chưa thể mở thông tin đặt chỗ cho lựa chọn này.',
    };
    return this.problem() ? messages[this.problem()!] : '';
  });
  readonly recoveryTab = computed(
    () =>
      ({ hotel: 'hotel', flight: 'flight', activity: 'tour', bus: 'bus' })[this.routeType()] ||
      'hotel',
  );
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        this.routeType.set(params.get('bookingType') || '');
        this.draftId.set(query.get('draft'));
        const isFromCart = query.get('fromCart') === 'true';
        this.fromCartMode.set(isFromCart);
        this.cartPlanId.set(query.get('planId'));
        this.pendingBooking.set(null);
        this.paymentVoucher.set(null);
        this.paymentError.set('');
        this.submitted.set(false);
        this.notice.set('');
        const draft = this.draft();
        if (draft) {
          this.load(draft);
        } else if (isFromCart) {
          this.form.reset(undefined, { emitEvent: false });
          this.form.setControl('hotel', createHotelGuestForm(undefined), { emitEvent: false });
          for (const key of ['flight', 'activity', 'bus'] as const)
            this.form.controls[key].disable({ emitEvent: false });
          const user = this.authService.currentUser() as any;
          if (user) {
            this.form.controls.contact.patchValue(
              {
                fullName: user.fullName || user.full_name || '',
                phone: user.phone_number || '',
                email: user.email || '',
              },
              { emitEvent: false },
            );
          }
          if (this.http) {
            this.cart.getCart().subscribe();
          }
        } else {
          this.form.reset(undefined, { emitEvent: false });
          for (const key of ['hotel', 'flight', 'activity', 'bus'] as const)
            this.form.controls[key].disable({ emitEvent: false });
        }
      });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.notice.set('');
      this.paymentError.set('');
      const draft = this.draft();
      if (draft) this.store.saveForm(draft.id, this.values(draft));
    });
  }

  formatVnd(amount: number | null | undefined): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount || 0)))}₫`;
  }

  selectPaymentMethod(method: 'bank_transfer' | 'e_wallet' | 'credit_card'): void {
    this.paymentMethod.set(method);
    this.paymentError.set('');
  }

  private checkoutHeaders(): Record<string, string> {
    return {
      ...this.authService.getAuthHeaders(),
      'x-cart-session': this.cart.getSessionKey(),
    };
  }

  private proceedFromCart(): void {
    if (this.form.controls.contact.invalid) {
      this.notice.set('Vui lòng kiểm tra và điền đầy đủ thông tin liên hệ hợp lệ.');
      return;
    }
    this.authService.requireAuth(() => {
      if (!this.http) {
        const code = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
        this.pendingBooking.set({
          _id: code,
          booking_code: code,
          total_price: this.cart.grandTotal(),
          booking_status: 'pending',
          items: this.cart.items(),
        });
        this.notice.set(`Đã tạo đơn giữ chỗ #${code}. Vui lòng chọn phương thức thanh toán bên dưới.`);
        return;
      }

      const contact = this.form.controls.contact.getRawValue();
      const hotelExtras = this.form.controls.hotel.getRawValue();
      this.paymentSubmitting.set(true);
      this.paymentError.set('');
      this.notice.set('Đang tạo đơn đặt phòng từ giỏ hàng...');

      this.http
        .post<{ success?: boolean; booking?: any; booking_code?: string; message?: string }>(
          'http://localhost:3000/api/v1/bookings',
          {
            fromCart: true,
            awaitPayment: true,
            customerName: contact.fullName,
            customerPhone: contact.phone,
            customerEmail: contact.email,
            nonSmoking: hotelExtras.nonSmoking,
            specialRequests: hotelExtras.specialRequests,
            sessionKey: this.cart.getSessionKey(),
          },
          { headers: this.checkoutHeaders() },
        )
        .subscribe({
          next: (res) => {
            this.paymentSubmitting.set(false);
            if (res?.booking) {
              const code = res.booking.booking_code || res.booking_code || '';
              this.pendingBooking.set(res.booking);
              this.bookingCode.set(code);
              this.notice.set(`Đã tạo đơn #${code} (chờ thanh toán). Chọn phương thức để hoàn tất.`);
            }
          },
          error: (err) => {
            this.paymentSubmitting.set(false);
            const msg = err?.error?.message || 'Không thể tạo đơn đặt phòng từ giỏ hàng.';
            this.paymentError.set(msg);
            this.notice.set(msg);
          },
        });
    }, 'Vui lòng đăng nhập tài khoản Du khách để thanh toán đơn đặt phòng.');
  }

  simulatePayment(simulateResult: 'success' | 'failed'): void {
    const booking = this.pendingBooking();
    if (!booking) return;
    this.paymentError.set('');

    this.authService.requireAuth(() => {
      if (!this.http) {
        if (simulateResult === 'failed') {
          this.paymentError.set('Thanh toán thất bại (mô phỏng). Giỏ hàng vẫn được giữ nguyên để bạn thử lại.');
          return;
        }
        const txnId = `TXN-${booking.booking_code}-${Date.now().toString().slice(-5)}`;
        this.cart.items.set([]);
        this.paymentVoucher.set({
          booking: { ...booking, booking_status: 'confirmed' },
          payment: {
            payment_method: this.paymentMethod(),
            payment_status: 'completed',
            transaction_id: txnId,
            paid_at: new Date().toISOString(),
            amount: booking.total_price || 0,
          },
        });
        this.pendingBooking.set(null);
        return;
      }

      this.paymentSubmitting.set(true);
      this.http
        .post<any>(
          'http://localhost:3000/api/v1/payments',
          {
            booking_id: booking._id || booking.booking_code,
            payment_method: this.paymentMethod(),
            simulateResult,
            sessionKey: this.cart.getSessionKey(),
          },
          { headers: this.checkoutHeaders() },
        )
        .subscribe({
          next: (res) => {
            this.paymentSubmitting.set(false);
            if (res?.success && res.booking && res.payment) {
              this.cart.items.set([]);
              this.paymentVoucher.set({ booking: res.booking, payment: res.payment });
              this.pendingBooking.set(null);
              const code = res.booking.booking_code || res.booking.bookingCode || '';
              this.bookingCode.set(code);
              this.notice.set(`Thanh toán thành công! Mã đặt phòng E-Voucher: ${code}`);
              const planId = this.cartPlanId();
              if (planId) {
                this.http
                  ?.post(
                    'http://localhost:3000/api/v1/trips',
                    { plan_id: planId, trip_status: 'upcoming' },
                    { headers: this.authService.getAuthHeaders() },
                  )
                  .subscribe({ error: () => {} });
              }
            }
          },
          error: (err) => {
            this.paymentSubmitting.set(false);
            const msg =
              err?.error?.message ||
              'Thanh toán thất bại từ cổng mô phỏng. Đơn vẫn chờ thanh toán và giỏ hàng được giữ nguyên.';
            this.paymentError.set(msg);
          },
        });
    }, 'Vui lòng đăng nhập để thực hiện thanh toán.');
  }
  private load(d: BookingDraft): void {
    this.form.controls.contact.reset(d.form.contact, { emitEvent: false });
    this.form.setControl(
      'hotel',
      createHotelGuestForm(d.type === 'hotel' ? d.form.hotel : undefined),
      { emitEvent: false },
    );
    this.form.setControl(
      'flight',
      createFlightForm(
        d.type === 'flight' ? d.selection : undefined,
        d.type === 'flight' ? d.form.flight : undefined,
      ),
      { emitEvent: false },
    );
    this.form.setControl(
      'activity',
      createActivityForm(
        d.type === 'activity' ? d.selection : undefined,
        d.type === 'activity' ? d.form.activity : undefined,
      ),
      { emitEvent: false },
    );
    this.form.setControl(
      'bus',
      createBusForm(
        d.type === 'bus' ? d.selection : undefined,
        d.type === 'bus' ? d.form.bus : undefined,
      ),
      { emitEvent: false },
    );
    for (const key of ['hotel', 'flight', 'activity', 'bus'] as const)
      if (key !== d.type) this.form.controls[key].disable({ emitEvent: false });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
  private values(d: BookingDraft): CheckoutValues {
    const v = this.form.getRawValue();
    switch (d.type) {
      case 'hotel':
        return { contact: v.contact, hotel: v.hotel };
      case 'flight':
        return { contact: v.contact, flight: v.flight };
      case 'activity':
        return { contact: v.contact, activity: v.activity };
      case 'bus':
        return { contact: v.contact, bus: v.bus };
    }
  }
  proceed(): void {
    this.store.refreshTime();
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.fromCartMode()) {
      this.proceedFromCart();
      return;
    }
    const draft = this.draft();
    if (!draft) return;
    this.store.saveForm(draft.id, this.values(draft));
    if (this.form.invalid) {
      (
        this.element.nativeElement.querySelector<HTMLElement>(
          'input.ng-invalid,select.ng-invalid,textarea.ng-invalid',
        ) || this.element.nativeElement.querySelector<HTMLElement>('#checkout-phone')
      )?.focus();
      return;
    }
    if (this.store.completeDetails(draft.id)) {
      const code = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;

      let title = 'Đặt chỗ TRIPLA VIP';
      let location = 'Việt Nam';
      let hotelId: string | null = null;
      let roomId: string | null = null;
      let activityId: string | null = null;
      let checkInDate: string | undefined;
      let checkOutDate: string | undefined;
      let guests = 2;
      let placeKey = '';

      if (draft.type === 'hotel') {
        const sel = draft.selection;
        title = `${sel.hotelName} • ${sel.roomName}`;
        location = sel.address || 'Việt Nam';
        hotelId = sel.hotelId;
        roomId = sel.roomId;
        checkInDate = sel.criteria?.checkIn;
        checkOutDate = sel.criteria?.checkOut;
        guests = (sel.criteria?.adults || 2) + (sel.criteria?.children || 0);
        placeKey = `hotel:${sel.hotelId}`;
      } else if (draft.type === 'activity') {
        const sel = draft.selection;
        title = `${sel.activityName} • ${sel.ticketName || 'Vé tham quan'}`;
        location = sel.visitDate ? `Ngày sử dụng: ${sel.visitDate}` : 'Việt Nam';
        activityId = sel.activityId;
        checkInDate = sel.visitDate;
        guests = sel.quantity || 1;
        placeKey = `activity:${sel.activityId}`;
      } else if (draft.type === 'bus') {
        const sel = draft.selection;
        title = `Vé xe: ${sel.operator || 'Nhà xe Tripla'} (${sel.seats?.map((s) => s.label).join(', ') || 'Ghế tiêu chuẩn'})`;
        location = `${sel.from || 'Xuất phát'} → ${sel.to || 'Đến nơi'}`;
        checkInDate = sel.departureAt?.slice(0, 10);
        guests = sel.passengers || 1;
        placeKey = `bus:${sel.journeyId || 'bus'}`;
      } else if (draft.type === 'flight') {
        const sel = draft.selection;
        title = `Vé máy bay ${sel.airline || 'Hàng không'} (${sel.from} → ${sel.to})`;
        location = `${sel.from} → ${sel.to} · Hạng ${sel.cabin || 'Phổ thông'}`;
        checkInDate = sel.departureAt?.slice(0, 10);
        checkOutDate = sel.criteria?.returnDate || undefined;
        guests = (sel.adults || 1) + (sel.children || 0);
        placeKey = `flight:${sel.from}-${sel.to}:${sel.airline}:${code}`;
      }

      const contact = (draft.form as any)?.contact || {};
      const pricingAny = draft.pricing as any;
      const computedLinesTotal = Array.isArray(pricingAny?.lines)
        ? pricingAny.lines.reduce((sum: number, l: any) => sum + (l.kind === 'discount' ? -Number(l.amount || 0) : Number(l.amount || 0)), 0)
        : 0;
      const totalPrice = Number(pricingAny?.total) || computedLinesTotal || 2500000;
      const activeUserCode =
        (typeof window !== 'undefined' && window.localStorage?.getItem('tripla_active_profile')) || 'u1';

      const bookingPayload = {
        user_id: activeUserCode,
        bookingCode: code,
        bookingType: draft.type,
        title,
        location,
        customerName: contact.fullName || 'Thành viên TRIPLA',
        customerPhone: contact.phone || '0909123456',
        customerEmail: contact.email || 'customer@tripla.vn',
        check_in: checkInDate,
        check_out: checkOutDate,
        guests,
        total_price: totalPrice,
        totalPriceVnd: totalPrice,
        hotel_id: hotelId,
        room_id: roomId,
        location_id: activityId,
        status: 'CONFIRMED',
        booking_status: 'confirmed',
        details: {
          type: draft.type,
          pricing: draft.pricing,
          selection: (draft as any).selection
        }
      };

      const pinPlaceToTrip = () => {
        if (!placeKey) return;
        if (!this.tripStore.trips().length) {
          this.tripStore.create('Hành trình của tôi');
        }
        const targetTrip = this.tripStore.trips()[0];
        if (targetTrip && !targetTrip.places.includes(placeKey as any)) {
          this.tripStore.toggle(targetTrip.id, placeKey as any);
        }
      };

      if (draft.source !== 'demo' && this.http) {
        this.notice.set('Đang gửi yêu cầu đặt chỗ lên hệ thống...');
        this.http
          .post<{ success?: boolean; booking?: { booking_code?: string; bookingCode?: string } }>(
            'http://localhost:3000/api/v1/bookings',
            bookingPayload,
          )
          .subscribe({
            next: (res) => {
              const confirmedCode = res?.booking?.booking_code || res?.booking?.bookingCode || code;
              this.bookingCode.set(confirmedCode);
              pinPlaceToTrip();
              this.notice.set(
                `Đặt lịch & thanh toán thành công! Mã đơn: ${confirmedCode}. Đã lưu vào MongoDB tripla_db và tự động ghim vào Kế hoạch Chuyến đi của bạn.`,
              );
            },
            error: (err) => {
              const reason = err?.error?.message || err?.message || 'Không thể kết nối máy chủ đặt chỗ.';
              this.notice.set(`Đặt chỗ chưa thành công: ${reason} Vui lòng kiểm tra backend và thử lại.`);
            },
          });
      } else {
        this.notice.set(
          'Thông tin hợp lệ đã được lưu trong phiên này. Chưa tạo đặt phòng, đặt vé, giữ chỗ hoặc thực hiện thanh toán. Thanh toán chưa được triển khai.',
        );
      }
    }
  }
  back(): void {
    const d = this.draft();
    if (!d) return;
    const path =
      d.type === 'hotel'
        ? ['/hotels', d.selection.hotelId]
        : d.type === 'activity'
          ? ['/activities', d.selection.activityId]
          : d.type === 'bus'
            ? ['/buses', d.selection.journeyId]
            : ['/flight-search-results'];
    void this.router.navigate(path, { queryParams: d.returnQuery });
  }
}
