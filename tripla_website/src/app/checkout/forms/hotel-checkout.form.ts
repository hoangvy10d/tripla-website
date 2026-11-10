import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import {
  CheckoutContact,
  HotelGuestDetails,
  emptyContact,
  emptyHotelGuest,
} from '../models/checkout.model';

const nonBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };
export const callingCodes = [
  { code: '+84', label: 'Việt Nam (+84)' },
  { code: '+66', label: 'Thái Lan (+66)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+1', label: 'Mỹ / Canada (+1)' },
  { code: '+44', label: 'Anh (+44)' },
];
const phoneValidator: ValidatorFn = (control) => {
  const code = control.get('callingCode')?.value as string;
  const raw = control.get('phone')?.value as string;
  if (!raw?.trim()) return null; // The phone control handles required separately.
  if (!/^[\d\s().-]+$/.test(raw)) return { phoneInvalid: true };
  const digits = raw.replace(/\D/g, '');
  const rules: Record<string, RegExp> = {
    '+84': /^0?(?:[35789]\d{8}|2\d{9})$/,
    '+65': /^[3689]\d{7}$/,
    '+1': /^[2-9]\d{9}$/,
    '+66': /^0?\d{8,9}$/,
    '+60': /^0?\d{8,10}$/,
    '+44': /^0?\d{9,10}$/,
  };
  return rules[code]?.test(digits) ? null : { phoneInvalid: true };
};
export function createContactForm(value: CheckoutContact = emptyContact()) {
  return new FormGroup(
    {
      fullName: new FormControl(value.fullName, {
        nonNullable: true,
        validators: [nonBlank, Validators.maxLength(150)],
      }),
      email: new FormControl(value.email, {
        nonNullable: true,
        validators: [nonBlank, Validators.email, Validators.maxLength(254)],
      }),
      callingCode: new FormControl(value.callingCode, {
        nonNullable: true,
        validators: [
          Validators.required,
          (control) =>
            callingCodes.some((item) => item.code === control.value) ? null : { callingCode: true },
        ],
      }),
      phone: new FormControl(value.phone, {
        nonNullable: true,
        validators: [nonBlank, Validators.maxLength(24)],
      }),
    },
    { validators: phoneValidator },
  );
}
export function createHotelGuestForm(value: HotelGuestDetails = emptyHotelGuest()) {
  return new FormGroup({
    firstName: new FormControl(value.firstName, {
      nonNullable: true,
      validators: [nonBlank, Validators.maxLength(100)],
    }),
    lastName: new FormControl(value.lastName, {
      nonNullable: true,
      validators: [nonBlank, Validators.maxLength(100)],
    }),
    bookingForSomeoneElse: new FormControl(value.bookingForSomeoneElse, { nonNullable: true }),
    nonSmoking: new FormControl(value.nonSmoking, { nonNullable: true }),
    highFloor: new FormControl(value.highFloor, { nonNullable: true }),
    connectingRooms: new FormControl(value.connectingRooms, { nonNullable: true }),
    specialRequests: new FormControl(value.specialRequests, {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });
}
export type ContactFormGroup = ReturnType<typeof createContactForm>;
export type HotelGuestFormGroup = ReturnType<typeof createHotelGuestForm>;
export function showFieldError(control: AbstractControl, submitted: boolean): boolean {
  return control.invalid && (control.touched || submitted);
}
