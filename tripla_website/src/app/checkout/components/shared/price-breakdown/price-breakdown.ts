import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BookingPricing,
  checkoutMoney,
  hasUsableQuote,
  pricingLinesValid,
} from '../../../models/booking-pricing.model';
@Component({
  selector: 'app-checkout-price-breakdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-breakdown.html',
  styleUrl: './price-breakdown.css',
})
export class PriceBreakdown {
  readonly pricing = input.required<BookingPricing>();
  readonly now = input(Date.now());
  readonly usable = computed(() => {
    const p = this.pricing();
    return p.status !== 'unavailable' &&
      pricingLinesValid(p) &&
      (p.status !== 'verified' || hasUsableQuote(p, this.now()))
      ? p
      : null;
  });
  readonly verified = computed(() => hasUsableQuote(this.pricing(), this.now()));
  readonly knownAmount = computed(
    () =>
      this.usable()?.lines.reduce(
        (sum, line) => sum + (line.kind === 'discount' ? -line.amount : line.amount),
        0,
      ) ?? 0,
  );
  readonly missing = computed(() => {
    const p = this.usable();
    return p?.status === 'estimate' ? p.missingItems : [];
  });
  readonly total = computed(() => {
    const p = this.pricing();
    return p.status === 'verified' && this.verified() ? p.total : null;
  });
  money(value: number): string {
    return checkoutMoney(value, this.usable()?.currency || 'VND');
  }
}
