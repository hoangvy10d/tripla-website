import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { TripShopService } from '../../services/trip-shop';
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


@Component({
  selector: 'app-trip-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ParallaxDirective, RevealDirective],
  templateUrl: './trip-shop.html',
  styleUrls: ['./trip-shop.css']
})
export class TripShopComponent implements OnInit, OnDestroy {
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
  searchDestination = 'Đà Nẵng, Việt Nam';

  beginBooking(destination: string): void {
    this.searchDestination = destination;
    document.getElementById('tripshop-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('tripshop-destination')?.focus({ preventScroll: true });
  }

  // Flash Countdown Timer Properties
  countdownHours: string = '05';
  countdownMinutes: string = '23';
  countdownSeconds: string = '22';
  
  private secondsLeft: number = 5 * 3600 + 24 * 60 + 12;
  private timerInterval: any;
  private destroy$ = new Subject<void>();
readonly authService = inject(AuthService);
  constructor(private tripShopService: TripShopService) {}
openAuthModal(): void {
    this.authService.openAuthModal();
  }
  ngOnInit(): void {
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

  subscribeNewsletter(event: Event): void {
    event.preventDefault();
    if (this.newsletterEmail) {
      alert(`Cảm ơn bạn (${this.newsletterEmail}) đã đăng ký nhận đặc quyền TripShop VIP!`);
      this.newsletterEmail = '';
    }
  }

  private startCountdown(): void {
    this.timerInterval = setInterval(() => {
      if (this.secondsLeft > 0) {
        this.secondsLeft--;
        const hrs = Math.floor(this.secondsLeft / 3600);
        const mins = Math.floor((this.secondsLeft % 3600) / 60);
        const secs = this.secondsLeft % 60;

        this.countdownHours = hrs.toString().padStart(2, '0');
        this.countdownMinutes = mins.toString().padStart(2, '0');
        this.countdownSeconds = secs.toString().padStart(2, '0');
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
