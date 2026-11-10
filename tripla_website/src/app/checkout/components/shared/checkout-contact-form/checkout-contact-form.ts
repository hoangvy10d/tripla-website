import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ContactFormGroup, callingCodes, showFieldError } from '../../../forms/hotel-checkout.form';
@Component({
  selector: 'app-checkout-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout-contact-form.html',
  styleUrl: '../../../styles/checkout-form.css',
})
export class CheckoutContactForm {
  readonly group = input.required<ContactFormGroup>();
  readonly submitted = input(false);
  readonly callingCodes = callingCodes;
  invalid(field: keyof ContactFormGroup['controls']): boolean {
    return showFieldError(this.group().controls[field], this.submitted());
  }
  get phoneInvalid(): boolean {
    return (
      this.invalid('phone') ||
      (this.group().hasError('phoneInvalid') &&
        (this.group().controls.phone.touched || this.submitted()))
    );
  }
}
