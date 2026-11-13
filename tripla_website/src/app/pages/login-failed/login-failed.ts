import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login-failed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="lf-shell">
      <section class="lf-card" role="alert" aria-live="polite">
        <div class="lf-badge">{{ errorLabel() }}</div>
        <div class="lf-icon" aria-hidden="true">
          <span class="material-symbols-outlined">gpp_bad</span>
        </div>
        <h1>Đăng nhập không thành công</h1>
        <p class="lf-reason">{{ reason() }}</p>

        @if (username()) {
          <div class="lf-meta">
            <span>Tài khoản đã thử:</span>
            <strong>{{ username() }}</strong>
          </div>
        }

        <div class="lf-details">
          <div><span>Mã lỗi</span><code>{{ code() }}</code></div>
          <div><span>Cổng xác thực</span><strong>{{ loginSource() === 'admin' ? 'Admin / Employee Portal' : 'Traveler Account' }}</strong></div>
        </div>

        <div class="lf-actions">
          <button type="button" class="lf-btn primary" (click)="retryLogin()">
            Thử đăng nhập lại
          </button>
          <a class="lf-btn secondary" routerLink="/home">Về trang chủ</a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .lf-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(155deg, #f3f3e9 0%, #e7edda 100%);
      color: #173b32;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
    }
    .lf-card {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 24px;
      padding: 32px 28px;
      border: 1px solid rgba(23, 59, 50, 0.14);
      box-shadow: 0 24px 60px rgba(23, 59, 50, 0.12);
      text-align: center;
    }
    .lf-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      background: #fee2e2;
      color: #991b1b;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .lf-icon span {
      font-size: 52px;
      color: #b91c1c;
    }
    h1 {
      margin: 12px 0 8px;
      font-size: 24px;
      font-weight: 700;
    }
    .lf-reason {
      margin: 0 0 20px;
      font-size: 15px;
      line-height: 1.55;
      color: #374151;
    }
    .lf-meta {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .lf-details {
      background: #f3f3e9;
      border-radius: 14px;
      padding: 12px 16px;
      margin-bottom: 24px;
      display: grid;
      gap: 8px;
      font-size: 13px;
    }
    .lf-details > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    code {
      background: rgba(23, 59, 50, 0.1);
      color: #173b32;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }
    .lf-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .lf-btn {
      padding: 11px 20px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .lf-btn.primary {
      background: #173b32;
      color: #f3f3e9;
    }
    .lf-btn.secondary {
      background: transparent;
      border-color: #30624b;
      color: #173b32;
    }
  `]
})
export class LoginFailedComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly params = toSignal(this.route.queryParamMap);

  readonly code = computed(() => this.params()?.get('code') || 'AUTH_FAILED');
  readonly reason = computed(
    () =>
      this.params()?.get('reason') ||
      'Không thể xác thực tài khoản. Vui lòng kiểm tra thông tin đăng nhập.'
  );
  readonly loginSource = computed(() => this.params()?.get('from') || 'traveler');
  readonly username = computed(() => this.params()?.get('username') || '');

  readonly errorLabel = computed(() => {
    switch (this.code()) {
      case 'WRONG_PASSWORD':
        return 'Sai mật khẩu (Wrong Password)';
      case 'ACCOUNT_NOT_FOUND':
        return 'Không tìm thấy tài khoản (Account Not Found)';
      case 'WRONG_ROLE':
        return 'Sai vai trò truy cập (Wrong Role)';
      default:
        return 'Xác thực thất bại';
    }
  });

  retryLogin(): void {
    if (this.loginSource() === 'admin') {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.router.navigate(['/home']).then(() => {
      this.authService.openAuthModal();
    });
  }
}

