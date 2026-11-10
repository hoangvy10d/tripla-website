import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SavedTrips } from './saved-trips';
import { Tripshort } from '../pages/tripshort/tripshort';
import { SaveHotelTrip } from '../hotel-search/components/save-hotel-trip/save-hotel-trip';
import { vi } from 'vitest';
import { ActivityCard } from '../activity-search/components/activity-card/activity-card';
import { RouterTestingHarness } from '@angular/router/testing';
import { HotelDetails } from '../hotel-search/pages/hotel-details/hotel-details';

const existingTrip = { id: 'trip-1', name: 'Kỳ nghỉ', createdAt: '2026-11-10T00:00:00.000Z', places: ['resort'] };

describe('Shared saved trips', () => {
  it('shares activity bookmarks with existing trips and keeps hotel identifiers separate', () => {
    const card = TestBed.createComponent(ActivityCard);
    card.componentRef.setInput('activity', { id:'same-id', name:'Địa điểm mẫu', city:'Đà Lạt', categories:['Vé tham quan'], description:'', imageUrl:'/sample.jpg' });
    card.detectChanges();
    const picker = TestBed.createComponent(SaveHotelTrip);
    Object.defineProperty(picker.nativeElement.querySelector('dialog'), 'showModal', { value: vi.fn() });
    picker.componentRef.setInput('itemType', 'activity');
    picker.componentRef.setInput('hotelId', 'same-id');
    picker.componentRef.setInput('hotelName', 'Địa điểm mẫu');
    picker.componentInstance.toggle('trip-1');
    card.detectChanges();
    expect(card.componentInstance.isSaved()).toBe(true);
    expect(card.nativeElement.querySelector('.save-activity').textContent).toContain('Đã lưu');
    const store = TestBed.inject(SavedTrips);
    expect(store.trips()[0].places).toEqual(['resort', 'activity:same-id']);
    store.toggle('trip-1', 'hotel:same-id');
    picker.componentInstance.toggle('trip-1');
    card.detectChanges();
    expect(card.componentInstance.isSaved()).toBe(false);
    expect(store.trips()[0].places).toEqual(['resort', 'hotel:same-id']);
    expect(picker.componentInstance.message).toContain('Đã bỏ lưu địa điểm');
  });
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
    });
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify([existingTrip]));
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'hotels/:id', component: HotelDetails },
    ])] });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('keeps legacy Tripshort fields and saves hotels without overwriting places', () => {
    const store = TestBed.inject(SavedTrips);
    expect(store.toggle('trip-1', 'hotel:demo-pine')).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('tripla.savedTrips')!)).toEqual([
      { ...existingTrip, places: ['resort', 'hotel:demo-pine'] },
    ]);
    store.toggle('trip-1', 'hotel:demo-pine');
    expect(store.trips()[0].places).toEqual(['resort']);
  });

  it('shares trip creation and membership between Tripshort and hotels', () => {
    TestBed.overrideComponent(Tripshort, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(Tripshort);
    const short = fixture.componentInstance;
    const store = TestBed.inject(SavedTrips);
    short.newTripName = 'Từ Tripshort';
    short.createTrip();
    expect(store.trips()[1].name).toBe('Từ Tripshort');
    store.toggle(store.trips()[1].id, 'hotel:demo-pine');
    expect(short.savedTrips[1].places).toEqual(['hotel:demo-pine']);
    short.toggleTripPlace(store.trips()[1].id);
    expect(store.trips()[1].places).toContain('hotel:demo-pine');
    expect(store.trips()[1].places).toContain(short.selectedDrawerKey());
    store.create('Từ khách sạn');
    expect(short.savedTrips[2].name).toBe('Từ khách sạn');
  });

  it('does not overwrite malformed storage and refreshes changes from another tab', () => {
    const store = TestBed.inject(SavedTrips);
    window.localStorage.setItem('tripla.savedTrips', '{broken');
    expect(store.create('Không ghi đè')).toBe(false);
    expect(window.localStorage.getItem('tripla.savedTrips')).toBe('{broken');
    expect(store.error()).toBeTruthy();
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify([{ ...existingTrip, name: 'Tên mới' }]));
    window.dispatchEvent(new StorageEvent('storage', { key: 'tripla.savedTrips' }));
    expect(store.trips()[0].name).toBe('Tên mới');
    expect(store.error()).toBe('');
  });

  it('creates a trip in the hotel picker and toggles the hotel independently', () => {
    const fixture = TestBed.createComponent(SaveHotelTrip);
    fixture.componentRef.setInput('hotelId', 'demo-pine');
    fixture.componentRef.setInput('hotelName', 'Nhà Bên Rừng');
    const showModal = vi.fn();
    Object.defineProperty(fixture.nativeElement.querySelector('dialog'), 'showModal', { value: showModal });
    fixture.detectChanges();
    expect(showModal).toHaveBeenCalledOnce();
    const component = fixture.componentInstance;
    component.newTripName = 'Chuyến mới';
    component.createTrip();
    fixture.detectChanges();
    const trip = component.store.trips()[1];
    (fixture.nativeElement.querySelectorAll('.trip-row')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(trip.name).toBe('Chuyến mới');
    expect(component.store.trips()[1].places).toEqual(['hotel:demo-pine']);
    expect(component.message).toContain('Đã lưu');
    expect(fixture.nativeElement.querySelectorAll('.trip-row')[1].getAttribute('aria-pressed')).toBe('true');
    component.toggle(trip.id);
    expect(component.store.trips()[1].places).toEqual([]);
    expect(component.message).toContain('Đã bỏ lưu');
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.nativeElement.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('reports a storage write failure without marking a hotel as saved', () => {
    const store = TestBed.inject(SavedTrips);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(store.toggle('trip-1', 'hotel:demo-pine')).toBe(false);
    expect(store.trips()[0].places).toEqual(['resort']);
    expect(store.error()).toContain('Không thể lưu');
  });

  it('shows existing hotel saves in details and stays saved until removed from every trip', async () => {
    window.localStorage.setItem('tripla.savedTrips', JSON.stringify([
      { ...existingTrip, places: ['resort', 'hotel:demo-pine'] },
      { ...existingTrip, id: 'trip-2', places: ['hotel:demo-pine'] },
    ]));
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/hotels/demo-pine?demo=true', HotelDetails);
    expect(page.isSaved()).toBe(true);
    expect(harness.routeNativeElement!.querySelector('.save-hotel')!.textContent).toContain('Đã lưu');
    page.tripStore.toggle('trip-1', 'hotel:demo-pine');
    expect(page.isSaved()).toBe(true);
    page.tripStore.toggle('trip-2', 'hotel:demo-pine');
    harness.detectChanges();
    expect(page.isSaved()).toBe(false);
    expect(harness.routeNativeElement!.querySelector('.save-hotel')!.textContent).toContain('Lưu vào chuyến đi');
    page.tripStore.toggle('trip-1', 'hotel:demo-pine');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.save-hotel')!.textContent).toContain('Đã lưu');
    await harness.navigateByUrl('/hotels/demo-coast?demo=true');
    expect(page.isSaved()).toBe(false);
  });
});
