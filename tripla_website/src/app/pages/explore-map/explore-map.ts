import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { addBaseTileLayer, loadLeaflet } from '../../services/leaflet-loader';
import { SavedPlaceKey, SavedTrips } from '../../services/saved-trips';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';

declare global {
  interface Window {
    L?: any;
  }
}

interface MapPlace {
  id: string;
  slug?: string;
  hotel_slug?: string;
  kind: 'location' | 'hotel' | 'activity';
  name: string;
  category: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  price: number;
  image?: string;
  rating?: number;
  reelCount?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'Tất cả': 'Tất cả',
  'Khách sạn': 'Khách sạn',
  'Hoạt động': 'Hoạt động',
  restaurant: 'Ẩm thực',
  attraction: 'Điểm tham quan',
  nature: 'Thiên nhiên',
  cafe: 'Cà phê',
};

@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SiteHeaderComponent],
  templateUrl: './explore-map.html',
  styleUrls: ['./explore-map.css']
})
export class ExploreMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private savedTrips = inject(SavedTrips);
  private readonly apiBase = '/api/v1';

  places: MapPlace[] = [];
  categories: string[] = ['Tất cả'];
  quickCities: Array<{ name: string; count: number }> = [];
  activeCategory = 'Tất cả';
  activeCity = '';
  searchText = '';
  selected: MapPlace | null = null;
  saveNotice = '';
  panelOpen = true;
  isLoading = true;
  errorMessage: string | null = null;

  private map: any = null;
  private markerLayer: any = null;
  private markersById = new Map<string, any>();

  ngAfterViewInit(): void {
    this.loadLeaflet()
      .then(() => {
        this.initMap();
        this.loadPlaces();
      })
      .catch(() => {
        this.errorMessage = 'Không tải được thư viện bản đồ Leaflet (cần kết nối Internet).';
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadLeaflet(): Promise<void> {
    return loadLeaflet().then(() => undefined);
  }

  private initMap(): void {
    const L = window.L;
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapEl.nativeElement, { zoomControl: false }).setView([16.0, 107.5], 6);
      L.control.zoom({ position: 'topright' }).addTo(this.map);
      addBaseTileLayer(L, this.map);
      this.markerLayer = L.layerGroup().addTo(this.map);
    });
  }

  private loadPlaces(): void {
    this.http
      .get<any>(`${this.apiBase}/map/places`)
      .pipe(
        catchError(() =>
          forkJoin({
            locations: this.http.get<any>(`${this.apiBase}/locations`).pipe(catchError(() => of({ items: [] }))),
            hotels: this.http.get<any>(`${this.apiBase}/hotels`).pipe(catchError(() => of({ items: [] }))),
            activities: this.http.get<any>(`${this.apiBase}/activities`).pipe(catchError(() => of({ items: [] }))),
          }),
        ),
      )
      .subscribe((res) => {
        if (Array.isArray(res?.items) && res.items.length > 0) {
          this.places = res.items
            .map((p: any) => this.toPlace(p, (p.kind as MapPlace['kind']) || 'location'))
            .filter((p: MapPlace | null): p is MapPlace => !!p);
        } else {
          const locs: MapPlace[] = (res?.locations?.items || [])
            .map((l: any) => this.toPlace(l, 'location'))
            .filter((p: MapPlace | null): p is MapPlace => !!p);
          const hts: MapPlace[] = (res?.hotels?.items || [])
            .map((h: any) => this.toPlace(h, 'hotel'))
            .filter((p: MapPlace | null): p is MapPlace => !!p);
          const locIds = new Set(locs.map((p) => p.id));
          const acts: MapPlace[] = (res?.activities?.items || [])
            .map((a: any) => this.toPlace(a, 'activity'))
            .filter((p: MapPlace | null): p is MapPlace => !!p && !locIds.has(p.id));
          this.places = [...locs, ...acts, ...hts];
        }
        const cats = new Set<string>();
        const cityCounts = new Map<string, number>();
        this.places.forEach((p) => {
          cats.add(p.category);
          if (p.city) cityCounts.set(p.city, (cityCounts.get(p.city) || 0) + 1);
        });
        this.categories = ['Tất cả', ...Array.from(cats)];
        this.quickCities = Array.from(cityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 14)
          .map(([name, count]) => ({ name, count }));
        this.isLoading = false;
        if (!this.places.length) {
          this.errorMessage = 'Chưa có dữ liệu toạ độ. Hãy chạy server (npm start) và seed dữ liệu (npm run seed).';
        }
        this.route.queryParamMap.subscribe(() => {
          this.applyQueryParams();
          this.cdr.markForCheck();
        });
      });
  }

  private resolveCityFromQuery(q: string, cityParam: string): string {
    const combined = this.foldText(`${q} ${cityParam}`);
    if (combined.includes('canada') || combined.includes('banff') || combined.includes('british columbia') || combined.includes('lake louise') || combined.includes('moraine') || combined.includes('icefields') || combined.includes('emerald lake') || combined.includes('cascade')) return 'Canada';
    if (combined.includes('thuy si') || combined.includes('switzerland') || combined.includes('lauterbrunnen') || combined.includes('interlaken') || combined.includes('beatenberg') || combined.includes('beatus') || combined.includes('jungfrau') || combined.includes('grindelwald')) return 'Thụy Sĩ';
    if (combined.includes('cao bang') || combined.includes('ban gioc') || combined.includes('nguom ngao') || combined.includes('pac bo')) return 'Cao Bằng';
    if (combined.includes('quang binh') || combined.includes('phong nha') || combined.includes('son doong') || combined.includes('hang en') || combined.includes('song chay')) return 'Quảng Bình';
    if (combined.includes('vinh hy') || combined.includes('ninh thuan') || combined.includes('amanoi') || combined.includes('nui chua')) return 'Ninh Thuận';
    if (combined.includes('phu yen') || combined.includes('song cau') || combined.includes('bai san ho') || combined.includes('zannier')) return 'Phú Yên';
    if (combined.includes('da lat') || combined.includes('lam dong')) return 'Đà Lạt';
    if (combined.includes('vung tau') || combined.includes('ba ria')) return 'Vũng Tàu';
    if (combined.includes('nha trang') || combined.includes('khanh hoa') || combined.includes('ninh van')) return 'Nha Trang';
    if (combined.includes('da nang') || combined.includes('ba na') || combined.includes('golden bridge') || combined.includes('son tra') || combined.includes('my khe')) return 'Đà Nẵng';
    if (combined.includes('hoi an') || combined.includes('quang nam')) return 'Hội An';
    if (combined.includes('phu quoc') || combined.includes('kien giang')) return 'Phú Quốc';
    if (combined.includes('sa pa') || combined.includes('lao cai') || combined.includes('fansipan')) return 'Sa Pa';
    if (combined.includes('ninh binh') || combined.includes('trang an') || combined.includes('van long')) return 'Ninh Bình';
    if (combined.includes('ha noi') || combined.includes('hoan kiem')) return 'Hà Nội';
    if (combined.includes('ho chi minh') || combined.includes('sai gon') || combined.includes('tp hcm')) return 'Hồ Chí Minh';
    if (combined.includes('hue') || combined.includes('lang co')) return 'Huế';
    if (combined.includes('ha long') || combined.includes('quang ninh') || combined.includes('ti top') || combined.includes('sung sot') || combined.includes('cua van')) return 'Hạ Long';
    return cityParam.trim();
  }

  /** Supports /map?q=...&city=...&focus=<id> coming from TripShop, TripShorts and the Planner. */
  private applyQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const q = (params.get('q') || '').trim();
    const rawCity = (params.get('city') || '').trim();
    const focus = params.get('focus');

    const resolvedCity = this.resolveCityFromQuery(q, rawCity);

    // Hiển thị toàn bộ các điểm tham quan, khách sạn và hoạt động trong cùng khu vực (resolvedCity)
    if (resolvedCity) {
      this.activeCity = resolvedCity;
      this.searchText = '';
    } else if (q) {
      this.activeCity = '';
      this.searchText = q;
    }

    if (this.filteredPlaces.length === 0) {
      this.activeCity = '';
      this.searchText = q || resolvedCity;
      if (this.filteredPlaces.length === 0) {
        this.searchText = '';
      }
    }

    this.renderMarkers(true);

    let target: MapPlace | null = null;
    if (focus) {
      target = this.places.find((p) => p.id === focus) || null;
    } else if (q) {
      const qFold = this.foldText(q);
      const qTokens = qFold.split(' ').filter((w) => w.length >= 2);
      target =
        this.filteredPlaces.find((p) => this.foldText(p.name).includes(qFold)) ||
        this.filteredPlaces.find((p) => {
          const hay = this.foldText(`${p.name} ${p.address}`);
          return qTokens.length > 0 && qTokens.every((t) => hay.includes(t));
        }) ||
        this.filteredPlaces[0] ||
        null;
    } else if (this.filteredPlaces.length > 0 && resolvedCity) {
      target = this.filteredPlaces[0];
    }

    if (target) {
      this.selectPlace(target, this.filteredPlaces.length === 1);
    }
  }

  private toPlace(raw: any, kind: MapPlace['kind']): MapPlace | null {
    const coords = raw.geo?.coordinates;
    let lng = Array.isArray(coords) ? Number(coords[0]) : Number(raw.coordinates?.longitude ?? raw.lng ?? raw.longitude);
    let lat = Array.isArray(coords) ? Number(coords[1]) : Number(raw.coordinates?.latitude ?? raw.lat ?? raw.latitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return {
      id: String(kind === 'location' ? raw._id || raw.id : raw.id || raw._id),
      slug: raw.slug ? String(raw.slug) : undefined,
      hotel_slug: raw.hotel_slug ? String(raw.hotel_slug) : undefined,
      kind,
      name: kind === 'hotel' ? raw.hotel_name || raw.name : raw.name || raw.title,
      category:
        kind === 'hotel'
          ? 'Khách sạn'
          : kind === 'activity'
            ? 'Hoạt động'
            : raw.location_category || raw.category || 'Điểm tham quan',
      address: raw.address || raw.city || '',
      city: String(raw.city || '').trim(),
      lat,
      lng,
      price:
        Number(
          kind === 'hotel'
            ? raw.price_per_night || raw.pricePerNight
            : kind === 'activity'
              ? raw.priceFrom
              : raw.entry_fee ?? raw.price
        ) || 0,
      image: raw.image || raw.image_url || raw.imageUrl || raw.images?.[0],
      rating: Number(raw.rating) || undefined,
      reelCount: Number(raw.reelCount) || 0
    };
  }

  private foldText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\btitov\b|\btitop\b/g, 'ti top')
      .replace(/\bsu sot\b/g, 'sung sot')
      .replace(/\bsapa\b/g, 'sa pa')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private matchesScope(p: MapPlace): boolean {
    const rawQ = this.foldText(this.searchText.trim());
    const cleanQ = rawQ.replace(/^(vinh|thanh pho|tp|tinh)\s+/g, '').trim();
    const tokens = cleanQ.split(' ').filter((w) => w.length >= 2);
    const cityOk = !this.activeCity || this.foldText(`${p.city} ${p.address}`).includes(this.foldText(this.activeCity));
    const hay = this.foldText(`${p.name} ${p.address} ${p.city} ${this.categoryLabel(p.category)}`);
    const searchOk =
      !rawQ ||
      hay.includes(rawQ) ||
      (cleanQ.length >= 2 && hay.includes(cleanQ)) ||
      (tokens.length > 0 && tokens.every((tok) => hay.includes(tok)));
    return cityOk && searchOk;
  }

  get filteredPlaces(): MapPlace[] {
    return this.places.filter(
      (p) => (this.activeCategory === 'Tất cả' || p.category === this.activeCategory) && this.matchesScope(p)
    );
  }

  categoryLabel(cat: string): string {
    return CATEGORY_LABELS[cat] || cat;
  }

  categoryIcon(kind: MapPlace['kind'], category: string): string {
    if (category === 'Tất cả') return 'public';
    if (kind === 'hotel' || category === 'Khách sạn') return 'hotel';
    if (kind === 'activity' || category === 'Hoạt động') return 'local_activity';
    if (category === 'restaurant') return 'restaurant';
    if (category === 'cafe') return 'local_cafe';
    if (category === 'nature') return 'landscape';
    return 'explore';
  }

  categoryCount(cat: string): number {
    if (cat === 'Tất cả') return this.places.filter((p) => this.matchesScope(p)).length;
    return this.places.filter((p) => p.category === cat && this.matchesScope(p)).length;
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.renderMarkers(true);
    this.cdr.markForCheck();
  }

  setCity(city: string): void {
    this.activeCity = this.activeCity === city ? '' : city;
    this.renderMarkers(true);
    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.renderMarkers(false);
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchText = '';
    this.renderMarkers(true);
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.searchText = '';
    this.activeCity = '';
    this.activeCategory = 'Tất cả';
    this.selected = null;
    this.saveNotice = '';
    this.renderMarkers(true);
    this.cdr.markForCheck();
  }

  fitAllPlaces(): void {
    this.renderMarkers(true);
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    this.cdr.markForCheck();
    if (this.map) {
      setTimeout(() => this.map?.invalidateSize(), 260);
    }
  }

  private renderMarkers(fit: boolean): void {
    const L = window.L;
    if (!L || !this.map || !this.markerLayer) return;
    this.markerLayer.clearLayers();
    this.markersById.clear();
    const list = this.filteredPlaces;
    list.forEach((p) => {
      const activeCls = this.selected?.id === p.id ? ' active' : '';
      const iconName = this.categoryIcon(p.kind, p.category);
      const icon = L.divIcon({
        className: '',
        html: `<div class="tripla-pin ${p.kind}${activeCls}" data-place-id="${p.id}"><span class="material-symbols-outlined">${iconName}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(this.markerLayer);
      marker.bindTooltip(p.name, { direction: 'top', offset: [0, -34] });
      marker.on('click', () => this.zone.run(() => this.selectPlace(p, false)));
      this.markersById.set(p.id, marker);
    });
    if (fit && list.length) {
      const bounds = L.latLngBounds(list.map((p) => [p.lat, p.lng]));
      this.map.fitBounds(bounds, { padding: [96, 80], maxZoom: 13 });
    }
  }

  private syncActiveMarkerState(): void {
    const selectedId = this.selected?.id;
    this.markersById.forEach((marker, id) => {
      const pinEl = marker.getElement()?.querySelector?.('.tripla-pin');
      if (pinEl) {
        pinEl.classList.toggle('active', id === selectedId);
      }
    });
  }

  selectPlace(p: MapPlace, fly = true): void {
    this.selected = p;
    this.saveNotice = '';
    this.syncActiveMarkerState();
    if (fly && this.map) {
      this.map.flyTo([p.lat, p.lng], 14, { duration: 0.8 });
    }
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.selected = null;
    this.saveNotice = '';
    this.syncActiveMarkerState();
    this.cdr.markForCheck();
  }

  zoomToSelected(): void {
    if (this.selected && this.map) {
      this.map.flyTo([this.selected.lat, this.selected.lng], 15, { duration: 0.7 });
    }
  }

  googleMapsUrl(p: MapPlace): string {
    const query = [p.name, p.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  private placeSaveKey(p: MapPlace): SavedPlaceKey {
    const prefix = p.kind === 'hotel' ? 'hotel' : p.kind === 'activity' ? 'activity' : 'location';
    return `${prefix}:${p.id}`;
  }

  get isSelectedSaved(): boolean {
    if (!this.selected) return false;
    const key = this.placeSaveKey(this.selected);
    return this.savedTrips.trips().some((t) => t.places.includes(key));
  }

  bookSelected(): void {
    if (!this.selected) return;
    if (this.selected.kind === 'hotel') {
      const checkIn = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const checkOut = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const hotelTarget = this.selected.hotel_slug || this.selected.slug || this.selected.id;
      void this.router.navigate([this.selected.hotel_slug || this.selected.slug ? '/hotel' : '/hotels', hotelTarget], {
        queryParams: { checkIn, checkOut, adults: 2, children: 0, rooms: 1 }
      });
    } else if (this.selected.kind === 'activity') {
      void this.router.navigate(['/activities', this.selected.slug || this.selected.id]);
    } else {
      void this.router.navigate(['/activity-search'], {
        queryParams: {
          location: this.selected.city || 'Việt Nam',
          query: this.selected.name
        }
      });
    }
  }

  saveSelectedToTrip(): void {
    if (!this.selected) return;
    this.savedTrips.refresh();
    if (!this.savedTrips.trips().length) {
      this.savedTrips.create('Chuyến đi từ Bản đồ');
    }
    const targetTrip = this.savedTrips.trips()[0];
    if (!targetTrip) {
      this.saveNotice = 'Không thể lưu chuyến đi trên trình duyệt.';
      this.cdr.markForCheck();
      return;
    }
    const key = this.placeSaveKey(this.selected);
    if (!targetTrip.places.includes(key)) {
      this.savedTrips.toggle(targetTrip.id, key);
    }
    this.saveNotice = `Đã lưu "${this.selected.name}" vào "${targetTrip.name}".`;
    this.cdr.markForCheck();
  }

  formatVnd(val: number): string {
    return val > 0 ? `${val.toLocaleString('vi-VN')} ₫` : 'Miễn phí';
  }
}

