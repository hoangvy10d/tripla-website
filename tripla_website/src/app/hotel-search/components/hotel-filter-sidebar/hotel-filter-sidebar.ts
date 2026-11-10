import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { accommodationTypes, HotelFilter, hotelAmenityGroups } from '../../models/hotel-filter.model';
@Component({
  selector: 'app-hotel-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotel-filter-sidebar.html',
  styleUrl: './hotel-filter-sidebar.css',
})
export class HotelFilterSidebar {
  readonly filters = input.required<HotelFilter>();
  readonly filtersChange = output<HotelFilter>();
  readonly reset = output<void>();
  readonly types = [...accommodationTypes];
  readonly stars = [5, 4, 3, 2, 1];
  readonly amenityGroups: ReadonlyArray<{ title: string; items: ReadonlyArray<{id: string; label: string}> }> = hotelAmenityGroups;
  readonly expanded = new Set<string>();
  get priceLimit(): number { return Math.max(24000000, this.filters().maxPrice || 0, this.filters().minPrice || 0); }
  toggleExpanded(group: string): void { this.expanded.has(group) ? this.expanded.delete(group) : this.expanded.add(group); }
  readonly amenities = [
    { id: 'wifi', label: 'Wi-Fi' },
    { id: 'pool', label: 'Hồ bơi' },
    { id: 'privatePool', label: 'Hồ bơi riêng' },
    { id: 'parking', label: 'Bãi đỗ xe' },
    { id: 'breakfast', label: 'Bữa sáng' },
  ];
  priceError = '';
  patch(patch: Partial<HotelFilter>) {
    const next = { ...this.filters(), ...patch };
    if (next.minPrice !== null && next.maxPrice !== null && next.minPrice > next.maxPrice) {
      this.priceError = 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.';
      return;
    }
    this.priceError = '';
    this.filtersChange.emit(next);
  }
  price(key: 'minPrice' | 'maxPrice', value: number | null) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      this.priceError = 'Giá phải là số không âm.';
      return;
    }
    this.patch({ [key]: value });
  }
  toggleStar(n: number) {
    const a = this.filters().stars;
    this.patch({ stars: a.includes(n) ? a.filter((v) => v !== n) : [...a, n] });
  }
  toggleAmenity(id: string) {
    const a = this.filters().amenities;
    this.patch({ amenities: a.includes(id) ? a.filter((v) => v !== id) : [...a, id] });
  }
}
