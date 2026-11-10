import { TestBed } from '@angular/core/testing';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { TripShopComponent } from '../pages/trip-shop/trip-shop';
import { ActivitySearchResults } from './pages/activity-search-results/activity-search-results';
import { ActivitySearchService } from './services/activity-search';
import { filterActivities } from './services/activity-search';
import { ActivityFilterSidebar } from './components/activity-filter-sidebar/activity-filter-sidebar';
import { ActivitySearchCriteria } from './models/activity-search.model';
import {
  ActivityCategory,
  activitySearchParams,
  readActivitySearch,
} from './models/activity-search.model';

describe('Activity search', () => {
  it('filters Food & Dining and preserves price bounds and sorting in URL', async () => {
    const service = TestBed.inject(ActivitySearchService);
    const criteria: ActivitySearchCriteria = {
      location: 'Đà Lạt',
      query: '',
      categories: ['Food & Dining'],
      minPrice: 0,
      maxPrice: 1000000,
      sort: 'price-asc',
    };
    expect(readActivitySearch(convertToParamMap(activitySearchParams(criteria)))).toEqual(criteria);
    const results = await firstValueFrom(service.search(criteria));
    expect(results).toHaveLength(1);
    expect(results[0].categories).toContain('Food & Dining');
    const ordered = await firstValueFrom(service.search({ ...criteria, categories: [] }));
    expect(ordered.map((item) => item.priceFrom)).toEqual(
      [...ordered.map((item) => item.priceFrom!)].sort((a, b) => a - b),
    );
    const limited = filterActivities(
      [...ordered, { ...ordered[0], id: 'no-price', priceFrom: undefined }],
      { ...criteria, categories: [], minPrice: 200000, maxPrice: 400000 },
    );
    expect(limited.length).toBeGreaterThan(0);
    expect(limited.every((item) => item.priceFrom! >= 200000 && item.priceFrom! <= 400000)).toBe(
      true,
    );
  });
  it('ignores malformed prices and rejects reversed URL bounds', () => {
    expect(
      readActivitySearch(
        convertToParamMap({ location: 'Đà Lạt', minPrice: '-1', maxPrice: 'bad' }),
      ),
    ).toEqual({ location: 'Đà Lạt', query: '', categories: [] });
    const result = readActivitySearch(
      convertToParamMap({ location: 'Đà Lạt', minPrice: '500000', maxPrice: '100000' }),
    );
    expect(result.minPrice).toBe(500000);
    expect(result.maxPrice).toBeUndefined();
  });
  it('resets filters without losing location, keyword or sorting', () => {
    const fixture = TestBed.createComponent(ActivityFilterSidebar);
    fixture.componentRef.setInput('criteria', {
      location: 'Hà Nội',
      query: 'ẩm thực',
      categories: ['Food & Dining'],
      minPrice: 100000,
      maxPrice: 500000,
      sort: 'price-desc',
    });
    fixture.detectChanges();
    const changes: ActivitySearchCriteria[] = [];
    fixture.componentInstance.filtersChange.subscribe((value) => changes.push(value));
    expect(fixture.nativeElement.querySelector('input[type=checkbox]:checked')).not.toBeNull();
    (
      fixture.nativeElement.querySelector('.selected-panel header button') as HTMLButtonElement
    ).click();
    expect(changes[0]).toEqual({
      location: 'Hà Nội',
      query: 'ẩm thực',
      categories: [],
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'price-desc',
    });
  });
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'trip-shop', component: TripShopComponent },
          { path: 'activity-search', component: ActivitySearchResults },
        ]),
      ],
    });
    TestBed.overrideComponent(TripShopComponent, { set: { template: '', imports: [] } });
  });

  it('searches a city from TripShop without requiring any category', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    home.selectBookingTab('tour');
    home.chooseTourDestination('Đà Lạt');
    home.searchTours();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeDebugElement!.componentInstance as ActivitySearchResults;
    expect(page.criteria()).toEqual({ location: 'Đà Lạt', query: '', categories: [] });
    expect(page.activities()).toHaveLength(4);
    expect(page.activities().every((activity) => activity.city === 'Đà Lạt')).toBe(true);
    expect(harness.routeNativeElement!.querySelectorAll('app-activity-card')).toHaveLength(4);
  });

  it('carries multiple categories and the keyword across navigation and direct reload', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    home.selectBookingTab('tour');
    home.chooseTourDestination('Hà Nội');
    home.toggleTourCategory('Vé tham quan');
    home.toggleTourCategory('Bảo tàng & Phòng trưng bày');
    home.searchTours();
    await harness.fixture.whenStable();
    const page = harness.routeDebugElement!.componentInstance as ActivitySearchResults;
    expect(page.criteria().categories).toEqual(['Vé tham quan', 'Bảo tàng & Phòng trưng bày']);
    expect(page.activities()).toHaveLength(2);
    const savedUrl = TestBed.inject(Router).url;
    await harness.navigateByUrl('/trip-shop');
    const restored = await harness.navigateByUrl(savedUrl, ActivitySearchResults);
    expect(restored.criteria().location).toBe('Hà Nội');
    expect(restored.criteria().categories).toHaveLength(2);
    restored.search({ ...restored.criteria(), query: 'bao tang' });
    await harness.fixture.whenStable();
    expect(restored.criteria().query).toBe('bao tang');
    expect(restored.activities()).toHaveLength(1);
  });

  it('updates categories on the results page without losing the location', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      '/activity-search?location=' + encodeURIComponent('Đà Lạt'),
      ActivitySearchResults,
    );
    page.filter(['Công viên & vườn']);
    await harness.fixture.whenStable();
    expect(page.criteria().location).toBe('Đà Lạt');
    expect(page.activities().map((activity) => activity.name)).toEqual(['Vườn hoa Đà Lạt']);
    page.filter([]);
    await harness.fixture.whenStable();
    expect(page.activities()).toHaveLength(4);
  });

  it('handles missing destinations, unsupported locations and categories with no matches', async () => {
    const harness = await RouterTestingHarness.create();
    const home = await harness.navigateByUrl('/trip-shop', TripShopComponent);
    home.selectBookingTab('tour');
    home.searchTours();
    expect(TestBed.inject(Router).url).toBe('/trip-shop');
    expect(home.tourResult).toContain('Vui lòng chọn');
    const page = await harness.navigateByUrl('/activity-search', ActivitySearchResults);
    expect(page.error()).toBeTruthy();
    await harness.navigateByUrl('/activity-search?location=Bangkok');
    expect(page.activities()).toEqual([]);
    expect(page.error()).toBe('');
    await harness.navigateByUrl(
      '/activity-search?location=da%20lat&categories=' + encodeURIComponent('Công viên nước'),
    );
    expect(page.activities()).toEqual([]);
  });

  it('normalizes aliases, preserves category labels and discards invalid URL categories', async () => {
    const service = TestBed.inject(ActivitySearchService);
    const results = await firstValueFrom(
      service.search({ location: 'TPHCM', query: '', categories: [] }),
    );
    expect(results).toHaveLength(4);
    const categories: ActivityCategory[] = ['Sở thú & thủy cung', 'Công viên & vườn'];
    const criteria = { location: 'Hồ Chí Minh', query: 'thao cam', categories };
    expect(readActivitySearch(convertToParamMap(activitySearchParams(criteria)))).toEqual(criteria);
    expect(
      readActivitySearch(
        convertToParamMap({
          location: 'Đà Lạt',
          categories: ['invalid', 'Vé tham quan', 'Vé tham quan'],
        }),
      ).categories,
    ).toEqual(['Vé tham quan']);
  });
});
