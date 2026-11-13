import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TripCard } from '../../models/home.model';
import { StatPill } from '../../models/home.model';
import { MOCK_STAT_PILLS, MOCK_TRIP_CARDS } from '../../mock/home.mock';
import { AuthService } from '../../services/auth-service';
import { HomeService } from '../../services/home-service';
import { ParallaxDirective } from './directives/parallax.directive';
import { RevealDirective } from './directives/reveal.directive';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';

/* ---- Hằng số chuyển động (giây hoặc tỉ lệ cuộn p: 0 → 1) ---- */
const HERO_PHOTO = '/images/ruongbacthangedit.jpeg';
const LOAD_TIMEOUT = 8000; // ms: quá thời gian này intro vẫn chạy với những gì đã tải
const COUNT_TO_100 = 0.5; // s
const UNLOCK_AT = 2.3; // s: mở khóa cuộn sau intro
const SMOOTH = 0.16; // phần khoảng cách còn lại mỗi frame (60fps) khi làm mượt cuộn
const COPY_RISE = 120; // design px chữ hero trồi lên
const COPY_RANGE: [number, number] = [0.2, 0.8];
const READY_IN: [number, number] = [0.79, 0.81];
const REDUCED_READY_IN: [number, number] = [0.3, 0.6];
const READY_AT = 0.8;
const READY_BACK = 0.74;
const DOLLY = 0.18;
const FRONT_SCALE = 1.06;
const COVER = 1.25;
const FOLLOW = 0.3; // con trỏ: phần khoảng cách còn lại mỗi frame ở 60fps
const PP = {
  dolly: [0, 0.7] as [number, number],
  turn: [0, 0.45] as [number, number],
  faceOut: [0.15, 0.4] as [number, number],
  rim: [0.1, 0.4] as [number, number],
  fill: [0.35, 0.62] as [number, number],
  expand: [0.5, 0.82] as [number, number],
};

