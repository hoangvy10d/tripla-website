import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { injectLiveHttp } from './live-http';

export interface AuthUserProfile {
  _id?: string;
  id: string;
  code?: string;
  fullName: string;
  full_name?: string;
  email: string;
  phone_number?: string;
  role?: 'tourist' | 'admin' | 'provider' | string;
  avatar?: string;
  membershipTier?: string;
  points?: number;
}

export interface AuthSession {
  token: string;
  user: AuthUserProfile;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUserProfile;
  errorCode?: string;
  message?: string;
}

const SESSION_STORAGE_KEY = 'tripla_session';
const ACTIVE_PROFILE_KEY = 'tripla_active_profile';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = injectLiveHttp();
  private readonly router = inject(Router, { optional: true });
  private readonly apiBase = 'http://localhost:3000/api/v1';

  isModalOpen = signal<boolean>(false);
  currentUser = signal<AuthUserProfile | null>(null);
  sessionToken = signal<string | null>(null);
  pendingNotice = signal<string>('');

  private pendingAction: (() => void) | null = null;
  private pendingRedirectUrl: string | null = null;

  constructor() {
    this.restoreSession();
  }

  private getStorage(): Storage | null {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        typeof window.localStorage.getItem === 'function' &&
        typeof window.localStorage.setItem === 'function'
      ) {
        return window.localStorage;
      }
    } catch {
      return null;
    }
    return null;
  }

  private restoreSession(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed?.user) {
        this.currentUser.set(parsed.user);
        this.sessionToken.set(parsed.token || null);
      }
    } catch {
      storage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private persistSessionState(user: AuthUserProfile, token?: string): void {
    const resolvedUser: AuthUserProfile = {
      ...user,
      id: user.id || user._id || user.code || 'user',
      fullName: user.fullName || user.full_name || user.email
    };
    const resolvedToken = token ?? this.sessionToken() ?? '';
    this.currentUser.set(resolvedUser);
    if (resolvedToken) {
      this.sessionToken.set(resolvedToken);
    }
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ token: resolvedToken, user: resolvedUser })
      );
      if (resolvedUser.id) {
        storage.setItem(ACTIVE_PROFILE_KEY, resolvedUser.id);
      }
    }
  }

  saveSession(user: AuthUserProfile, token?: string): void {
    this.persistSessionState(user, token);
    const action = this.pendingAction;
    const redirectUrl = this.pendingRedirectUrl;
    this.pendingAction = null;
    this.pendingRedirectUrl = null;
    this.pendingNotice.set('');
    this.isModalOpen.set(false);

    if (action) {
      try {
        action();
      } catch {
        // Ignore action error after session restore
      }
    } else if (redirectUrl && this.router) {
      const role = String(user.role || '').toLowerCase();
      if (!redirectUrl.startsWith('/admin') || role === 'admin') {
        this.router.navigateByUrl(redirectUrl);
      }
    }
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.sessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  isLoggedIn(): boolean {
    return Boolean(this.currentUser());
  }

  isAdmin(): boolean {
    return String(this.currentUser()?.role || '').toLowerCase() === 'admin';
  }

  logout(): void {
    this.currentUser.set(null);
    this.sessionToken.set(null);
    this.pendingAction = null;
    this.pendingRedirectUrl = null;
    this.pendingNotice.set('');
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(SESSION_STORAGE_KEY);
      storage.removeItem(ACTIVE_PROFILE_KEY);
    }
  }

  openAuthModal(options?: {
    notice?: string;
    redirectUrl?: string;
    pendingAction?: () => void;
  }): void {
    if (options?.pendingAction) {
      this.pendingAction = options.pendingAction;
    }
    if (options?.redirectUrl) {
      this.pendingRedirectUrl = options.redirectUrl;
    }
    if (options?.notice !== undefined) {
      this.pendingNotice.set(options.notice);
    }
    this.isModalOpen.set(true);
  }

  closeAuthModal(clearPending = false): void {
    this.isModalOpen.set(false);
    if (clearPending) {
      this.pendingAction = null;
      this.pendingRedirectUrl = null;
      this.pendingNotice.set('');
    }
  }

  /**
   * Flow F0: Run protected action immediately if authenticated; otherwise open
   * login modal, remember the target action, and resume automatically after login.
   */
  requireAuth(
    action: () => void,
    notice = 'Vui lòng đăng nhập tài khoản du khách để tiếp tục thao tác.'
  ): boolean {
    if (this.currentUser()) {
      action();
      return true;
    }
    this.openAuthModal({
      pendingAction: action,
      notice
    });
    return false;
  }

  fetchMe(): Observable<AuthResponse> {
    const token = this.sessionToken();
    if (!token) {
      return of({ success: false, message: 'Chưa có phiên đăng nhập.' });
    }
    if (!this.http) {
      const current = this.currentUser();
      return of(current ? { success: true, user: current, token } : { success: false });
    }
    return this.http
      .get<AuthResponse>(`${this.apiBase}/auth/me`, { headers: this.getAuthHeaders() })
      .pipe(
        tap((res) => {
          if (res?.success && res.user) {
            this.persistSessionState(res.user, token);
          }
        }),
        catchError((err) => {
          if (err?.status === 401) {
            this.logout();
          }
          return of({
            success: false,
            errorCode: err?.error?.errorCode || 'SESSION_EXPIRED',
            message: err?.error?.message || 'Phiên đăng nhập đã hết hạn.'
          });
        })
      );
  }

  register(payload: {
    full_name: string;
    email: string;
    phone_number?: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.authenticate('register', payload.email, payload.password, {
      fullName: payload.full_name,
      phoneNumber: payload.phone_number
    });
  }

  updateProfile(payload: {
    full_name?: string;
    phone_number?: string;
    avatar?: string;
    bio?: string;
    location?: string;
  }): Observable<AuthResponse> {
    const current = this.currentUser();
    if (!current) {
      return of({ success: false, message: 'Bạn cần đăng nhập để cập nhật hồ sơ.' });
    }
    if (!this.http) {
      const next: AuthUserProfile = {
        ...current,
        fullName: payload.full_name ?? current.fullName,
        full_name: payload.full_name ?? current.fullName,
        phone_number: payload.phone_number ?? current.phone_number,
        avatar: payload.avatar ?? current.avatar
      };
      this.persistSessionState(next);
      return of({ success: true, user: next });
    }
    return this.http
      .put<AuthResponse>(`${this.apiBase}/auth/profile`, payload, {
        headers: this.getAuthHeaders()
      })
      .pipe(
        tap((res) => {
          if (res?.success && res.user) {
            this.persistSessionState(res.user);
          }
        }),
        catchError((err) =>
          of({
            success: false,
            message: err?.error?.message || 'Không thể cập nhật thông tin cá nhân.'
          })
        )
      );
  }

  navigateToLoginFailed(
    errorCode: string,
    message: string,
    loginFrom: 'traveler' | 'admin' = 'traveler',
    username = ''
  ): void {
    this.closeAuthModal();
    if (this.router) {
      this.router.navigate(['/login-failed'], {
        queryParams: {
          code: errorCode || 'AUTH_FAILED',
          reason: message || 'Đăng nhập thất bại.',
          from: loginFrom,
          username
        }
      });
    }
  }

  loginCust(username: string, password: string): Observable<AuthResponse> {
    return this.executeRoleLogin('cust', username, password);
  }

  loginEmp(username: string, password: string): Observable<AuthResponse> {
    return this.executeRoleLogin('emp', username, password);
  }

  private executeRoleLogin(
    target: 'cust' | 'emp',
    username: string,
    password: string
  ): Observable<AuthResponse> {
    const cleanUsername = String(username || '').trim();
    const loginFrom = target === 'emp' ? 'admin' : 'traveler';

    if (!this.http) {
      const demoUser: AuthUserProfile = {
        id: target === 'emp' ? 'a1' : 'u1',
        fullName: target === 'emp' ? 'Trần Duy Thanh' : 'Nguyễn Hoàng Vy',
        email: cleanUsername || (target === 'emp' ? 'admin@tripla.com' : 'vynhk24411e@st.uel.edu.vn'),
        role: target === 'emp' ? 'admin' : 'tourist',
        membershipTier: target === 'emp' ? 'SYSTEM ADMIN' : 'GOLD VIP'
      };
      this.saveSession(demoUser, 'offline-demo-token');
      return of({ success: true, token: 'offline-demo-token', user: demoUser });
    }

    const endpoint = target === 'emp' ? 'login-emp' : 'login-cust';
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/${endpoint}`, {
        username: cleanUsername,
        password
      })
      .pipe(
        tap((res) => {
          if (res?.success && res.user) {
            this.saveSession(res.user, res.token);
          } else {
            this.navigateToLoginFailed(
              res?.errorCode || 'AUTH_FAILED',
              res?.message || 'Đăng nhập thất bại.',
              loginFrom,
              cleanUsername
            );
          }
        }),
        catchError((err) => {
          const errorCode =
            err?.error?.errorCode || (err?.status === 403 ? 'WRONG_ROLE' : 'AUTH_FAILED');
          const message =
            err?.error?.message ||
            (err?.status === 0
              ? 'Không thể kết nối máy chủ xác thực.'
              : 'Thông tin đăng nhập không hợp lệ.');
          this.navigateToLoginFailed(errorCode, message, loginFrom, cleanUsername);
          return of({ success: false, errorCode, message });
        })
      );
  }

  authenticate(
    mode: 'login' | 'register',
    emailOrIdentifier: string,
    password: string,
    extra?: { fullName?: string; phoneNumber?: string }
  ): Observable<AuthResponse> {
    if (mode === 'login') {
      return this.loginCust(emailOrIdentifier, password);
    }

    const email = String(emailOrIdentifier || '').trim();
    const fullName =
      String(extra?.fullName || '').trim() ||
      (email.includes('@') ? email.split('@')[0] : 'Khách hàng TRIPLA');
    const phoneNumber = String(extra?.phoneNumber || '').trim();

    if (!this.http) {
      const demoUser: AuthUserProfile = {
        id: `usr_${Date.now()}`,
        fullName,
        email,
        phone_number: phoneNumber,
        role: 'tourist',
        membershipTier: 'MEMBER',
        points: 200
      };
      this.saveSession(demoUser, 'offline-demo-token');
      return of({ success: true, token: 'offline-demo-token', user: demoUser });
    }

    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/register`, {
        email,
        full_name: fullName,
        fullName,
        phone_number: phoneNumber,
        password
      })
      .pipe(
        tap((res) => {
          if (res?.success && res.user) {
            this.saveSession(res.user, res.token);
          }
        }),
        catchError((err) =>
          of({
            success: false,
            errorCode: err?.error?.errorCode || 'REGISTER_FAILED',
            message: err?.error?.message || 'Đăng ký tài khoản thất bại.'
          })
        )
      );
  }
}
