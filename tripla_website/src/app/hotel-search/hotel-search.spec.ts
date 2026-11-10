import { ParallaxService } from '../pages/home/directives/parallax.service';
import { provideLocationMocks } from '@angular/common/testing';
import { firstValueFrom, filter, take } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router, NavigationEnd } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Location } from '@angular/common';
import { By } from '@angular/platform-browser';
import { HotelSearchResults } from './pages/hotel-search-results/hotel-search-results';
import { HotelSearchBar } from './components/hotel-search-bar/hotel-search-bar';
import { HotelFilterSidebar } from './components/hotel-filter-sidebar/hotel-filter-sidebar';
import { TripShopComponent } from '../pages/trip-shop/trip-shop';
import { defaultHotelFilters } from './models/hotel-filter.model';
import {
  HotelSearchCriteria,
  hotelSearchParams,
  readHotelSearch,
  validateHotelCriteria,
} from './models/hotel-search-criteria.model';
const criteria: HotelSearchCriteria = {
  service: 'hotel',
  location: 'Đà Lạt',
  checkIn: '2099-12-12',
  checkOut: '2099-12-15',
  adults: 2,
  children: 0,
  rooms: 1,
};
const url = (location = 'Đà Lạt') =>
  '/hotel-search?' +
  new URLSearchParams({
    location,
    checkIn: criteria.checkIn,
    checkOut: criteria.checkOut,
    adults: '2',
    children: '0',
    rooms: '1',
  }).toString();
