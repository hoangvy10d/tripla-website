import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripShopComponent } from './trip-shop';

describe('TripShop', () => {
  let component: TripShopComponent;
  let fixture: ComponentFixture<TripShopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripShopComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TripShopComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
