import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { throwError, Subject } from 'rxjs';
import { TripPlanningPage } from './pages/trip-planning-page/trip-planning-page';
import { PlanningPlacesService } from './services/planning-places.service';
import { PlanningPlace } from './models/planning-place.model';
import { ActivitySearchService } from '../activity-search/services/activity-search';
const trips = [
  {
    id: 'one',
    name: 'Chuyến Một',
    createdAt: '2026-11-10T00:00:00Z',
    places: ['hotel:demo-pine', 'activity:demo-dalat-garden'],
  },
  {
    id: 'two',
    name: 'Chuyến Hai',
    createdAt: '2026-11-10T00:00:00Z',
    places: ['dining', 'activity:removed'],
  },
];
describe('Trip Planning foundation', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    });
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify(trips));
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'trip-planning', component: TripPlanningPage }])],
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('reads existing saved trips and switches places without mixing them', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.store.trips().map((t) => t.name)).toEqual(['Chuyến Một', 'Chuyến Hai']);
    expect(page.places().map((p) => p.title)).toEqual(['Nhà Bên Rừng', 'Vườn hoa Đà Lạt']);
    expect(
      harness.routeNativeElement!.querySelector('.main-nav a[aria-current=page]')!.textContent,
    ).toContain('Trip Planning');
    page.selectTrip('two');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.trip()!.id).toBe('two');
    expect(page.places().map((p) => p.key)).toEqual(['dining', 'activity:removed']);
    expect(page.places()[0].title).toBe('Cliffside Sunset Dining');
    expect(page.places()[1].kind).toBe('unavailable');
    expect(harness.routeNativeElement!.textContent).not.toContain('Nhà Bên Rừng');
  });
  it('keeps temporary views separate and never persists schedules or notes', async () => {
    const before = window.localStorage.getItem('tripla.savedTrips');
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    page.selectPlace(page.places()[0]);
    page.addDay();
    page.updateView({ note: 'Ghi chú Một' });
    page.selectTrip('two');
    await harness.fixture.whenStable();
    expect(page.view().note).toBe('');
    expect(page.view().dayCount).toBe(1);
    expect(page.selectedPlace()).toBeNull();
    page.updateView({ note: 'Ghi chú Hai' });
    page.selectTrip('one');
    await harness.fixture.whenStable();
    expect(page.view().note).toBe('Ghi chú Một');
    expect(page.view().activeDay).toBe(2);
    expect(page.selectedPlace()!.key).toBe('hotel:demo-pine');
    expect(page.scheduleEntries()).toEqual([]);
    expect(window.localStorage.getItem('tripla.savedTrips')).toBe(before);
  });
  it('handles no trips, trips without places, and invalid links', async () => {
    window.localStorage.setItem('tripla.savedTrips', '[]');
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning', TripPlanningPage);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.trip()).toBeNull();
    expect(page.places()).toEqual([]);
    expect(harness.routeNativeElement!.textContent).toContain('Chưa có chuyến đi');
    page.newTripName = 'Chuyến mới';
    page.createTrip();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.trip()!.name).toBe('Chuyến mới');
    expect(page.places()).toEqual([]);
    const stored = JSON.parse(window.localStorage.getItem('tripla.savedTrips')!);
    expect(Object.keys(stored[0]).sort()).toEqual(['createdAt', 'id', 'name', 'places']);
    await harness.navigateByUrl('/trip-planning?trip=missing');
    await harness.fixture.whenStable();
    expect(page.trip()).toBeNull();
  });
  it('shows storage errors without rendering stale saved places', async () => {
    window.localStorage.setItem('tripla.savedTrips', '{broken');
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning', TripPlanningPage);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.store.error()).toBeTruthy();
    expect(page.places()).toEqual([]);
    expect(harness.routeNativeElement!.querySelector('[role=alert]')).not.toBeNull();
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify(trips));
    page.retry();
    await harness.fixture.whenStable();
    expect(page.trip()!.id).toBe('one');
    expect(page.places()).toHaveLength(2);
  });
  it('retains an unavailable place when its catalog request fails', async () => {
    vi.spyOn(TestBed.inject(ActivitySearchService), 'getDetails').mockReturnValue(
      throwError(() => Error('Unavailable')),
    );
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    expect(page.places()).toHaveLength(2);
    expect(page.places()[0].kind).toBe('hotel');
    expect(page.places()[1].kind).toBe('unavailable');
  });
  it('cancels obsolete loads when a different trip is selected', async () => {
    const first = new Subject<PlanningPlace[]>(),
      second = new Subject<PlanningPlace[]>();
    vi.spyOn(TestBed.inject(PlanningPlacesService), 'resolve').mockImplementation((keys) =>
      keys.includes('dining') ? second : first,
    );
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    expect(page.loading()).toBe(true);
    page.selectTrip('two');
    await harness.fixture.whenStable();
    first.next([{ key: 'old', title: 'Wrong trip', kind: 'unavailable' }]);
    first.complete();
    second.next([{ key: 'dining', title: 'Correct trip', kind: 'tripshort' }]);
    second.complete();
    await harness.fixture.whenStable();
    expect(page.places().map((p) => p.title)).toEqual(['Correct trip']);
    expect(page.loading()).toBe(false);
  });
});
