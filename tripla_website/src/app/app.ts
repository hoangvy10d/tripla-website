import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthModalComponent } from './pages/auth-modal/auth-modal-component/auth-modal-component';
import { AuthService } from './services/auth-service';

export const NOT_FOUND_IMAGE_PATH = 'images/not-found.svg';

@Component({
  imports: [RouterOutlet, AuthModalComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('tripla_website');
  readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const onCaptureError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;
      const img = target as HTMLImageElement;
      if (img.dataset['fallbackApplied'] === '1') return;
      img.dataset['fallbackApplied'] = '1';
      img.src = NOT_FOUND_IMAGE_PATH;
      if (!img.alt) {
        img.alt = 'Not Found';
      }
    };

    // Capture phase is required because image error events do not bubble.
    this.document.addEventListener('error', onCaptureError, true);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('error', onCaptureError, true);
    });
  }
}
