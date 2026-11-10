import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CheckoutStateService } from './services/checkout-state.service';
import {
  HotelBookingInput,
  buildHotelBookingDraft,
  hotelSelectionProblem,
} from './adapters/hotel-booking-draft';
import { createContactForm, createHotelGuestForm } from './forms/hotel-checkout.form';
import { BookingPricing, hasUsableQuote } from './models/booking-pricing.model';
import { HotelCheckoutValues } from './models/checkout.model';

export const hotelInput = (): HotelBookingInput => ({
  hotel: {
    id: 'hotel-test',
    name: 'Khách sạn kiểm thử',
    address: 'Đà Lạt',
    currency: 'VND',
    rooms: [
      {
        id: 'room-test',
        name: 'Phòng đôi',
        size: 28,
        bed: 'Đôi',
        guests: 2,
        pricePerNight: 500000,
        breakfast: false,
      },
    ],
  },
  room: {
    id: 'room-test',
    name: 'Phòng đôi',
    size: 28,
    bed: 'Đôi',
    guests: 2,
    pricePerNight: 500000,
    breakfast: false,
  },
  criteria: {
    service: 'hotel',
    location: 'Đà Lạt',
    checkIn: '2099-12-12',
    checkOut: '2099-12-15',
    adults: 3,
    children: 1,
    rooms: 2,
  },
  source: 'demo',
});
export const validValues = (): HotelCheckoutValues => ({
  contact: {
    fullName: 'Khách Kiểm Thử',
    email: 'guest@example.test',
    callingCode: '+84',
    phone: '0912345678',
  },
  hotel: {
    firstName: 'Kiểm Thử',
    lastName: 'Khách',
    bookingForSomeoneElse: true,
    nonSmoking: true,
    highFloor: false,
    connectingRooms: false,
    specialRequests: 'Yêu cầu mẫu',
  },
});

describe('Checkout forms and pricing', () => {
  it('validates required names, whitespace, email, and optional requests', () => {
    const contact = createContactForm();
    expect(contact.invalid).toBe(true);
    expect(contact.untouched).toBe(true);
    contact.setValue(validValues().contact);
    expect(contact.valid).toBe(true);
    contact.controls.fullName.setValue('   ');
    expect(contact.controls.fullName.invalid).toBe(true);
    contact.controls.fullName.setValue('Khách');
    contact.controls.email.setValue('not-an-email');
    expect(contact.controls.email.invalid).toBe(true);
    const guest = createHotelGuestForm();
    expect(guest.invalid).toBe(true);
    guest.patchValue({ firstName: 'Tên', lastName: 'Họ' });
    expect(guest.valid).toBe(true);
    guest.controls.specialRequests.setValue('a'.repeat(501));
    expect(guest.invalid).toBe(true);
  });
  it('revalidates phone numbers when the calling code changes', () => {
    const form = createContactForm(validValues().contact);
    expect(form.valid).toBe(true);
    form.controls.callingCode.setValue('+65');
    expect(form.hasError('phoneInvalid')).toBe(true);
    form.controls.phone.setValue('8123 4567');
    expect(form.valid).toBe(true);
    form.controls.phone.setValue('letters');
    expect(form.hasError('phoneInvalid')).toBe(true);
    form.controls.callingCode.setValue('+999');
    expect(form.invalid).toBe(true);
  });
  it('creates only an estimate from room-night prices and rejects incomplete selections', () => {
    const input = hotelInput(),
      draft = buildHotelBookingDraft(input);
    expect(draft.pricing.status).toBe('estimate');
    if (draft.pricing.status === 'estimate') {
      expect(draft.pricing.lines[0].amount).toBe(3000000);
      expect(draft.pricing.lines[0].quantity).toBe(6);
      expect(draft.pricing.missingItems).toContain('Thuế');
    }
    expect(hasUsableQuote(draft.pricing)).toBe(false);
    expect(
      hotelSelectionProblem({ ...input, criteria: { ...input.criteria, rooms: 1 } }),
    ).toBeTruthy();
    expect(hotelSelectionProblem({ ...input, source: 'catalog' })).toContain('mã gói giá');
    expect(() =>
      buildHotelBookingDraft({ ...input, room: { ...input.room, id: 'unrelated' } }),
    ).toThrow();
    expect(() =>
      buildHotelBookingDraft({ ...input, criteria: { ...input.criteria, checkOut: '2099-12-10' } }),
    ).toThrow();
  });
  it('does not invent a price when the source rate is missing', () => {
    const input = hotelInput();
    input.room.pricePerNight = NaN;
    expect(buildHotelBookingDraft(input).pricing).toEqual({ status: 'unavailable' });
  });
  it('requires a complete, current and internally consistent provider quote', () => {
    const now = Date.now();
    const quote: BookingPricing = {
      status: 'verified',
      currency: 'VND',
      quoteId: 'provider-quote',
      validUntil: new Date(now + 60000).toISOString(),
      lines: [
        { kind: 'base', label: 'Phòng', amount: 100 },
        { kind: 'tax', label: 'Thuế', amount: 10 },
        { kind: 'discount', label: 'Ưu đãi', amount: 5 },
      ],
      total: 105,
    };
    expect(hasUsableQuote(quote, now)).toBe(true);
    expect(hasUsableQuote({ ...quote, total: 100 }, now)).toBe(false);
    expect(hasUsableQuote({ ...quote, validUntil: new Date(now - 1).toISOString() }, now)).toBe(
      false,
    );
    expect(hasUsableQuote({ ...quote, quoteId: '' }, now)).toBe(false);
  });
});

