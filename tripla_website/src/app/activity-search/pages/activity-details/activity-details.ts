import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CheckoutStateService } from '../../../checkout/services/checkout-state.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ActivityDetails, ActivityTicket } from '../../models/activity.model';
import { ActivitySearchService } from '../../services/activity-search';
import { ActivityNavigation } from '../../components/activity-navigation/activity-navigation';
import { SavedTrips } from '../../../services/saved-trips';
import { SaveHotelTrip } from '../../../hotel-search/components/save-hotel-trip/save-hotel-trip';
import {
  localDateString,
  validDate,
} from '../../../hotel-search/models/hotel-search-criteria.model';
@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ActivityNavigation, SaveHotelTrip],
  templateUrl: './activity-details.html',
  styleUrl: './activity-details.css',
})
export class ActivityDetailsPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router=inject(Router);private readonly checkout=inject(CheckoutStateService);
  readonly checkoutError=signal('');ticketQuantity=1;
  private readonly source = inject(ActivitySearchService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly tripStore = inject(SavedTrips);
  readonly activity = signal<ActivityDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly saveOpen = signal(false);
  readonly isSaved = computed(
    () =>
      !!this.activity() &&
      this.tripStore
        .trips()
        .some((trip) => trip.places.includes(`activity:${this.activity()!.id}`)),
  );
  readonly group = signal('all');
  readonly reviewIndex = signal(0);
  readonly expanded = signal(false);
  readonly today = localDateString(new Date());
  visitDate = this.today;
  get dateValid(): boolean {
    return validDate(this.visitDate) && this.visitDate >= this.today;
  }
  readonly dateOptions = [0, 1, 2, 3].map((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return {
      value: localDateString(date),
      label:
        offset === 0
          ? 'Hôm nay'
          : offset === 1
            ? 'Ngày mai'
            : new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' }).format(date),
    };
  });
  readonly groups = computed(() => [
    ...new Set(this.activity()?.tickets.map((ticket) => ticket.group) || []),
  ]);
  readonly tickets = computed(
    () =>
      this.activity()?.tickets.filter(
        (ticket) => this.group() === 'all' || ticket.group === this.group(),
      ) || [],
  );
  readonly review = computed(() => this.activity()?.reviews[this.reviewIndex()] || null);
  readonly selectedTicket = signal<ActivityTicket | null>(null);
  readonly galleryImage = signal(0);
  @ViewChild('galleryDialog') galleryDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('ticketDialog') ticketDialog?: ElementRef<HTMLDialogElement>;
  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.activity.set(null);
          this.loading.set(true);
          this.error.set('');
          this.group.set('all');
          this.reviewIndex.set(0);
          this.expanded.set(false);
          this.saveOpen.set(false);
          this.selectedTicket.set(null);
          this.visitDate = this.today;
          this.closeDialogs();
        }),
        switchMap((params) =>
          this.source.getDetails(params.get('id') || '').pipe(
            catchError(() => {
              this.error.set('Không thể tải địa điểm. Vui lòng thử lại.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((activity) => {
        this.activity.set(activity);
        this.loading.set(false);
      });
  }
  formatPrice(value: number, currency = 'VND'): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  scrollTo(id: string): void {
    this.element.nativeElement
      .querySelector<HTMLElement>(`#${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  nextReview(step: number): void {
    const length = this.activity()?.reviews.length || 0;
    if (length) this.reviewIndex.update((value) => (value + step + length) % length);
  }
  showGallery(index = 0): void {
    this.galleryImage.set(index);
    this.galleryDialog?.nativeElement.showModal();
  }
  changePhoto(step: number): void {
    const length = this.activity()?.images.length || 0;
    if (length) this.galleryImage.update((value) => (value + step + length) % length);
  }
  chooseTicket(ticket: ActivityTicket): void {
    if (!this.dateValid) return;
    this.selectedTicket.set(ticket);
    this.ticketDialog?.nativeElement.showModal();
  }
  startCheckout():void {
    const activity=this.activity(),ticket=this.selectedTicket();if(!activity||!ticket)return;
    try{const draft=this.checkout.startActivity({activity,ticket,visitDate:this.visitDate,quantity:this.ticketQuantity,source:'demo',returnQuery:{...this.route.snapshot.queryParams}});
      this.closeDialogs();void this.router.navigate(['/checkout','activity'],{queryParams:{draft:draft.id}});
    }catch(error){this.checkoutError.set(error instanceof Error?error.message:'Lựa chọn gói vé chưa hợp lệ.');}
  }
  closeDialogs(): void {
    if (this.galleryDialog?.nativeElement.open) this.galleryDialog.nativeElement.close();
    if (this.ticketDialog?.nativeElement.open) this.ticketDialog.nativeElement.close();
  }
  ngOnDestroy(): void {
    this.closeDialogs();
  }
}
