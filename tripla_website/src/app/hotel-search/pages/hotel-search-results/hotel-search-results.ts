import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotelSearchBar } from '../../components/hotel-search-bar/hotel-search-bar';
import { HotelFilterSidebar } from '../../components/hotel-filter-sidebar/hotel-filter-sidebar';
import { HotelResultsList } from '../../components/hotel-results-list/hotel-results-list';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';
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
import { injectLiveHttp } from '../../../services/live-http';

interface HotelCatalogResponse {
  success: boolean;
  count?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items?: Hotel[];
}

@Component({
  selector: 'app-hotel-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink, ActivityNavigation, SiteFooterComponent, HotelSearchBar, HotelFilterSidebar, HotelResultsList],
  templateUrl: './hotel-search-results.html',
  styleUrl: './hotel-search-results.css',
})
export class HotelSearchResults {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = injectLiveHttp();
  private readonly apiBase = 'http://localhost:3000/api/v1';

  readonly state = signal<HotelSearchState | null>(null);
  readonly error = signal('');
  readonly hotels = signal<Hotel[]>([]);
  readonly loading = signal(false);
  readonly demo = signal(false);
  readonly isMongoConnected = signal(false);
  readonly filtersExpanded = signal(false);

  // Q3: keyword search, sortByPrice, pagination & Grid View state
  readonly keyword = signal('');
  readonly sortByPrice = signal<'asc' | 'desc' | ''>('');
  readonly page = signal(1);
  readonly limit = signal(6);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly viewMode = signal<'grid' | 'list'>('grid');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = readHotelSearch(params);
      const previous = this.state();
      // Filter-only navigation must preserve unconfirmed edits in HotelSearchBar.
      if (previous && JSON.stringify(previous.criteria) === JSON.stringify(next.criteria)) {
        next.criteria = previous.criteria;
      }

      const kw = (params.get('keyword') || '').trim();
      const rawSort = (params.get('sortByPrice') || '').trim().toLowerCase();
      const sortVal: 'asc' | 'desc' | '' = rawSort === 'asc' || rawSort === 'desc' ? rawSort : '';
      const pageVal = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
      const limitVal = Math.min(50, Math.max(1, parseInt(params.get('limit') || '6', 10) || 6));

      this.keyword.set(kw);
      this.sortByPrice.set(sortVal);
      this.page.set(pageVal);
      this.limit.set(limitVal);

      // In live runtime, browsing without query dates defaults cleanly to catalog search
      const hasAnyCriteriaParam = params.has('location') || params.has('checkIn') || params.has('checkOut');
      if (this.http && !hasAnyCriteriaParam && params.get('demo') !== 'true') {
        const today = new Date();
        const checkOutDate = new Date(today.getTime() + 2 * 86400000);
        next.criteria = {
          ...next.criteria,
          location: next.criteria.location || 'Việt Nam',
          checkIn: next.criteria.checkIn || localDateString(today),
          checkOut: next.criteria.checkOut || localDateString(checkOutDate),
        };
      }

      this.state.set(next);
      this.error.set(validateHotelCriteria(next.criteria) || '');
      this.demo.set(params.get('demo') === 'true');
      const demoItems = this.demo() && !this.error() ? findDemoHotels(next.criteria.location) : [];
      this.hotels.set(demoItems);
      this.total.set(demoItems.length);
      this.totalPages.set(1);
      this.loading.set(false);
      this.isMongoConnected.set(false);

