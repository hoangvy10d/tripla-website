import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../models/activity.model';
import { RouterLink } from '@angular/router';
import { SavedTrips } from '../../../services/saved-trips';
import { SaveHotelTrip } from '../../../hotel-search/components/save-hotel-trip/save-hotel-trip';
@Component({
  selector: 'app-activity-card',
  standalone: true,
  imports: [CommonModule, SaveHotelTrip, RouterLink],
  templateUrl: './activity-card.html',
  styleUrl: './activity-card.css',
})
export class ActivityCard {
  formatPrice(value: number, currency = 'VND'): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  readonly activity = input.required<Activity>();
  readonly failedImage = signal('');
  readonly tripStore = inject(SavedTrips);
  readonly saveOpen = signal(false);
  readonly isSaved = computed(() =>
    this.tripStore.trips().some((trip) => trip.places.includes(`activity:${this.activity().id}`)),
  );
}
