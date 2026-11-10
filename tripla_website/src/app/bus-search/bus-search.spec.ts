import { TestBed } from '@angular/core/testing';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { TripShopComponent } from '../pages/trip-shop/trip-shop';
import { BusSearchResults } from './pages/bus-search-results/bus-search-results';
import { BusDetailsPage } from './pages/bus-details/bus-details';
import { BusSearchService, filterBusTrips } from './services/bus-search';
import {
  BusSearchState,
  busSearchParams,
  readBusSearch,
  validateBusCriteria,
} from './models/bus-search.model';
const state: BusSearchState = {
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
const url = (s = state) =>
  '/bus-search?' +
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(busSearchParams(s))
        .filter(([, v]) => v !== null)
        .map(([key, value]) => [key, String(value)]),
    ),
  ).toString();
describe('Bus search', () => {
  it('opens trip details and limits seat selection to the adult count', async () => {
    const harness=await RouterTestingHarness.create();
    await harness.navigateByUrl(url());
    (harness.routeNativeElement!.querySelector('.fare button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();harness.detectChanges();
    const page=harness.routeDebugElement!.componentInstance as BusDetailsPage;
    expect(page.details()!.trip.operatorName).toBe('Bình Minh Tải');
    expect(page.state()!.criteria).toEqual(state.criteria);
    const seats=page.details()!.seats;
    page.toggle(seats[3]);expect(page.selected()).toHaveLength(0);
    page.toggle(seats[0]);page.toggle(seats[1]);
    expect(page.canContinue()).toBe(true);expect(page.total()).toBe(660000);
    page.toggle(seats[2]);expect(page.selected()).toHaveLength(2);expect(page.error()).toBeTruthy();
    page.continue();expect(page.continued()).toBe(true);
    page.toggle(seats[0]);expect(page.continued()).toBe(false);expect(page.canContinue()).toBe(false);
    (harness.routeNativeElement!.querySelector('main > a.back') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();expect(TestBed.inject(Router).url).toContain('/bus-search?');
  });
  it('loads direct links and handles an unknown trip safely', async () => {
    const harness=await RouterTestingHarness.create();
    const params=url().split('?')[1];
    const page=await harness.navigateByUrl('/buses/demo-outbound-2099-12-12-0?'+params,BusDetailsPage);
    expect(page.details()).not.toBeNull();page.activeDeck.set(2);expect(page.seats().every(seat=>seat.deck===2)).toBe(true);
    await harness.navigateByUrl('/buses/missing?'+params);expect(page.details()).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Chưa có thông tin chuyến xe');
  });
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'trip-shop', component: TripShopComponent },
          { path: 'bus-search', component: BusSearchResults },
          { path: 'buses/:id', component: BusDetailsPage },
        ]),
      ],
    });
    TestBed.overrideComponent(TripShopComponent, { set: { template: '', imports: [] } });
  });
  it('navigates from the bus form with all passengers and dates', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    home.selectBookingTab('bus');
    home.busFrom = state.criteria.from;
    home.busTo = state.criteria.to;
    home.busDeparture = state.criteria.departureDate;
    home.busAdults = 2;
    home.busInfants = 1;
    home.searchBus();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeDebugElement!.componentInstance as BusSearchResults;
    expect(page.state()!.criteria).toEqual(state.criteria);
    expect(harness.routeNativeElement!.querySelectorAll('app-bus-card')).toHaveLength(4);
    expect(
      harness.routeNativeElement!.querySelector('.service-nav .selected')!.textContent,
    ).toContain('Vé xe khách');
  });
  it('filters hours and operators together and keeps options available', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url(), BusSearchResults);
    page.filter({ operators: ['minh-tai'], departureBands: ['evening'] });
    await harness.fixture.whenStable();
    expect(page.trips()).toHaveLength(1);
    expect(page.trips()[0].departureAt).toContain('22:30');
    expect(page.operators()).toHaveLength(3);
    expect(page.state()!.criteria).toEqual(state.criteria);
    const direct = TestBed.inject(Router).url;
    await harness.navigateByUrl('/trip-shop');
    const restored = await harness.navigateByUrl(direct, BusSearchResults);
    expect(restored.trips()).toHaveLength(1);
    restored.filter({ operators: [], departureBands: [] });
    await harness.fixture.whenStable();
    expect(restored.trips()).toHaveLength(4);
  });
  it('handles round trips, day changes and separate selections', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      url({ ...state, criteria: { ...state.criteria, returnDate: '2099-12-15' } }),
      BusSearchResults,
    );
    page.choose(page.trips()[0]);
    await harness.fixture.whenStable();
    expect(page.state()!.leg).toBe('inbound');
    expect(page.trips()[0].from).toBe('Đà Lạt');
    page.choose(page.trips()[0]);
    expect(page.selection().outbound).not.toBeNull();
    expect(page.selection().inbound).not.toBeNull();
    page.changeDate('2099-12-16');
    await harness.fixture.whenStable();
    expect(page.state()!.criteria.returnDate).toBe('2099-12-16');
    expect(page.selection().outbound).toBeNull();
    expect(page.rawTrips()[0].departureAt).toContain('2099-12-16');
  });
  it('rejects invalid dates and identical endpoints, and handles unsupported routes', async () => {
    expect(validateBusCriteria({ ...state.criteria, to: state.criteria.from })).toBeTruthy();
    expect(validateBusCriteria({ ...state.criteria, departureDate: '2099-02-30' })).toBeTruthy();
    expect(validateBusCriteria({ ...state.criteria, returnDate: '2099-12-01' })).toBeTruthy();
    expect(validateBusCriteria({ ...state.criteria, infants: 3 })).toBeTruthy();
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/bus-search', BusSearchResults);
    expect(page.error()).toBeTruthy();
    await harness.navigateByUrl(url({ ...state, criteria: { ...state.criteria, to: 'Bangkok' } }));
    expect(page.trips()).toEqual([]);
    expect(page.error()).toBe('');
  });
  it('round trips filters and computes overnight sample arrivals', async () => {
    const selected = {
      ...state,
      filters: { operators: ['minh-tai'], departureBands: ['evening'] },
    };
    expect(readBusSearch(convertToParamMap(busSearchParams(selected)))).toEqual(selected);
    const trips = await firstValueFrom(TestBed.inject(BusSearchService).search(state));
    expect(trips[3].arrivalAt).toContain('2099-12-13');
    for (const band of ['night', 'morning', 'afternoon', 'evening'])
      expect(filterBusTrips(trips, { operators: [], departureBands: [band] })).toHaveLength(1);
  });
});
