import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusTrip } from '../../models/bus.model';
@Component({
  selector: 'app-bus-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bus-card.html',
  styleUrl: './bus-card.css',
})
export class BusCard {
  readonly trip = input.required<BusTrip>();
  readonly selected = output<BusTrip>();
  get duration(): string {
    const value = this.trip().durationMinutes;
    return `${Math.floor(value / 60)}h ${value % 60}m`;
  }
  get price(): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: this.trip().currency,
      maximumFractionDigits: 0,
    }).format(this.trip().price);
  }
}
