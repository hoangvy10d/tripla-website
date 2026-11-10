export interface PriceLine {
  label: string;
  kind: 'base' | 'tax' | 'fee' | 'discount';
  amount: number;
  quantity?: number;
  unitAmount?: number;
}
export type BookingPricing =
  | { status: 'unavailable' }
  | { status: 'estimate'; currency: string; lines: PriceLine[]; missingItems: string[] }
  | {
      status: 'verified';
      currency: string;
      lines: PriceLine[];
      total: number;
      quoteId: string;
      validUntil: string;
    };

export function pricingLinesValid(
  pricing: Exclude<BookingPricing, { status: 'unavailable' }>,
): boolean {
  return (
    /^[A-Z]{3}$/.test(pricing.currency) &&
    pricing.lines.length > 0 &&
    (pricing.status !== 'estimate' || pricing.lines.every((line) => line.kind !== 'discount')) &&
    pricing.lines.every(
      (line) =>
        Number.isFinite(line.amount) &&
        line.amount >= 0 &&
        (line.quantity === undefined || (Number.isInteger(line.quantity) && line.quantity > 0)) &&
        (line.unitAmount === undefined ||
          (Number.isFinite(line.unitAmount) && line.unitAmount >= 0)),
    )
  );
}

// Only a backend adapter may supply verified quotes. This is a consistency check,
// not a replacement for provider price/availability verification.
export function hasUsableQuote(pricing: BookingPricing, now = Date.now()): boolean {
  if (
    pricing.status !== 'verified' ||
    !pricingLinesValid(pricing) ||
    !pricing.quoteId.trim() ||
    !Number.isFinite(pricing.total) ||
    pricing.total < 0 ||
    !(Date.parse(pricing.validUntil) > now)
  )
    return false;
  const sum = pricing.lines.reduce(
    (value, line) => value + (line.kind === 'discount' ? -line.amount : line.amount),
    0,
  );
  return Math.abs(sum - pricing.total) < 0.01;
}

export function checkoutMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(value);
}
