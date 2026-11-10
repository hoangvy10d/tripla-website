import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivityCategory,
  ActivitySearchCriteria,
  activityCategories,
} from '../../models/activity-search.model';
@Component({
  selector: 'app-activity-filter-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-filter-sidebar.html',
  styleUrl: './activity-filter-sidebar.css',
})
export class ActivityFilterSidebar {
  readonly criteria = input.required<ActivitySearchCriteria>();
  readonly filtersChange = output<ActivitySearchCriteria>();
  readonly categories = activityCategories;
  readonly limit = 4000000;
  get hasFilters(): boolean {
    const c = this.criteria();
    return !!(c.categories.length || c.minPrice !== undefined || c.maxPrice !== undefined);
  }
  toggle(category: ActivityCategory): void {
    const c = this.criteria();
    this.filtersChange.emit({
      ...c,
      categories: c.categories.includes(category)
        ? c.categories.filter((value) => value !== category)
        : [...c.categories, category],
    });
  }
  reset(): void {
    this.filtersChange.emit({
      ...this.criteria(),
      categories: [],
      minPrice: undefined,
      maxPrice: undefined,
    });
  }
  resetCategories(): void {
    this.filtersChange.emit({ ...this.criteria(), categories: [] });
  }
  resetPrice(): void {
    this.filtersChange.emit({ ...this.criteria(), minPrice: undefined, maxPrice: undefined });
  }
  price(side: 'min' | 'max', value: string): void {
    const c = this.criteria();
    const amount = Number(value);
    this.filtersChange.emit(
      side === 'min'
        ? { ...c, minPrice: amount === 0 ? undefined : Math.min(amount, c.maxPrice ?? this.limit) }
        : { ...c, maxPrice: amount === this.limit ? undefined : Math.max(amount, c.minPrice ?? 0) },
    );
  }
}