async function historyNavigation(action: () => void): Promise<void> {
  TestBed.inject(Router).setUpLocationChangeListener();
  const navigation = firstValueFrom(
    TestBed.inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      take(1),
    ),
  );
  action();
  await navigation;
}
describe('Hotel search URL contract', () => {
  it('round trips all selected filters and counts', () => {
    const c = { ...criteria, location: 'Phú Quốc', adults: 4, children: 2, rooms: 2 };
    const filters = {
      ...defaultHotelFilters(),
      accommodation: 'Biệt thự' as const,
      minPrice: 100000,
      maxPrice: 5000000,
      stars: [4, 5],
      minRating: 8,
      amenities: ['wifi', 'privatePool'],
      freeCancellation: true,
      payAtProperty: true,
      area: 'Bãi biển',
    };
    expect(readHotelSearch(convertToParamMap(hotelSearchParams(c, filters)))).toEqual({
      criteria: c,
      filters,
    });
  });
  it('rejects blank location, impossible dates, inverted stays and invalid guests', () => {
    for (const patch of [
      { location: '' },
      { checkIn: '2099-02-30' },
      { checkOut: criteria.checkIn },
      { adults: 0 },
      { children: -1 },
      { rooms: 1.5 },
    ])
      expect(validateHotelCriteria({ ...criteria, ...patch })).toBeTruthy();
  });
  it('does not silently replace invalid required URL data with a destination', () => {
    expect(
      validateHotelCriteria(
        readHotelSearch(convertToParamMap({ location: '', checkIn: 'bad' })).criteria,
      ),
    ).toBeTruthy();
  });
  it('sanitizes invalid optional URL filters', () => {
    const result = readHotelSearch(
      convertToParamMap({
        stars: '0,3,99,3',
        minRating: '11',
        amenities: 'wifi,unknown',
        minPrice: '-1',
      }),
    );
    expect(result.filters.stars).toEqual([3]);
    expect(result.filters.minRating).toBeNull();
    expect(result.filters.amenities).toEqual(['wifi']);
    expect(result.filters.minPrice).toBeNull();
  });
});
describe('Hotel search navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideLocationMocks(),
        provideRouter([
          { path: 'trip-shop', component: TripShopComponent },
          { path: 'hotel-search', component: HotelSearchResults },
        ]),
      ],
    });
    // Exercise existing search handlers without unrelated homepage animation infrastructure.
    TestBed.overrideComponent(TripShopComponent, {
      set: { template: '<button (click)="searchHotels()">Search</button>', imports: [] },
    });
  });
  it('searches two different locations using the current home form snapshot and restores home on Back', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    const router = TestBed.inject(Router);
    home.searchDestination = 'Đà Lạt';
    home.checkIn = new Date(2099, 11, 12);
    home.checkOut = new Date(2099, 11, 15);
    home.adults = 3;
    home.children = 2;
    home.rooms = 2;
    home.accommodationType = 'Biệt thự';
    (harness.routeNativeElement!.querySelector('button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(router.url).toContain('adults=3');
    expect(router.url).toContain('rooms=2');
    expect(router.parseUrl(router.url).queryParams['location']).toBe('Đà Lạt');
    const page = harness.routeDebugElement!.componentInstance as HotelSearchResults;
    expect(page.state()!.filters.accommodation).toBe('Biệt thự');
    const location = TestBed.inject(Location);
    await historyNavigation(() => location.back());
    await harness.fixture.whenStable();
    harness.detectChanges();
    const restored = harness.routeDebugElement!.componentInstance as TripShopComponent;
    expect(restored.searchDestination).toBe('Đà Lạt');
    expect(restored.children).toBe(2);
    restored.searchDestination = 'Phú Quốc';
    restored.searchHotels();
    await harness.fixture.whenStable();
    expect(router.parseUrl(router.url).queryParams['location']).toBe('Phú Quốc');
  });
  it('does not navigate for blank location or when a different service is active', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    home.searchHotels();
    expect(home.hotelSearchError).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/trip-shop');
    for (const tab of ['flight', 'tour', 'bus'] as const) {
      home.selectBookingTab(tab);
      home.searchHotels();
      expect(home.bookingTab()).toBe(tab);
      expect(TestBed.inject(Router).url).toBe('/trip-shop');
    }
  });
  it('restores a directly opened URL including filters (refresh contract)', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      url('Phú Quốc') + '&freeCancellation=true&amenities=privatePool&accommodation=Bi?t%20th?',
      HotelSearchResults,
    );
    expect(page.state()!.criteria.location).toBe('Phú Quốc');
    expect(page.state()!.filters.freeCancellation).toBe(true);
    expect(page.state()!.filters.amenities).toEqual(['privatePool']);
    expect(harness.routeNativeElement!.textContent).toContain('Chưa có dữ liệu chỗ nghỉ');
  });
  it('preserves unsubmitted search edits while filters change, resets only filters, and supports history', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url(), HotelSearchResults);
    const bar = harness.routeDebugElement!.query(By.directive(HotelSearchBar))
      .componentInstance as HotelSearchBar;
    bar.draft.location = 'Phú Quốc';
    bar.draft.adults = 4;
    bar.draft.rooms = 2;
    page.filter({ ...page.state()!.filters, freeCancellation: true });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(bar.draft.location).toBe('Phú Quốc');
    expect(page.state()!.criteria.location).toBe('Đà Lạt');
    bar.submit();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.state()!.criteria.location).toBe('Phú Quốc');
    expect(page.state()!.criteria.adults).toBe(4);
    expect(page.state()!.filters.freeCancellation).toBe(true);
    const sidebar = harness.routeDebugElement!.query(By.directive(HotelFilterSidebar))
      .componentInstance as HotelFilterSidebar;
    sidebar.toggleAmenity('wifi');
    await harness.fixture.whenStable();
    expect(page.state()!.filters.amenities).toEqual(['wifi']);
    page.resetFilters();
    await harness.fixture.whenStable();
    expect(page.state()!.filters).toEqual(defaultHotelFilters());
    expect(page.state()!.criteria.rooms).toBe(2);
    const location = TestBed.inject(Location);
    await historyNavigation(() => location.back());
    await harness.fixture.whenStable();
    expect(page.state()!.filters.amenities).toEqual(['wifi']);
    await historyNavigation(() => location.forward());
    await harness.fixture.whenStable();
    expect(page.state()!.filters.amenities).toEqual([]);
  });
});

describe('TripShop real template compatibility', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'trip-shop', component: TripShopComponent },
          { path: 'hotel-search', component: HotelSearchResults },
        ]),
        { provide: ParallaxService, useValue: { reduced: true } },
      ],
    }),
  );
  it('keeps other service forms working and navigates from the real hotel search button', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    const root = harness.routeNativeElement!;
    const tabs = root.querySelectorAll<HTMLButtonElement>('.tabs .tab');
    for (const [index, selector] of [
      [1, '.flight-booking'],
      [2, '.tour-booking'],
      [3, '.bus-booking'],
    ] as const) {
      tabs[index].click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect((root.querySelector(selector) as HTMLElement).hidden).toBe(false);
      expect(TestBed.inject(Router).url).toBe('/trip-shop');
    }
    tabs[0].click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const destination = root.querySelector<HTMLInputElement>('#tripshop-destination')!;
    destination.value = 'Đà Lạt';
    destination.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    expect(home.searchDestination).toBe('Đà Lạt');
    root.querySelector<HTMLButtonElement>('.hotel-booking-content .search-btn')!.click();
    await harness.fixture.whenStable();
    expect(
      TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['location'],
    ).toBe('Đà Lạt');
  });
});
