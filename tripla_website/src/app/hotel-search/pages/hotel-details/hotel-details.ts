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
import { injectLiveHttp } from '../../../services/live-http';
import { AuthService } from '../../../services/auth-service';
import { BookingCartService } from '../../../services/booking-cart.service';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';

@Component({
  selector: 'app-hotel-details', standalone: true, imports: [CommonModule, RouterLink, ActivityNavigation, SiteFooterComponent, HotelSearchBar, SaveHotelTrip],
  templateUrl: './hotel-details.html', styleUrl: './hotel-details.css',
})
export class HotelDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = injectLiveHttp();
  private readonly apiBase = '/api/v1';
  readonly isMongoConnected = signal(false);
  private readonly checkout = inject(CheckoutStateService);
  private readonly authService = inject(AuthService);
  readonly cart = inject(BookingCartService);
  readonly checkoutError = signal('');
  readonly searchState = signal<HotelSearchState | null>(null);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly hotel = signal<Hotel | null>(null);
  readonly tripStore = inject(SavedTrips);
  readonly saveOpen = signal(false);
  readonly roomAvailability = signal<Record<string, number>>({});
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
        this.cart.clearMessages();
        const id = params.get('identifier') || params.get('id');
        const isDemo = query.get('demo') === 'true';
        this.isMongoConnected.set(false);
        this.hotel.set(isDemo ? demoHotels.find(hotel => hotel.id === id) || null : null);

        const state = readHotelSearch(query);
        if (this.http && !isDemo && (!state.criteria.checkIn || !state.criteria.checkOut || validateHotelCriteria(state.criteria))) {
          const checkIn = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
          const checkOut = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
          state.criteria = {
            ...state.criteria,
            location: state.criteria.location || 'Việt Nam',
            checkIn: state.criteria.checkIn || checkIn,
            checkOut: state.criteria.checkOut || checkOut,
            adults: Math.max(1, state.criteria.adults || 2),
            children: Math.max(0, state.criteria.children || 0),
            rooms: Math.max(1, state.criteria.rooms || 1),
          };
        }
        this.searchState.set(state);
        const criteria = state.criteria;
        this.nights.set(validateHotelCriteria(criteria) ? 0 : hotelNights(criteria));
        this.staySummary.set(this.nights()
          ? `${criteria.checkIn} → ${criteria.checkOut} · ${this.nights()} đêm · ${criteria.adults} người lớn · ${criteria.children} trẻ em · ${criteria.rooms} phòng` : 'Chưa chọn ngày ở và số khách hợp lệ');

        if (this.http && id && !isDemo) {
          this.cart.getCart().subscribe();
          this.http.get<{ success: boolean; hotel?: Hotel }>(`${this.apiBase}/hotels/${encodeURIComponent(id)}`)
            .subscribe({
              next: (res) => {
                if (res?.hotel) {
                  this.hotel.set(res.hotel);
                  this.isMongoConnected.set(true);
                  this.refreshRoomsAvailability(res.hotel, criteria.checkIn, criteria.checkOut);
                }
              },
              error: () => {
                this.isMongoConnected.set(false);
              }
            });
        }
        this.selectImage(0);
      });
  }

  private refreshRoomsAvailability(hotel: Hotel, checkIn: string, checkOut: string): void {
    const rooms = hotel.rooms || [];
    if (!rooms.length || !checkIn || !checkOut) return;
    rooms.forEach((rm) => {
      const roomId = rm._id || rm.id;
      if (!roomId) return;
      this.cart.checkRoomAvailability(roomId, checkIn, checkOut).subscribe((res) => {
        if (res?.success && typeof res.availableStock === 'number') {
          this.roomAvailability.update((curr) => ({ ...curr, [roomId]: res.availableStock! }));
        }
      });
    });
  }

  availableForRoom(room: HotelRoom): number {
    const key = room._id || room.id;
    const live = this.roomAvailability()[key];
    return typeof live === 'number' ? live : Number(room.stock ?? room.total_units ?? 5);
  }

  addRoomToCart(room: HotelRoom): void {
    const h = this.hotel();
    const criteria = this.searchState()?.criteria;
    if (!h) return;
    const checkIn = criteria?.checkIn || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const checkOut = criteria?.checkOut || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    this.cart
      .addToCart({
        hotel_id: h._id || h.id,
        hotel_name: h.name,
        hotel_slug: h.hotel_slug,
        room_id: room._id || room.id,
        room_name: room.name,
        unit_price: room.pricePerNight,
        quantity: 1,
        check_in: checkIn,
        check_out: checkOut,
        availableStock: this.availableForRoom(room)
      })
      .subscribe();
  }

  changeCartQuantity(itemId: string, nextQty: number): void {
    this.cart.updateCartItem(itemId, nextQty).subscribe();
  }

  removeCartItem(itemId: string): void {
    this.cart.removeCartItem(itemId).subscribe();
  }

  checkoutFromCart(): void {
    if (!this.cart.items().length) return;
    this.authService.requireAuth(() => {
      void this.router.navigate(['/checkout/hotel'], { queryParams: { fromCart: 'true' } });
    }, 'Vui lòng đăng nhập tài khoản Du khách trước khi thanh toán giỏ đặt phòng.');
  }

  selectImage(index: number): void {
    this.selectedImage.set(index);
    this.imageFailed.set(false);
  }
  private checkoutInput(room: HotelRoom): HotelBookingInput | null {
    const hotel = this.hotel(), state = this.searchState();
    if (!hotel || !state) return null;
    const isDemo =
      this.route.snapshot.queryParamMap.get('demo') === 'true' ||
      !this.isMongoConnected();
    return {
      hotel,
      room,
      criteria: state.criteria,
      filters: state.filters,
      rateId: isDemo ? undefined : (room.rateId || room.id || 'catalog-standard'),
      source: isDemo ? 'demo' : 'catalog',
    };
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
