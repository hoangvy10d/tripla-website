import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Hotel } from '../../models/hotel.model';
import { SavedTrips } from '../../../services/saved-trips';
import { SaveHotelTrip } from '../save-hotel-trip/save-hotel-trip';
@Component({
  selector: 'app-hotel-card',
  standalone: true,
  imports: [CommonModule, RouterLink, SaveHotelTrip],
  templateUrl: './hotel-card.html',
  styleUrl: './hotel-card.css',
})
export class HotelCard {
  readonly hotel = input.required<Hotel>();
  readonly failedImage = signal('');
  readonly tripStore = inject(SavedTrips);
  readonly saveOpen = signal(false);
  get isSaved(): boolean {
    return this.tripStore.trips().some(trip => trip.places.includes(`hotel:${this.hotel().id}`));
  }
}
