import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import {
  BusCriteria,
  BusFilters,
  BusSearchState,
  busSearchParams,
  readBusSearch,
  shiftBusDate,
  validateBusCriteria,
} from '../../models/bus-search.model';
import { BusTrip } from '../../models/bus.model';
import { BusSearchService, filterBusTrips } from '../../services/bus-search';
import { BusSearchBar } from '../../components/bus-search-bar/bus-search-bar';
import { BusFilterSidebar } from '../../components/bus-filter-sidebar/bus-filter-sidebar';
import { BusCard } from '../../components/bus-card/bus-card';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
import { localDateString } from '../../../hotel-search/models/hotel-search-criteria.model';
@Component({
  selector: 'app-bus-search-results',
  standalone: true,
  imports: [CommonModule, BusSearchBar, BusFilterSidebar, BusCard, ActivityNavigation],
  templateUrl: './bus-search-results.html',
  styleUrl: './bus-search-results.css',
})
export class BusSearchResults {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly source = inject(BusSearchService);
  readonly state = signal<BusSearchState | null>(null);
  readonly rawTrips = signal<BusTrip[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selection = signal<{ outbound: BusTrip | null; inbound: BusTrip | null }>({
    outbound: null,
    inbound: null,
  });
  readonly trips = computed(() =>
    this.state() ? filterBusTrips(this.rawTrips(), this.state()!.filters) : [],
  );
  readonly operators = computed(() => [
    ...new Map(
      this.rawTrips().map((trip) => [
        trip.operatorId,
        { id: trip.operatorId, name: trip.operatorName },
      ]),
    ).values(),
  ]);
  readonly activeDate = computed(() => {
    const s = this.state();
    return s ? (s.leg === 'inbound' ? s.criteria.returnDate! : s.criteria.departureDate) : '';
  });
  readonly dates = computed(() =>
    this.error() || !this.activeDate()
      ? []
      : [-2, -1, 0, 1, 2, 3, 4].map((offset) => shiftBusDate(this.activeDate(), offset)),
  );
  readonly today = localDateString(new Date());
  readonly summary = computed(() => {
    const trips = this.rawTrips();
    return trips.length
      ? {
          price: Math.min(...trips.map((t) => t.price)),
          duration: Math.min(...trips.map((t) => t.durationMinutes)),
        }
      : null;
  });
  constructor() {
    this.route.queryParamMap
      .pipe(
        map(readBusSearch),
        tap((next) => {
          const previous = this.state();
          if (previous && JSON.stringify(previous.criteria) === JSON.stringify(next.criteria))
            next.criteria = previous.criteria;
          else this.selection.set({ outbound: null, inbound: null });
          this.state.set(next);
          this.loading.set(true);
          this.rawTrips.set([]);
          this.error.set(validateBusCriteria(next.criteria));
        }),
        switchMap((state) =>
          this.error()
            ? of([] as BusTrip[])
            : this.source.search(state).pipe(
                catchError(() => {
                  this.error.set('Không thể tải chuyến xe. Vui lòng tìm lại.');
                  return of([] as BusTrip[]);
                }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((trips) => {
        this.rawTrips.set(trips);
        this.loading.set(false);
      });
  }
  navigate(state: BusSearchState): void {
    const error = validateBusCriteria(state.criteria);
    if (error) {
      this.error.set(error);
      return;
    }
    void this.router.navigate(['/bus-search'], { queryParams: busSearchParams(state) });
  }
  search(criteria: BusCriteria): void {
    this.navigate({ ...this.state()!, criteria, leg: 'outbound' });
  }
  filter(filters: BusFilters): void {
    this.navigate({ ...this.state()!, filters });
  }
  changeLeg(leg: 'outbound' | 'inbound'): void {
    this.navigate({ ...this.state()!, leg });
  }
  changeDate(date: string): void {
    const s = this.state()!;
    const c = { ...s.criteria };
    if (s.leg === 'inbound') c.returnDate = date;
    else {
      c.departureDate = date;
      if (c.returnDate && c.returnDate < date) c.returnDate = date;
    }
    this.navigate({ ...s, criteria: c });
  }
  disabledDate(date: string): boolean {
    return (
      date < this.today ||
      (this.state()?.leg === 'inbound' && date < this.state()!.criteria.departureDate)
    );
  }
  choose(trip: BusTrip): void {
    const state = this.state()!;
    this.selection.update((value) => ({ ...value, [state.leg]: trip }));
    if (state.leg === 'outbound' && state.criteria.returnDate) this.changeLeg('inbound');
  }
  openDetails(trip: BusTrip): void {
    void this.router.navigate(['/buses', trip.id], { queryParams: busSearchParams(this.state()!) });
  }
  price(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
