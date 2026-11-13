import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { BusDetails, BusSeat } from '../../models/bus.model';
import {
  BusSearchState,
  readBusSearch,
  busSearchParams,
  validateBusCriteria,
} from '../../models/bus-search.model';
import { BusSearchService } from '../../services/bus-search';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';
import { CheckoutStateService } from '../../../checkout/services/checkout-state.service';
import { injectLiveHttp } from '../../../services/live-http';
@Component({
  selector: 'app-bus-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ActivityNavigation, SiteFooterComponent],
  templateUrl: './bus-details.html',
  styleUrl: './bus-details.css',
})
export class BusDetailsPage {
  private readonly checkout=inject(CheckoutStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly source = inject(BusSearchService);
  private readonly http = injectLiveHttp();
  readonly isMongoConnected = computed(() => !!this.http && !this.details()?.trip.id.startsWith('demo-'));
  readonly details = signal<BusDetails | null>(null);
  readonly state = signal<BusSearchState | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selected = signal<string[]>([]);
  readonly continued = signal(false);
  readonly decks = [1, 2];
  readonly activeDeck = signal(1);
  readonly seats = computed(
    () => this.details()?.seats.filter((seat) => seat.deck === this.activeDeck()) || [],
  );
  readonly selectedSeats = computed(
    () => this.details()?.seats.filter((seat) => this.selected().includes(seat.id)) || [],
  );
  readonly total = computed(() => (this.details()?.trip.price || 0) * this.selected().length);
  readonly requiredSeats = computed(() => this.state()?.criteria.adults || 1);
  readonly canContinue = computed(() => this.selected().length === this.requiredSeats());
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        tap(([, params]) => {
          const state = readBusSearch(params);
          this.state.set(state);
          this.error.set(validateBusCriteria(state.criteria));
          this.loading.set(true);
          this.details.set(null);
          this.selected.set([]);
          this.continued.set(false);
          this.activeDeck.set(1);
        }),
        switchMap(([params]) =>
          this.error()
            ? of(null)
            : this.source.details(params.get('id') || '', this.state()!).pipe(
                catchError(() => {
                  this.error.set('Không thể tải thông tin chuyến xe.');
                  return of(null);
                }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((details) => {
        this.details.set(details);
        this.loading.set(false);
      });
  }
  toggle(seat: BusSeat): void {
    if (!seat.available) return;
    this.continued.set(false);
    if (this.selected().includes(seat.id)) {
      this.selected.update((value) => value.filter((id) => id !== seat.id));
      this.error.set('');
      return;
    }
    if (this.selected().length >= this.requiredSeats()) {
      this.error.set(`Chỉ chọn ${this.requiredSeats()} ghế cho ${this.requiredSeats()} người lớn.`);
      return;
    }
    this.error.set('');
    this.selected.update((value) => [...value, seat.id]);
  }
  money(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: this.details()?.trip.currency || 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
  continue(): void {
    if (this.canContinue()) this.continued.set(true);
  }
  startCheckout():void {
    const details=this.details(),state=this.state();if(!details||!state||!this.canContinue())return;
    try{const draft=this.checkout.startBus({details,state,seats:this.selectedSeats(),source:this.isMongoConnected()?'catalog':'demo'});
      void this.router.navigate(['/checkout','bus'],{queryParams:{draft:draft.id}});
    }catch(error){this.error.set(error instanceof Error?error.message:'Ghế đã chọn chưa hợp lệ.');}
  }
  chooseReturn(): void {
    const state = this.state();
    if (state?.criteria.returnDate)
      void this.router.navigate(['/bus-search'], {
        queryParams: busSearchParams({ ...state, leg: 'inbound' }),
      });
  }
}
