import { Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, of, switchMap, tap } from 'rxjs';
import { SavedPlaceKey, SavedTrips } from '../../../services/saved-trips';
import { AuthService } from '../../../services/auth-service';
import { BookingCartService } from '../../../services/booking-cart.service';
import { injectLiveHttp } from '../../../services/live-http';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer';
import { PlanningPlacesService } from '../../services/planning-places.service';
import { ItineraryStateService } from '../../services/itinerary-state.service';
import { PlanningMap } from '../../components/planning-map/planning-map';
import {
  PlanningPlace,
  PlanningViewState,
  PlanningScheduleEntry,
} from '../../models/planning-place.model';
interface DragItem {
  kind: 'place' | 'entry';
  id: string;
  tripId: string;
}
@Component({
  selector: 'app-trip-planning-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ActivityNavigation, SiteFooterComponent, PlanningMap],
  templateUrl: './trip-planning-page.html',
  styleUrl: './trip-planning-page.css',
})
export class TripPlanningPage {
  readonly store = inject(SavedTrips);
  readonly plans = inject(ItineraryStateService);
  private readonly http = injectLiveHttp();
  readonly authService = inject(AuthService);
  private readonly cartService = inject(BookingCartService);
  readonly isMongoConnected = signal(!!this.http);
  private readonly apiBase = '/api/v1';
  private readonly source = inject(PlanningPlacesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly requestedTrip = signal<string | null>(null);
  readonly backendPlans = signal<any[]>([]);
  readonly selectedBackendPlanId = signal<string | null>(null);
  readonly backendPlanBundle = signal<any | null>(null);
  readonly backendBudgetVnd = signal<number | null>(null);
  private readonly loadedPlaces = signal<{ tripId: string | null; items: PlanningPlace[] }>({
    tripId: null,
    items: [],
  });
  readonly places = computed(() =>
    this.catalog().filter((place) => this.trip()?.places.some((key) => key === place.key)),
  );
  private readonly catalog = computed(() =>
    this.loadedPlaces().tripId === this.trip()?.id ? this.loadedPlaces().items : [],
  );
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly actionError = signal('');
  readonly bookingSubmitting = signal(false);
  readonly confirmedBookingCode = signal('');
  readonly estimatedTotal = computed(() => {
    const cloudBudget = this.backendBudgetVnd();
    if (this.selectedBackendPlanId() && cloudBudget !== null) {
      return cloudBudget;
    }
    return this.scheduleEntries().reduce((sum, entry) => {
      const place = this.catalog().find((p) => p.key === entry.placeKey);
      return sum + this.parsePlacePrice(place?.priceLabel);
    }, 0);
  });

  formatVnd(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(Math.max(0, Number(amount || 0)));
  }
  private readonly views = signal<Record<string, PlanningViewState>>({});
  readonly trip = computed(() =>
    this.store.readError()
      ? null
      : this.requestedTrip()
        ? this.store.trips().find((trip) => trip.id === this.requestedTrip()) || null
        : this.store.trips()[0] || null,
  );
  readonly plan = computed(() => {
    const id = this.trip()?.id;
    return id ? this.plans.read(id) : null;
  });
  readonly view = computed<PlanningViewState>(() => {
    const id = this.trip()?.id,
      local = id ? this.views()[id] : undefined,
      plan = this.plan()?.value;
    return {
      dayCount: plan?.dayCount || 1,
      activeDay: Math.min(local?.activeDay || 1, plan?.dayCount || 1),
      selectedPlaceKey: local?.selectedPlaceKey || null,
      selectedEntryId: local?.selectedEntryId || null,
      note: plan?.note || '',
    };
  });
  readonly days = computed(() => Array.from({ length: this.view().dayCount }, (_, i) => i + 1));
  readonly scheduleEntries = computed(() => this.plan()?.value.entries || []);
  readonly dayEntries = computed(() =>
    this.scheduleEntries().filter(
      (entry) => entry.tripId === this.trip()?.id && entry.day === this.view().activeDay,
    ),
  );
  readonly selectedEntry = computed(
    () => this.scheduleEntries().find((entry) => entry.id === this.view().selectedEntryId) || null,
  );
  /** Places of the active day in time order, used for numbered markers + route on the map (F3). */
  readonly dayRoute = computed(() =>
    [...this.dayEntries()]
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((entry) => this.catalog().find((place) => place.key === entry.placeKey))
      .filter((place): place is PlanningPlace => !!place),
  );
  readonly selectedPlace = computed(
    () =>
      this.catalog().find(
        (place) => place.key === (this.selectedEntry()?.placeKey || this.view().selectedPlaceKey),
      ) || null,
  );
  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly rowHeight = 66;
  readonly dragging = signal<DragItem | null>(null);
  readonly dropMinute = signal<number | null>(null);
  newTripName = '';
  addTime = '09:00';
  addDuration = 60;
  constructor() {
    this.store.refresh();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.requestedTrip.set(params.get('trip'));
      const planParam = params.get('plan');
      if (planParam && this.http) {
        this.loadBackendPlan(planParam);
      }
      this.message.set('');
      this.actionError.set('');
      this.confirmedBookingCode.set('');
    });
    if (this.http && this.authService.isLoggedIn()) {
      this.fetchBackendPlans();
    }
    toObservable(this.trip)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
          this.loadedPlaces.set({ tripId: null, items: [] });
        }),
        switchMap((trip) =>
          trip
            ? this.source
              .resolve([
                ...trip.places,
                ...this.plans.read(trip.id).value.entries.map((entry) => entry.placeKey),
              ])
              .pipe(
                catchError(() => {
                  this.error.set('Không thể tải thông tin địa điểm. Vui lòng thử lại.');
                  return of([] as PlanningPlace[]);
                }),
              )
            : of([] as PlanningPlace[]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((items) => {
        this.loadedPlaces.set({ tripId: this.trip()?.id || null, items });
        this.loading.set(false);
      });
  }
  private parsePlacePrice(label?: string): number {
    if (!label) return 450000;
    if (label.toLowerCase().includes('miễn phí')) return 0;
    const match = label.match(/[\d.,]+/);
    if (!match) return 450000;
    const numeric = Number(match[0].replace(/\D+/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 450000;
  }
  removeSavedPlace(key: string, event: Event): void {
    event.stopPropagation();
    const id = this.trip()?.id;
    if (!id) return;
    const usedEntries = this.scheduleEntries().filter((entry) => entry.placeKey === key);
    if (
      usedEntries.length > 0 &&
      !window.confirm(
        `Địa điểm này đang nằm trong ${usedEntries.length} hoạt động của lịch trình. Bỏ địa điểm và xóa các hoạt động liên quan?`,
      )
    ) {
      return;
    }
    usedEntries.forEach((entry) => this.plans.remove(id, entry.id));
    if (this.view().selectedPlaceKey === key) {
      this.updateView({ selectedPlaceKey: null, selectedEntryId: null });
    }
    this.store.toggle(id, key as SavedPlaceKey);
    this.actionError.set('');
    this.message.set('Đã bỏ địa điểm khỏi chuyến đi.');
  }
  selectTrip(id: string): void {
    void this.router.navigate(['/trip-planning'], { queryParams: { trip: id } });
  }
  updateView(patch: Partial<PlanningViewState>): void {
    const id = this.trip()?.id;
    if (!id) return;
    this.message.set('');
    if (patch.note !== undefined) this.plans.patch(id, { note: patch.note });
    if (patch.dayCount !== undefined) this.plans.patch(id, { dayCount: patch.dayCount });
    this.views.update((value) => ({ ...value, [id]: { ...this.view(), ...patch } }));
  }
  selectPlace(place: PlanningPlace): void {
    this.updateView({ selectedPlaceKey: place.key, selectedEntryId: null });
  }
  selectEntry(entry: PlanningScheduleEntry): void {
    this.updateView({
      selectedEntryId: entry.id,
      selectedPlaceKey: entry.placeKey,
      activeDay: entry.day,
    });
  }
  addDay(): void {
    if (this.view().dayCount < 30)
      this.updateView({ dayCount: this.view().dayCount + 1, activeDay: this.view().dayCount + 1 });
  }
  changeDay(day: number): void {
    if (day >= 1 && day <= this.view().dayCount) this.updateView({ activeDay: day });
  }
  removeDay(): void {
    const id = this.trip()?.id,
      day = this.view().activeDay;
    if (!id || this.view().dayCount <= 1) return;
    if (
      this.dayEntries().length &&
      !window.confirm('Xóa ngày này và các hoạt động trong ngày? Địa điểm đã lưu không bị xóa.')
    )
      return;
    this.plans.removeDay(id, day);
    this.updateView({ activeDay: Math.min(day, this.view().dayCount), selectedEntryId: null });
  }
  clearSchedule(): void {
    const id = this.trip()?.id;
    if (
      id &&
      window.confirm(
        'Xóa toàn bộ hoạt động khỏi lịch trình? Địa điểm đã lưu và ghi chú chung vẫn được giữ.',
      )
    ) {
      this.plans.clear(id);
      this.updateView({ selectedEntryId: null });
    }
  }
  createTrip(): void {
    if (!this.store.create(this.newTripName)) return;
    this.newTripName = '';
    const trip = this.store.trips().at(-1);
    if (trip) this.selectTrip(trip.id);
  }
  deleteCurrentTrip(): void {
    const trip = this.trip();
    if (!trip) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa chuyến đi "${trip.name}" không?`)) {
      this.store.delete(trip.id);
      const remaining = this.store.trips();
      if (remaining.length > 0) {
        this.selectTrip(remaining[0].id);
      } else {
        this.router.navigate(['/trip-planning']);
      }
    }
  }
  retry(): void {
    this.store.refresh();
  }
  hourLabel(hour: number): string {
    return this.time(hour * 60);
  }
  time(minute: number): string {
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  }
  private minutes(value: string): number {
    if (!/^\d{2}:\d{2}$/.test(value)) return -1;
    const [h, m] = value.split(':').map(Number);
    return h < 24 && m < 60 ? h * 60 + m : -1;
  }
  title(entry: PlanningScheduleEntry): string {
    return (
      entry.title ||
      this.catalog().find((place) => place.key === entry.placeKey)?.title ||
      entry.placeKey
    );
  }
  addSelected(): void {
    const place = this.selectedPlace();
    if (place)
      this.addPlace(place.key, this.view().activeDay, this.minutes(this.addTime), this.addDuration);
  }
  addPlace(key: string, day: number, start: number, duration = 60): void {
    const id = this.trip()?.id;
    if (!id) return;
    this.actionError.set('');
    const entry = this.plans.add(id, key, day, start, duration);
    if (entry) this.selectEntry(entry);
    else
      this.actionError.set(
        this.plans.read(id).error || 'Chỉ có thể thêm địa điểm đã lưu trong chuyến đi đang chọn.',
      );
  }
  editEntry(
    patch: Partial<
      Pick<PlanningScheduleEntry, 'day' | 'startMinute' | 'durationMinutes' | 'title' | 'note'>
    >,
  ): void {
    const id = this.trip()?.id,
      entry = this.selectedEntry();
    if (!id || !entry) return;
    this.message.set('');
    this.actionError.set('');
    if (this.plans.edit(id, entry.id, patch)) {
      if (patch.day) this.changeDay(patch.day);
    } else this.actionError.set(this.plans.read(id).error || 'Không thể cập nhật hoạt động.');
  }
  editTime(value: string): void {
    this.editEntry({ startMinute: this.minutes(value) });
  }
  deleteEntry(entry: PlanningScheduleEntry): void {
    const id = this.trip()?.id;
    if (!id) return;
    this.plans.remove(id, entry.id);
    if (this.view().selectedEntryId === entry.id) this.updateView({ selectedEntryId: null });
    this.actionError.set('');
    this.message.set('Đã xóa hoạt động. Địa điểm đã lưu vẫn được giữ.');
  }
  startDrag(event: DragEvent, kind: 'place' | 'entry', id: string): void {
    const tripId = this.trip()?.id;
    if (!tripId) return;
    const item = { kind, id, tripId };
    this.dragging.set(item);
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/x-tripla-planning', JSON.stringify(item));
      event.dataTransfer.effectAllowed = kind === 'place' ? 'copy' : 'move';
    }
  }
  endDrag(): void {
    this.dragging.set(null);
    this.dropMinute.set(null);
  }
  dragOver(event: DragEvent): void {
    if (this.dragging()?.tripId !== this.trip()?.id) return;
    event.preventDefault();
    this.dropMinute.set(this.dropTime(event));
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = this.dragging()?.kind === 'place' ? 'copy' : 'move';
  }
  private dropTime(event: DragEvent): number {
    const top = (event.currentTarget as HTMLElement).getBoundingClientRect().top;
    return Math.max(
      0,
      Math.min(1425, Math.floor((((event.clientY - top) / this.rowHeight) * 60) / 15) * 15),
    );
  }
  dropOnTimeline(event: DragEvent): void {
    event.preventDefault();
    this.performDrop(this.view().activeDay, this.dropTime(event));
  }
  dropOnDay(event: DragEvent, day: number): void {
    event.preventDefault();
    const drag = this.dragging(),
      entry = this.scheduleEntries().find((entry) => entry.id === drag?.id);
    this.performDrop(day, entry?.startMinute ?? this.minutes(this.addTime));
  }
  private performDrop(day: number, start: number): void {
    const drag = this.dragging(),
      id = this.trip()?.id;
    if (!drag || !id || drag.tripId !== id) {
      this.endDrag();
      return;
    }
    if (drag.kind === 'place') this.addPlace(drag.id, day, start, Math.min(60, 1440 - start));
    else {
      const entry = this.scheduleEntries().find((entry) => entry.id === drag.id);
      if (entry) {
        this.selectEntry(entry);
        this.editEntry({ day, startMinute: start });
      }
    }
    this.endDrag();
  }
  save(): void {
    const id = this.trip()?.id;
    if (!id) return;
    this.actionError.set('');
    this.message.set(this.plans.save(id) ? 'Đã lưu lịch trình và ghi chú trên trình duyệt.' : '');
    if (!this.message())
      this.actionError.set(
        this.plans.read(id).error || this.store.error() || 'Không thể lưu lịch trình.',
      );
  }
  confirmAndBookItinerary(): void {
    const trip = this.trip();
    if (!trip || this.bookingSubmitting()) return;
    this.actionError.set('');
    this.confirmedBookingCode.set('');
    const savedOk = this.plans.save(trip.id);
    if (!savedOk) {
      this.actionError.set(
        this.plans.read(trip.id).error || this.store.error() || 'Không thể lưu lịch trình.',
      );
      return;
    }
    const code = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
    const totalPrice = this.estimatedTotal() || this.scheduleEntries().length * 450000;
    const checkInDate = this.plan()?.value.startDate || new Date().toISOString().slice(0, 10);
    const checkOutDate =
      this.dayDate(this.view().dayCount) ||
      new Date(Date.now() + this.view().dayCount * 86400000).toISOString().slice(0, 10);
    const curUser = this.authService.currentUser();
    const activeUserCode =
      curUser?.id ||
      (typeof window !== 'undefined' && window.localStorage?.getItem('tripla_active_profile')) ||
      'u1';

    if (this.http) {
      this.bookingSubmitting.set(true);
      const headers = this.authService.getAuthHeaders();
      const cloudPlanId = this.selectedBackendPlanId();
      if (cloudPlanId && this.authService.isLoggedIn()) {
        this.http
          .post(`${this.apiBase}/trips`, { plan_id: cloudPlanId, trip_status: 'upcoming' }, { headers })
          .pipe(catchError(() => of(null)))
          .subscribe();
      }
      this.http
        .post(
          `${this.apiBase}/bookings`,
          {
            user_id: activeUserCode,
            bookingCode: code,
            bookingType: 'itinerary_schedule',
            title: `Lịch trình: ${trip.name}`,
            location: `${this.view().dayCount} ngày · ${this.scheduleEntries().length} hoạt động`,
            customerName: curUser?.fullName || 'Thành viên TRIPLA',
            customerEmail: curUser?.email || '',
            checkIn: checkInDate,
            check_in: checkInDate,
            check_out: checkOutDate,
            guests: 2,
            total_price: totalPrice,
            totalPriceVnd: totalPrice,
            status: 'CONFIRMED',
            details: {
              tripId: trip.id,
              planId: cloudPlanId,
              dayCount: this.view().dayCount,
              entries: this.scheduleEntries(),
            },
          },
          { headers }
        )
        .subscribe({
          next: () => {
            this.bookingSubmitting.set(false);
            this.confirmedBookingCode.set(code);
            this.message.set(
              `Đã lưu & xác nhận đặt lịch ${this.scheduleEntries().length} hoạt động thành công! Mã lịch trình: ${code}.`,
            );
          },
          error: () => {
            this.bookingSubmitting.set(false);
            this.actionError.set(
              'Không thể đồng bộ đơn đặt lịch lên máy chủ. Lịch trình của bạn vẫn đã được lưu trên trình duyệt.',
            );
          },
        });
      return;
    }
    this.confirmedBookingCode.set(code);
    this.message.set(
      `Đã lưu & xác nhận đặt lịch ${this.scheduleEntries().length} hoạt động thành công! Mã lịch trình: ${code}.`,
    );
  }

  /**
   * Q13 / Q14 Cloud Trip Plan sync methods
   */
  private readonly cloudEntryIds = new Map<string, string>();
  private lastSyncedDetailKeys = new Map<string, { day: number; startMinute: number; note: string }>();
  private lastSyncedStartDate = '';
  private lastSyncedDayCount = 1;
  private lastSyncedDigest = '';
  private isHydratingCloud = false;
  private cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private cloudSyncInFlight = false;
  private cloudSyncPending = false;
  private lastLoadedCloudPlanId = '';

  private readonly _cloudSyncEffect = effect(() => {
    const cloudId = this.selectedBackendPlanId();
    const activeTrip = this.trip();
    const entries = this.scheduleEntries();
    const dayCount = this.view().dayCount;
    const startDate = this.plan()?.value.startDate || '';

    if (!this.http || !cloudId || !activeTrip || activeTrip.id !== cloudId || this.isHydratingCloud) {
      return;
    }
    const digest = this.buildCloudPlanDigest(startDate, dayCount, entries);
    if (digest === this.lastSyncedDigest) return;

    untracked(() => this.queueCloudSync(cloudId, activeTrip.id, entries, dayCount, startDate));
  });

  fetchBackendPlans(): void {
    if (!this.http || !this.authService.isLoggedIn()) return;
    this.http
      .get<any>(`${this.apiBase}/trip-plans`, { headers: this.authService.getAuthHeaders() })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.success && Array.isArray(res.items)) {
          this.backendPlans.set(res.items);
          if (!this.selectedBackendPlanId() && res.items.length > 0 && !this.requestedTrip()) {
            this.loadBackendPlan(String(res.items[0]._id));
          }
        }
      });
  }

  loadBackendPlan(planId: string): void {
    if (!this.http || !planId) return;
    if (this.lastLoadedCloudPlanId === planId && this.trip()?.id === planId && this.backendPlanBundle()) {
      return;
    }
    this.selectedBackendPlanId.set(planId);
    this.http
      .get<any>(`${this.apiBase}/trip-plans/${planId}`, { headers: this.authService.getAuthHeaders() })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.success && res.plan) {
          this.lastLoadedCloudPlanId = planId;
          this.backendPlanBundle.set(res);
          this.backendBudgetVnd.set(Number(res.plan.estimated_budget || 0));
          this.hydrateCloudPlanToLocal(res);
        }
      });
  }

  private toYmdDate(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const d = new Date(value as string | number | Date);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private addDaysYmd(startYmd: string, offsetDays: number): string {
    const base = new Date(`${startYmd || new Date().toISOString().slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
    base.setUTCDate(base.getUTCDate() + offsetDays);
    return base.toISOString().slice(0, 10);
  }

  private diffDaysYmd(startYmd: string, visitYmd: string): number {
    const s = Date.parse(`${startYmd}T00:00:00Z`);
    const v = Date.parse(`${visitYmd}T00:00:00Z`);
    if (Number.isNaN(s) || Number.isNaN(v)) return 0;
    return Math.max(0, Math.round((v - s) / 86400000));
  }

  private hhmmssToMinutes(timeStr: unknown, prevMinuteInDay: number | null): number {
    if (typeof timeStr === 'string' && /^\d{1,2}:\d{2}/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map((n) => Number(n));
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const parsed = Math.min(1410, Math.max(0, h * 60 + m));
        if (prevMinuteInDay !== null && parsed < prevMinuteInDay + 30) {
          return Math.min(1410, prevMinuteInDay + 30);
        }
        return parsed;
      }
    }
    return prevMinuteInDay !== null ? Math.min(1410, prevMinuteInDay + 30) : 9 * 60;
  }

  private minutesToHhmmss(minute: number): string {
    const clamped = Math.min(1439, Math.max(0, Math.round(minute)));
    const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
    const mm = String(clamped % 60).padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  private buildCloudPlanDigest(
    startDate: string,
    dayCount: number,
    entries: PlanningScheduleEntry[],
  ): string {
    const normalized = [...entries]
      .sort((a, b) => a.day - b.day || a.startMinute - b.startMinute)
      .map((e) => `${e.id}|${e.placeKey}|${e.day}|${e.startMinute}|${e.note || ''}`);
    return `${startDate}::${dayCount}::${normalized.join(';')}`;
  }

  private hydrateCloudPlanToLocal(bundle: any): void {
    const plan = bundle.plan;
    const planId = String(plan._id);
    const startYmd = this.toYmdDate(plan.start_date) || new Date().toISOString().slice(0, 10);
    const endYmd = this.toYmdDate(plan.end_date) || startYmd;
    const dayCount = Math.max(1, Math.min(30, this.diffDaysYmd(startYmd, endYmd) + 1));

    const places: SavedPlaceKey[] = [];
    const pushPlace = (key: SavedPlaceKey) => {
      if (!places.includes(key)) places.push(key);
    };

    for (const w of bundle.wishlist || []) {
      const locId = w?.location_id?._id || (typeof w?.location_id === 'string' ? w.location_id : null);
      const hotelId = w?.hotel_id?._id || (typeof w?.hotel_id === 'string' ? w.hotel_id : null);
      if (locId) pushPlace(`location:${String(locId)}`);
      if (hotelId) pushPlace(`hotel:${String(hotelId)}`);
    }

    const prevMinuteByDay = new Map<number, number>();
    const entries: PlanningScheduleEntry[] = [];
    this.cloudEntryIds.clear();
    this.lastSyncedDetailKeys.clear();

    const sortedDetails = [...(bundle.plan_details || [])].sort((a, b) => {
      const da = this.toYmdDate(a.visit_date);
      const db = this.toYmdDate(b.visit_date);
      if (da !== db) return da.localeCompare(db);
      return Number(a.sequence_order || 0) - Number(b.sequence_order || 0);
    });

    for (const d of sortedDetails) {
      const detailId = String(d._id);
      const locObj = typeof d.location_id === 'object' && d.location_id ? d.location_id : null;
      const hotelObj = typeof d.hotel_id === 'object' && d.hotel_id ? d.hotel_id : null;
      const locId = locObj?._id || (typeof d.location_id === 'string' ? d.location_id : null);
      const hotelId = hotelObj?._id || (typeof d.hotel_id === 'string' ? d.hotel_id : null);

      const placeKey: SavedPlaceKey | '' = hotelId
        ? `hotel:${String(hotelId)}`
        : locId
          ? `location:${String(locId)}`
          : '';
      if (placeKey) pushPlace(placeKey);

      const visitYmd = this.toYmdDate(d.visit_date) || startYmd;
      const day = Math.max(1, Math.min(dayCount, this.diffDaysYmd(startYmd, visitYmd) + 1));
      const startMinute = this.hhmmssToMinutes(d.start_time, prevMinuteByDay.get(day) ?? null);
      prevMinuteByDay.set(day, startMinute);

      const entry: PlanningScheduleEntry = {
        id: detailId,
        tripId: planId,
        placeKey: (placeKey || `location:${detailId}`) as SavedPlaceKey,
        day,
        startMinute,
        durationMinutes: 30,
        title: String(locObj?.name || hotelObj?.hotel_name || d.note || 'Điểm dừng').slice(0, 150),
        note: String(d.note || '').slice(0, 2000),
      };
      entries.push(entry);
      this.cloudEntryIds.set(detailId, detailId);
      this.lastSyncedDetailKeys.set(detailId, { day, startMinute, note: entry.note });
    }

    const updatedAt = plan.updatedAt || plan.created_at || new Date().toISOString();
    this.isHydratingCloud = true;
    try {
      this.store.upsertCloudTrip({
        id: planId,
        name: plan.plan_name || 'Kế hoạch chuyến đi',
        createdAt: plan.created_at || updatedAt,
        places,
        itinerary: {
          version: 1,
          revision: 1,
          updatedAt,
          dayCount,
          startDate: startYmd,
          note: plan.note || '',
          entries,
        },
      });
      this.plans.reload(planId);
      this.lastSyncedStartDate = startYmd;
      this.lastSyncedDayCount = dayCount;
      this.lastSyncedDigest = this.buildCloudPlanDigest(startYmd, dayCount, entries);

      if (this.route.snapshot.queryParamMap.get('trip') !== planId) {
        void this.router.navigate([], {
          queryParams: { trip: planId, plan: planId },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    } finally {
      setTimeout(() => {
        this.isHydratingCloud = false;
      }, 0);
    }
  }

  private queueCloudSync(
    cloudId: string,
    tripId: string,
    entries: PlanningScheduleEntry[],
    dayCount: number,
    startDate: string,
  ): void {
    if (this.cloudSyncTimer) clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(() => {
      void this.flushCloudSync(cloudId, tripId, entries, dayCount, startDate);
    }, 150);
  }

  private async flushCloudSync(
    cloudId: string,
    tripId: string,
    entries: PlanningScheduleEntry[],
    dayCount: number,
    startDate: string,
  ): Promise<void> {
    if (!this.http || !this.authService.isLoggedIn()) return;
    if (this.cloudSyncInFlight) {
      this.cloudSyncPending = true;
      return;
    }

    this.cloudSyncInFlight = true;
    const headers = this.authService.getAuthHeaders();
    const effectiveStart =
      startDate ||
      this.lastSyncedStartDate ||
      this.toYmdDate(this.backendPlanBundle()?.plan?.start_date) ||
      new Date().toISOString().slice(0, 10);
    const effectiveEnd = this.addDaysYmd(effectiveStart, Math.max(0, dayCount - 1));
    let latestRes: any = null;

    try {
      // 1. Sync plan dates if dayCount or startDate changed (must happen before adding out-of-range details)
      if (startDate !== this.lastSyncedStartDate || dayCount !== this.lastSyncedDayCount) {
        latestRes = await firstValueFrom(
          this.http
            .put<any>(
              `${this.apiBase}/trip-plans/${cloudId}`,
              { start_date: effectiveStart, end_date: effectiveEnd },
              { headers },
            )
            .pipe(catchError(() => of(null))),
        );
      }

      // 2. Delete removed entries
      const currentLocalIds = new Set(entries.map((e) => e.id));
      for (const prevLocalId of Array.from(this.lastSyncedDetailKeys.keys())) {
        if (!currentLocalIds.has(prevLocalId)) {
          const detailId = this.cloudEntryIds.get(prevLocalId) || prevLocalId;
          latestRes = await firstValueFrom(
            this.http
              .delete<any>(`${this.apiBase}/plan-details/${detailId}`, { headers })
              .pipe(catchError(() => of(null))),
          );
          this.cloudEntryIds.delete(prevLocalId);
          this.lastSyncedDetailKeys.delete(prevLocalId);
        }
      }

      // 3. Create newly added entries ordered by (day, startMinute)
      const sorted = [...entries].sort((a, b) => a.day - b.day || a.startMinute - b.startMinute);
      const dayCounters = new Map<number, number>();
      const rankById = new Map<string, number>();
      for (const e of sorted) {
        const nextSeq = (dayCounters.get(e.day) || 0) + 1;
        dayCounters.set(e.day, nextSeq);
        rankById.set(e.id, nextSeq);
      }

      for (const e of sorted) {
        if (!this.cloudEntryIds.has(e.id)) {
          const refBody = e.placeKey.startsWith('hotel:')
            ? { hotel_id: e.placeKey.slice(6) }
            : e.placeKey.startsWith('location:')
              ? { location_id: e.placeKey.slice(9) }
              : {};
          const payload = {
            plan_id: cloudId,
            ...refBody,
            visit_date: this.addDaysYmd(effectiveStart, Math.max(0, e.day - 1)),
            start_time: this.minutesToHhmmss(e.startMinute),
            sequence_order: rankById.get(e.id) || 1,
            note: e.note || e.title || '',
          };
          const createdRes = await firstValueFrom(
            this.http
              .post<any>(`${this.apiBase}/plan-details`, payload, { headers })
              .pipe(catchError(() => of(null))),
          );
          if (createdRes?.detail?._id) {
            this.cloudEntryIds.set(e.id, String(createdRes.detail._id));
            latestRes = createdRes;
          }
        }
      }

      // 4. Update modified entries' start_time/note & persist sequence_order via reorder
      let needsReorder = false;
      const reorderItems: Array<{ id: string; visit_date: string; sequence_order: number }> = [];
      for (const e of sorted) {
        const backendId = this.cloudEntryIds.get(e.id);
        if (!backendId) continue;
        const visitDate = this.addDaysYmd(effectiveStart, Math.max(0, e.day - 1));
        reorderItems.push({ id: backendId, visit_date: visitDate, sequence_order: rankById.get(e.id) || 1 });

        const prev = this.lastSyncedDetailKeys.get(e.id);
        if (prev && (prev.day !== e.day || prev.startMinute !== e.startMinute || prev.note !== (e.note || ''))) {
          needsReorder = true;
          latestRes = await firstValueFrom(
            this.http
              .put<any>(
                `${this.apiBase}/plan-details/${backendId}`,
                {
                  visit_date: visitDate,
                  start_time: this.minutesToHhmmss(e.startMinute),
                  sequence_order: rankById.get(e.id) || 1,
                  note: e.note || '',
                },
                { headers },
              )
              .pipe(catchError(() => of(null))),
          );
        } else if (!prev) {
          needsReorder = true;
        }
      }

      if (needsReorder && reorderItems.length > 0) {
        const reordered = await firstValueFrom(
          this.http
            .put<any>(`${this.apiBase}/trip-plans/${cloudId}/reorder`, { items: reorderItems }, { headers })
            .pipe(catchError(() => of(null))),
        );
        if (reordered) latestRes = reordered;
      }

      // Refresh local snapshot & estimated_budget
      this.lastSyncedDetailKeys.clear();
      for (const e of sorted) {
        if (this.cloudEntryIds.has(e.id)) {
          this.lastSyncedDetailKeys.set(e.id, {
            day: e.day,
            startMinute: e.startMinute,
            note: e.note || '',
          });
        }
      }
      this.lastSyncedStartDate = startDate;
      this.lastSyncedDayCount = dayCount;
      this.lastSyncedDigest = this.buildCloudPlanDigest(startDate, dayCount, entries);

      if (latestRes?.estimated_budget !== undefined || latestRes?.plan?.estimated_budget !== undefined) {
        this.backendBudgetVnd.set(
          Number(latestRes?.estimated_budget ?? latestRes?.plan?.estimated_budget ?? 0),
        );
        this.backendPlanBundle.set(latestRes);
      }
      if (this.plan()?.dirty && this.trip()?.id === tripId) {
        this.plans.save(tripId);
      }
    } finally {
      this.cloudSyncInFlight = false;
      if (this.cloudSyncPending) {
        this.cloudSyncPending = false;
        const latestEntries = this.scheduleEntries();
        const latestDays = this.view().dayCount;
        const latestStart = this.plan()?.value.startDate || '';
        this.queueCloudSync(cloudId, tripId, latestEntries, latestDays, latestStart);
      }
    }
  }

  moveEntryOrder(entry: PlanningScheduleEntry, direction: -1 | 1, event?: Event): void {
    event?.stopPropagation();
    const dayList = [...this.dayEntries()].sort((a, b) => a.startMinute - b.startMinute);
    const idx = dayList.findIndex((e) => e.id === entry.id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= dayList.length) return;
    const a = dayList[idx];
    const b = dayList[swapIdx];
    const id = this.trip()?.id;
    if (!id) return;
    const minA = a.startMinute;
    const minB = b.startMinute === a.startMinute ? Math.min(1425, b.startMinute + 15 * direction) : b.startMinute;
    this.plans.edit(id, a.id, { startMinute: minB });
    this.plans.edit(id, b.id, { startMinute: minA });
  }

  /**
   * Q16: Book individual stop ("Đặt chỗ") or entire itinerary ("Đặt tất cả") + POST /api/trips
   */
  bookStop(place: PlanningPlace, event?: Event): void {
    event?.stopPropagation();
    this.authService.requireAuth(() => {
      const checkIn = this.plan()?.value.startDate || new Date().toISOString().slice(0, 10);
      const checkOut =
        this.dayDate(Math.max(2, this.view().dayCount)) ||
        new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

      if (place.key.startsWith('hotel:')) {
        const hotelId = place.key.slice(6);
        const target = place.detailsPath || `/hotel/${hotelId}`;
        void this.router.navigate([target], {
          queryParams: { checkIn, checkOut }
        });
        return;
      }
      if (place.detailsPath) {
        void this.router.navigate([place.detailsPath], {
          queryParams: { ...(place.detailsQuery || {}), checkIn, checkOut }
        });
        return;
      }
      void this.router.navigate(['/hotel-search']);
    }, 'Vui lòng đăng nhập để đặt dịch vụ từ kế hoạch chuyến đi.');
  }

  bookAllInPlan(): void {
    this.authService.requireAuth(() => {
      const checkIn = this.plan()?.value.startDate || new Date().toISOString().slice(0, 10);
      const checkOut =
        this.dayDate(Math.max(2, this.view().dayCount)) ||
        new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

      const allPlaces = [...this.places(), ...this.dayRoute()];
      const firstHotel = allPlaces.find((p) => p.key.startsWith('hotel:'));
      const cloudPlanId = this.selectedBackendPlanId();

      if (this.http && cloudPlanId) {
        this.http
          .post(
            `${this.apiBase}/trips`,
            { plan_id: cloudPlanId, trip_status: 'upcoming', note: this.view().note || '' },
            { headers: this.authService.getAuthHeaders() }
          )
          .pipe(catchError(() => of(null)))
          .subscribe();
      }

      if (firstHotel) {
        const hotelId = firstHotel.key.slice(6);
        if (this.http) {
          this.http
            .get<any>(`${this.apiBase}/hotels/${hotelId}`)
            .pipe(catchError(() => of(null)))
            .subscribe((res) => {
              const hotelObj = res?.hotel || res;
              const firstRoom = hotelObj?.rooms?.[0] || res?.rooms?.[0];
              if (firstRoom?._id || firstRoom?.id) {
                this.cartService
                  .addToCart({
                    hotel_id: String(hotelObj?._id || hotelObj?.id || hotelId),
                    hotel_name: hotelObj?.name || firstHotel.title,
                    hotel_slug: hotelObj?.hotel_slug,
                    room_id: String(firstRoom._id || firstRoom.id),
                    room_name: firstRoom.name || firstRoom.room_name,
                    unit_price: Number(firstRoom.pricePerNight || firstRoom.room_price || 0),
                    quantity: 1,
                    check_in: checkIn,
                    check_out: checkOut,
                    availableStock: Number(firstRoom.stock ?? firstRoom.total_units ?? 5)
                  })
                  .subscribe(() => {
                    void this.router.navigate(['/checkout/hotel'], {
                      queryParams: { fromCart: 'true', ...(cloudPlanId ? { planId: cloudPlanId } : {}) }
                    });
                  });
              } else {
                void this.router.navigate(['/hotel', hotelObj?.hotel_slug || hotelId], { queryParams: { checkIn, checkOut } });
              }
            });
          return;
        }
        const fallbackTarget = firstHotel.detailsPath || `/hotel/${hotelId}`;
        void this.router.navigate([fallbackTarget], { queryParams: { checkIn, checkOut } });
        return;
      }

      this.confirmAndBookItinerary();
    }, 'Vui lòng đăng nhập để đặt toàn bộ chuyến đi và lưu vào Hồ sơ.');
  }
  reloadSaved(): void {
    const id = this.trip()?.id;
    if (
      id &&
      (!this.plan()?.dirty || window.confirm('Bỏ thay đổi chưa lưu và mở lại lịch trình đã lưu?'))
    ) {
      this.plans.reload(id);
      this.actionError.set('');
      this.message.set('Đã mở lại bản đã lưu.');
    }
  }
  setStartDate(value: string): void {
    const id = this.trip()?.id;
    if (id && !this.plans.patch(id, { startDate: value || null }))
      this.actionError.set(this.plans.read(id).error);
  }
  dayDate(day: number): string | null {
    const start = this.plan()?.value.startDate;
    if (!start) return null;
    const date = new Date(start + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + day - 1);
    return date.toISOString().slice(0, 10);
  }
  canLeave(): boolean {
    return (
      !this.plans.anyDirty() ||
      window.confirm(
        'Có lịch trình chưa lưu. Rời trang? Bản nháp chỉ còn trong bộ nhớ và sẽ mất nếu tải lại hoặc đóng trang.',
      )
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.plans.anyDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