describe('CheckoutStateService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('stores separate immutable selection snapshots for each draft', () => {
    const store = TestBed.inject(CheckoutStateService),
      input = hotelInput();
    const first = store.startHotel(input),
      second = store.startHotel(input);
    expect(first.id).not.toBe(second.id);
    first.selection.hotelName = 'Mutated';
    input.hotel.name = 'Changed source';
    const resolved = store.resolve('hotel', first.id);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.draft.selection.hotelName).toBe('Khách sạn kiểm thử');
    store.saveHotelForm(first.id, validValues());
    const other = store.resolve('hotel', second.id);
    if (other.ok) expect(other.draft.form.contact.fullName).toBe('');
  });
  it('saves invalid edits but only marks complete after all required fields validate', () => {
    const store = TestBed.inject(CheckoutStateService),
      draft = store.startHotel(hotelInput());
    expect(store.completeHotelDetails(draft.id)).toBe(false);
    store.saveHotelForm(draft.id, validValues());
    expect(store.completeHotelDetails(draft.id)).toBe(true);
    let result = store.resolve('hotel', draft.id);
    if (result.ok) expect(result.draft.status).toBe('details-complete');
    const invalid = validValues();
    invalid.contact.email = 'bad';
    store.saveHotelForm(draft.id, invalid);
    expect(store.completeHotelDetails(draft.id)).toBe(false);
    result = store.resolve('hotel', draft.id);
    if (result.ok) {
      expect(result.draft.status).toBe('editing');
      expect(result.draft.form.contact.email).toBe('bad');
    }
  });
  it('handles missing/unsupported routes and expiration without inventing a booking', () => {
    const store = TestBed.inject(CheckoutStateService),
      draft = store.startHotel(hotelInput());
    expect(store.resolve('hotel', null)).toEqual({ ok: false, problem: 'missing' });
    expect(store.resolve('invalid', draft.id)).toEqual({ ok: false, problem: 'unknown-type' });
    for (const type of ['flight', 'activity', 'bus'])
      expect(store.resolve(type, draft.id)).toEqual({ ok: false, problem: 'type-mismatch' });
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(draft.expiresAt) + 1);
    expect(store.resolve('hotel', draft.id)).toEqual({ ok: false, problem: 'expired' });
    expect(store.saveHotelForm(draft.id, validValues())).toBe(false);
  });
  it('does not persist personal details in browser storage', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('sessionStorage', { setItem });
    const store = TestBed.inject(CheckoutStateService),
      draft = store.startHotel(hotelInput());
    store.saveHotelForm(draft.id, validValues());
    store.completeHotelDetails(draft.id);
    expect(setItem).not.toHaveBeenCalled();
    store.discard(draft.id);
    expect(store.resolve('hotel', draft.id)).toEqual({ ok: false, problem: 'missing' });
  });
});
