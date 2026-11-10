import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-checkout-actions',
  standalone: true,
  templateUrl: './checkout-actions.html',
  styleUrl: './checkout-actions.css',
})
export class CheckoutActions {
  readonly backLabel = input('Quay lại chọn phòng');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly saved = input(false);
  readonly back = output<void>();
  readonly proceed = output<void>();
}
