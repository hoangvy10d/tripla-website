import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ExploreMapComponent } from './explore-map';

function createFakeLeaflet() {
  const layer = {
    on: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  };
  const layerGroup = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
  };
  const map = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
    removeLayer: vi.fn(),
  };
  const marker = {
    addTo: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    getElement: vi.fn(() => null),
  };
  return {
    map: vi.fn(() => map),
    control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
    tileLayer: vi.fn(() => layer),
    layerGroup: vi.fn(() => layerGroup),
    divIcon: vi.fn((opts: any) => opts),
    marker: vi.fn(() => marker),
    latLngBounds: vi.fn((pts: any) => pts),
  };
}

describe('ExploreMapComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    });
    (window as any).L = createFakeLeaflet();

    TestBed.configureTestingModule({
      imports: [ExploreMapComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    delete (window as any).L;
    vi.unstubAllGlobals();
  });

  it('loads places, renders Vietnamese botanical UI categories, and supports city/search filtering and trip saving', async () => {
    const fixture = TestBed.createComponent(ExploreMapComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = httpMock.expectOne('/api/v1/map/places');
    req.flush({
      success: true,
      items: [
        {
          id: 'loc-1',
          kind: 'location',
          name: 'The Cliff Dining Pavilion',
          category: 'restaurant',
          address: 'Vịnh Vĩnh Hy, Ninh Thuận',
          city: 'Vĩnh Hy',
          lat: 11.71,
          lng: 109.19,
          price: 0,
          rating: 4.9,
          reelCount: 2,
        },
        {
          id: 'hot-1',
          kind: 'hotel',
          name: 'Amanoi Resort',
          category: 'Khách sạn',
          address: 'Vĩnh Hy, Ninh Thuận',
          city: 'Vĩnh Hy',
          lat: 11.72,
          lng: 109.2,
          price: 4500000,
          rating: 4.9,
          reelCount: 1,
        },
        {
          id: 'loc-2',
          kind: 'location',
          name: 'Cầu Vàng Bà Nà',
          category: 'attraction',
          address: 'Hòa Vang, Đà Nẵng',
          city: 'Đà Nẵng',
          lat: 15.99,
          lng: 107.99,
          price: 900000,
          rating: 4.8,
          reelCount: 0,
        },
      ],
    });
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.places.length).toBe(3);
    expect(comp.categoryLabel('restaurant')).toBe('Ẩm thực');
    expect(comp.categoryLabel('attraction')).toBe('Điểm tham quan');
    expect(comp.quickCities[0]).toEqual({ name: 'Vĩnh Hy', count: 2 });

    // Top header navigation exists
    const navLinks = Array.from(fixture.nativeElement.querySelectorAll('.top-nav a')).map((a: any) =>
      a.textContent.trim()
    );
    expect(navLinks).toContain('Về TRIPLA');
    expect(navLinks).toContain('Bản đồ');
    expect(navLinks).toContain('Trip Planning');

    // City filter narrows list cleanly
    comp.setCity('Đà Nẵng');
    fixture.detectChanges();
    expect(comp.filteredPlaces.length).toBe(1);
    expect(comp.filteredPlaces[0].name).toBe('Cầu Vàng Bà Nà');

    // Selecting place updates detail card, Google Maps link and Trip save state
    comp.selectPlace(comp.filteredPlaces[0]);
    fixture.detectChanges();
    expect(comp.googleMapsUrl(comp.selected!)).toContain('google.com/maps/search');
    expect(comp.isSelectedSaved).toBe(false);

    comp.saveSelectedToTrip();
    fixture.detectChanges();
    expect(comp.isSelectedSaved).toBe(true);
    expect(fixture.nativeElement.querySelector('.save-msg')?.textContent).toContain('Mở Trip Planning');

    // Clear filters restores full scope
    comp.clearFilters();
    fixture.detectChanges();
    expect(comp.filteredPlaces.length).toBe(3);
    expect(comp.selected).toBeNull();

    // Panel collapse toggles visibility state
    comp.togglePanel();
    fixture.detectChanges();
    expect(comp.panelOpen).toBe(false);
    expect(fixture.nativeElement.querySelector('.panel-reopen')).not.toBeNull();
  });
});
