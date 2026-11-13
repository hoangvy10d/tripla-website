import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TripShopService } from './trip-shop';

describe('TripShopService', () => {
  let service: TripShopService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TripShopService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TripShopService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
