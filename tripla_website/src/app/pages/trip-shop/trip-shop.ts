import { Component, DestroyRef, OnInit, OnDestroy, inject, signal, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { accommodationTypes, defaultHotelFilters, HotelFilter } from '../../hotel-search/models/hotel-filter.model';
import { HotelSearchCriteria, hotelSearchParams, localDateString, validateHotelCriteria } from '../../hotel-search/models/hotel-search-criteria.model';
import { HotelSearchDraft } from '../../hotel-search/services/hotel-search-draft';
import { FlightSearchCriteria, CabinClass, flightCriteriaParams, validateFlightCriteria } from '../../flight-search/models/flight-search-criteria.model';
import { defaultFlightFilters, flightFilterParams } from '../../flight-search/models/flight-filter.model';
import { FlightSearchDraft } from '../../flight-search/services/flight-search-draft';
import { Subject, catchError, of, takeUntil } from 'rxjs';

import { TripShopService } from '../../services/trip-shop';
import { TripShortService } from '../../services/trip-short.service';
import { matchesDestination, popularVietnamDestinations, vietnamDestinations } from '../../models/vietnam-destinations';
import { ActivityCategory, activityCategories, activitySearchParams } from '../../activity-search/models/activity-search.model';
import { BusCriteria,busSearchParams,validateBusCriteria } from '../../bus-search/models/bus-search.model';
import { 
  NavItem, 
  ValueProposition, 
  FlashDeal, 
  Destination, 
  LuxuryStay 
} from '../../models/trip-shop.model';
import { AuthService } from '../../services/auth-service';
import { ParallaxDirective } from '../home/directives/parallax.directive';
import { RevealDirective } from '../home/directives/reveal.directive';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';


@Component({
  selector: 'app-trip-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ParallaxDirective, RevealDirective, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './trip-shop.html',
  styleUrls: ['./trip-shop.css']
})
export class TripShopComponent implements OnInit, OnDestroy {
  private readonly flightDraft = inject(FlightSearchDraft);
  flightSearchError = '';
  searchFlights(): void {
    if (this.bookingTab() !== 'flight') return;
    const criteria: FlightSearchCriteria = { service: 'flight', tripType: this.flightRoundTrip ? 'round-trip' : 'one-way',
      from: { ...this.flightFrom }, to: { ...this.flightTo }, departureDate: this.flightDeparture,
      returnDate: this.flightRoundTrip ? this.flightReturn : null, adults: this.flightAdults,
      children: this.flightChildren, infants: this.flightInfants, cabin: this.cabin as CabinClass };
    this.flightSearchError = validateFlightCriteria(criteria) || '';
    if (this.flightSearchError) return;
    const filters = { ...defaultFlightFilters(), stops: this.directFlight ? [0] : [] };
    void this.router.navigate(['/flight-search-results'], { queryParams: { ...flightCriteriaParams(criteria), ...flightFilterParams(filters, 'cheapest') } });
  }
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly hotelDraft = inject(HotelSearchDraft);
  hotelSearchError = '';
  private hotelFilters = defaultHotelFilters();
  private hotelCriteria(): HotelSearchCriteria {
    return { service: 'hotel', location: this.searchDestination.trim(), checkIn: localDateString(this.checkIn),
      checkOut: localDateString(this.checkOut), adults: this.adults, children: this.children, rooms: this.rooms };
  }
  searchHotels(): void {
    if (this.bookingTab() !== 'hotel') return;
    const criteria = this.hotelCriteria();
    this.hotelSearchError = validateHotelCriteria(criteria) || '';
    if (this.hotelSearchError) return;
    const filters: HotelFilter = { ...this.hotelFilters, accommodation: this.accommodationType };
    void this.router.navigate(['/hotel-search'], { queryParams: hotelSearchParams(criteria, filters) });
  }
  readonly bookingTab = signal<'hotel' | 'flight' | 'tour' | 'bus'>('hotel');
  selectBookingTab(tab: 'hotel' | 'flight' | 'tour' | 'bus'): void {
    this.tourPanel = null;
    this.destinationOpen = false;
    this.guestsOpen = false;
    this.calendarOpen = false;
    this.airportOpen = null;
    this.flightGuestsOpen = false;
    this.bookingTab.set(tab);
  }
  busCountry = 'Tất cả';
  readonly busCountries = ['Tất cả', 'Việt Nam', 'Thái Lan', 'Malaysia'];
  readonly busCities = [
    { name: 'Hồ Chí Minh', country: 'Việt Nam' }, { name: 'Đà Lạt', country: 'Việt Nam' },
    { name: 'Hà Nội', country: 'Việt Nam' }, { name: 'Đà Nẵng', country: 'Việt Nam' },
    { name: 'Bangkok', country: 'Thái Lan' }, { name: 'Chiang Mai', country: 'Thái Lan' },
    { name: 'Kuala Lumpur', country: 'Malaysia' }, { name: 'Penang', country: 'Malaysia' }
  ];
  busFrom = 'Hồ Chí Minh';
  busTo = 'Đà Lạt';
  busDeparture = this.flightDateString(new Date());
  busReturn = this.flightDateString(new Date(Date.now() + 2 * 86400000));
  busRoundTrip = false;
  busCalendar: 'departure' | 'return' | null = null;
  openBusCalendar(side: 'departure' | 'return'): void {
    if (side === 'return' && !this.busRoundTrip) return;
    this.busCalendar = this.busCalendar === side ? null : side;
    this.busPopup = null;
    const [year, month] = (side === 'departure' ? this.busDeparture : this.busReturn).split('-').map(Number);
    this.calendarMonth = new Date(year, month - 1, 1);
  }
  busDayDisabled(day: Date): boolean {
    return day < this.bookingToday || (this.busCalendar === 'return' && this.flightDateString(day) < this.busDeparture);
  }
  busDaySelected(day: Date): boolean {
    return this.flightDateString(day) === (this.busCalendar === 'departure' ? this.busDeparture : this.busReturn);
  }
  selectBusDay(day: Date): void {
    if (this.busDayDisabled(day)) return;
    if (this.busCalendar === 'departure') this.updateBusDeparture(this.flightDateString(day));
    else this.busReturn = this.flightDateString(day);
    this.busCalendar = null;
  }
  busAdults = 1;
  busInfants = 0;
  busPopup: 'from' | 'to' | 'guests' | null = null;
  busCityQuery = '';
  readonly busRoutes = [
    { from: 'Hồ Chí Minh', to: 'Đà Lạt' }, { from: 'Hồ Chí Minh', to: 'Nha Trang' },
    { from: 'Hồ Chí Minh', to: 'Đà Nẵng' }, { from: 'Hồ Chí Minh', to: 'Bình Thuận' },
    { from: 'Hà Nội', to: 'Đà Nẵng' }, { from: 'Hà Nội', to: 'Ninh Bình' },
    { from: 'Hà Nội', to: 'Sa Pa' }, { from: 'Hà Nội', to: 'Hạ Long' },
    { from: 'Đà Nẵng', to: 'Huế' }
  ];
  get busPassengers(): number { return this.busAdults + this.busInfants; }
  get busSuggestedCities(): string[] {
    const names = this.busPopup === 'to'
      ? this.busRoutes.filter(route => route.from === this.busFrom).map(route => route.to)
      : [...new Set(this.busRoutes.map(route => route.from))];
    return names.filter(name => name.toLocaleLowerCase().includes(this.busCityQuery.trim().toLocaleLowerCase()));
  }
  openBusPopup(popup: 'from' | 'to' | 'guests'): void {
    this.busPopup = this.busPopup === popup ? null : popup;
    this.busCityQuery = '';
  }
  chooseBusCity(city: string): void {
    if (this.busPopup === 'from') {
      this.busFrom = city;
      const routes = this.busRoutes.filter(route => route.from === city);
      if (!routes.some(route => route.to === this.busTo)) this.busTo = routes[0].to;
    } else this.busTo = city;
    this.busPopup = null;
  }
  chooseBusRoute(from: string, to: string): void {
    this.busFrom = from;
    this.busTo = to;
    this.busPopup = null;
  }
  changeBusAdults(step: number): void {
    this.busAdults = Math.max(1, Math.min(4, this.busAdults + step));
    this.busInfants = Math.min(this.busInfants, this.busAdults);
  }
  changeBusInfants(step: number): void {
    this.busInfants = Math.max(0, Math.min(this.busAdults, this.busInfants + step));
  }
  busResult = '';
  get availableBusCities() { return this.busCities.filter(city => this.busCountry === 'Tất cả' || city.country === this.busCountry); }
  setBusCountry(country: string): void {
    this.busCountry = country;
    this.busFrom = this.availableBusCities[0].name;
    this.busTo = this.availableBusCities[1].name;
    this.busResult = '';
  }
  swapBusCities(): void { [this.busFrom, this.busTo] = [this.busTo, this.busFrom]; }
  updateBusDeparture(value: string): void {
    this.busDeparture = value;
    if (this.busReturn < value) this.busReturn = value;
  }
  searchBus(): void {
    if(this.bookingTab()!=='bus') return;
    const criteria:BusCriteria={from:this.busFrom,to:this.busTo,departureDate:this.busDeparture,
      returnDate:this.busRoundTrip?this.busReturn:null,adults:this.busAdults,infants:this.busInfants};
    this.busResult=validateBusCriteria(criteria);
    if(this.busResult) return;
    this.busPopup=null;this.busCalendar=null;
    void this.router.navigate(['/bus-search'],{queryParams:busSearchParams({criteria,filters:{operators:[],departureBands:[]},leg:'outbound'})});
  }
  tourPanel: 'destinations' | 'activities' | null = null;
  tourDestination = '';
  tourQuery = '';
  tourPlaceQuery = '';
  tourResult = '';
  readonly tourCategories = activityCategories;
  selectedTourCategories: ActivityCategory[] = [];
  toggleTourCategory(category: ActivityCategory): void {
    this.selectedTourCategories = this.selectedTourCategories.includes(category)
      ? this.selectedTourCategories.filter(value => value !== category) : [...this.selectedTourCategories, category];
  }
  readonly tourCountries = [
    { name: 'Việt Nam', cities: ['Hồ Chí Minh', 'Đà Lạt', 'Đà Nẵng', 'Phú Quốc', 'Hà Nội'], image: '/images/trangan.jpg' },
    { name: 'Thái Lan', cities: ['Bangkok', 'Phuket', 'Chiang Mai'], image: '/resort-night-bg.png' },
    { name: 'Singapore', cities: ['Singapore'], image: '/images/Grassland.jpeg' },
    { name: 'Trung Quốc', cities: ['Bắc Kinh', 'Thượng Hải'], image: '/images/ruongbacthangedit.jpeg' },
    { name: 'Malaysia', cities: ['Kuala Lumpur', 'Penang'], image: '/images/tranganedit.jpeg' }
  ];
  readonly tourGroups = [
    { title: 'Các địa điểm thú vị tại Việt Nam', places: ['Đà Lạt', 'Đà Nẵng', 'Phú Quốc', 'Hồ Chí Minh', 'Hà Nội', 'Ninh Bình'] },
    { title: 'Các địa điểm hàng đầu thế giới', places: ['Bangkok', 'Singapore', 'Tokyo', 'Seoul', 'Paris', 'Kuala Lumpur'] }
  ];
  get matchingTourCountries() {
    if (!this.tourPlaceQuery.trim()) return this.tourCountries;
    return this.tourCountries.map(country => {
      const places = country.name === 'Việt Nam' ? vietnamDestinations
        : country.cities.map(name => ({ name, region: country.name }));
      return { ...country, cities: places.filter(place => matchesDestination(place, this.tourPlaceQuery)).map(place => place.name) };
    }).filter(country => country.cities.length || matchesDestination({ name: country.name, region: '' }, this.tourPlaceQuery));
  }
  chooseTourDestination(name: string): void {
    this.tourDestination = name;
    this.tourPlaceQuery = '';
    this.tourPanel = null;
    this.tourResult = '';
  }
  scrollTourPlaces(element: HTMLElement, direction: number): void {
    element.scrollBy({ left: direction * 220, behavior: 'smooth' });
  }
  searchTours(): void {
    if (this.bookingTab() !== 'tour') return;
    if (!this.tourDestination.trim()) {
      this.tourResult = 'Vui lòng chọn điểm đến trước khi tìm trải nghiệm.';
      this.tourPanel = 'destinations';
      return;
    }
    this.tourPanel = null;
    this.tourResult = '';
    void this.router.navigate(['/activity-search'], { queryParams: activitySearchParams({
      location: this.tourDestination, query: this.tourQuery, categories: this.selectedTourCategories,
    }) });
  }
  flightRoundTrip = true;
  directFlight = false;
  cabin = 'Phổ thông';
  cabinOpen = false;
  readonly cabins = ['Phổ thông', 'Phổ thông đặc biệt', 'Thương gia', 'Hạng nhất'];
  flightAdults = 1;
  flightChildren = 0;
  flightInfants = 0;
  readonly flightPassengerTypes = [
    { key: 'flightAdults' as const, label: 'Người lớn', age: 'Từ 12 tuổi', icon: 'person', min: 1 },
    { key: 'flightChildren' as const, label: 'Trẻ em', age: 'Từ 2 – 11 tuổi', icon: 'child_care', min: 0 },
    { key: 'flightInfants' as const, label: 'Em bé', age: 'Dưới 2 tuổi', icon: 'face', min: 0 }
  ];
  flightPassengerMax(key: 'flightAdults' | 'flightChildren' | 'flightInfants'): number {
    if (key === 'flightInfants') return this.flightAdults;
    return 9 - (key === 'flightAdults' ? this.flightChildren : this.flightAdults);
  }
  changeFlightPassenger(key: 'flightAdults' | 'flightChildren' | 'flightInfants', step: number): void {
    const min = key === 'flightAdults' ? 1 : 0;
    this[key] = Math.max(min, Math.min(this.flightPassengerMax(key), this[key] + step));
    this.flightInfants = Math.min(this.flightInfants, this.flightAdults);
  }
  flightGuestsOpen = false;
  airportOpen: 'from' | 'to' | null = null;
  airportQuery = '';
  readonly airports = [
    { code: 'SGN', city: 'Sài Gòn (TP HCM)', name: 'Sân bay Quốc tế Tân Sơn Nhất' },
    { code: 'HAN', city: 'Hà Nội', name: 'Sân bay Quốc tế Nội Bài' },
    { code: 'PQC', city: 'Phú Quốc', name: 'Sân bay Phú Quốc' },
    { code: 'DLI', city: 'Đà Lạt', name: 'Sân bay Liên Khương' },
    { code: 'DAD', city: 'Đà Nẵng', name: 'Sân bay Quốc tế Đà Nẵng' },
    { code: 'BKK', city: 'Bangkok', name: 'Sân bay Quốc tế Suvarnabhumi' }
  ];
  flightFrom = this.airports[0];
  flightTo = this.airports[5];
  flightDeparture = this.flightDateString(new Date());
  flightReturn = this.flightDateString(new Date(Date.now() + 2 * 86400000));
  flightCalendar: 'departure' | 'return' | null = null;
  openFlightCalendar(side: 'departure' | 'return'): void {
    if (side === 'return' && !this.flightRoundTrip) return;
    this.flightCalendar = this.flightCalendar === side ? null : side;
    const value = side === 'departure' ? this.flightDeparture : this.flightReturn;
    const [year, month] = value.split('-').map(Number);
    this.calendarMonth = new Date(year, month - 1, 1);
    this.airportOpen = null;
    this.flightGuestsOpen = false;
  }
  flightDayDisabled(day: Date): boolean {
    return day < this.bookingToday || (this.flightCalendar === 'return' && this.flightDateString(day) < this.flightDeparture);
  }
  flightDaySelected(day: Date): boolean {
    return this.flightDateString(day) === (this.flightCalendar === 'departure' ? this.flightDeparture : this.flightReturn);
  }
  selectFlightDay(day: Date): void {
    if (this.flightDayDisabled(day)) return;
    if (this.flightCalendar === 'departure') this.updateFlightDeparture(this.flightDateString(day));
    else this.flightReturn = this.flightDateString(day);
    this.flightCalendar = null;
  }
  private flightDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  get filteredAirports() {
    const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    return this.airports.filter(airport => normalize(airport.city + airport.name + airport.code).includes(normalize(this.airportQuery.trim())));
  }
  chooseAirport(airport: typeof this.flightFrom): void {
    if (this.airportOpen === 'from') this.flightFrom = airport;
    else this.flightTo = airport;
    this.airportOpen = null;
  }
  swapAirports(): void { [this.flightFrom, this.flightTo] = [this.flightTo, this.flightFrom]; }
  openAirports(side: 'from' | 'to'): void {
    this.airportOpen = this.airportOpen === side ? null : side;
    this.airportQuery = '';
    this.flightGuestsOpen = false;
  }
  updateFlightDeparture(value: string): void {
    this.flightDeparture = value;
    if (this.flightReturn < value) this.flightReturn = value;
  }
  accommodationType: HotelFilter['accommodation'] = 'Tất cả';
  readonly accommodationTypes = accommodationTypes.slice(0, 4);
  calendarOpen = false;
  readonly bookingToday = new Date(new Date().setHours(0, 0, 0, 0));
  checkIn = this.bookingToday;
  checkOut = new Date(this.bookingToday.getFullYear(), this.bookingToday.getMonth(), this.bookingToday.getDate() + 1);
  calendarMonth = new Date(this.bookingToday.getFullYear(), this.bookingToday.getMonth(), 1);
  draftCheckIn: Date | null = null;
  draftCheckOut: Date | null = null;
  readonly weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  get bookingNights(): number {
    return Math.round((Date.UTC(this.checkOut.getFullYear(), this.checkOut.getMonth(), this.checkOut.getDate()) - Date.UTC(this.checkIn.getFullYear(), this.checkIn.getMonth(), this.checkIn.getDate())) / 86400000);
  }
  get bookingMonths(): Date[] {
    return [this.calendarMonth, new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1)];
  }
  monthDays(month: Date): (Date | null)[] {
    return [...Array((month.getDay() + 6) % 7).fill(null), ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }
  toggleBookingCalendar(): void {
    this.destinationOpen = false;
    this.guestsOpen = false;
    this.calendarOpen = !this.calendarOpen;
    this.draftCheckIn = null;
    this.draftCheckOut = null;
    this.calendarMonth = new Date(this.checkIn.getFullYear(), this.checkIn.getMonth(), 1);
  }
  moveBookingMonth(step: number): void {
    const next = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + step, 1);
    if (next >= new Date(this.bookingToday.getFullYear(), this.bookingToday.getMonth(), 1)) this.calendarMonth = next;
  }
  selectBookingDay(day: Date): void {
    if (day < this.bookingToday) return;
    if (!this.draftCheckIn || this.draftCheckOut || day <= this.draftCheckIn) {
      this.draftCheckIn = day;
      this.draftCheckOut = null;
    } else this.draftCheckOut = day;
  }
  bookingRange(day: Date): boolean {
    return !!this.draftCheckIn && !!this.draftCheckOut && day > this.draftCheckIn && day < this.draftCheckOut;
  }
  applyBookingDates(): void {
    if (!this.draftCheckIn || !this.draftCheckOut) return;
    this.checkIn = this.draftCheckIn;
    this.checkOut = this.draftCheckOut;
    this.calendarOpen = false;
  }
  // Observables Data Stores
  navItems: NavItem[] = [];
  valueProps: ValueProposition[] = [];
  flashDeals: FlashDeal[] = [];
  destinations: Destination[] = [];
  luxuryStays: LuxuryStay[] = [];
  filteredLuxuryStays: LuxuryStay[] = [];

  // Filter States
  activeCategory: string = 'all';
  newsletterEmail: string = '';
  searchDestination = '';
  destinationOpen = false;
  guestsOpen = false;
  adults = 2;
  children = 0;
  rooms = 1;
  recentDestinations: string[] = [];
  readonly popularDestinations = popularVietnamDestinations;
  readonly guestCounters = [
    { key: 'adults' as const, label: 'Người lớn', min: 1, max: 30 },
    { key: 'children' as const, label: 'Trẻ em', min: 0, max: 10 },
    { key: 'rooms' as const, label: 'Phòng', min: 1, max: 10 }
  ];
  get matchingDestinations() {
    if (!this.searchDestination.trim()) return this.popularDestinations;
    return vietnamDestinations.filter(place => matchesDestination(place, this.searchDestination));
  }
  chooseDestination(name: string): void {
    this.hotelSearchError = '';
    this.searchDestination = name;
    this.recentDestinations = [name, ...this.recentDestinations.filter(value => value !== name)].slice(0, 3);
    this.destinationOpen = false;
  }
  changeGuestCount(key: 'adults' | 'children' | 'rooms', step: number): void {
    const counter = this.guestCounters.find(item => item.key === key)!;
    this[key] = Math.max(counter.min, Math.min(counter.max, this[key] + step));
  }
  openDestinationSuggestions(): void {
    this.destinationOpen = true;
    this.guestsOpen = false;
    this.calendarOpen = false;
  }
  toggleGuests(): void {
    this.guestsOpen = !this.guestsOpen;
    this.destinationOpen = false;
    this.calendarOpen = false;
  }

  /**
   * "Đặt ngay" / "Xem Phòng Trống" / "Tìm kiếm" on catalog cards.
   * Opens the matching hotel detail page (with the current dates & guests) when the card
   * maps to a hotel in MongoDB; otherwise runs a hotel search for the card's city/destination.
   */
  beginBooking(destination: string, location = '', matchHotel = true): void {
    this.selectBookingTab('hotel');
    const hotel = matchHotel ? this.matchCatalogHotel(destination) : null;
    const city = location.split(',').pop()?.trim() || (matchHotel ? '' : this.knownDestination(destination));
    const resolvedLocation = hotel ? hotel.name : city || destination;

    let checkIn = this.checkIn;
    let checkOut = this.checkOut;
    if (!(checkIn instanceof Date) || Number.isNaN(checkIn.getTime()) || checkIn < this.bookingToday) {
      checkIn = this.bookingToday;
    }
    if (!(checkOut instanceof Date) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      checkOut = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + 2);
    }

    const criteria: HotelSearchCriteria = {
      service: 'hotel',
      location: resolvedLocation,
      checkIn: localDateString(checkIn),
      checkOut: localDateString(checkOut),
      adults: Math.max(1, this.adults || 2),
      children: Math.max(0, this.children || 0),
      rooms: Math.max(1, this.rooms || 1),
    };
    this.hotelSearchError = '';
    const queryParams = hotelSearchParams(criteria, { ...this.hotelFilters, accommodation: this.accommodationType });
    if (hotel) {
      void this.router.navigate(hotel.slug ? ['/hotel', hotel.slug] : ['/hotels', hotel.id], { queryParams });
    } else {
      void this.router.navigate(['/hotel-search'], { queryParams });
    }
  }

  /** Maps a marketing title like "Thị Trấn Sương Mù Sapa" to a known destination ("Sa Pa"). */
  private knownDestination(title: string): string {
    const squash = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
    const t = squash(title);
    return vietnamDestinations.find((d) => t.includes(squash(d.name)))?.name || '';
  }

  private hotelCatalog: { id: string; slug?: string; name: string }[] = [];
  private matchCatalogHotel(cardName: string): { id: string; slug?: string; name: string } | null {
    const generic = new Set(['the', 'hotel', 'hotels', 'resort', 'villa', 'villas', 'spa', 'luxury', 'private', 'beach', 'bay', 'club', 'cliff', 'dining']);
    const fold = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !generic.has(t));
    const cardTokens = fold(cardName);
    if (!cardTokens.length) return null;
    const primary = cardTokens[0];
    let best: { id: string; slug?: string; name: string } | null = null;
    let bestScore = 0;
    for (const h of this.hotelCatalog) {
      const hTokens = fold(h.name);
      if (!hTokens.includes(primary)) continue;
      const overlap = cardTokens.filter((t) => hTokens.includes(t)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        best = h;
      }
    }
    return best;
  }

  // Flash Countdown Timer Properties
  countdownHours: string = '05';
  countdownMinutes: string = '23';
  countdownSeconds: string = '22';
  
  private secondsLeft: number = 5 * 3600 + 24 * 60 + 12;
  private timerInterval: any;
  private destroy$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly authService = inject(AuthService);
  private readonly tripShortService = inject(TripShortService);
  constructor(private tripShopService: TripShopService) {}
