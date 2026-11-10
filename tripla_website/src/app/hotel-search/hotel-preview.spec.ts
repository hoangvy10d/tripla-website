import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HotelSearchResults } from './pages/hotel-search-results/hotel-search-results';
import { HotelDetails } from './pages/hotel-details/hotel-details';
import { HotelCard } from './components/hotel-card/hotel-card';

const searchUrl = '/hotel-search?location=da%20lat&checkIn=2099-12-12&checkOut=2099-12-15&adults=2&children=1&rooms=1';

describe('Hotel preview and details', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([
    { path: 'hotel-search', component: HotelSearchResults },
    { path: 'hotels/:id', component: HotelDetails },
  ])] }));

  it('keeps fixtures out of normal results and filters preview hotels by location', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(searchUrl, HotelSearchResults);
    expect(page.hotels()).toEqual([]);
    await harness.navigateByUrl(searchUrl + '&demo=true');
    expect(page.hotels().map(hotel => hotel.id)).toEqual(['demo-pine', 'demo-garden']);
    await harness.navigateByUrl(searchUrl.replace('da%20lat', 'Ha%20Noi') + '&demo=true');
    expect(page.hotels()).toEqual([]);
    expect(harness.routeNativeElement!.textContent).toContain('Chưa có mẫu tại điểm đến này');
  });

  it('can open a preview from a search page without valid dates', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/hotel-search', HotelSearchResults);
    page.previewDemo();
    await harness.fixture.whenStable();
    expect(page.error()).toBe('');
    expect(page.demo()).toBe(true);
    expect(page.hotels()).toHaveLength(2);
  });

  it('opens the correct details from a card and preserves the stay on return', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(searchUrl + '&demo=true');
    const link = harness.routeNativeElement!.querySelector('.details-link') as HTMLAnchorElement;
    link.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const router = TestBed.inject(Router);
    expect(router.url).toContain('/hotels/demo-pine?');
    expect(router.parseUrl(router.url).queryParams['children']).toBe('1');
    const details = harness.routeDebugElement!.componentInstance as HotelDetails;
    expect(details.hotel()!.name).toBe('Nhà Bên Rừng');
    expect(details.nights()).toBe(3);
    expect(harness.routeNativeElement!.querySelectorAll('.room')).toHaveLength(2);
    (harness.routeNativeElement!.querySelector('.back') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();
    expect(router.url).toContain('/hotel-search?');
    expect(router.parseUrl(router.url).queryParams['checkIn']).toBe('2099-12-12');
    expect(router.parseUrl(router.url).queryParams['demo']).toBe('true');
  });

  it('handles direct details links, image selection, and unknown hotel ids', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/hotels/demo-pine?demo=true', HotelDetails);
    expect(page.hotel()!.id).toBe('demo-pine');
    const buttons = harness.routeNativeElement!.querySelectorAll('.thumbnails button');
    (buttons[1] as HTMLButtonElement).click();
    harness.detectChanges();
    expect(page.activeImage()).toBe('/images/Grassland.jpeg');
    await harness.navigateByUrl('/hotels/missing?demo=true');
    expect(page.hotel()).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Chưa có thông tin khách sạn');
    await harness.navigateByUrl('/hotels/demo-pine');
    expect(page.hotel()).toBeNull();
  });

  it('renders missing values and replaces broken card images with a placeholder', () => {
    const fixture = TestBed.createComponent(HotelCard);
    fixture.componentRef.setInput('hotel', { id: 'unknown', name: 'Chỗ nghỉ mới', address: 'Đà Lạt', imageUrl: '/missing.jpg' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ảnh đang cập nhật');
    expect(fixture.nativeElement.textContent).toContain('Chưa có đánh giá');
    expect(fixture.nativeElement.textContent).toContain('Giá đang cập nhật');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });
});
