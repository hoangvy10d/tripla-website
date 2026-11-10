import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { PlanningPlace } from '../../models/planning-place.model';
@Component({
  selector: 'app-planning-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planning-map.html',
  styleUrl: './planning-map.css',
})
export class PlanningMap {
  readonly place = input<PlanningPlace | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  readonly searchUrl = computed(() => {
    const p = this.place();
    return p?.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.title + ', ' + p.location)}`
      : null;
  });
  readonly embedUrl = computed(() => {
    const c = this.place()?.coordinates;
    if (
      !c ||
      !Number.isFinite(c.latitude) ||
      !Number.isFinite(c.longitude) ||
      Math.abs(c.latitude) > 90 ||
      Math.abs(c.longitude) > 180
    )
      return null;
    const bbox = [
      Math.max(-180, c.longitude - 0.015),
      Math.max(-90, c.latitude - 0.01),
      Math.min(180, c.longitude + 0.015),
      Math.min(90, c.latitude + 0.01),
    ].join(',');
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(c.latitude + ',' + c.longitude)}`,
    );
  });
}
