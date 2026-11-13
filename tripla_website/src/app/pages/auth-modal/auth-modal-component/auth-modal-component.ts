import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal-component.html',
  styleUrls: ['./auth-modal-component.css']
})
export class AuthModalComponent {
  private readonly router = inject(Router, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  currentAuthMode: 'login' | 'register' = 'login';
  isPasswordVisible = false;
  isSubmitting = false;
  authError = '';
  forgotNotice = '';

  authData = {
    identifier: '',
    password: '',
    fullName: '',
    phoneNumber: ''
  };

  constructor(public authService: AuthService) {}

  /** Tài khoản du khách (tourist) đã hash SHA-256 trong MongoDB. */
  readonly quickAccounts = [
    { name: 'Nguyễn Hoàng Vy', email: 'vynhk24411e@st.uel.edu.vn' },
    { name: 'Ngô Minh Thùy', email: 'thuynmk24411e@st.uel.edu.vn' },
    { name: 'Victoria Chen', email: 'victoria.chen@tripla.vn' }
  ];

  useQuickAccount(email: string) {
    this.currentAuthMode = 'login';
    this.authError = '';
    this.authData.identifier = email;
    this.authData.password = '123456';
  }

  closeModal(cancelled = false) {
    this.authService.closeAuthModal(cancelled);
  }

  goToAdminLogin() {
    this.closeModal();
    if (this.router) {
      this.router.navigate(['/admin/login']);
    }
  }

  switchAuthMode(mode: 'login' | 'register') {
    this.currentAuthMode = mode;
    this.forgotNotice = '';
    this.authError = '';
  }

  handleForgotPassword() {
    const email = (this.authData.identifier || '').trim() || 'email đã đăng ký';
    this.forgotNotice = `Hướng dẫn đặt lại mật khẩu sẽ được gửi tới ${email}. Tài khoản mẫu dùng mật khẩu: 123456.`;
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  handleAuthSubmit(event: Event) {
    event.preventDefault();
    const identifier = (this.authData.identifier || '').trim();
    const password = this.authData.password || '';
    if (!identifier || !password) {
      this.authError = 'Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu.';
      return;
    }

    if (this.currentAuthMode === 'register') {
      if (!identifier.includes('@')) {
        this.authError = 'Vui lòng nhập địa chỉ email hợp lệ để đăng ký.';
        return;
      }
      if (!this.authData.fullName.trim()) {
        this.authError = 'Vui lòng nhập họ và tên.';
        return;
      }
    }

    this.isSubmitting = true;
    this.authError = '';

    this.authService
      .authenticate(this.currentAuthMode, identifier, password, {
        fullName: this.authData.fullName,
        phoneNumber: this.authData.phoneNumber
      })
      .subscribe((res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.closeModal(false);
        } else if (this.currentAuthMode === 'register') {
          this.authError = res.message || 'Đăng ký thất bại.';
        } else {
          this.closeModal(false);
        }
        this.cdr.markForCheck();
      });
  }
}