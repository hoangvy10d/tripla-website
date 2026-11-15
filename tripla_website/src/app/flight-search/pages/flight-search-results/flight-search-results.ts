import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { injectLiveHttp } from '../../../services/live-http';
import { FlightSearchBar } from '../../components/flight-search-bar/flight-search-bar';
import { FlightFilterSidebar } from '../../components/flight-filter-sidebar/flight-filter-sidebar';
import { FlightDateNavigation } from '../../components/flight-date-navigation/flight-date-navigation';
import { FlightSortBar } from '../../components/flight-sort-bar/flight-sort-bar';
import { FlightResultsList } from '../../components/flight-results-list/flight-results-list';
import {
  FlightSearchCriteria,
  readFlightCriteria,
  flightCriteriaParams,
  validateFlightCriteria,
  airports,
  localDateString,
} from '../../models/flight-search-criteria.model';
import {
  FlightFilter,
  FlightSort,
  readFlightFilters,
  readFlightSort,
  defaultFlightFilters,
  flightFilterParams,
  filterAndSortFlights,
} from '../../models/flight-filter.model';
import { Flight, FlightSearchData, FlightSelection } from '../../models/flight.model';
import { demoFlightData } from '../../services/flight-demo';
import { CheckoutStateService } from '../../../checkout/services/checkout-state.service';
import { FlightOfferDialog, FlightFareOption } from '../../components/flight-offer-dialog/flight-offer-dialog';
import { FlightFare } from '../../models/flight.model';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';
interface AppliedFlightSearch {
  criteria: FlightSearchCriteria;
  filters: FlightFilter;
  sort: FlightSort;
  leg: 'outbound' | 'inbound';
}
@Component({
  selector: 'app-flight-search-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ActivityNavigation,
    SiteFooterComponent,
    FlightSearchBar,
    FlightFilterSidebar,
    FlightDateNavigation,
    FlightSortBar,
    FlightResultsList,
    FlightOfferDialog,
  ],
  templateUrl: './flight-search-results.html',
  styleUrl: './flight-search-results.css',
})
export class FlightSearchResults {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = injectLiveHttp();
  private readonly apiBase = '/api/v1';
  private readonly checkout=inject(CheckoutStateService);
  readonly checkoutError=signal('');
  readonly state = signal<AppliedFlightSearch | null>(null);
  readonly error = signal('');
  readonly filtersExpanded = signal(false);
  // null means no data source, not a real empty search response. Wire an API adapter here later.
  readonly data = signal<FlightSearchData | null>(null);
  readonly loading = signal(false);
  readonly demo = signal(false);
  readonly isMongoConnected = signal(false);
  readonly pendingFlight = signal<Flight | null>(null);
  readonly fareSelection = signal<{ outbound: FlightFare | null; inbound: FlightFare | null }>({ outbound: null, inbound: null });
  readonly selection = signal<FlightSelection>({ outbound: null, inbound: null });
  readonly rawFlights = computed(() => {
    const s = this.state();
    return s ? this.data()?.[s.leg] || [] : [];
  });
  readonly flights = computed(() => {
    const s = this.state();
    return s ? filterAndSortFlights(this.rawFlights(), s.filters, s.sort) : [];
  });
  readonly airlines = computed(() => [
    ...new Map(
      this.rawFlights().map((f) => [f.airlineCode, { code: f.airlineCode, name: f.airlineName }]),
    ).values(),
  ]);
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.pendingFlight.set(null);
      const next: AppliedFlightSearch = {
        criteria: readFlightCriteria(params),
        filters: readFlightFilters(params),
        sort: readFlightSort(params),
        leg:
          params.get('leg') === 'inbound' && params.get('tripType') === 'round-trip'
            ? 'inbound'
            : 'outbound',
      };
      const previous = this.state();
      if (previous && JSON.stringify(previous.criteria) === JSON.stringify(next.criteria))
        next.criteria = previous.criteria;
      else {
        const onlyReturnChanged=previous?.criteria.tripType==='round-trip' && next.criteria.tripType==='round-trip'
          && JSON.stringify({...previous.criteria,returnDate:next.criteria.returnDate})===JSON.stringify(next.criteria);
        this.selection.set({ outbound: onlyReturnChanged?this.selection().outbound:null, inbound: null });
        this.fareSelection.set({ outbound: onlyReturnChanged?this.fareSelection().outbound:null, inbound: null });
        this.data.set(null);
      }
      this.state.set(next);
      this.error.set(validateFlightCriteria(next.criteria) || '');
      const wasDemo = this.demo();
      this.demo.set(params.get('demo') === 'true');
      if (this.demo()) this.data.set(this.error() ? null : demoFlightData(next.criteria));
      else if (wasDemo) {
        this.data.set(null);
        this.selection.set({ outbound: null, inbound: null });
        this.fareSelection.set({ outbound: null, inbound: null });
      }
      this.isMongoConnected.set(false);
      this.loading.set(false);
      if (this.http && !this.error() && !this.demo() && next.criteria.from.code && next.criteria.to.code) {
        this.loading.set(true);
        const httpParams = new HttpParams()
          .set('from', next.criteria.from.code)
          .set('to', next.criteria.to.code)
          .set('departureDate', next.criteria.departureDate)
          .set('returnDate', next.criteria.returnDate || next.criteria.departureDate)
          .set('tripType', next.criteria.tripType);
        this.http
          .get<{ success: boolean; outbound?: Flight[]; inbound?: Flight[] }>(
            `${this.apiBase}/flights`,
            { params: httpParams },
          )
          .subscribe({
            next: (res) => {
              this.loading.set(false);
              this.isMongoConnected.set(true);
              if (res?.outbound && res.outbound.length > 0) {
                this.data.set({
                  outbound: res.outbound,
                  inbound: res.inbound || [],
                });
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
  search(criteria: FlightSearchCriteria) {
    this.navigate({ ...this.state()!, criteria, leg: 'outbound' });
  }
  previewDemo(): void {
    let criteria = this.state()!.criteria;
    if (validateFlightCriteria(criteria)) criteria = {
      service: 'flight', tripType: 'one-way', from: airports[0], to: airports[1],
      departureDate: localDateString(new Date()), returnDate: null,
      adults: 1, children: 0, infants: 0, cabin: 'Phổ thông',
    };
    void this.router.navigate(['/flight-search-results'], { queryParams: {
      ...flightCriteriaParams(criteria), ...flightFilterParams(defaultFlightFilters(), 'cheapest'),
      demo: 'true', leg: 'outbound',
    } });
  }
  filter(filters: FlightFilter) {
    this.navigate({ ...this.state()!, filters });
  }
  resetFilters() {
    this.filter(defaultFlightFilters());
  }
  sort(sort: FlightSort) {
    this.navigate({ ...this.state()!, sort });
  }
  changeLeg(leg: 'outbound' | 'inbound') {
    this.navigate({ ...this.state()!, leg });
  }
  changeDate(date: string) {
    const s = this.state()!;
    const criteria = { ...s.criteria };
    if (s.leg === 'inbound') criteria.returnDate = date;
    else {
      criteria.departureDate = date;
      if (criteria.tripType === 'round-trip' && criteria.returnDate! < date)
        criteria.returnDate = date;
    }
    if (criteria.tripType === 'round-trip' && criteria.returnDate! < criteria.departureDate)
      criteria.returnDate = criteria.departureDate;
    this.navigate({ ...s, criteria });
  }
  chooseFlight(flight: Flight) {
    const s = this.state()!;
    this.selection.update((v) => ({ ...v, [s.leg]: flight }));
    if (s.criteria.tripType === 'round-trip' && s.leg === 'outbound') this.changeLeg('inbound');
  }
  openFlight(flight: Flight): void {
    const state=this.state()!;
    if(state.criteria.tripType==='round-trip') {
      if(state.leg==='outbound') {
        this.selection.set({outbound:flight,inbound:null});
        this.fareSelection.set({outbound:null,inbound:null});
        this.changeLeg('inbound');return;
      }
      if(!this.selection().outbound){this.changeLeg('outbound');return;}
      this.fareSelection.set({outbound:null,inbound:null});
      this.selection.update(value=>({...value,inbound:flight}));
    }
    this.pendingFlight.set(flight);
  }
  chooseFare(offer: { flight: Flight; fare: FlightFareOption }): void {
    if(offer.fare.outboundFare && offer.fare.inboundFare){
      const go=offer.fare.outboundFare,back=offer.fare.inboundFare;
      this.fareSelection.set({outbound:go,inbound:back});
      this.selection.update(value=>({outbound:value.outbound?{...value.outbound,price:go.price,currency:go.currency}:null,
        inbound:{...offer.flight,price:back.price,currency:back.currency}}));
      this.pendingFlight.set(null);this.startCheckout();return;
    }
    const leg = this.state()!.leg;
    this.fareSelection.update(value => ({ ...value, [leg]: offer.fare }));
    this.pendingFlight.set(null);
    this.chooseFlight({ ...offer.flight, price: offer.fare.price, currency: offer.fare.currency });
    this.startCheckout();
  }
  startCheckout():void {
    const state=this.state(),selection=this.selection(),fares=this.fareSelection();
    if(!state||!selection.outbound||!fares.outbound)return;
    if(state.criteria.tripType==='round-trip'&&(!selection.inbound||!fares.inbound)){this.checkoutError.set('Chọn gói giá cho cả hai chiều trước khi tiếp tục.');return;}
    try{const draft=this.checkout.startFlight({criteria:state.criteria,outbound:selection.outbound,inbound:selection.inbound||undefined,
      fares:{outbound:fares.outbound,inbound:fares.inbound||undefined},source:(this.demo() || !this.isMongoConnected())?'demo':'catalog'});
      this.checkoutError.set('');void this.router.navigate(['/checkout','flight'],{queryParams:{draft:draft.id}});
    }catch(error){this.checkoutError.set(error instanceof Error?error.message:'Không thể tạo bản nháp chuyến bay.');}
  }
  private navigate(next: AppliedFlightSearch) {
    const error = validateFlightCriteria(next.criteria);
    if (error) {
      this.error.set(error);
      return;
    }
    void this.router.navigate(['/flight-search-results'], {
      queryParams: {
        ...flightCriteriaParams(next.criteria),
        ...flightFilterParams(next.filters, next.sort),
        leg: next.leg,
        demo: this.demo() ? 'true' : null,
      },
    });
  }
}
