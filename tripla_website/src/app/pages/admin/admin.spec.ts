import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TRIPLA_LIVE_API_ENABLED } from '../../services/live-http';
import { AdminComponent } from './admin';

describe('AdminComponent (Q7, Q8, Q9)', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let component: AdminComponent;
  let httpMock: HttpTestingController;

  const sampleDashboard = {
    success: true,
    stats: { usersCount: 11, totalRevenue: 98500000, contentsCount: 18, bookingsCount: 2 },
    users: [],
    providers: [
      { _id: 'prov-1', business_name: 'Amanoi Resorts Vietnam', verification_status: 'approved' },
      { _id: 'prov-2', business_name: 'Unapproved Inn', verification_status: 'pending' }
    ],
    hotels: [
      {
        _id: 'hotel-1',
        hotel_name: 'Amanoi Vinh Hy',
        address: 'Vinh Hy, Ninh Thuan',
        star_rating: 5,
        price_per_night: 18000000,
        provider_id: { _id: 'prov-1', business_name: 'Amanoi Resorts Vietnam', verification_status: 'approved' }
      }
    ],
    rooms: [{ _id: 'room-1', hotel_id: 'hotel-1', room_name: 'Ocean Pavilion', stock: 4 }],
    locations: [],
    busTrips: [],
    contents: [],
    reports: [],
    bookings: [
      {
        _id: 'book-1',
        booking_code: 'TRP-880101',
        title: 'Amanoi Vinh Hy',
        total_price: 18000000,
        booking_status: 'confirmed',
        user_id: { full_name: 'Nguyễn Hoàng Vy' }
      }
    ]
  };

  const sampleProviders = {
    success: true,
    providers: [
      {
        _id: 'prov-1',
        provider_id: 'prov-1',
        business_name: 'Amanoi Resorts Vietnam',
        verification_status: 'approved'
      },
      {
        _id: 'prov-3',
        provider_id: 'prov-3',
        business_name: 'Regent Phu Quoc Partner',
        verification_status: 'approved'
      }
    ]
  };

  const sampleTopCustomers = {
    success: true,
    totalCheckedOutBookings: 7,
    items: [
      { rank: 1, user_id: 'u1', full_name: 'Victoria Chen', email: 'victoria@tripla.vn', total_spending: 72000000, completed_bookings: 2 },
      { rank: 2, user_id: 'u2', full_name: 'Marcus Vũ', email: 'marcus@tripla.vn', total_spending: 46000000, completed_bookings: 2 },
      { rank: 3, user_id: 'u3', full_name: 'Nguyễn Hoàng Vy', email: 'vy@tripla.vn', total_spending: 28000000, completed_bookings: 1 },
      { rank: 4, user_id: 'u4', full_name: 'Khánh Linh', email: 'linh@tripla.vn', total_spending: 16500000, completed_bookings: 1 },
      { rank: 5, user_id: 'u5', full_name: 'Minh Thư', email: 'thu@tripla.vn', total_spending: 9200000, completed_bookings: 1 }
    ]
  };

  function flushInitialLoads(): void {
    const dashReq = httpMock.expectOne('/api/v1/admin/dashboard');
    expect(dashReq.request.headers.get('Authorization')).toBe('Bearer admin-test-token');
    dashReq.flush(sampleDashboard);

    const provReq = httpMock.expectOne('/api/v1/admin/providers?status=approved');
    provReq.flush(sampleProviders);

    const topReq = httpMock.expectOne('/api/v1/admin/top-customers');
    topReq.flush(sampleTopCustomers);
  }

  beforeEach(async () => {
    const store = new Map<string, string>();
    store.set(
      'tripla_session',
      JSON.stringify({
        token: 'admin-test-token',
        user: {
          id: 'a1',
          fullName: 'Trần Duy Thanh',
          email: 'admin@tripla.com',
          role: 'admin'
        }
      })
    );

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear()
      }
    });

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/login', component: AdminComponent }]),
        { provide: TRIPLA_LIVE_API_ENABLED, useValue: true }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock?.verify();
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
  });

  it('Q9: loads and renders Top 5 Customers Leaderboard and chart from /admin/top-customers', () => {
    flushInitialLoads();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.leaderboard-row');
    expect(rows.length).toBe(5);
    expect(rows[0].textContent).toContain('#1');
    expect(rows[0].textContent).toContain('Victoria Chen');
    expect(rows[0].textContent).toContain('2 đơn');

    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('Q7: populates approved providers dropdown, creates a hotel via POST /admin/hotels, and displays 409 active-booking block on delete', () => {
    flushInitialLoads();
    component.setTab('data');
    component.setCategory('hotels');
    fixture.detectChanges();

    component.openAddHotelModal();
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('select[name="hotelProvider"] option')
    ).map((opt: any) => opt.textContent.trim());
    expect(options).toContain('Amanoi Resorts Vietnam (approved)');
    expect(options).toContain('Regent Phu Quoc Partner (approved)');
    expect(options.some((t) => t.includes('Unapproved Inn'))).toBe(false);

    component.hotelForm.hotel_name = 'Tripla Cliff Resort';
    component.hotelForm.address = 'Bãi Cháy, Hạ Long';
    component.hotelForm.provider_id = 'prov-3';
    component.hotelForm.price_per_night = 4200000;
    component.saveHotelForm();

    const postReq = httpMock.expectOne('/api/v1/admin/hotels');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.headers.get('Authorization')).toBe('Bearer admin-test-token');
    expect(postReq.request.body.provider_id).toBe('prov-3');
    postReq.flush({ success: true, hotel: { _id: 'hotel-new', hotel_name: 'Tripla Cliff Resort' } });

    flushInitialLoads();
    expect(component.isHotelModalOpen).toBe(false);
    expect(component.toastMessage).toContain('Tripla Cliff Resort');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(component.dataRows[0]);

    const delReq = httpMock.expectOne('/api/v1/admin/hotels/hotel-1');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(
      { success: false, message: 'Không thể xóa khách sạn vì còn 1 đơn đặt phòng đang hoạt động.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.errorMessage).toContain('đang hoạt động');
    expect(component.toastMessage).toContain('đang hoạt động');
  });

  it('Q8: cancels confirmed booking via PUT /admin/bookings/:id/status, restores room stock and shows refund toast', () => {
    flushInitialLoads();
    const targetBooking = component.bookings[0];

    component.updateBookingStatus(targetBooking, 'cancelled');

    const putReq = httpMock.expectOne('/api/v1/admin/bookings/book-1/status');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ booking_status: 'cancelled' });
    putReq.flush({
      success: true,
      booking: { booking_status: 'cancelled' },
      releasedRooms: [{ room_id: 'room-1', room_name: 'Ocean Pavilion', releasedQuantity: 2, newStock: 6 }],
      paymentRefunded: true
    });

    const topRefresh = httpMock.expectOne('/api/v1/admin/top-customers');
    topRefresh.flush(sampleTopCustomers);

    expect(targetBooking.booking_status).toBe('cancelled');
    expect(component.rooms[0].stock).toBe(6);
    expect(component.toastMessage).toContain('Hoàn kho: +2 Ocean Pavilion (tồn 6)');
    expect(component.toastMessage).toContain('Đã hoàn tiền');
  });

  it('Q18: filters reports, resolves/dismisses report status, and deletes reported content via /admin/contents/:id', () => {
    flushInitialLoads();
    component.setTab('community');
    component.filterReports('pending');

    const repReq = httpMock.expectOne('/api/v1/admin/reports?status=pending');
    repReq.flush({
      success: true,
      items: [
        {
          _id: 'rep-1',
          reason: 'spam',
          status: 'pending',
          content_id: { _id: 'cnt-1', content_title: 'Bad Reel' },
          reporter_id: { full_name: 'Minh Thùy' }
        }
      ]
    });
    expect(component.reports.length).toBe(1);

    component.updateReportStatus(component.reports[0], 'dismissed');
    const putReq = httpMock.expectOne('/api/v1/admin/reports/rep-1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ status: 'dismissed' });
    putReq.flush({ success: true, report: { _id: 'rep-1', status: 'dismissed' } });
    expect(component.reports[0].status).toBe('dismissed');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteReportedContent({
      _id: 'rep-1',
      status: 'pending',
      content_id: { _id: 'cnt-1', content_title: 'Bad Reel' }
    });
    const delContentReq = httpMock.expectOne('/api/v1/admin/contents/cnt-1');
    expect(delContentReq.request.method).toBe('DELETE');
    delContentReq.flush({ success: true, resolvedReportsCount: 1 });
    expect(component.toastMessage).toContain('gỡ nội dung vi phạm');
  });

  it('Q19: queries paginated /admin/bookings with keyword/status and syncs real revenue via /admin/stats', () => {
    flushInitialLoads();
    component.loadAdminStats();
    const statsReq = httpMock.expectOne('/api/v1/admin/stats');
    statsReq.flush({
      success: true,
      stats: { revenue: 125000000, bookingsCount: 14, usersCount: 20, contentsCount: 9, pendingReportsCount: 3 }
    });
    expect(component.stats.totalRevenue).toBe(125000000);
    expect(component.stats.pendingReportsCount).toBe(3);

    component.bookingKeyword = 'Amanoi';
    component.bookingStatusFilter = 'confirmed';
    component.applyBookingFilter();
    const bookReq = httpMock.expectOne(
      '/api/v1/admin/bookings?keyword=Amanoi&status=confirmed&page=1&limit=10'
    );
    bookReq.flush({
      success: true,
      page: 1,
      limit: 10,
      total: 15,
      totalPages: 2,
      items: [{ _id: 'b-99', booking_code: 'TRP-9901', booking_status: 'confirmed', total_price: 9000000 }]
    });
    expect(component.bookingTotalPages).toBe(2);
    expect(component.bookings.length).toBe(1);
  });

  it('Q20: validates lat/lng, creates location via POST /admin/locations, and cascades delete via DELETE /admin/locations/:id', () => {
    flushInitialLoads();
    component.setTab('data');
    component.setCategory('locations');
    component.openAddLocationModal();

    const catReq = httpMock.expectOne('/api/v1/location-categories');
    catReq.flush({
      success: true,
      categories: [
        { value: 'attraction', label: 'Điểm tham quan (attraction)' },
        { value: 'nature', label: 'Thiên nhiên (nature)' }
      ]
    });

    // Reject invalid latitude > 90 client-side
    component.locationForm.name = 'Đỉnh Bàn Cờ';
    component.locationForm.address = 'Sơn Trà, Đà Nẵng';
    component.locationForm.latitude = 95;
    component.saveLocationForm();
    expect(component.locationFormError).toContain('-90..90');

    component.locationForm.latitude = 16.118;
    component.locationForm.longitude = 108.273;
    component.locationForm.location_category = 'nature';
    component.saveLocationForm();

    const postLoc = httpMock.expectOne('/api/v1/admin/locations');
    expect(postLoc.request.method).toBe('POST');
    expect(postLoc.request.body.location_category).toBe('nature');
    postLoc.flush({ success: true, location: { _id: 'loc-new', name: 'Đỉnh Bàn Cờ' } });
    flushInitialLoads();
    expect(component.isLocationModalOpen).toBe(false);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem({ id: 'loc-new', name: 'Đỉnh Bàn Cờ', sub: 'nature', price: 0 });
    const delLoc = httpMock.expectOne('/api/v1/admin/locations/loc-new');
    expect(delLoc.request.method).toBe('DELETE');
    delLoc.flush({ success: true, deletedWishlists: 2, clearedLocationTags: 1, clearedPlanDetails: 1 });
    flushInitialLoads();
    expect(component.toastMessage).toContain('2 wishlist');
  });
});

