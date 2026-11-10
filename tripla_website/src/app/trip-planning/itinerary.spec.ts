import { TestBed } from '@angular/core/testing';
import { provideRouter,Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { SavedTrips } from '../services/saved-trips';
import { ItineraryStateService } from './services/itinerary-state.service';
import { TripPlanningPage } from './pages/trip-planning-page/trip-planning-page';
import { PlanningMap } from './components/planning-map/planning-map';
import { itineraryProblem } from './models/itinerary.model';
import { planningUnsavedGuard } from './planning-unsaved.guard';
const trips = [
  {
    id: 'one',
    name: 'Một',
    createdAt: '2026-11-10T00:00:00Z',
    places: ['hotel:demo-pine', 'activity:demo-dalat-garden'],
  },
  { id: 'two', name: 'Hai', createdAt: '2026-11-10T00:00:00Z', places: ['dining'] },
];
function configure() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: 'trip-planning',
          component: TripPlanningPage,
          canDeactivate: [planningUnsavedGuard],
        },
        { path: 'other', component: TripPlanningPage },
      ]),
    ],
  });
}
describe('Interactive itinerary', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    });
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify(trips));
    configure();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('validates timing, prevents overlaps and recovers after a rejected move', () => {
    const state = TestBed.inject(ItineraryStateService);
    const entry = state.add('one', 'hotel:demo-pine', 1, 540, 60)!;
    expect(entry).not.toBeNull();
    expect(state.add('one', 'activity:demo-dalat-garden', 1, 570, 60)).toBeNull();
    expect(state.read('one').error).toContain('chồng lấn');
    expect(state.edit('one', entry.id, { startMinute: 600 })).toBe(true);
    expect(state.read('one').error).toBe('');
    expect(state.edit('one', entry.id, { startMinute: 1410, durationMinutes: 60 })).toBe(false);
    expect(state.read('one').value.entries[0].startMinute).toBe(600);
    expect(state.add('one', 'dining', 1, 700)).toBeNull();
    expect(state.edit('one', entry.id, { durationMinutes: 0 })).toBe(false);
    expect(state.edit('one', entry.id, { durationMinutes: 30 })).toBe(true);
  });
  it('moves across days and removes timeline entries without changing saved places', () => {
    const state = TestBed.inject(ItineraryStateService),
      saved = TestBed.inject(SavedTrips);
    state.patch('one', { dayCount: 3 });
    const entry = state.add('one', 'hotel:demo-pine', 1, 540)!;
    state.edit('one', entry.id, { day: 3, note: 'Ghi chú hoạt động' });
    expect(state.read('one').value.entries[0].day).toBe(3);
    state.removeDay('one', 2);
    expect(state.read('one').value.entries[0].day).toBe(2);
    expect(state.read('two').value.entries).toEqual([]);
    state.remove('one', entry.id);
    expect(state.read('one').value.entries).toEqual([]);
    expect(saved.trips()[0].places).toEqual(trips[0].places);
  });
  it('persists activities, dates and both note types and restores a new app instance', async () => {
    let state = TestBed.inject(ItineraryStateService);
    state.patch('one', { dayCount: 2, startDate: '2026-12-01', note: 'Ghi chú chuyến' });
    const entry = state.add('one', 'hotel:demo-pine', 2, 615, 90)!;
    state.edit('one', entry.id, { note: 'Ghi chú riêng', title: 'Tên hiển thị' });
    expect(state.save('one')).toBe(true);
    const stored = JSON.parse(window.localStorage.getItem('tripla.savedTrips')!);
    expect(stored[0].itinerary.entries[0].note).toBe('Ghi chú riêng');
    expect(stored[1]).toEqual(trips[1]);
    TestBed.resetTestingModule();
    configure();
    state = TestBed.inject(ItineraryStateService);
    expect(state.read('one').value.entries[0]).toMatchObject({
      startMinute: 615,
      durationMinutes: 90,
      day: 2,
      title: 'Tên hiển thị',
    });
    expect(state.read('one').value.note).toBe('Ghi chú chuyến');
    expect(state.read('one').dirty).toBe(false);
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    page.changeDay(2);
    expect(page.dayDate(2)).toBe('2026-12-02');
    expect(page.dayEntries()).toHaveLength(1);
  });
  it('does not overwrite cross-tab updates or corrupt stored itineraries', () => {
    const state = TestBed.inject(ItineraryStateService);
    state.add('one', 'hotel:demo-pine', 1, 540);
    state.save('one');
    state.patch('one', { note: 'Local edit' });
    const data = JSON.parse(window.localStorage.getItem('tripla.savedTrips')!);
    data[0].itinerary.revision++;
    data[0].itinerary.note = 'Another tab';
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify(data));
    expect(state.save('one')).toBe(false);
    expect(state.read('one').error).toContain('tab khác');
    expect(JSON.parse(window.localStorage.getItem('tripla.savedTrips')!)[0].itinerary.note).toBe(
      'Another tab',
    );
    state.reload('one');
    expect(state.read('one').value.note).toBe('Another tab');
    data[0].itinerary.entries[0].durationMinutes = -1;
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify(data));
    state.reload('one');
    expect(state.read('one').error).toBeTruthy();
    expect(state.save('one')).toBe(false);
  });
  it('reports storage failures while preserving the editable draft', () => {
    const state = TestBed.inject(ItineraryStateService);
    state.add('one', 'hotel:demo-pine', 1, 540);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw Error('Quota');
    });
    expect(state.save('one')).toBe(false);
    expect(state.read('one').dirty).toBe(true);
    expect(state.read('one').value.entries).toHaveLength(1);
  });
  it('handles native drag/drop at quarter-hours and updates details and timetable together', async () => {
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const card = harness.routeNativeElement!.querySelector('.place-card')!;
    const drag = new Event('dragstart', { bubbles: true });
    Object.defineProperty(drag, 'dataTransfer', { value: { setData: vi.fn() } });
    card.dispatchEvent(drag);
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'clientY', { value: 9 * 66 + 16.5 });
    harness.routeNativeElement!.querySelector('.timeline-canvas')!.dispatchEvent(drop);
    harness.detectChanges();
    expect(page.selectedEntry()!.startMinute).toBe(555);
    expect(page.selectedPlace()!.key).toBe('hotel:demo-pine');
    const input = harness.routeNativeElement!.querySelector(
      'input[aria-label="Giờ bắt đầu hoạt động"]',
    ) as HTMLInputElement;
    input.value = '10:30';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.selectedEntry()!.startMinute).toBe(630);
    expect(
      (harness.routeNativeElement!.querySelector('.calendar-entry') as HTMLElement).style.top,
    ).toBe('693px');
    page.addDay();
    page.editEntry({ day: 2, note: 'Đến sớm' });
    expect(page.dayEntries()[0].note).toBe('Đến sớm');
    page.deleteEntry(page.selectedEntry()!);
    expect(page.scheduleEntries()).toHaveLength(0);
    expect(page.store.trips()[0].places).toHaveLength(2);
  });
  it('warns about unsaved work and lets the user cancel leaving', async () => {
    const harness = await RouterTestingHarness.create(),
      page = await harness.navigateByUrl('/trip-planning?trip=one', TripPlanningPage);
    await harness.fixture.whenStable();
    page.updateView({ note: 'Chưa lưu' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(page.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalled();
    expect(await TestBed.inject(Router).navigateByUrl('/other')).toBe(false);
    expect(TestBed.inject(Router).url).toContain('/trip-planning');
    const event = new Event('beforeunload', { cancelable: true });
    page.beforeUnload(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(true);
    page.save();
    expect(page.canLeave()).toBe(true);
  });
  it('updates the map search from the selected source location without inventing coordinates', () => {
    const fixture = TestBed.createComponent(PlanningMap);
    fixture.componentRef.setInput('place', {
      key: 'x',
      title: 'Vườn hoa',
      location: 'Đà Lạt',
      kind: 'activity',
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.searchUrl()).toContain(encodeURIComponent('Vườn hoa, Đà Lạt'));
    expect(fixture.componentInstance.embedUrl()).toBeNull();
    fixture.componentRef.setInput('place', { key: 'y', title: 'Không rõ', kind: 'unavailable' });
    fixture.detectChanges();
    expect(fixture.componentInstance.searchUrl()).toBeNull();
  });
});
