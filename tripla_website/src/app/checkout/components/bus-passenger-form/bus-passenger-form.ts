import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { BusFormGroup } from '../../forms/service-checkout.forms';
import { BusBookingDraft } from '../../models/booking-draft.model';
import { showFieldError } from '../../forms/hotel-checkout.form';
@Component({
  selector: 'app-bus-passenger-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bus-passenger-form.html',
  styleUrl: '../../styles/checkout-form.css',
})
export class BusPassengerForm {
  readonly group = input.required<BusFormGroup>();
  readonly selection = input.required<BusBookingDraft['selection']>();
  readonly submitted = input(false);
  invalid(control: AbstractControl) {
    return showFieldError(control, this.submitted());
  }
}
