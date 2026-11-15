import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { adminGuard } from '../guards/admin-guard';
import { authGuard } from '../guards/auth-guard';
import { LoginFailedComponent } from '../pages/login-failed/login-failed';
import { AuthService } from './auth-service';
import { TRIPLA_LIVE_API_ENABLED } from './live-http';

describe('AuthService & adminGuard (Q2)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear()
      }
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login-failed', component: LoginFailedComponent },
          { path: 'admin/login', component: LoginFailedComponent }
        ]),
        { provide: TRIPLA_LIVE_API_ENABLED, useValue: true }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock?.verify();
    window.localStorage?.clear?.();
  });

  it('logs in tourist via /api/v1/auth/login-cust and persists session', () => {
    let result: any = null;
    service.loginCust('0909111001', '123456').subscribe((res) => (result = res));

    const req = httpMock.expectOne('/api/v1/auth/login-cust');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: '0909111001', password: '123456' });

    req.flush({
      success: true,
      token: 'tok-cust-1',
      user: { id: 'u1', fullName: 'Nguyễn Hoàng Vy', email: 'vynhk24411e@st.uel.edu.vn', role: 'tourist' }
    });

    expect(result.success).toBe(true);
    expect(service.currentUser()?.role).toBe('tourist');
    expect(service.getAuthHeaders()).toEqual({ Authorization: 'Bearer tok-cust-1' });
    expect(window.localStorage.getItem('tripla_session')).toContain('tok-cust-1');
  });

  it('redirects to /login-failed when login-cust rejects wrong password or wrong role', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    let result: any = null;

    service.loginCust('admin@tripla.com', 'wrongpass').subscribe((res) => (result = res));

    const req = httpMock.expectOne('/api/v1/auth/login-cust');
    req.flush(
      { success: false, errorCode: 'WRONG_ROLE', message: 'Tourist role required.' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WRONG_ROLE');
    expect(navSpy).toHaveBeenCalledWith(['/login-failed'], {
      queryParams: expect.objectContaining({ code: 'WRONG_ROLE', from: 'traveler', username: 'admin@tripla.com' })
    });
  });

  it('enforces admin role in adminGuard', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/admin' } as RouterStateSnapshot;

    // Unauthenticated -> /admin/login
    const unauth = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(unauth instanceof UrlTree).toBe(true);
    expect((unauth as UrlTree).toString()).toContain('/admin/login');

    // Tourist -> /login-failed
    service.saveSession({ id: 'u1', fullName: 'Vy', email: 'vynhk24411e@st.uel.edu.vn', role: 'tourist' }, 't');
    const touristCheck = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(touristCheck instanceof UrlTree).toBe(true);
    expect((touristCheck as UrlTree).toString()).toContain('/login-failed');

    // Admin -> true
    service.saveSession({ id: 'a1', fullName: 'Thanh', email: 'admin@tripla.com', role: 'admin' }, 'a');
    const adminCheck = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(adminCheck).toBe(true);
  });

  it('registers tourist, fetches /auth/me, clears session on logout, and executes Flow F0 pending actions/redirects (Q10)', () => {
    // Register
    let regRes: any = null;
    service
      .register({
        full_name: 'Du Khách Mới',
        email: 'newguest@tripla.vn',
        phone_number: '0909888777',
        password: 'secret'
      })
      .subscribe((res) => (regRes = res));

    const regReq = httpMock.expectOne('/api/v1/auth/register');
    expect(regReq.request.method).toBe('POST');
    regReq.flush({
      success: true,
      token: 'tok-new-1',
      user: { id: 'u99', fullName: 'Du Khách Mới', email: 'newguest@tripla.vn', role: 'tourist' }
    });
    expect(regRes.success).toBe(true);
    expect(service.isLoggedIn()).toBe(true);

    // /auth/me
    let meRes: any = null;
    service.fetchMe().subscribe((res) => (meRes = res));
    const meReq = httpMock.expectOne('/api/v1/auth/me');
    expect(meReq.request.headers.get('Authorization')).toBe('Bearer tok-new-1');
    meReq.flush({
      success: true,
      user: { id: 'u99', fullName: 'Du Khách Mới', email: 'newguest@tripla.vn', role: 'tourist', points: 250 }
    });
    expect(meRes.user.points).toBe(250);

    // Logout
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.sessionToken()).toBeNull();

    // Flow F0 pendingAction
    let resumed = false;
    const ranNow = service.requireAuth(() => {
      resumed = true;
    }, 'Đăng nhập để lưu');
    expect(ranNow).toBe(false);
    expect(service.isModalOpen()).toBe(true);
    expect(resumed).toBe(false);

    service.saveSession({ id: 'u99', fullName: 'Du Khách Mới', email: 'newguest@tripla.vn', role: 'tourist' }, 'tok-2');
    expect(resumed).toBe(true);
    expect(service.isModalOpen()).toBe(false);

    // Flow F0 authGuard on /profile
    service.logout();
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const guardRes = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/profile' } as RouterStateSnapshot)
    );
    expect(guardRes instanceof UrlTree).toBe(true);
    expect(service.isModalOpen()).toBe(true);

    service.saveSession({ id: 'u99', fullName: 'Du Khách Mới', email: 'newguest@tripla.vn', role: 'tourist' }, 'tok-3');
    expect(navSpy).toHaveBeenCalledWith('/profile');
  });
});
