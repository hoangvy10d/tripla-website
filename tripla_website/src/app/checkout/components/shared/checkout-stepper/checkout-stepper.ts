import { Component, input } from '@angular/core';
@Component({
  selector: 'app-checkout-stepper',
  standalone: true,
  templateUrl: './checkout-stepper.html',
  styleUrl: './checkout-stepper.css',
})
export class CheckoutStepper {
  readonly detailsSaved = input(false);
}