openAuthModal(): void {
    this.authService.openAuthModal();
  }
  ngOnInit(): void {
    const savedFlight = this.flightDraft.value;
    if (savedFlight) {
      const c = savedFlight.criteria;
      this.flightFrom = { ...c.from };
      this.flightTo = { ...c.to };
      this.flightDeparture = c.departureDate;
      this.flightReturn = c.returnDate || c.departureDate;
      this.flightRoundTrip = c.tripType === 'round-trip';
      this.flightAdults = c.adults;
      this.flightChildren = c.children;
      this.flightInfants = c.infants;
      this.cabin = c.cabin;
      this.directFlight = savedFlight.directFlight;
      if (savedFlight.active && this.router.getCurrentNavigation()?.trigger === 'popstate') this.selectBookingTab('flight');
    }
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'flight' || tab === 'tour' || tab === 'bus') this.selectBookingTab(tab);
    const saved = this.hotelDraft.value;
    if (saved) {
      this.searchDestination = saved.criteria.location;
      const parse = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
      this.checkIn = parse(saved.criteria.checkIn);
      this.checkOut = parse(saved.criteria.checkOut);
      this.adults = saved.criteria.adults;
      this.children = saved.criteria.children;
      this.rooms = saved.criteria.rooms;
      this.accommodationType = saved.filters.accommodation;
      this.hotelFilters = saved.filters;
    }
    const queryDestination = this.route.snapshot.queryParamMap.get('destination');
    if (queryDestination) {
      this.searchDestination = queryDestination;
    }
    this.fetchData();
    this.startCountdown();
  }

  private fetchData(): void {
    this.tripShopService.getNavItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.navItems = data);

    this.tripShopService.getValueProps()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.valueProps = data);

    this.tripShopService.getFlashDeals()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.flashDeals = data);

    this.tripShopService.getDestinations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.destinations = data);

    this.tripShopService.getLuxuryStays()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.luxuryStays = data;
        this.filteredLuxuryStays = data;
      });

    this.tripShortService.getVenues()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res?.tripShopCatalog) {
          if (res.tripShopCatalog.flashDeals?.length) {
            this.flashDeals = res.tripShopCatalog.flashDeals;
          }
          if (res.tripShopCatalog.destinations?.length) {
            this.destinations = res.tripShopCatalog.destinations;
          }
          if (res.tripShopCatalog.luxuryStays?.length) {
            this.luxuryStays = res.tripShopCatalog.luxuryStays;
            this.filterCategory(this.activeCategory);
          }
        }
      });

    // Đồng bộ trực tiếp danh sách Hotels & Rooms chuẩn ERD từ GET /api/v1/hotels
    this.tripShortService.getHotels()
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (Array.isArray(res?.items)) {
          this.hotelCatalog = res.items
            .map((h: any) => ({
              id: String(h.id || h._id),
              slug: h.hotel_slug ? String(h.hotel_slug) : undefined,
              name: String(h.hotel_name || h.name || ''),
            }))
            .filter((h: { id: string; slug?: string; name: string }) => h.id && h.name);
        }
        if (Array.isArray(res?.items) && res.items.length > 0 && this.luxuryStays.length === 0) {
          this.luxuryStays = res.items.map((h: any) => ({
            id: h._id || h.id,
            name: h.hotel_name || h.name,
            category: 'resort',
            location: h.address || h.city,
            rating: Number(h.rating || 9.8),
            ratingText: 'Tuyệt đỉnh',
            reviewCount: Number(h.reviewCount || 420),
            description: h.description || '',
            videoCount: 18,
            perks: h.perks || ['Bữa sáng miễn phí', 'Quản gia 24/7'],
            specialOffer: h.specialOffer || 'Đặc quyền TRIPLA VIP',
            roomType: h.rooms?.[0]?.room_name || h.rooms?.[0]?.name || 'Ocean Pool Pavilion',
            originalPrice: Number(h.originalPrice || 21000000),
            discountPrice: Number(h.price_per_night || h.pricePerNight || 15000000),
            isBestSeller: true,
            imageUrl: h.image_url || h.imageUrl || h.images?.[0]
          }));
          this.filterCategory(this.activeCategory);
        }
      });
  }

  setActiveNav(selectedItem: NavItem): void {
    this.navItems.forEach(item => item.isActive = false);
    selectedItem.isActive = true;
  }

  filterCategory(category: string): void {
    this.activeCategory = category;
    if (category === 'all') {
      this.filteredLuxuryStays = this.luxuryStays;
    } else {
      this.filteredLuxuryStays = this.luxuryStays.filter(stay => stay.category === category);
    }
  }

  newsletterNotice = '';

  subscribeNewsletter(event: Event): void {
    event.preventDefault();
    const email = this.newsletterEmail.trim();
    if (!email || !email.includes('@')) {
      this.newsletterNotice = 'Vui lòng nhập địa chỉ email hợp lệ để nhận mã ưu đãi 15%.';
      return;
    }
    this.newsletterNotice = `Đã đăng ký VIP cho ${email}! Mã ưu đãi của bạn: TRIPLA15VIP.`;
    this.newsletterEmail = '';
  }

  private startCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        if (this.secondsLeft > 0) {
          this.secondsLeft--;
          const hrs = Math.floor(this.secondsLeft / 3600);
          const mins = Math.floor((this.secondsLeft % 3600) / 60);
          const secs = this.secondsLeft % 60;

          this.countdownHours = hrs.toString().padStart(2, '0');
          this.countdownMinutes = mins.toString().padStart(2, '0');
          this.countdownSeconds = secs.toString().padStart(2, '0');
          this.cdr.markForCheck();
        }
      }, 1000);
    });
    this.destroyRef.onDestroy(() => {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.flightDraft.value = { active: this.bookingTab() === 'flight', directFlight: this.directFlight,
      criteria: { service: 'flight', tripType: this.flightRoundTrip ? 'round-trip' : 'one-way',
        from: { ...this.flightFrom }, to: { ...this.flightTo }, departureDate: this.flightDeparture,
        returnDate: this.flightRoundTrip ? this.flightReturn : null, adults: this.flightAdults,
        children: this.flightChildren, infants: this.flightInfants, cabin: this.cabin as CabinClass } };
    this.hotelDraft.value = { criteria: this.hotelCriteria(), filters: { ...this.hotelFilters, accommodation: this.accommodationType } };
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
