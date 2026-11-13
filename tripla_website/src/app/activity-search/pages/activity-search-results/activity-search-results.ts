import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { Activity } from '../../models/activity.model';
import {
  ActivityCategory,
  ActivitySearchCriteria,
  activitySearchParams,
  readActivitySearch,
} from '../../models/activity-search.model';
import { ActivitySearchService } from '../../services/activity-search';
import { ActivitySearchBar } from '../../components/activity-search-bar/activity-search-bar';
import { ActivityFilterSidebar } from '../../components/activity-filter-sidebar/activity-filter-sidebar';
import { ActivityResultsList } from '../../components/activity-results-list/activity-results-list';
import { ActivityNavigation } from '../../components/activity-navigation/activity-navigation';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';
import { injectLiveHttp } from '../../../services/live-http';
@Component({
  selector: 'app-activity-search-results',
  standalone: true,
  imports: [
    CommonModule,
    ActivitySearchBar,
    ActivityFilterSidebar,
    ActivityResultsList,
    ActivityNavigation,
    SiteFooterComponent,
  ],
  templateUrl: './activity-search-results.html',
  styleUrl: './activity-search-results.css',
})
export class ActivitySearchResults {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly source = inject(ActivitySearchService);
  readonly isMongoConnected = signal(!!injectLiveHttp());
  readonly criteria = signal<ActivitySearchCriteria>({ location: '', query: '', categories: [] });
  readonly activities = signal<Activity[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    this.route.queryParamMap
      .pipe(
        map(readActivitySearch),
        tap((criteria) => {
          this.criteria.set(criteria);
          this.loading.set(true);
          this.activities.set([]);
          this.error.set(
            criteria.location ? '' : 'Vui lòng chọn hoặc nhập điểm đến để tìm trải nghiệm.',
          );
        }),
        switchMap((criteria) =>
          criteria.location
            ? this.source.search(criteria).pipe(
                catchError(() => {
                  this.error.set('Không thể tải trải nghiệm. Vui lòng tìm lại.');
                  return of([] as Activity[]);
                }),
              )
            : of([] as Activity[]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((activities) => {
        this.activities.set(activities);
        this.loading.set(false);
      });
  }
  search(criteria: ActivitySearchCriteria): void {
    if (!criteria.location.trim()) return;
    void this.router.navigate(['/activity-search'], {
      queryParams: activitySearchParams(criteria),
    });
  }
  filter(categories: ActivityCategory[]): void {
    this.search({ ...this.criteria(), categories });
  }
  changeSort(sort: 'relevant' | 'price-asc' | 'price-desc'): void {
    this.search({ ...this.criteria(), sort });
  }
}
