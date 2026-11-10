import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, NavigationEnd } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Location } from '@angular/common';
import { firstValueFrom, filter, take } from 'rxjs';
import { vi } from 'vitest';
import { CheckoutPage } from './pages/checkout-page/checkout-page';
import { CheckoutStateService } from './services/checkout-state.service';
import {
  createFlightForm,
  createActivityForm,
  createBusForm,
} from './forms/service-checkout.forms';
import { demoFlightData } from '../flight-search/services/flight-demo';
import {
  airports,
  FlightSearchCriteria,
} from '../flight-search/models/flight-search-criteria.model';
import { ActivitySearchService } from '../activity-search/services/activity-search';
import { ActivityDetailsPage } from '../activity-search/pages/activity-details/activity-details';
import { BusSearchService } from '../bus-search/services/bus-search';
import { BusSearchState } from '../bus-search/models/bus-search.model';
import { BusDetailsPage } from '../bus-search/pages/bus-details/bus-details';
import { FlightSearchResults } from '../flight-search/pages/flight-search-results/flight-search-results';
import {
  FlightBookingDraft,
  ActivityBookingDraft,
  BusBookingDraft,
} from './models/booking-draft.model';
const contact = {
  fullName: 'Khách Kiểm Thử',
  email: 'guest@example.test',
  callingCode: '+84',
  phone: '0912345678',
};
const criteria: FlightSearchCriteria = {
  service: 'flight',
  tripType: 'round-trip',
  from: airports[0],
  to: airports[1],
  departureDate: '2099-12-12',
  returnDate: '2099-12-15',
  adults: 2,
  children: 1,
  infants: 1,
  cabin: 'Phổ thông',
};
const busState: BusSearchState = {
  criteria: {
    from: 'Hồ Chí Minh',
    to: 'Đà Lạt',
    departureDate: '2099-12-12',
    returnDate: null,
    adults: 2,
    infants: 1,
  },
  filters: { operators: [], departureBands: [] },
  leg: 'outbound',
};
async function drafts() {
  const store = TestBed.inject(CheckoutStateService),
    data = demoFlightData(criteria);
  const flight = store.startFlight({
    criteria,
    outbound: data.outbound[0],
    inbound: data.inbound[0],
    fares: { outbound: data.outbound[0].fares![0], inbound: data.inbound[0].fares![0] },
    source: 'demo',
  });
  const activity = await firstValueFrom(
    TestBed.inject(ActivitySearchService).getDetails('demo-dalat-garden'),
  );
  activity!.tickets[0].requiresParticipants = true;
  const act = store.startActivity({
    activity: activity!,
    ticket: activity!.tickets[0],
    visitDate: '2099-12-12',
    quantity: 2,
    source: 'demo',
  });
  const busData = await firstValueFrom(TestBed.inject(BusSearchService).search(busState));
  const details = await firstValueFrom(
    TestBed.inject(BusSearchService).details(busData[0].id, busState),
  );
  const bus = store.startBus({
    details: details!,
    state: busState,
    seats: details!.seats.filter((seat) => seat.available).slice(0, 2),
    source: 'demo',
  });
  return { flight, activity: act, bus };
}
describe('All-service checkout', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideLocationMocks(),
        provideRouter([
          { path: 'checkout/:bookingType', component: CheckoutPage },
          { path: 'activities/:id', component: ActivityDetailsPage },
          { path: 'buses/:id', component: BusDetailsPage },
          { path: 'flight-search-results', component: FlightSearchResults },
        ]),
      ],
    }),
  );
  afterEach(() => vi.restoreAllMocks());
  for (const type of ['flight', 'activity', 'bus'] as const)
    it(`renders, validates, saves and restores ${type} independently`, async () => {
      const all = await drafts(),
        draft = all[type],
        harness = await RouterTestingHarness.create();
      const page = await harness.navigateByUrl(`/checkout/${type}?draft=${draft.id}`, CheckoutPage);
      const selector =
        type === 'flight'
          ? 'app-flight-passenger-form'
          : type === 'activity'
            ? 'app-activity-booking-form'
            : 'app-bus-passenger-form';
      expect(harness.routeNativeElement!.querySelector(selector)).not.toBeNull();
      expect(harness.routeNativeElement!.querySelector('app-hotel-booking-form')).toBeNull();
      expect(harness.routeNativeElement!.querySelectorAll('.field-error')).toHaveLength(0);
      page.form.controls.contact.setValue(contact);
      page.proceed();
      harness.detectChanges();
      expect(page.form.invalid).toBe(true);
      if (type === 'flight') {
        expect(page.form.controls.flight.controls.passengers.length).toBe(4);
        page.form.controls.flight.controls.passengers.controls.forEach((p, i) =>
          p.patchValue({ firstName: 'Tên ' + i, lastName: 'Họ' }),
        );
        expect(harness.routeNativeElement!.textContent).toContain('Vietnam Airlines');
      }
      if (type === 'activity') {
        expect(page.form.controls.activity.controls.participants.length).toBe(2);
        page.form.controls.activity.controls.participants.controls.forEach((p, i) =>
          p.patchValue({ fullName: 'Khách ' + i }),
        );
        page.form.controls.activity.controls.purchaserAttending.setValue(false);
        expect(harness.routeNativeElement!.textContent).toContain('Vườn hoa Đà Lạt');
      }
      if (type === 'bus') {
        expect(page.form.controls.bus.controls.passengers.length).toBe(2);
        page.form.controls.bus.controls.passengers.controls.forEach((p, i) =>
          p.patchValue({ fullName: 'Khách ' + i }),
        );
        expect(harness.routeNativeElement!.textContent).toContain('Bình Minh Tải');
      }
      page.proceed();
      harness.detectChanges();
      expect(page.form.valid).toBe(true);
      expect(page.draft()!.status).toBe('details-complete');
      expect(page.notice()).toContain('Thanh toán chưa được triển khai');
      const router = TestBed.inject(Router);
      expect(router.url).toBe(`/checkout/${type}?draft=${draft.id}`);
      expect(Object.keys(router.parseUrl(router.url).queryParams)).toEqual(['draft']);
      const before = structuredClone(page.form.getRawValue());
      await harness.navigateByUrl(`/checkout/${type}?draft=missing`);
      const done = firstValueFrom(
        router.events.pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1),
        ),
      );
      router.setUpLocationChangeListener();
      TestBed.inject(Location).back();
      await done;
      await harness.fixture.whenStable();
      expect(
        (harness.routeDebugElement!.componentInstance as CheckoutPage).form.getRawValue(),
      ).toEqual(before);
      const forward = firstValueFrom(
        router.events.pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1),
        ),
      );
      TestBed.inject(Location).forward();
      await forward;
      await harness.fixture.whenStable();
      expect((harness.routeDebugElement!.componentInstance as CheckoutPage).draft()).toBeNull();
      const other = all[type === 'flight' ? 'activity' : 'flight'];
      const untouched = TestBed.inject(CheckoutStateService).resolve(other.type, other.id);
      if (untouched.ok) expect(untouched.draft.form.contact.fullName).toBe('');
    });
  it('validates ordering, conditional birth dates and nationality without requiring passports', async () => {
    const { flight } = await drafts();
    const form = createFlightForm({
      ...flight.selection,
      requirements: { dateOfBirth: true, nationality: true },
    });
    form.controls.passengers.controls.forEach((p) =>
      p.patchValue({
        firstName: 'Tên',
        lastName: 'Họ',
        dateOfBirth: '2099-01-01',
        nationality: 'Việt Nam',
      }),
    );
    expect(form.invalid).toBe(true);
    form.controls.passengers.controls.forEach((p) => p.controls.dateOfBirth.setValue('2020-01-01'));
    expect(form.valid).toBe(true);
    form.controls.passengers.removeAt(0);
    expect(form.hasError('passengerCount')).toBe(true);
  });
  it('does not require attendee names when the ticket does not request them', async () => {
    const { activity } = await drafts();
    const form = createActivityForm({ ...activity.selection, requiresParticipants: false });
    expect(form.valid).toBe(true);
    expect(form.controls.participants.length).toBe(0);
  });
  it('rejects seat reassignment and missing source selections', async () => {
    const { bus } = await drafts(),
      form = createBusForm(bus.selection);
    form.controls.passengers.controls.forEach((p) => p.controls.fullName.setValue('Hành khách'));
    expect(form.valid).toBe(true);
    form.controls.passengers.at(0).controls.seatId.setValue('foreign-seat');
    expect(form.hasError('seatAssignment')).toBe(true);
    const data = demoFlightData(criteria);
    expect(() =>
      TestBed.inject(CheckoutStateService).startFlight({
        criteria,
        outbound: data.outbound[0],
        fares: { outbound: data.outbound[0].fares![0] },
        source: 'demo',
      }),
    ).toThrow();
  });
  it('connects an actual selected activity ticket and quantity to checkout', async () => {
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/activities/demo-dalat-garden', ActivityDetailsPage);
    page.selectedTicket.set(page.activity()!.tickets[0]);
    page.ticketQuantity = 3;
    page.startCheckout();
    await harness.fixture.whenStable();
    const checkout = harness.routeDebugElement!.componentInstance as CheckoutPage;
    const d = checkout.draft();
    expect(d?.type).toBe('activity');
    if (d?.type === 'activity') {
      expect(d.selection.quantity).toBe(3);
      expect(d.selection.ticketId).toBe(page.activity()!.tickets[0].id);
    }
  });
  it('connects actual bus seats to checkout without reserving them', async () => {
    const harness = await RouterTestingHarness.create(),
      query = new URLSearchParams({
        from: 'Hồ Chí Minh',
        to: 'Đà Lạt',
        departureDate: '2099-12-12',
        adults: '2',
        infants: '1',
        leg: 'outbound',
      }).toString();
    const page = await harness.navigateByUrl(
      '/buses/demo-outbound-2099-12-12-0?' + query,
      BusDetailsPage,
    );
    const seats = page
      .details()!
      .seats.filter((s) => s.available)
      .slice(0, 2);
    seats.forEach((s) => page.toggle(s));
    page.startCheckout();
    await harness.fixture.whenStable();
    const d = (harness.routeDebugElement!.componentInstance as CheckoutPage).draft();
    expect(d?.type).toBe('bus');
    if (d?.type === 'bus') expect(d.selection.seatIds).toEqual(seats.map((s) => s.id));
  });
});
