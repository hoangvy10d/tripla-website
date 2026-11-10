import { FormArray, FormControl, FormGroup, Validators, ValidatorFn } from '@angular/forms';
import {
  FlightBookingDraft,
  ActivityBookingDraft,
  BusBookingDraft,
  BookingDraft,
} from '../models/booking-draft.model';
import {
  FlightCheckoutValues,
  ActivityCheckoutValues,
  BusCheckoutValues,
  FlightPassenger,
} from '../models/checkout.model';
import { createContactForm, createHotelGuestForm } from './hotel-checkout.form';
import { validDate, localDateString } from '../../hotel-search/models/hotel-search-criteria.model';
const nameValidators = [
  Validators.required,
  Validators.maxLength(100),
  ((control) =>
    typeof control.value === 'string' && control.value.trim()
      ? null
      : { required: true }) as ValidatorFn,
];
export function passengerTypes(s: FlightBookingDraft['selection']): FlightPassenger['type'][] {
  return [
    ...Array(s.adults).fill('adult'),
    ...Array(s.children).fill('child'),
    ...Array(s.infants).fill('infant'),
  ];
}
export function createFlightForm(
  selection?: FlightBookingDraft['selection'],
  value?: FlightCheckoutValues['flight'],
) {
  const expected = selection ? passengerTypes(selection) : [];
  const passengers =
    value?.passengers ||
    expected.map((type) => ({
      type,
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: '',
    }));
  const dob: ValidatorFn = (control) =>
    !control.value && !selection?.requirements.dateOfBirth
      ? null
      : validDate(control.value) && control.value <= localDateString(new Date())
        ? null
        : { birthDate: true };
  return new FormGroup(
    {
      passengers: new FormArray(
        passengers.map(
          (p) =>
            new FormGroup({
              type: new FormControl(p.type, { nonNullable: true }),
              firstName: new FormControl(p.firstName, {
                nonNullable: true,
                validators: nameValidators,
              }),
              lastName: new FormControl(p.lastName, {
                nonNullable: true,
                validators: nameValidators,
              }),
              dateOfBirth: new FormControl(p.dateOfBirth, { nonNullable: true, validators: dob }),
              nationality: new FormControl(p.nationality, {
                nonNullable: true,
                validators: selection?.requirements.nationality ? nameValidators : [],
              }),
            }),
        ),
      ),
    },
    {
      validators: (control) => {
        const values = control.getRawValue().passengers as FlightPassenger[];
        return values.length === expected.length && values.every((p, i) => p.type === expected[i])
          ? null
          : { passengerCount: true };
      },
    },
  );
}
export function createActivityForm(
  selection?: ActivityBookingDraft['selection'],
  value?: ActivityCheckoutValues['activity'],
) {
  const expected = selection?.requiresParticipants ? selection.quantity : 0;
  return new FormGroup(
    {
      purchaserAttending: new FormControl(value?.purchaserAttending ?? true, { nonNullable: true }),
      participants: new FormArray(
        (value?.participants || Array.from({ length: expected }, () => ({ fullName: '' }))).map(
          (p) =>
            new FormGroup({
              fullName: new FormControl(p.fullName, {
                nonNullable: true,
                validators: nameValidators,
              }),
            }),
        ),
      ),
      notes: new FormControl(value?.notes || '', {
        nonNullable: true,
        validators: Validators.maxLength(500),
      }),
    },
    {
      validators: (control) =>
        control.get('participants')?.value.length === expected ? null : { participantCount: true },
    },
  );
}
export function createBusForm(
  selection?: BusBookingDraft['selection'],
  value?: BusCheckoutValues['bus'],
) {
  const seats = selection?.seats || [];
  return new FormGroup(
    {
      passengers: new FormArray(
        (
          value?.passengers || seats.map((seat) => ({ seatId: seat.id, fullName: '', phone: '' }))
        ).map(
          (p) =>
            new FormGroup({
              seatId: new FormControl(p.seatId, { nonNullable: true }),
              fullName: new FormControl(p.fullName, {
                nonNullable: true,
                validators: nameValidators,
              }),
              phone: new FormControl(p.phone, {
                nonNullable: true,
                validators: (control) =>
                  !control.value ||
                  (/^[\d +().-]{7,24}$/.test(control.value) &&
                    control.value.replace(/\D/g, '').length >= 7)
                    ? null
                    : { phone: true },
              }),
            }),
        ),
      ),
      pickup: new FormControl(value?.pickup ?? selection?.pickup ?? '', {
        nonNullable: true,
        validators: Validators.required,
      }),
      dropoff: new FormControl(value?.dropoff ?? selection?.dropoff ?? '', {
        nonNullable: true,
        validators: Validators.required,
      }),
    },
    {
      validators: (control) => {
        const p = control.getRawValue().passengers as BusCheckoutValues['bus']['passengers'];
        return p.length === seats.length &&
          p.every((passenger, i) => passenger.seatId === seats[i].id) &&
          control.get('pickup')?.value === selection?.pickup &&
          control.get('dropoff')?.value === selection?.dropoff
          ? null
          : { seatAssignment: true };
      },
    },
  );
}
export type FlightFormGroup = ReturnType<typeof createFlightForm>;
export type ActivityFormGroup = ReturnType<typeof createActivityForm>;
export type BusFormGroup = ReturnType<typeof createBusForm>;
export function checkoutFormValid(draft: BookingDraft): boolean {
  if (createContactForm(draft.form.contact).invalid) return false;
  switch (draft.type) {
    case 'hotel':
      return createHotelGuestForm(draft.form.hotel).valid;
    case 'flight':
      return createFlightForm(draft.selection, draft.form.flight).valid;
    case 'activity':
      return createActivityForm(draft.selection, draft.form.activity).valid;
    case 'bus':
      return createBusForm(draft.selection, draft.form.bus).valid;
  }
}
