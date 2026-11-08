import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth-service';


@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal-component.html',
  styleUrls: ['./auth-modal-component.css']
})
export class AuthModalComponent {
  currentAuthMode: 'login' | 'register' = 'login';
  isPasswordVisible = false;
  isSubmitting = false;
  authData = {
    identifier: '',
    password: '',
  };

  constructor(public authService: AuthService) {}

  closeModal() {
    this.authService.closeAuthModal();
  }

  switchAuthMode(mode: 'login' | 'register') {
    this.currentAuthMode = mode;
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  handleAuthSubmit(event: Event) {
    event.preventDefault();
    this.isSubmitting = true;

    // Logic submit API ở đây
    setTimeout(() => {
      this.isSubmitting = false;
      this.closeModal();
    }, 500);
  }
}