const segment = (t: number, [from, to]: [number, number]) => Math.min(1, Math.max(0, (t - from) / (to - from)));
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ParallaxDirective, RevealDirective, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('oceanAudio', { static: true }) oceanAudioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('page', { static: true }) pageRef!: ElementRef<HTMLElement>;
  @ViewChild('pin', { static: true }) pinRef!: ElementRef<HTMLElement>;
  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLElement>;
  @ViewChild('image', { static: true }) imageRef!: ElementRef<HTMLElement>;
  @ViewChild('light', { static: true }) lightRef!: ElementRef<HTMLElement>;
  @ViewChild('portal', { static: true }) portalRef!: ElementRef<HTMLElement>;
  @ViewChild('rim', { static: true }) rimRef!: ElementRef<HTMLElement>;
  @ViewChild('fill', { static: true }) fillRef!: ElementRef<HTMLElement>;
  @ViewChild('copy', { static: true }) copyRef!: ElementRef<HTMLElement>;
  @ViewChild('ready', { static: true }) readyRef!: ElementRef<HTMLElement>;
  @ViewChild('counter', { static: true }) counterRef!: ElementRef<HTMLElement>;
  @ViewChild('cursor', { static: true }) cursorRef!: ElementRef<HTMLElement>;

  activeNavPath: string = 'kham-pha';
  isAudioActive: boolean = false;
  navDark: boolean = false;
  readonly heroPhotoCss = `url('${HERO_PHOTO}')`;
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly homeService = inject(HomeService);
  readonly authService = inject(AuthService); // public để dùng thẳng ở HTML
  isOceanScene = false;
  private audioRequested = true;
  private audioRequestId = 0;
  activeSearchField: string | null = null;

  // Search Fields State
  searchDestination: string = 'Quần Đảo Vịnh San Hô, Phú Quốc';
  searchDateRange: string = '18 Th06 – 24 Th06, 2025';
  searchGuestInfo: string = '2 Khách • Overwater Villa';

  // Khai báo thuộc tính và gán giá trị từ mock data
  statPills: StatPill[] = MOCK_STAT_PILLS;
  trips: TripCard[] = MOCK_TRIP_CARDS;

  // ---- trạng thái cổng thẻ kính ----
  private reduced = false;
  private target = 0;
  private current = 0;
  private lastTime = 0;
  private ticking = false;
  private raf = 0;
  private readyShown = false;
  private counterValue = 0;
  private cursorX = 0;
  private cursorY = 0;
  private cursorTx = 0;
  private cursorTy = 0;
  private cursorRaf = 0;
  private cursorLast = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private cleanups: Array<() => void> = [];

  // Hàm kích hoạt mở Pop-up Login
  openAuthModal(): void {
    this.authService.openAuthModal();
  }

  ngOnInit(): void {
    this.syncActiveNavFromUrl();
    this.homeService.getTripCards().subscribe((trips) => {
      if (trips && trips.length > 0) {
        this.trips = trips;
        this.changeDetector.markForCheck();
      }
    });
    this.homeService.getStatPills().subscribe((pills) => {
      if (pills && pills.length > 0) {
        this.statPills = pills;
        this.changeDetector.markForCheck();
      }
    });
  }

  private syncActiveNavFromUrl(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/trip-shop')) {
      this.activeNavPath = 'tripshop';
    } else if (currentUrl.includes('/tripshort')) {
      this.activeNavPath = 'tripshorts';
    } else if (currentUrl.includes('/about')) {
      this.activeNavPath = 've-tripla';
    } else {
      this.activeNavPath = 'kham-pha';
    }
  }

  ngAfterViewInit(): void {
    if (this.heroVideo) {
      this.heroVideo.nativeElement.muted = true;
      this.heroVideo.nativeElement.defaultMuted = true;
      this.heroVideo.nativeElement.volume = 0;
    }
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      return;
    }
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.zone.runOutsideAngular(() => {
      this.applyProgress(0);
      this.bindScroll();
      this.bindPointer();
      this.runIntro();
    });
  }

  /* ============================== Intro ============================== */
  private runIntro(): void {
    const root = document.documentElement;
    const page = this.pageRef.nativeElement;

    if (this.reduced) {
      this.setCounter(100);
      page.classList.add('is-go', 'is-reduced');
      return;
    }

    root.style.overflow = 'hidden'; // khóa cuộn trong lúc intro
    window.scrollTo(0, 0);

    let settled = 0;
    const bump = () => this.tweenCounter(((++settled) / 2) * 90, 0.4);
    const loadImage = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // lỗi ảnh: dùng nền gradient thay thế
      img.src = HERO_PHOTO;
    }).then(bump);
    const loadFonts = (document.fonts
      ? Promise.all(['400 1em "Tripla Sans"', '500 1em "Tripla Sans"', 'italic 400 1em "Tripla Editorial"'].map((f) => document.fonts.load(f).catch(() => undefined)))
      : Promise.resolve()
    ).then(bump);
    const timeout = new Promise<void>((resolve) => this.timers.push(setTimeout(resolve, LOAD_TIMEOUT)));

    Promise.race([Promise.all([loadImage, loadFonts]), timeout]).then(() => {
      this.tweenCounter(100, COUNT_TO_100);
      page.classList.add('is-go');
      this.timers.push(setTimeout(() => {
        root.style.overflow = '';
        this.updateTarget();
      }, UNLOCK_AT * 1000));
    });
  }

  private setCounter(v: number): void {
    this.counterValue = v;
    this.counterRef.nativeElement.textContent = String(Math.round(v)).padStart(2, '0');
  }

  private tweenCounter(to: number, seconds: number): void {
    const from = this.counterValue;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (seconds * 1000));
      this.setCounter(lerp(from, to, 1 - (1 - t) * (1 - t)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ========================== Cuộn qua cổng ========================== */
  private bindScroll(): void {
    const onScroll = () => this.updateTarget();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    this.cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    });
    this.updateTarget();
  }

  private updateTarget(): void {
    const rect = this.pinRef.nativeElement.getBoundingClientRect();
    const range = rect.height - window.innerHeight;
    this.target = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
    if (this.reduced) {
      this.current = this.target;
      this.applyProgress(this.current);
      return;
    }
    if (!this.ticking) {
      this.ticking = true;
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }

  private tick(now: number): void {
    const dt = Math.min(64, now - this.lastTime);
    this.lastTime = now;
    const k = 1 - Math.pow(1 - SMOOTH, dt / 16.67);
    this.current += (this.target - this.current) * k;
    if (Math.abs(this.target - this.current) < 0.0005) this.current = this.target;
    this.applyProgress(this.current);
    if (this.current !== this.target) {
      this.raf = requestAnimationFrame((t) => this.tick(t));
    } else {
      this.ticking = false;
    }
  }

  /** Cập nhật mọi thứ theo tiến độ p (0 → 1): máy quay tiến vào, thẻ xoay, viền sáng, nền trắng, phóng to, màn thứ hai. */
  private applyProgress(p: number): void {
    const light = this.lightRef.nativeElement;
    const portal = this.portalRef.nativeElement;
    const image = this.imageRef.nativeElement;
    const stage = this.stageRef.nativeElement;
    const ready = this.readyRef.nativeElement;

    if (!this.reduced) {
      const d = 1 + DOLLY * inOut(segment(p, PP.dolly));
      image.style.transform = `scale(${d})`;

      const turn = inOut(segment(p, PP.turn));
      const ry = -26 * (1 - turn);
      const rx = 5 * (1 - turn);
      const flat = d * (1 + (FRONT_SCALE - 1) * turn);
      const w = light.offsetWidth || 1;
      const h = light.offsetHeight || 1;
      const cover = Math.max(stage.clientWidth / w, stage.clientHeight / h) * COVER;
      const sc = lerp(flat, cover, segment(p, PP.expand) ** 3);
      const t = `translate(-50%, -50%) perspective(1400px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${sc})`;
      light.style.transform = portal.style.transform = t;

      light.style.opacity = String(1 - segment(p, PP.faceOut));
      this.rimRef.nativeElement.style.opacity = String(segment(p, PP.rim));
      this.fillRef.nativeElement.style.opacity = String(segment(p, PP.fill));
      this.copyRef.nativeElement.style.transform = `translateY(calc(${-COPY_RISE * segment(p, COPY_RANGE)} * var(--u)))`;
    }

    // Màn hình thứ hai
    const readyOpacity = segment(p, this.reduced ? REDUCED_READY_IN : READY_IN);
    ready.style.opacity = String(readyOpacity);
    ready.style.visibility = readyOpacity === 0 ? 'hidden' : 'visible';

    const showAt = this.reduced ? 0.6 : READY_AT;
    const hideAt = this.reduced ? 0.3 : READY_BACK;
    if (!this.readyShown && p >= showAt) {
      this.readyShown = true;
      ready.classList.add('ready-in');
    } else if (this.readyShown && p < hideAt) {
      this.readyShown = false;
      ready.classList.remove('ready-in');
    }
    this.setOceanScene(readyOpacity === 1);

    // Thanh điều hướng đổi sang chữ tối khi nền chuyển trắng
    const dark = this.pinRef.nativeElement.getBoundingClientRect().bottom <= 80;
    ready.toggleAttribute('inert', readyOpacity < 1);
    if (dark !== this.navDark) {
      this.zone.run(() => { this.navDark = dark; });
    }
  }

  /* ===================== Con trỏ kính + nghiêng thẻ ===================== */
  private bindPointer(): void {
    const finePointer = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cursor = this.cursorRef.nativeElement;

    this.cursorX = this.cursorTx = window.innerWidth / 2;
    this.cursorY = this.cursorTy = window.innerHeight / 2;

    const onMove = (e: PointerEvent) => {
      if (!finePointer) return;
      this.cursorTx = e.clientX;
      this.cursorTy = e.clientY;
      cursor.setAttribute('data-visible', 'true');
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) cursor.setAttribute('data-visible', 'false');
    };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('mouseout', onOut);
    this.cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onOut);
    });

    if (!finePointer) return;
    this.cursorLast = performance.now();
    const loop = (now: number) => {
      const dt = now - this.cursorLast;
      this.cursorLast = now;
      const k = 1 - Math.pow(1 - FOLLOW, dt / 16.67);
      this.cursorX += (this.cursorTx - this.cursorX) * k;
      this.cursorY += (this.cursorTy - this.cursorY) * k;
      cursor.style.transform = `translate3d(${this.cursorX}px, ${this.cursorY}px, 0) translate(-50%, -50%)`;
      this.cursorRaf = requestAnimationFrame(loop);
    };
    this.cursorRaf = requestAnimationFrame(loop);
  }

  /* ============================ Âm thanh biển ============================ */
  toggleAmbientSound(): void {
    if (!this.isOceanScene) return;
    if (this.audioRequested) {
      this.audioRequested = false;
      ++this.audioRequestId;
      this.stopOceanAudio();
      return;
    }
    this.audioRequested = true;
    this.playAmbientSound();
  }

  private setOceanScene(inside: boolean): void {
    if (inside === this.isOceanScene) return;
    this.zone.run(() => {
      this.isOceanScene = inside;
      ++this.audioRequestId;
      this.stopOceanAudio();
      if (inside && this.audioRequested) this.playAmbientSound();
      this.changeDetector.markForCheck();
    });
  }

  private playAmbientSound(): void {
    if (!this.isOceanScene || !this.audioRequested) return;
    const audio = this.oceanAudioRef.nativeElement;
    audio.volume = 0.5;
    audio.muted = false;
    const requestId = ++this.audioRequestId;
    audio.play().then(() => {
      if (!this.audioRequested || !this.isOceanScene) { this.stopOceanAudio(); return; }
      if (requestId !== this.audioRequestId) return;
      this.syncOceanAudioState();
    }).catch(() => {
      if (requestId !== this.audioRequestId) return;
      this.zone.run(() => {
        this.audioRequested = false;
        this.isAudioActive = false;
        this.changeDetector.markForCheck();
      });
    });
  }

  private stopOceanAudio(): void {
    const audio = this.oceanAudioRef.nativeElement;
    audio.muted = true;
    audio.pause();
    this.isAudioActive = false;
    this.changeDetector.markForCheck();
  }

  syncOceanAudioState(): void {
    const audio = this.oceanAudioRef.nativeElement;
    if (!this.audioRequested || !this.isOceanScene) {
      audio.muted = true;
      audio.pause();
    }
    this.isAudioActive = !audio.paused && !audio.muted && !audio.error;
    this.changeDetector.markForCheck();
  }

  ngOnDestroy(): void {
    this.audioRequested = false;
    ++this.audioRequestId;
    const audio = this.oceanAudioRef.nativeElement;
    audio.muted = true;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    this.isAudioActive = false;

    this.timers.forEach(clearTimeout);
    this.cleanups.forEach((fn) => fn());
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.cursorRaf);
    if (typeof document !== 'undefined') document.documentElement.style.overflow = '';
  }

  setActiveNav(path: string): void {
    this.activeNavPath = path;
  }

  goToTripshort(): void {
    this.router.navigate(['/tripshort']);
  }

  scrollToFeaturedTrips(): void {
    const element = document.getElementById('featured-trips');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleStatPill(selectedPill: StatPill): void {
    this.statPills.forEach(p => p.isActive = (p.id === selectedPill.id ? !p.isActive : false));
  }

  selectSearchField(fieldName: string): void {
    this.activeSearchField = fieldName;
  }

  clearSearchFieldHighlight(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#search-fields-grid')) {
      this.activeSearchField = null;
    }
  }

  toggleTripSelection(trip: TripCard): void {
    const currentStatus = trip.isSelected;
    this.trips.forEach(t => t.isSelected = false);
    trip.isSelected = !currentStatus;
  }

  private defaultHotelDates(): { checkIn: string; checkOut: string } {
    const tomorrow = new Date(Date.now() + 86400000);
    const out = new Date(Date.now() + 3 * 86400000);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { checkIn: iso(tomorrow), checkOut: iso(out) };
  }

  searchHoliday(): void {
    const rawDest = (this.searchDestination || '').trim();
    const location = rawDest.includes(',') ? rawDest.split(',').pop()!.trim() : rawDest || 'Phú Quốc';
    const guestMatch = (this.searchGuestInfo || '').match(/(\d+)/);
    const adults = Math.max(1, Math.min(10, Number(guestMatch?.[1] || 2)));
    const { checkIn, checkOut } = this.defaultHotelDates();
    void this.router.navigate(['/hotel-search'], {
      queryParams: { location, checkIn, checkOut, adults, children: 0, rooms: 1 }
    });
  }

  formatReviewCount(count: number | string | undefined): string {
    if (!count) return '(100+)';
    const s = String(count).trim();
    return s.startsWith('(') ? s : `(${s})`;
  }

  bookFeaturedTrip(trip: TripCard, event: Event): void {
    event.stopPropagation();
    const fold = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
    const title = fold(trip.title || '');
    const loc = fold(trip.location || '');
    const { checkIn, checkOut } = this.defaultHotelDates();
    const queryParams: Record<string, string | number> = {
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      rooms: 1
    };

    if (trip.hotelSlug) {
      void this.router.navigate(['/hotel', trip.hotelSlug], { queryParams });
      return;
    }

    if (title.includes('amanoi') || loc.includes('vinh hy') || loc.includes('ninh thuan')) {
      void this.router.navigate(['/hotel', 'amanoi-ocean-pool-residence'], { queryParams });
      return;
    }
    if (title.includes('six senses')) {
      void this.router.navigate(['/hotel', 'six-senses-ninh-van-bay'], { queryParams });
      return;
    }
    if (title.includes('nam hai') || loc.includes('hoi an') || loc.includes('da nang')) {
      void this.router.navigate(['/hotel-search'], {
        queryParams: { ...queryParams, location: 'Đà Nẵng' }
      });
      return;
    }
    const city = trip.location?.includes(',') ? trip.location.split(',').pop()!.trim() : trip.location || trip.title;
    void this.router.navigate(['/hotel-search'], {
      queryParams: { ...queryParams, location: city }
    });
  }

}
