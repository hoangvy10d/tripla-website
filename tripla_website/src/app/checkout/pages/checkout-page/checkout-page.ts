import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  ],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  readonly store = inject(CheckoutStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly routeType = signal('');
  private readonly draftId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly notice = signal('');
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
        this.submitted.set(false);
        this.notice.set('');
        const draft = this.draft();
        if (draft) this.load(draft);
        else {
          this.form.reset(undefined, { emitEvent: false });
          for (const key of ['hotel', 'flight', 'activity', 'bus'] as const)
            this.form.controls[key].disable({ emitEvent: false });
        }
      });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.notice.set('');
      const draft = this.draft();
      if (draft) this.store.saveForm(draft.id, this.values(draft));
    });
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
    if (this.store.completeDetails(draft.id))
      this.notice.set(
        'Thông tin hợp lệ đã được lưu trong phiên này. Chưa tạo đặt phòng, đặt vé, giữ chỗ hoặc thực hiện thanh toán. Thanh toán chưa được triển khai.',
      );
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
