import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { Tripshort } from './tripshort';

describe('Tripshort (Q11 & F0)', () => {
  let component: Tripshort;
  let fixture: ComponentFixture<Tripshort>;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tripshort],
      providers: [provideRouter([])]
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    auth.logout();

    fixture = TestBed.createComponent(Tripshort);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create and enforce Flow F0 on like/comment/save when logged out', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
    const headerEl = fixture.nativeElement.querySelector('app-site-header header.site-hdr');
    expect(headerEl?.classList.contains('hdr-floating')).toBe(true);
    expect(fixture.nativeElement.querySelector('app-site-header .brand-sub')?.textContent?.trim()).toBe('TripShorts');

    component.toggleLike();
    expect(auth.isModalOpen()).toBe(true);
    auth.closeAuthModal(true);

    component.newCommentText = 'Đẹp quá!';
    component.submitComment();
    expect(auth.isModalOpen()).toBe(true);
    expect(component.newCommentText).toBe('Đẹp quá!');

    // Logging in automatically resumes pending comment submit
    auth.saveSession(
      { id: 'u1', fullName: 'Nguyễn Hoàng Vy', email: 'vy@tripla.vn', role: 'tourist' },
      'tok-vy'
    );
    expect(auth.isModalOpen()).toBe(false);
    expect(component.newCommentText).toBe('');
    expect(component.comments[0]?.content).toBe('Đẹp quá!');
  });
});
