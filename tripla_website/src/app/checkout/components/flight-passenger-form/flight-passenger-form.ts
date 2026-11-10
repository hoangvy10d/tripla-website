import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { FlightFormGroup } from '../../forms/service-checkout.forms';
import { FlightBookingDraft } from '../../models/booking-draft.model';
import { showFieldError } from '../../forms/hotel-checkout.form';
import { localDateString } from '../../../hotel-search/models/hotel-search-criteria.model';
@Component({
  selector: 'app-flight-passenger-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './flight-passenger-form.html',
  styleUrl: '../../styles/checkout-form.css',
})
export class FlightPassengerForm {
  readonly group = input.required<FlightFormGroup>();
  readonly selection = input.required<FlightBookingDraft['selection']>();
  readonly submitted = input(false);
  readonly today = localDateString(new Date());
  invalid(control: AbstractControl) {
    return showFieldError(control, this.submitted());
  }
}
