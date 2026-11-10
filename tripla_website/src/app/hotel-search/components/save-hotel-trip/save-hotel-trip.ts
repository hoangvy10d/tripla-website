import { AfterViewInit, Component, ElementRef, ViewChild, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavedTrips, SavedPlaceKey } from '../../../services/saved-trips';

@Component({
  selector: 'app-save-hotel-trip', standalone: true, imports: [CommonModule],
  templateUrl: './save-hotel-trip.html', styleUrl: './save-hotel-trip.css',
})
export class SaveHotelTrip implements AfterViewInit {
  readonly hotelId = input.required<string>();
  readonly hotelName = input.required<string>();
  readonly itemType = input<'hotel' | 'activity'>('hotel');
  get itemLabel(): string { return this.itemType() === 'hotel' ? 'khách sạn' : 'địa điểm'; }
  readonly closed = output<void>();
  readonly store = inject(SavedTrips);
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  view: 'list' | 'create' = 'list';
  newTripName = '';
  message = '';
  get placeKey(): SavedPlaceKey { return `${this.itemType()}:${this.hotelId()}`; }

  constructor() {
    this.store.refresh();
  }
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  createTrip(): void {
    if (!this.store.create(this.newTripName)) return;
    this.newTripName = '';
    this.view = 'list';
    this.message = `Đã tạo chuyến đi. Chọn chuyến đi để lưu ${this.itemLabel}.`;
  }
  toggle(id: string): void {
    if (!this.store.toggle(id, this.placeKey)) return;
    this.message = this.store.trips().find(trip => trip.id === id)?.places.includes(this.placeKey)
      ? `Đã lưu ${this.itemLabel} vào chuyến đi.` : `Đã bỏ lưu ${this.itemLabel} khỏi chuyến đi.`;
  }
  backdropClick(event: MouseEvent): void {
    if (event.target === this.dialog.nativeElement) this.closed.emit();
  }
}
