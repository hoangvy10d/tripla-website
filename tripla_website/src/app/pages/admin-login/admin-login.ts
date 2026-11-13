import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="al-shell">
      <section class="al-card">
        <div class="al-brand">
          <span class="al-pill">TRIPLA ADMIN PORTAL</span>
          <h1>Đăng nhập Quản trị viên</h1>
          <p>Sử dụng email hoặc số điện thoại nhân viên/admin để truy cập bảng điều hành.</p>
        </div>

        <form class="al-form" (submit)="submit($event)">
          <label class="al-field">
            <span>Email hoặc Số điện thoại</span>
            <input
              type="text"
              name="username"
              [(ngModel)]="username"
              placeholder="admin@tripla.com hoặc 0909000110"
              required
            />
          </label>

          <label class="al-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              placeholder="Nhập mật khẩu quản trị"
              required
            />
          </label>

          <div class="al-quick">
            <span>Tài khoản mẫu (SHA-256):</span>
            <button type="button" class="al-chip" (click)="fillDemoAdmin()">
              Trần Duy Thanh (admin&#64;tripla.com)
            </button>
          </div>

          <button type="submit" class="al-submit" [disabled]="submitting">
            {{ submitting ? 'Đang xác thực...' : 'Đăng nhập Admin Portal' }}
          </button>
        </form>

        <footer class="al-footer">
          <a routerLink="/home">← Quay lại trang Du khách</a>
        </footer>
      </section>
    </main>
  `,
  styles: [`
    .al-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(145deg, #173b32 0%, #0f2922 65%, #30624b 100%);
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
    }
    .al-card {
      width: 100%;
      max-width: 440px;
      background: #f3f3e9;
      color: #173b32;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 28px 65px rgba(0, 0, 0, 0.35);
    }
    .al-pill {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 999px;
      background: #dfecb6;
      color: #173b32;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .al-brand h1 {
      margin: 14px 0 6px;
      font-size: 26px;
      font-weight: 700;
    }
    .al-brand p {
      margin: 0 0 22px;
      font-size: 14px;
      color: #30624b;
      line-height: 1.5;
    }
    .al-form {
      display: grid;
      gap: 16px;
    }
    .al-field {
      display: grid;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .al-field input {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(23, 59, 50, 0.25);
      background: #ffffff;
      font-size: 14px;
      color: #173b32;
    }
    .al-quick {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #30624b;
    }
    .al-chip {
      border: 1px solid #30624b;
      background: #ffffff;
      color: #173b32;
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .al-submit {
      margin-top: 4px;
      padding: 13px 20px;
      border: none;
      border-radius: 999px;
      background: #173b32;
      color: #f3f3e9;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    .al-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .al-footer {
      margin-top: 20px;
      text-align: center;
      font-size: 13px;
    }
    .al-footer a {
      color: #30624b;
      font-weight: 600;
      text-decoration: none;
    }
  `]
})
export class AdminLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  submitting = false;

  fillDemoAdmin(): void {
    this.username = 'admin@tripla.com';
    this.password = 'admin123';
  }

  submit(event: Event): void {
    event.preventDefault();
    if (!this.username.trim() || !this.password) return;
    this.submitting = true;
    this.authService.loginEmp(this.username.trim(), this.password).subscribe((res) => {
      this.submitting = false;
      this.cdr.markForCheck();
      if (res.success && res.user?.role === 'admin') {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin';
        this.router.navigateByUrl(returnUrl);
      }
    });
  }
}

