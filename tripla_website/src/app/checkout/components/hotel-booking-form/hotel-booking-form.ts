import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HotelGuestFormGroup, showFieldError } from '../../forms/hotel-checkout.form';
@Component({
  selector: 'app-hotel-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hotel-booking-form.html',
  styleUrl: '../../styles/checkout-form.css',
})
export class HotelBookingForm {
  readonly group = input.required<HotelGuestFormGroup>();
  readonly submitted = input(false);
  readonly adults = input.required<number>();
  readonly children = input.required<number>();
  readonly rooms = input.required<number>();
  invalid(field: keyof HotelGuestFormGroup['controls']): boolean {
    return showFieldError(this.group().controls[field], this.submitted());
  }
}