      if (this.http && !this.error() && !this.demo()) {
        this.loading.set(true);
        let httpParams = new HttpParams()
          .set('accommodation', next.filters.accommodation === 'Tất cả' ? 'all' : next.filters.accommodation)
          .set('minPrice', String(next.filters.minPrice ?? 0))
          .set('maxPrice', String(next.filters.maxPrice ?? 100000000))
          .set('rating', String(next.filters.minRating ?? 0))
          .set('page', String(pageVal))
          .set('limit', String(limitVal));

        if (next.criteria.location.trim()) {
          httpParams = httpParams.set('location', next.criteria.location.trim());
        }
        if (kw) {
          httpParams = httpParams.set('keyword', kw);
        }
        if (sortVal) {
          httpParams = httpParams.set('sortByPrice', sortVal);
        }
        if (next.filters.stars.length > 0) {
          httpParams = httpParams.set('stars', next.filters.stars.join(','));
        }
        if (next.filters.amenities.length > 0) {
          httpParams = httpParams.set('amenities', next.filters.amenities.join(','));
        }
        if (next.filters.freeCancellation) {
          httpParams = httpParams.set('freeCancellation', 'true');
        }
        if (next.filters.dealsOnly) {
          httpParams = httpParams.set('dealsOnly', 'true');
        }
        if (next.filters.area.trim()) {
          httpParams = httpParams.set('area', next.filters.area.trim());
        }

        this.http
          .get<HotelCatalogResponse>(`${this.apiBase}/hotels`, {
            params: httpParams,
          })
          .subscribe({
            next: (res) => {
              this.loading.set(false);
              this.isMongoConnected.set(true);
              if (res?.success && Array.isArray(res.items)) {
                this.hotels.set(res.items);
                this.total.set(res.total ?? res.items.length);
                this.page.set(res.page ?? pageVal);
                this.totalPages.set(res.totalPages ?? 1);
                this.demo.set(false);
              }
            },
            error: () => {
              this.loading.set(false);
              this.isMongoConnected.set(false);
            },
          });
      }
    });
  }

  search(criteria: HotelSearchCriteria) {
    this.navigate(criteria, this.state()!.filters, { page: 1 });
  }

  filter(filters: HotelFilter) {
    this.navigate(this.state()!.criteria, filters, { page: 1 });
  }

  resetFilters() {
    this.filter(defaultHotelFilters());
  }

  onKeywordChange(keyword: string) {
    this.updateCatalogQuery({ keyword: keyword || null, page: 1 });
  }

  onSortChange(sortByPrice: 'asc' | 'desc' | '') {
    this.updateCatalogQuery({ sortByPrice: sortByPrice || null, page: 1 });
  }

  onPageChange(targetPage: number) {
    if (targetPage < 1 || targetPage > this.totalPages()) return;
    this.updateCatalogQuery({ page: targetPage });
  }

  private updateCatalogQuery(patch: Record<string, string | number | null>) {
    const current = this.state();
    let criteria = current?.criteria;
    if (!criteria || validateHotelCriteria(criteria)) {
      const today = new Date();
      const checkOutDate = new Date(today.getTime() + 2 * 86400000);
      criteria = {
        service: 'hotel',
        location: criteria?.location || 'Việt Nam',
        checkIn: localDateString(today),
        checkOut: localDateString(checkOutDate),
        adults: 2,
        children: 0,
        rooms: 1,
      };
    }
    this.navigate(criteria, current?.filters || defaultHotelFilters(), patch);
  }

  previewDemo() {
    let criteria = { ...this.state()!.criteria, location: 'Đà Lạt' };
    if (validateHotelCriteria(criteria)) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      criteria = {
        service: 'hotel',
        location: 'Đà Lạt',
        checkIn: localDateString(today),
        checkOut: localDateString(tomorrow),
        adults: 2,
        children: 0,
        rooms: 1,
      };
    }
    void this.router.navigate(['/hotel-search'], {
      queryParams: { ...hotelSearchParams(criteria, defaultHotelFilters()), demo: 'true' },
    });
  }

  private navigate(
    criteria: HotelSearchCriteria,
    filters: HotelFilter,
    extra: Record<string, string | number | null> = {}
  ) {
    const error = validateHotelCriteria(criteria);
    if (error) {
      this.error.set(error);
      return;
    }
    void this.router.navigate(['/hotel-search'], {
      queryParams: {
        ...hotelSearchParams(criteria, filters),
        keyword: this.keyword() || null,
        sortByPrice: this.sortByPrice() || null,
        page: this.page() > 1 ? this.page() : null,
        limit: this.limit() !== 6 ? this.limit() : null,
        ...extra,
        demo: this.demo() ? 'true' : null,
      },
    });
  }
}
