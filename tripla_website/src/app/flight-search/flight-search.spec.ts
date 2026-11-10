import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, convertToParamMap, NavigationEnd } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { firstValueFrom, filter, take } from 'rxjs';
import { By } from '@angular/platform-browser';
import { TripShopComponent } from '../pages/trip-shop/trip-shop';
import { FlightSearchResults } from './pages/flight-search-results/flight-search-results';
import { FlightSearchBar } from './components/flight-search-bar/flight-search-bar';
import { FlightCard } from './components/flight-card/flight-card';
import { FlightResultsList } from './components/flight-results-list/flight-results-list';
import { FlightFilterSidebar } from './components/flight-filter-sidebar/flight-filter-sidebar';
import {
  airports,
  FlightSearchCriteria,
  flightCriteriaParams,
  readFlightCriteria,
  validateFlightCriteria,
} from './models/flight-search-criteria.model';
import {
  defaultFlightFilters,
  filterAndSortFlights,
  flightFilterParams,
  readFlightFilters,
} from './models/flight-filter.model';
import { Flight } from './models/flight.model';
import { ParallaxService } from '../pages/home/directives/parallax.service';
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
  cabin: 'Thương gia',
};
const url = (c = criteria) =>
  '/flight-search-results?' +
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(flightCriteriaParams(c))
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
// Synthetic fixtures test logic only. They are never supplied to the application UI.
const fixtureFlight: Flight = {
  id: 'fixture-1',
  airlineCode: 'TEST',
  airlineName: 'Test only',
  from: 'SGN',
  to: 'HAN',
  departureAt: '2099-12-12T08:00:00+07:00',
  arrivalAt: '2099-12-12T10:00:00+07:00',
  durationMinutes: 120,
  stops: 0,
  carryOnIncluded: true,
  checkedBaggageIncluded: false,
  price: 100,
  currency: 'VND',
};
describe('Flight criteria and processing', () => {
  it('round trips airports, passengers, cabin and round trip dates', () =>
    expect(readFlightCriteria(convertToParamMap(flightCriteriaParams(criteria)))).toEqual(
      criteria,
    ));
  it('one-way drops return date from URL', () => {
    const result = readFlightCriteria(
      convertToParamMap(flightCriteriaParams({ ...criteria, tripType: 'one-way' })),
    );
    expect(result.returnDate).toBeNull();
    expect(validateFlightCriteria(result)).toBeNull();
  });
  it('rejects missing/same airports, invalid dates and passenger counts', () => {
    for (const patch of [
      { from: { code: '', city: '', name: '' } },
      { to: criteria.from },
      { departureDate: '2099-02-30' },
      { returnDate: '2099-12-11' },
      { adults: 0 },
      { children: 8 },
      { infants: 3 },
      { cabin: 'invalid' },
    ])
      expect(
        validateFlightCriteria({ ...criteria, ...patch } as FlightSearchCriteria),
      ).toBeTruthy();
  });
  it('round trips filter selections without prices', () => {
    const f = {
      ...defaultFlightFilters(),
      airlines: ['TEST'],
      stops: [0],
      departureBands: ['morning' as const],
      arrivalBands: ['noon' as const],
      carryOn: true,
      checkedBaggage: true,
    };
    expect(readFlightFilters(convertToParamMap(flightFilterParams(f, 'latest')))).toEqual(f);
  });
  it('filters airlines, stops and separates checked from carry-on baggage', () => {
    expect(
      filterAndSortFlights(
        [fixtureFlight],
        { ...defaultFlightFilters(), carryOn: true },
        'cheapest',
      ),
    ).toHaveLength(1);
    expect(
      filterAndSortFlights(
        [fixtureFlight],
        { ...defaultFlightFilters(), checkedBaggage: true },
        'cheapest',
      ),
    ).toHaveLength(0);
    expect(
      filterAndSortFlights(
        [fixtureFlight],
        { ...defaultFlightFilters(), airlines: ['OTHER'] },
        'cheapest',
      ),
    ).toHaveLength(0);
    expect(
      filterAndSortFlights([fixtureFlight], { ...defaultFlightFilters(), stops: [1] }, 'cheapest'),
    ).toHaveLength(0);
  });
  it('filters local departure/arrival bands and sorts in all four modes without mutating data', () => {
    const second = {
      ...fixtureFlight,
      id: 'fixture-2',
      price: 80,
      durationMinutes: 150,
      departureAt: '2099-12-12T18:00:00+07:00',
      arrivalAt: '2099-12-12T20:30:00+07:00',
    };
    const data = [fixtureFlight, second];
    expect(filterAndSortFlights(data, defaultFlightFilters(), 'cheapest')[0].id).toBe('fixture-2');
    expect(filterAndSortFlights(data, defaultFlightFilters(), 'shortest')[0].id).toBe('fixture-1');
    expect(filterAndSortFlights(data, defaultFlightFilters(), 'earliest')[0].id).toBe('fixture-1');
    expect(filterAndSortFlights(data, defaultFlightFilters(), 'latest')[0].id).toBe('fixture-2');
    expect(
      filterAndSortFlights(
        data,
        { ...defaultFlightFilters(), departureBands: ['night'], arrivalBands: ['night'] },
        'cheapest',
      ),
    ).toHaveLength(1);
    expect(data[0].id).toBe('fixture-1');
  });
});
describe('Flight routed flow', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideLocationMocks(),
        provideRouter([
          { path: 'trip-shop', component: TripShopComponent },
          { path: 'flight-search-results', component: FlightSearchResults },
        ]),
        { provide: ParallaxService, useValue: { reduced: true } },
      ],
    }),
  );
  it('uses the real flight search button and current form values', async () => {
    const h = await RouterTestingHarness.create();
    const home = await h.navigateByUrl('/trip-shop?tab=flight', TripShopComponent);
    home.flightFrom = home.airports[0];
    home.flightTo = home.airports[1];
    home.flightDeparture = '2099-12-12';
    home.flightReturn = '2099-12-15';
    home.flightAdults = 2;
    home.flightChildren = 1;
    home.flightInfants = 1;
    home.cabin = 'Thương gia';
    home.directFlight = true;
    h.detectChanges();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.flight-search')!.click();
    await h.fixture.whenStable();
    const p = h.routeDebugElement!.componentInstance as FlightSearchResults;
    expect(p.state()!.criteria.from.code).toBe('SGN');
    expect(p.state()!.criteria.to.code).toBe('HAN');
    expect(p.state()!.criteria.cabin).toBe('Thương gia');
    expect(p.state()!.criteria.children).toBe(1);
    expect(p.state()!.filters.stops).toEqual([0]);
    expect(TestBed.inject(Router).url).toContain('/flight-search-results?');
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    const navigation = firstValueFrom(router.events.pipe(filter(e => e instanceof NavigationEnd), take(1)));
    TestBed.inject(Location).back();
    await navigation;
    await h.fixture.whenStable();
    const restored = h.routeDebugElement!.componentInstance as TripShopComponent;
    expect(restored.bookingTab()).toBe('flight');
    expect(restored.flightChildren).toBe(1);
    expect(restored.flightTo.code).toBe('HAN');
    expect(restored.cabin).toBe('Thương gia');
  });
  it('restores a direct URL and renders honest empty state without filter prices', async () => {
    const h = await RouterTestingHarness.create();
    const p = await h.navigateByUrl(url(), FlightSearchResults);
    expect(p.state()!.criteria).toEqual(criteria);
    expect(p.data()).toBeNull();
    expect(h.routeNativeElement!.textContent).toContain('Chưa có dữ liệu chuyến bay');
    const sidebar = h.routeDebugElement!.query(By.directive(FlightFilterSidebar));
    expect(sidebar.nativeElement.textContent).not.toContain('VND');
  });
  it('re-searches a different route and preserves unconfirmed edits on filter changes', async () => {
    const h = await RouterTestingHarness.create();
    const p = await h.navigateByUrl(url(), FlightSearchResults);
    const bar = h.routeDebugElement!.query(By.directive(FlightSearchBar))
      .componentInstance as FlightSearchBar;
    bar.draft.from = airports[1];
    bar.draft.to = airports[2];
    bar.draft.adults = 3;
    bar.draft.cabin = 'Hạng nhất';
    p.filter({ ...p.state()!.filters, carryOn: true });
    await h.fixture.whenStable();
    h.detectChanges();
    expect(bar.draft.to.code).toBe('DAD');
    expect(p.state()!.criteria.to.code).toBe('HAN');
    bar.submit();
    await h.fixture.whenStable();
    expect(p.state()!.criteria.from.code).toBe('HAN');
    expect(p.state()!.criteria.to.code).toBe('DAD');
    expect(p.state()!.criteria.adults).toBe(3);
    expect(p.state()!.filters.carryOn).toBe(true);
  });
  it('changes dates and preserves valid return date; distinguishes inbound results', async () => {
    const h = await RouterTestingHarness.create();
    const p = await h.navigateByUrl(url(), FlightSearchResults);
    p.changeDate('2099-12-20');
    await h.fixture.whenStable();
    expect(p.state()!.criteria.returnDate).toBe('2099-12-20');
    p.changeLeg('inbound');
    await h.fixture.whenStable();
    expect(p.state()!.leg).toBe('inbound');
    p.changeDate('2099-12-22');
    await h.fixture.whenStable();
    expect(p.state()!.criteria.returnDate).toBe('2099-12-22');
    p.search({ ...p.state()!.criteria, tripType: 'one-way', returnDate: null });
    await h.fixture.whenStable();
    expect(p.state()!.criteria.returnDate).toBeNull();
    expect(p.state()!.leg).toBe('outbound');
  });
  it('filters/sorts supplied data, handles no matches, resets only filters and restores history', async () => {
    const h = await RouterTestingHarness.create();
    const p = await h.navigateByUrl(url(), FlightSearchResults);
    p.data.set({ outbound: [fixtureFlight], inbound: [] });
    p.filter({ ...p.state()!.filters, checkedBaggage: true });
    await h.fixture.whenStable();
    expect(p.flights()).toEqual([]);
    p.sort('latest');
    await h.fixture.whenStable();
    p.resetFilters();
    await h.fixture.whenStable();
    expect(p.flights()).toHaveLength(1);
    expect(p.state()!.criteria).toEqual(criteria);
    expect(p.state()!.sort).toBe('latest');
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    const location = TestBed.inject(Location);
    let done = firstValueFrom(
      router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        take(1),
      ),
    );
    location.back();
    await done;
    expect(p.state()!.filters.checkedBaggage).toBe(true);
    done = firstValueFrom(
      router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        take(1),
      ),
    );
    location.forward();
    await done;
    expect(p.state()!.filters.checkedBaggage).toBe(false);
  });
  it('records separate outbound/inbound selections without inventing a combined fare', async () => {
    const h = await RouterTestingHarness.create();
    const p = await h.navigateByUrl(url(), FlightSearchResults);
    p.chooseFlight(fixtureFlight);
    await h.fixture.whenStable();
    expect(p.state()!.leg).toBe('inbound');
    p.chooseFlight({ ...fixtureFlight, id: 'return-fixture', from: 'HAN', to: 'SGN' });
    expect(p.selection().outbound!.id).toBe('fixture-1');
    expect(p.selection().inbound!.id).toBe('return-fixture');
  });
});
