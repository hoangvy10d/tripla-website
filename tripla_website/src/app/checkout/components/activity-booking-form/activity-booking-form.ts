import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivityFormGroup } from '../../forms/service-checkout.forms';
import { ActivityBookingDraft } from '../../models/booking-draft.model';
import { showFieldError } from '../../forms/hotel-checkout.form';
@Component({
  selector: 'app-activity-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-booking-form.html',
  styleUrl: '../../styles/checkout-form.css',
})
export class ActivityBookingForm {
  readonly group = input.required<ActivityFormGroup>();
  readonly selection = input.required<ActivityBookingDraft['selection']>();
  readonly submitted = input(false);
  invalid(control: AbstractControl) {
    return showFieldError(control, this.submitted());
  }
}
