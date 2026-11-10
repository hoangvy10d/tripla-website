import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { ActivitySearchResults } from './pages/activity-search-results/activity-search-results';
import { ActivityDetailsPage } from './pages/activity-details/activity-details';

describe('Activity details', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'activity-search', component: ActivitySearchResults },
          { path: 'activities/:id', component: ActivityDetailsPage },
        ]),
      ],
    }),
  );
  it('opens the correct card and keeps search filters on return', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(
      '/activity-search?location=da%20lat&categories=' + encodeURIComponent('Vé tham quan'),
    );
    (harness.routeNativeElement!.querySelector('.card-link') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeDebugElement!.componentInstance as ActivityDetailsPage;
    expect(page.activity()!.id).toBe('demo-dalat-garden');
    expect(page.activity()!.name).toBe('Vườn hoa Đà Lạt');
    expect(harness.routeNativeElement!.querySelector('app-activity-navigation')).not.toBeNull();
    (harness.routeNativeElement!.querySelector('.breadcrumbs a') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();
    expect(
      TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['categories'],
    ).toBe('Vé tham quan');
  });
  it('supports direct links, ticket groups, review navigation and invalid ids', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/activities/demo-danang-bana', ActivityDetailsPage);
    expect(page.activity()!.name).toBe('Bà Nà Hills');
    expect(harness.routeNativeElement!.querySelectorAll('.ticket-card')).toHaveLength(3);
    const first = page.review()!.id;
    page.nextReview(1);
    expect(page.review()!.id).not.toBe(first);
    page.group.set('Combo trải nghiệm');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelectorAll('.ticket-card')).toHaveLength(1);
    expect(page.tickets()[0].group).toBe('Combo trải nghiệm');
    await harness.navigateByUrl('/activities/missing');
    expect(page.activity()).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Chưa tìm thấy địa điểm');
  });
  it('opens the image viewer and previews a ticket without booking', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/activities/demo-dalat-garden', ActivityDetailsPage);
    const gallery = harness.routeNativeElement!.querySelector('.gallery-dialog')!;
    const ticketDialog = harness.routeNativeElement!.querySelector('.ticket-dialog')!;
    const openGallery = vi.fn(),
      openTicket = vi.fn();
    Object.defineProperty(gallery, 'showModal', { value: openGallery });
    Object.defineProperty(ticketDialog, 'showModal', { value: openTicket });
    page.showGallery(2);
    expect(openGallery).toHaveBeenCalledOnce();
    expect(page.galleryImage()).toBe(2);
    page.changePhoto(1);
    expect(page.galleryImage()).toBe(3);
    page.chooseTicket(page.tickets()[0]);
    harness.detectChanges();
    expect(openTicket).toHaveBeenCalledOnce();
    expect(ticketDialog.textContent).toContain('Không phải xác nhận đặt vé');
    page.visitDate = '2000-01-01';
    expect(page.dateValid).toBe(false);
    page.chooseTicket(page.tickets()[1]);
    expect(openTicket).toHaveBeenCalledOnce();
  });
});
