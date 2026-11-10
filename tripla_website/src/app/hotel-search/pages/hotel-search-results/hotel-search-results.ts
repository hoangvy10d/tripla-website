import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotelSearchBar } from '../../components/hotel-search-bar/hotel-search-bar';
import { HotelFilterSidebar } from '../../components/hotel-filter-sidebar/hotel-filter-sidebar';
import { HotelResultsList } from '../../components/hotel-results-list/hotel-results-list';
import {
  HotelSearchCriteria,
  HotelSearchState,
  readHotelSearch,
  hotelSearchParams,
  validateHotelCriteria,
  localDateString,
} from '../../models/hotel-search-criteria.model';
import { HotelFilter, defaultHotelFilters } from '../../models/hotel-filter.model';
import { Hotel } from '../../models/hotel.model';
import { findDemoHotels } from '../../services/hotel-demo';
@Component({
  selector: 'app-hotel-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink, HotelSearchBar, HotelFilterSidebar, HotelResultsList],
  templateUrl: './hotel-search-results.html',
  styleUrl: './hotel-search-results.css',
})
export class HotelSearchResults {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly state = signal<HotelSearchState | null>(null);
  readonly error = signal('');
  readonly hotels = signal<Hotel[]>([]);
  readonly demo = signal(false);
  readonly filtersExpanded = signal(false);
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = readHotelSearch(params);
      const previous = this.state();
      // Filter-only navigation must preserve unconfirmed edits in HotelSearchBar.
      if (previous && JSON.stringify(previous.criteria) === JSON.stringify(next.criteria))
        next.criteria = previous.criteria;
      this.state.set(next);
      this.error.set(validateHotelCriteria(next.criteria) || '');
      this.demo.set(params.get('demo') === 'true');
      this.hotels.set(this.demo() && !this.error() ? findDemoHotels(next.criteria.location) : []);
    });
  }
  search(criteria: HotelSearchCriteria) {
    this.navigate(criteria, this.state()!.filters);
  }
  filter(filters: HotelFilter) {
    this.navigate(this.state()!.criteria, filters);
  }
  resetFilters() {
    this.filter(defaultHotelFilters());
  }
  previewDemo() {
    let criteria = { ...this.state()!.criteria, location: 'Đà Lạt' };
    if (validateHotelCriteria(criteria)) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      criteria = { service: 'hotel', location: 'Đà Lạt', checkIn: localDateString(today),
        checkOut: localDateString(tomorrow), adults: 2, children: 0, rooms: 1 };
    }
    void this.router.navigate(['/hotel-search'], {
      queryParams: { ...hotelSearchParams(criteria, defaultHotelFilters()), demo: 'true' },
    });
  }
  private navigate(criteria: HotelSearchCriteria, filters: HotelFilter) {
    const error = validateHotelCriteria(criteria);
    if (error) {
      this.error.set(error);
      return;
    }
    void this.router.navigate(['/hotel-search'], {
      queryParams: { ...hotelSearchParams(criteria, filters), demo: this.demo() ? 'true' : null },
    });
  }
}
