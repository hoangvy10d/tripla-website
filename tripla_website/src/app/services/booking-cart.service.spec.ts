import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingCartService } from './booking-cart.service';
import { TRIPLA_LIVE_API_ENABLED } from './live-http';

describe('BookingCartService (Q5)', () => {
  let service: BookingCartService;
  let httpMock: HttpTestingController;

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
        provideRouter([]),
        { provide: TRIPLA_LIVE_API_ENABLED, useValue: true }
      ]
    });
    service = TestBed.inject(BookingCartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock?.verify();
  });

  it('adds a room to cart and rejects updates exceeding available stock', () => {
    let addRes: any = null;
    service
      .addToCart({
        hotel_id: 'h1',
        room_id: 'r1',
        room_name: 'Ocean Suite',
        unit_price: 5000000,
        quantity: 2,
        check_in: '2026-12-01',
        check_out: '2026-12-03',
        availableStock: 2
      })
      .subscribe((res) => (addRes = res));

    const addReq = httpMock.expectOne('http://localhost:3000/api/v1/cart');
    expect(addReq.request.method).toBe('POST');
    addReq.flush({
      success: true,
      items: [
        {
          id: 'item1',
          hotel_id: 'h1',
          hotel_name: 'Amanoi',
          room_id: 'r1',
          room_name: 'Ocean Suite',
          unit_price: 5000000,
          quantity: 2,
          check_in: '2026-12-01',
          check_out: '2026-12-03',
          nights: 2,
          line_total: 20000000,
          availableStock: 2
        }
      ]
    });

    expect(addRes.success).toBe(true);
    expect(service.totalQuantity()).toBe(2);

    // Try increasing to 3 (> availableStock 2)
    let updateRes: any = null;
    service.updateCartItem('item1', 3).subscribe((res) => (updateRes = res));

    const putReq = httpMock.expectOne('http://localhost:3000/api/v1/cart/item1');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush(
      {
        success: false,
        errorCode: 'EXCEEDS_AVAILABLE_STOCK',
        availableStock: 2,
        message: 'Vượt quá số phòng còn trống (2 phòng) cho ngày đã chọn.'
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(updateRes.success).toBe(false);
    expect(service.cartError()).toContain('2 phòng');
    expect(service.totalQuantity()).toBe(2);
  });
});

