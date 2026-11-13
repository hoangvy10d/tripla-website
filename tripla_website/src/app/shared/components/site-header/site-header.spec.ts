import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { SiteHeaderComponent } from './site-header';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    auth.logout();
    fixture = TestBed.createComponent(SiteHeaderComponent);
  });

  it('renders standardized 6 ecosystem routes and marks active route with aria-current', () => {
    fixture.componentRef.setInput('variant', 'floating');
    fixture.componentRef.setInput('activeNav', 'map');
    fixture.componentRef.setInput('subBrand', 'Bản đồ');
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('.top-nav a')) as HTMLAnchorElement[];
    const labels = links.map((a) => a.textContent?.trim());
    expect(labels).toEqual([
      'Trang chủ',
      'TripShorts',
      'TripShop',
      'Trip Planning',
      'Bản đồ',
      'Về TRIPLA',
    ]);

    const current = fixture.nativeElement.querySelector('.main-nav a[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Bản đồ');
    expect(fixture.nativeElement.querySelector('.brand-sub')?.textContent?.trim()).toBe('Bản đồ');
  });

  it('reacts to AuthService login and logout state', () => {
    fixture.componentRef.setInput('variant', 'floating');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.login-pill')?.textContent?.trim()).toBe('Đăng nhập');
    expect(fixture.nativeElement.querySelector('.user-pill')).toBeNull();

    auth.saveSession(
      { id: 'u1', fullName: 'Nguyễn Hoàng Vy', email: 'vy@tripla.vn', role: 'tourist' },
      'tok-header'
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.login-pill')).toBeNull();
    expect(fixture.nativeElement.querySelector('.user-pill')?.textContent).toContain('Hoàng Vy');

    (fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-pill')).not.toBeNull();
  });

  it('hides main nav in distraction-free checkout variant while keeping contextual back link', () => {
    fixture.componentRef.setInput('variant', 'checkout');
    fixture.componentRef.setInput('subBrand', 'Đặt chỗ & Thanh toán');
    fixture.componentRef.setInput('backLabel', '← TripShop');
    fixture.componentRef.setInput('backRoute', '/trip-shop');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.top-nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('.back')?.textContent?.trim()).toBe('← TripShop');
  });
});

