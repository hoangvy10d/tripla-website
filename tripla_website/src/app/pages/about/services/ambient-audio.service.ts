import { Injectable, signal } from '@angular/core';

/** Tiếng chim của About; tự phát khi được trình duyệt cho phép. */
@Injectable({ providedIn: 'root' })
export class AmbientAudioService {
  readonly playing = signal(false);

  private audio?: HTMLAudioElement;
  private requested = false;
  private requestId = 0;
  private waitingForGesture = false;
  private removeGestureListeners?: () => void;

  startDefault(): void {
    this.start();
  }

  toggle(): void {
    this.requested && !this.waitingForGesture ? this.stop() : this.start();
  }

  private start(): void {
    this.removeGestureListeners?.();
    this.removeGestureListeners = undefined;
    this.waitingForGesture = false;
    if (!this.audio) {
      this.audio = new Audio('/audio/tiengchimhot.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.5;
      this.audio.addEventListener('pause', () => this.playing.set(false));
      this.audio.addEventListener('error', () => this.stop());
    }
    this.requested = true;
    const requestId = ++this.requestId;
    this.audio.muted = false;
    this.audio.play().then(() => {
      if (!this.requested) { this.audio?.pause(); return; }
      if (requestId === this.requestId) this.playing.set(true);
    }).catch((error: unknown) => {
      if (requestId !== this.requestId) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.playing.set(false);
        this.waitingForGesture = true;
        const retry = (event: Event) => {
          // Nút loa có handler riêng, tránh bật rồi tắt trong cùng một lần bấm.
          if (event.target instanceof Element && event.target.closest('button.sound')) return;
          if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
          if (this.requested) this.start();
        };
        document.addEventListener('pointerdown', retry);
        document.addEventListener('keydown', retry);
        this.removeGestureListeners = () => {
          document.removeEventListener('pointerdown', retry);
          document.removeEventListener('keydown', retry);
        };
      } else {
        this.stop();
      }
    });
  }

  stop(): void {
    this.removeGestureListeners?.();
    this.removeGestureListeners = undefined;
    this.waitingForGesture = false;
    this.requested = false;
    ++this.requestId;
    if (this.audio) {
      this.audio.muted = true;
      this.audio.pause();
    }
    this.playing.set(false);
  }
}
