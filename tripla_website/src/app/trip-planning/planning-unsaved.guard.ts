import { CanDeactivateFn } from '@angular/router';
export const planningUnsavedGuard: CanDeactivateFn<{ canLeave: () => boolean }> = (component) =>
  component.canLeave();
