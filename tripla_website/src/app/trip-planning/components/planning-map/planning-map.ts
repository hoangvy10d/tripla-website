import { Component, ElementRef, NgZone, OnDestroy, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningPlace } from '../../models/planning-place.model';
import { addBaseTileLayer, loadLeaflet } from '../../../services/leaflet-loader';

type Coords = { latitude: number; longitude: number };
const validCoords = (c?: Coords): c is Coords =>
  !!c &&
  Number.isFinite(c.latitude) &&
  Number.isFinite(c.longitude) &&
  Math.abs(c.latitude) <= 90 &&
  Math.abs(c.longitude) <= 180 &&
  !(c.latitude === 0 && c.longitude === 0);

@Component({
  selector: 'app-planning-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planning-map.html',
  styleUrl: './planning-map.css',
})
export class PlanningMap implements OnDestroy {
  /** Currently selected place (highlighted on the map). */
  readonly place = input<PlanningPlace | null>(null);
  /** Places of the active day, ordered by start time; drawn as numbered markers + route polyline. */
  readonly route = input<PlanningPlace[]>([]);

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  private readonly zone = inject(NgZone);
  private map: any = null;
  private layer: any = null;
  readonly mapError = signal('');

  readonly searchUrl = computed(() => {
    const p = this.place();
    return p?.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.title + ', ' + p.location)}`
      : null;
  });
  readonly routePoints = computed(() => this.route().filter((p) => validCoords(p.coordinates)));
  readonly hasCoords = computed(() => validCoords(this.place()?.coordinates) || this.routePoints().length > 0);
  readonly embedUrl = computed<string | null>(() => {
    const c = this.place()?.coordinates;
    return validCoords(c) ? `https://maps.google.com/?q=${c.latitude},${c.longitude}` : null;
  });

  constructor() {
    effect(() => {
      const selected = this.place();
      const points = this.routePoints();
      if (!this.hasCoords()) return;
      loadLeaflet()
        .then((L) => this.zone.runOutsideAngular(() => setTimeout(() => this.render(L, selected, points))))
        .catch(() => this.mapError.set('Không tải được thư viện bản đồ (kiểm tra kết nối Internet).'));
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.map?.remove();
    this.map = null;
  }

  private destroyed = false;

  private render(L: any, selected: PlanningPlace | null, points: PlanningPlace[]): void {
    if (this.destroyed) return;
    if (!this.map) {
      this.map = L.map(this.mapEl.nativeElement, { zoomControl: true, attributionControl: true });
      addBaseTileLayer(L, this.map);
      this.layer = L.layerGroup().addTo(this.map);
    }
    this.map.invalidateSize();
    this.layer.clearLayers();

    const latLngs: [number, number][] = [];
    let selectedMarker: any = null;
    points.forEach((p, i) => {
      const c = p.coordinates!;
      const isSelected = selected?.key === p.key;
      const marker = L.marker([c.latitude, c.longitude], { icon: this.pin(L, String(i + 1), isSelected) })
        .bindPopup(`<strong>${i + 1}. ${this.escape(p.title)}</strong><br>${this.escape(p.location || '')}`)
        .addTo(this.layer);
      if (isSelected) selectedMarker = marker;
      latLngs.push([c.latitude, c.longitude]);
    });
    if (latLngs.length > 1) {
      L.polyline(latLngs, { color: '#547c38', weight: 3, opacity: 0.8, dashArray: '6 6' }).addTo(this.layer);
    }

    const sc = selected?.coordinates;
    if (selected && validCoords(sc) && !selectedMarker) {
      selectedMarker = L.marker([sc.latitude, sc.longitude], { icon: this.pin(L, '★', true) })
        .bindPopup(`<strong>${this.escape(selected.title)}</strong><br>${this.escape(selected.location || '')}`)
        .addTo(this.layer);
      latLngs.push([sc.latitude, sc.longitude]);
    }

    if (latLngs.length > 1) this.map.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28], maxZoom: 15 });
    else if (latLngs.length === 1) this.map.setView(latLngs[0], 14);
    selectedMarker?.openPopup();
  }

  private pin(L: any, label: string, active: boolean): any {
    const bg = active ? '#d9822b' : '#547c38';
    return L.divIcon({
      className: '',
      html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};color:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font:600 12px/1 sans-serif">${label}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
    });
  }

  private escape(s: string): string {
    return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
  }
}
