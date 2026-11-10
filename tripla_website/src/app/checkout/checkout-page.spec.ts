import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, NavigationEnd } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Location } from '@angular/common';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, filter, take } from 'rxjs';
import { vi } from 'vitest';
import { CheckoutPage } from './pages/checkout-page/checkout-page';
import { CheckoutStateService } from './services/checkout-state.service';
import { HotelDetails } from '../hotel-search/pages/hotel-details/hotel-details';
import { HotelBookingInput } from './adapters/hotel-booking-draft';
import { demoHotels } from '../hotel-search/services/hotel-demo';
import { PriceBreakdown } from './components/shared/price-breakdown/price-breakdown';

const input = (): HotelBookingInput => ({
  hotel: demoHotels[0],
  room: demoHotels[0].rooms![0],
  source: 'demo',
  criteria: {
    service: 'hotel',
    location: 'Đà Lạt',
    checkIn: '2099-12-12',
    checkOut: '2099-12-15',
    adults: 2,
    children: 0,
    rooms: 1,
  },
});
const fill = (page: CheckoutPage) =>
  page.form.patchValue({
    contact: {
      fullName: 'Khách Mẫu',
      email: 'guest@example.test',
      callingCode: '+84',
      phone: '0912345678',
    },
    hotel: {
      firstName: 'Mẫu',
      lastName: 'Khách',
      nonSmoking: true,
      specialRequests: 'Tầng cao nếu có',
    },
  });
async function history(action: () => void) {
  const router = TestBed.inject(Router);
  router.setUpLocationChangeListener();
  const done = firstValueFrom(
    router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      take(1),
    ),
  );
  action();
  await done;
}
describe('Hotel checkout page', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideLocationMocks(),
        provideRouter([
          { path: 'checkout/:bookingType', component: CheckoutPage },
          { path: 'hotels/:id', component: HotelDetails },
          { path: 'trip-shop', component: HotelDetails },
        ]),
      ],
    }),
  );
  afterEach(() => vi.restoreAllMocks());
  it('creates a draft from a complete room selection and navigates with only its id', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(
      '/hotels/demo-pine?demo=true&location=da%20lat&checkIn=2099-12-12&checkOut=2099-12-15&adults=2&children=0&rooms=1',
    );
    const button = harness.routeNativeElement!.querySelector(
      '.room-price button',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const router = TestBed.inject(Router);
    expect(router.url).toContain('/checkout/hotel?draft=');
    expect(Object.keys(router.parseUrl(router.url).queryParams)).toEqual(['draft']);
    expect(harness.routeNativeElement!.querySelector('app-hotel-booking-form')).not.toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Nhà Bên Rừng');
    expect(harness.routeNativeElement!.textContent).toContain('Phòng Tiêu chuẩn');
  });
  it('does not show validation prematurely and blocks invalid Continue without leaving checkout', async () => {
    const store = TestBed.inject(CheckoutStateService),
      draft = store.startHotel(input()),
      harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/checkout/hotel?draft=' + draft.id, CheckoutPage);
    expect(harness.routeNativeElement!.querySelectorAll('.field-error')).toHaveLength(0);
    (harness.routeNativeElement!.querySelector('.continue') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(page.form.invalid).toBe(true);
    expect(harness.routeNativeElement!.querySelectorAll('.field-error').length).toBeGreaterThan(0);
    expect(TestBed.inject(Router).url).toContain('/checkout/hotel?draft=');
    expect(page.draft()!.status).toBe('editing');
    expect(page.notice()).toBe('');
  });
  it('persists valid input through Back/Forward and Continue never enters payment', async () => {
    const store = TestBed.inject(CheckoutStateService),
      draft = store.startHotel(input()),
      harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/checkout/hotel?draft=' + draft.id, CheckoutPage);
    fill(page);
    harness.detectChanges();
    const email = harness.routeNativeElement!.querySelector('#checkout-email') as HTMLInputElement;
    expect(email.value).toBe('guest@example.test');
    page.proceed();
    harness.detectChanges();
    expect(page.draft()!.status).toBe('details-complete');
    expect(page.notice()).toContain('Chưa tạo đặt phòng');
    expect(TestBed.inject(Router).url).not.toContain('payment');
    expect(harness.routeNativeElement!.querySelector('[aria-current=step]')!.textContent).toContain(
      'Thông tin đặt chỗ',
    );
    page.back();
    await harness.fixture.whenStable();
    await history(() => TestBed.inject(Location).back());
    await harness.fixture.whenStable();
    harness.detectChanges();
    const restored = harness.routeDebugElement!.componentInstance as CheckoutPage;
    expect(restored.form.controls.hotel.controls.nonSmoking.value).toBe(true);
    expect(restored.form.controls.hotel.controls.specialRequests.value).toBe('Tầng cao nếu có');
    expect(restored.form.controls.contact.controls.email.value).toBe('guest@example.test');
    await history(() => TestBed.inject(Location).forward());
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('/hotels/demo-pine');
  });
  it('handles missing, unknown and future service routes without rendering a wrong form', async () => {
    const harness = await RouterTestingHarness.create();
    for (const path of [
      '/checkout/hotel',
      '/checkout/invalid',
      '/checkout/flight',
      '/checkout/activity',
      '/checkout/bus',
    ]) {
      await harness.navigateByUrl(path);
      expect(harness.routeNativeElement!.querySelector('app-hotel-booking-form')).toBeNull();
      expect(harness.routeNativeElement!.querySelector('.recovery')).not.toBeNull();
    }
    await harness.navigateByUrl('/checkout/hotel?draft=unknown');
    expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy bản nháp');
  });
  it('blocks expired drafts at Continue and preserves the no-booking state', async () => {
    const store = TestBed.inject(CheckoutStateService),
      draft = store.startHotel(input()),
      harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/checkout/hotel?draft=' + draft.id, CheckoutPage);
    fill(page);
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(draft.expiresAt) + 1);
    page.proceed();
    harness.detectChanges();
    expect(page.draft()).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Bản nháp đã hết hạn');
    expect(harness.routeNativeElement!.querySelector('form')).toBeNull();
  });
});
describe('Checkout pricing UI', () => {
  it('labels estimates and unknown fees without a final payable total', () => {
    const fixture = TestBed.createComponent(PriceBreakdown);
    fixture.componentRef.setInput('pricing', {
      status: 'estimate',
      currency: 'VND',
      lines: [{ kind: 'base', label: 'Tiền phòng', amount: 1000000 }],
      missingItems: ['Thuế', 'Phí dịch vụ'],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tạm tính');
    expect(fixture.nativeElement.textContent).toContain('Chưa xác nhận');
    expect(fixture.nativeElement.textContent).not.toContain('Tổng theo báo giá');
    fixture.componentRef.setInput('pricing', { status: 'unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chưa có dữ liệu giá hợp lệ');
  });
  it('does not display an expired or inconsistent verified total', () => {
    const fixture = TestBed.createComponent(PriceBreakdown);
    fixture.componentRef.setInput('pricing', {
      status: 'verified',
      currency: 'VND',
      quoteId: 'quote-test',
      validUntil: '2000-01-01T00:00:00Z',
      total: 100,
      lines: [{ kind: 'base', label: 'Giá', amount: 100 }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.total')).toBeNull();
  });
});
