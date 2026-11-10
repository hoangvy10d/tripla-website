import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  BookingDraft,
  BookingType,
  HotelBookingDraft,
  bookingTypes,
} from '../models/booking-draft.model';
import { CheckoutProblem, HotelCheckoutValues, CheckoutValues } from '../models/checkout.model';
import {
  FlightBookingInput,
  ActivityBookingInput,
  BusBookingInput,
  buildFlightDraft,
  buildActivityDraft,
  buildBusDraft,
  draftSelectionProblem,
} from '../adapters/service-booking-drafts';
import { checkoutFormValid } from '../forms/service-checkout.forms';
import { HotelBookingInput, buildHotelBookingDraft } from '../adapters/hotel-booking-draft';

export type CheckoutResolution =
  { ok: true; draft: BookingDraft } | { ok: false; problem: CheckoutProblem };
type HotelResolution =
  { ok: true; draft: HotelBookingDraft } | { ok: false; problem: CheckoutProblem };
@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  // Memory only. Personal details never enter URLs or browser storage.
  private readonly drafts = signal<Record<string, BookingDraft>>({});
  private readonly clock = signal(Date.now());
  readonly now = this.clock.asReadonly();
  constructor() {
    const timer = setInterval(() => this.clock.set(Date.now()), 15000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  startHotel(input: HotelBookingInput): HotelBookingDraft {
    const draft = buildHotelBookingDraft(input);
    this.drafts.update((value) => ({ ...value, [draft.id]: structuredClone(draft) }));
    return structuredClone(draft);
  }
  private register<T extends BookingDraft>(draft: T): T {
    this.drafts.update((value) => ({ ...value, [draft.id]: structuredClone(draft) }));
    return structuredClone(draft);
  }
  startFlight(input: FlightBookingInput) {
    return this.register(buildFlightDraft(input));
  }
  startActivity(input: ActivityBookingInput) {
    return this.register(buildActivityDraft(input));
  }
  startBus(input: BusBookingInput) {
    return this.register(buildBusDraft(input));
  }
  refreshTime(): void {
    this.clock.set(Date.now());
  }
  resolve(type: 'hotel', id: string | null): HotelResolution;
  resolve(type: string, id: string | null): CheckoutResolution;
  resolve(type: string, id: string | null): CheckoutResolution {
    this.clock(); // Recheck the open page when the in-memory draft expires.
    if (!bookingTypes.includes(type as BookingType)) return { ok: false, problem: 'unknown-type' };
    const draft = id ? this.drafts()[id] : null;
    if (!draft) return { ok: false, problem: 'missing' };
    if (draft.type !== type) return { ok: false, problem: 'type-mismatch' };
    if (!(Date.parse(draft.expiresAt) > Date.now())) return { ok: false, problem: 'expired' };
    if (draftSelectionProblem(draft)) return { ok: false, problem: 'invalid-selection' };
    return { ok: true, draft: structuredClone(draft) };
  }
  saveHotelForm(id: string, values: HotelCheckoutValues): boolean {
    const resolved = this.resolve('hotel', id);
    if (!resolved.ok) return false;
    const draft = { ...resolved.draft, form: structuredClone(values), status: 'editing' as const };
    this.drafts.update((value) => ({ ...value, [id]: draft }));
    return true;
  }
  completeHotelDetails(id: string): boolean {
    return this.resolve('hotel', id).ok && this.completeDetails(id);
  }
  saveForm(id: string, values: CheckoutValues): boolean {
    const current = this.drafts()[id];
    if (!current) return false;
    const resolved = this.resolve(current.type, id);
    if (!resolved.ok) return false;
    const draft = resolved.draft;
    let updated: BookingDraft;
    switch (draft.type) {
      case 'hotel':
        if (!('hotel' in values)) return false;
        updated = { ...draft, form: values };
        break;
      case 'flight':
        if (!('flight' in values)) return false;
        updated = { ...draft, form: values };
        break;
      case 'activity':
        if (!('activity' in values)) return false;
        updated = { ...draft, form: values };
        break;
      case 'bus':
        if (!('bus' in values)) return false;
        updated = { ...draft, form: values };
        break;
    }
    this.drafts.update((value) => ({
      ...value,
      [id]: structuredClone({ ...updated, status: 'editing' as const }),
    }));
    return true;
  }
  completeDetails(id: string): boolean {
    const draft = this.drafts()[id];
    if (!draft) return false;
    const result = this.resolve(draft.type, id);
    if (!result.ok || !checkoutFormValid(result.draft)) return false;
    this.drafts.update((value) => ({
      ...value,
      [id]: { ...result.draft, status: 'details-complete' },
    }));
    return true;
  }
  discard(id: string): void {
    this.drafts.update((value) => {
      const next = { ...value };
      delete next[id];
      return next;
    });
  }
}
