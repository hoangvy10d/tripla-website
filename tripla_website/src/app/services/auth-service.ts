import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Dùng Signal của Angular (hoặc BehaviorSubject)
  isModalOpen = signal<boolean>(false);

  openAuthModal() {
    this.isModalOpen.set(true);
  }

  closeAuthModal() {
    this.isModalOpen.set(false);
  }
}