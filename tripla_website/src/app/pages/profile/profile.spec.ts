import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProfileComponent } from './profile';
import { AuthService } from '../../services/auth-service';

describe('ProfileComponent (Q17 Hub)', () => {
  let httpMock: HttpTestingController;
  const logoutSpy = vi.fn();
  const updateProfileSpy = vi.fn(() => of({ success: true, user: { full_name: 'Updated Tourist', phone_number: '0999888777' } }));

  beforeEach(async () => {
    logoutSpy.mockClear();
    updateProfileSpy.mockClear();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'home', component: ProfileComponent }]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => true,
            currentUser: () => ({ id: 'u1-oid', full_name: 'Hoàng Vy', email: 'vy@tripla.vn', role: 'tourist' }),
            getAuthHeaders: () => ({ Authorization: 'Bearer tok-q17' }),
            fetchMe: () => of({ _id: 'u1-oid', full_name: 'Hoàng Vy', email: 'vy@tripla.vn', role: 'tourist' }),
            updateProfile: updateProfileSpy,
            logout: logoutSpy,
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialLoads(): void {
    httpMock.expectOne('http://localhost:3000/api/v1/bookings/my').flush({
      success: true,
      items: [
        { _id: 'b1', booking_code: 'TRP-CONFIRMED', booking_status: 'confirmed', total_price: 2000000, title: 'Amanoi' },
        { _id: 'b2', booking_code: 'TRP-CHECKEDIN', booking_status: 'checked_in', total_price: 3000000, title: 'Regent' },
      ],
    });
    httpMock.expectOne('http://localhost:3000/api/v1/trip-plans').flush({
      success: true,
      items: [{ _id: 'p1', plan_name: 'Vĩnh Hy', estimated_budget: 5000000, start_date: '2026-12-01', end_date: '2026-12-03' }],
    });
    httpMock.expectOne('http://localhost:3000/api/v1/trips/my').flush({
      success: true,
      items: [{ _id: 't1', trip_status: 'upcoming', plan_id: { _id: 'p1', plan_name: 'Vĩnh Hy', estimated_budget: 5000000 } }],
    });
    httpMock.expectOne('http://localhost:3000/api/v1/notifications').flush({
      success: true,
      unreadCount: 1,
      items: [{ _id: 'n1', title: 'Xác nhận đặt phòng', content: 'Đơn #TRP-CONFIRMED đã xác nhận', is_read: false, type: 'booking' }],
    });
    httpMock.expectOne('http://localhost:3000/api/v1/users/u1-oid/profile').flush({
      success: true,
      user: { _id: 'u1-oid', full_name: 'Hoàng Vy', email: 'vy@tripla.vn', role: 'tourist' },
      wishlists: [],
      contents: [],
    });
  }

  it('loads my bookings/notifications, enforces canCancelBooking rules, edits profile and logs out', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialLoads();
    fixture.detectChanges();

    expect(comp.canCancelBooking('pending')).toBe(true);
    expect(comp.canCancelBooking('confirmed')).toBe(true);
    expect(comp.canCancelBooking('checked_in')).toBe(false);
    expect(comp.canCancelBooking('checked_out')).toBe(false);
    expect(comp.unreadNotificationsCount).toBe(1);

    // Filter bookings by status
    comp.setBookingStatusFilter('confirmed');
    const filterReq = httpMock.expectOne('http://localhost:3000/api/v1/bookings/my?status=confirmed');
    filterReq.flush({ success: true, items: [] });

    // Mark notification as read
    comp.markNotificationRead('n1');
    const readReq = httpMock.expectOne('http://localhost:3000/api/v1/notifications/n1/read');
    expect(readReq.request.method).toBe('PUT');
    readReq.flush({ success: true });
    expect(comp.unreadNotificationsCount).toBe(0);

    // Edit profile
    comp.editFullName = 'Updated Tourist';
    comp.editPhone = '0999888777';
    comp.saveProfile();
    expect(updateProfileSpy).toHaveBeenCalled();

    // Logout
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    comp.logout();
    expect(logoutSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/home']);
  });

  it('unwraps fetchMe AuthResponse, binds real comments and bookmarkedReels, and shows 0 instead of fake fallback numbers', () => {
    const authMock = TestBed.inject(AuthService) as any;
    authMock.fetchMe = () =>
      of({
        success: true,
        user: {
          _id: 'u1-oid',
          full_name: 'Lê Minh Anh',
          email: 'minhanh@tripla.vn',
          role: 'tourist',
          followers: 0,
          following: 0,
          points: 0
        }
      });

    const fixture = TestBed.createComponent(ProfileComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('http://localhost:3000/api/v1/bookings/my').flush({ success: true, items: [] });
    httpMock.expectOne('http://localhost:3000/api/v1/trip-plans').flush({ success: true, items: [] });
    httpMock.expectOne('http://localhost:3000/api/v1/trips/my').flush({ success: true, items: [] });
    httpMock.expectOne('http://localhost:3000/api/v1/notifications').flush({ success: true, unreadCount: 0, items: [] });
    httpMock.expectOne('http://localhost:3000/api/v1/users/u1-oid/profile').flush({
      success: true,
      user: {
        _id: 'u1-oid',
        full_name: 'Lê Minh Anh',
        email: 'minhanh@tripla.vn',
        role: 'tourist',
        followers: 0,
        following: 0,
        points: 0
      },
      wishlists: [],
      bookmarkedReels: [{ _id: 'c1', content_title: 'Đà Lạt sương sớm', location_name: 'Đà Lạt', stats: { views: 12, likes: 3 } }],
      comments: [{ _id: 'cmt1', text: 'Góc quay rất đẹp!', contentTitle: 'Đà Lạt sương sớm', locationName: 'Đà Lạt' }],
      contents: []
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(comp.userDisplayName).toBe('Lê Minh Anh');
    expect(comp.comments.length).toBe(1);
    expect(comp.bookmarkedReels.length).toBe(1);
    expect(text).not.toContain('1,250');
    expect(text).not.toContain('18,500');
    expect(text).not.toContain('0909 123 456');
    expect(text).not.toContain('The Reverie Saigon & Amanoi Resort');
  });
});

