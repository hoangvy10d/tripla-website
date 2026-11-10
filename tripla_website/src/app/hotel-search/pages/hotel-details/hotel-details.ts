import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { Hotel, HotelRoom } from '../../models/hotel.model';
import { CheckoutStateService } from '../../../checkout/services/checkout-state.service';
import { HotelBookingInput, hotelSelectionProblem } from '../../../checkout/adapters/hotel-booking-draft';
import { demoHotels } from '../../services/hotel-demo';
import { HotelSearchCriteria, HotelSearchState, hotelSearchParams, readHotelSearch, hotelNights, validateHotelCriteria } from '../../models/hotel-search-criteria.model';
import { HotelSearchBar } from '../../components/hotel-search-bar/hotel-search-bar';
import { SavedTrips } from '../../../services/saved-trips';
import { SaveHotelTrip } from '../../components/save-hotel-trip/save-hotel-trip';

@Component({
  selector: 'app-hotel-details', standalone: true, imports: [CommonModule, RouterLink, HotelSearchBar, SaveHotelTrip],
  templateUrl: './hotel-details.html', styleUrl: './hotel-details.css',
})
export class HotelDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutStateService);
  readonly checkoutError = signal('');
  readonly searchState = signal<HotelSearchState | null>(null);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly hotel = signal<Hotel | null>(null);
  readonly tripStore = inject(SavedTrips);
  readonly saveOpen = signal(false);
  readonly isSaved = computed(() => {
    const id = this.hotel()?.id;
    return !!id && this.tripStore.trips().some(trip => trip.places.includes(`hotel:${id}`));
  });
  readonly selectedImage = signal(0);
  readonly imageFailed = signal(false);
  readonly staySummary = signal('');
  readonly nights = signal(0);
  readonly activeImage = computed(() => this.hotel()?.images?.[this.selectedImage()] || '');

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        this.checkoutError.set('');
        this.saveOpen.set(false);
        this.hotel.set(query.get('demo') === 'true'
          ? demoHotels.find(hotel => hotel.id === params.get('id')) || null : null);
        this.selectImage(0);
        const state = readHotelSearch(query);
        this.searchState.set(state);
        const criteria = state.criteria;
        this.nights.set(validateHotelCriteria(criteria) ? 0 : hotelNights(criteria));
        this.staySummary.set(this.nights()
          ? `${criteria.checkIn} → ${criteria.checkOut} · ${this.nights()} đêm · ${criteria.adults} người lớn · ${criteria.children} trẻ em · ${criteria.rooms} phòng` : 'Chưa chọn ngày ở và số khách hợp lệ');
      });
  }
  selectImage(index: number): void {
    this.selectedImage.set(index);
    this.imageFailed.set(false);
  }
  private checkoutInput(room: HotelRoom): HotelBookingInput | null {
    const hotel = this.hotel(), state = this.searchState();
    if (!hotel || !state) return null;
    return { hotel, room, criteria: state.criteria, filters: state.filters,
      source: this.route.snapshot.queryParamMap.get('demo') === 'true' ? 'demo' : 'catalog' };
  }
  roomCheckoutProblem(room: HotelRoom): string {
    const input = this.checkoutInput(room);
    return input ? hotelSelectionProblem(input) : 'Vui lòng chọn khách sạn, phòng và ngày ở hợp lệ.';
  }
  startCheckout(room: HotelRoom): void {
    const input = this.checkoutInput(room);
    if (!input) return;
    const problem = hotelSelectionProblem(input);
    this.checkoutError.set(problem);
    if (problem) return;
    const draft = this.checkout.startHotel(input);
    void this.router.navigate(['/checkout', 'hotel'], { queryParams: { draft: draft.id } });
  }
  searchHotels(criteria: HotelSearchCriteria): void {
    const state = this.searchState();
    if (!state || validateHotelCriteria(criteria)) return;
    void this.router.navigate(['/hotel-search'], {
      queryParams: { ...hotelSearchParams(criteria, state.filters),
        demo: this.route.snapshot.queryParamMap.get('demo') === 'true' ? 'true' : null },
    });
  }
  scrollToSection(event: Event, section: 'overview' | 'amenities' | 'rooms' | 'policies'): void {
    event.preventDefault();
    this.element.nativeElement.querySelector<HTMLElement>(`#${section}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
