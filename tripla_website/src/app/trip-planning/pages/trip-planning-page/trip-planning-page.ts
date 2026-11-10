import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { SavedTrips } from '../../../services/saved-trips';
import { ActivityNavigation } from '../../../activity-search/components/activity-navigation/activity-navigation';
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
  imports: [CommonModule, FormsModule, RouterLink, ActivityNavigation, PlanningMap],
  templateUrl: './trip-planning-page.html',
  styleUrl: './trip-planning-page.css',
})
export class TripPlanningPage {
  readonly store = inject(SavedTrips);
  readonly plans = inject(ItineraryStateService);
  private readonly source = inject(PlanningPlacesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly requestedTrip = signal<string | null>(null);
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
      this.message.set('');
      this.actionError.set('');
    });
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
