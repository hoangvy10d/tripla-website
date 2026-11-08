import { TestBed } from '@angular/core/testing';

import { TripShopComponent } from '../pages/trip-shop/trip-shop';

describe('TripShop', () => {
  let service: TripShopComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripShopComponent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
