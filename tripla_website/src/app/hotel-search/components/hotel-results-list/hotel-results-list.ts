import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Hotel } from '../../models/hotel.model';
import { HotelCard } from '../hotel-card/hotel-card';
@Component({
  selector: 'app-hotel-results-list',
  standalone: true,
  imports: [CommonModule, HotelCard],
  templateUrl: './hotel-results-list.html',
  styleUrl: './hotel-results-list.css',
})
export class HotelResultsList {
  readonly hotels = input<Hotel[]>([]);
  readonly loading = input(false);
  readonly location = input('');
  readonly demo = input(false);
}
