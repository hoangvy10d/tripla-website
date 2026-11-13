import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TripShopComponent } from './trip-shop';
import { AuthService } from '../../services/auth-service';
import { of } from 'rxjs';

describe('TripShopComponent', () => {
  let component: TripShopComponent;
  let fixture: ComponentFixture<TripShopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripShopComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            currentUser: () => null,
            getAuthHeaders: () => ({}),
            fetchMe: () => of(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripShopComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
