import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteFooterComponent, TRIPLA_FOOTER_ECOSYSTEM, TRIPLA_FOOTER_SERVICES } from './site-footer';

describe('SiteFooterComponent', () => {
  let fixture: ComponentFixture<SiteFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteFooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteFooterComponent);
  });

  it('renders full Botanical Dark Pine footer with unified ecosystem, service, hotline and legal links', () => {
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('footer.sf-shell')?.classList.contains('is-compact')).toBe(false);
    expect(el.querySelector('.sf-mark')?.textContent?.trim()).toBe('TRIPLA');
    expect(el.querySelector('.sf-hl-num')?.textContent?.trim()).toBe('1900 8888');
    expect(el.querySelector('.sf-copy')?.textContent).toContain('2026 TRIPLA');

    const ecoLinks = Array.from(el.querySelectorAll('nav[aria-label="Hệ sinh thái TRIPLA"] a')).map((a) =>
      a.textContent?.trim()
    );
    expect(ecoLinks).toEqual(TRIPLA_FOOTER_ECOSYSTEM.map((i) => i.label));

    const svcLinks = Array.from(el.querySelectorAll('nav[aria-label="Dịch vụ du lịch TRIPLA"] a')).map((a) =>
      a.textContent?.trim()
    );
    expect(svcLinks).toEqual(TRIPLA_FOOTER_SERVICES.map((i) => i.label));
  });

  it('renders compact variant without 4-column mark for booking/planning/checkout workspaces', () => {
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('footer.sf-shell')?.classList.contains('is-compact')).toBe(true);
    expect(el.querySelector('.sf-mark')).toBeNull();
    expect(el.querySelectorAll('.sf-compact-nav a').length).toBeGreaterThanOrEqual(5);
    expect(el.querySelector('.sf-support-pill')?.textContent).toContain('1900 8888');
  });
});

