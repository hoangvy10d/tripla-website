import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';
@Component({
  selector: 'app-flight-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-card.html',
  styleUrl: './flight-card.css',
})
export class FlightCard {
  readonly flight = input.required<Flight>();
  readonly selected = output<Flight>();
  readonly failedLogo = signal('');
  get hasPrice(): boolean {
    const price = this.flight().price;
    return typeof price === 'number' && Number.isFinite(price) && price >= 0;
  }
  get hasDiscount(): boolean {
    const original = this.flight().originalPrice;
    return this.hasPrice && typeof original === 'number' && Number.isFinite(original)
      && original > this.flight().price!;
  }
  get priceCaption(): string {
    const flight = this.flight();
    const basis = flight.priceBasis === 'adult' ? ' / người lớn'
      : flight.priceBasis === 'all-passengers' ? ' / tất cả khách' : '';
    const taxes = flight.taxesIncluded === true ? 'Đã gồm thuế, phí'
      : flight.taxesIncluded === false ? 'Chưa gồm thuế, phí' : 'Thuế, phí: xem điều kiện vé';
    return `${basis ? basis.trim() + ' · ' : ''}${taxes}`;
  }
  get duration() {
    const n = this.flight().durationMinutes;
    return Math.floor(n / 60) + 'h ' + (n % 60) + 'm';
  }
  get dayOffset() {
    const f = this.flight();
    return Math.round(
      (Date.parse(f.arrivalAt.slice(0, 10)) - Date.parse(f.departureAt.slice(0, 10))) / 86400000,
    );
  }
}
