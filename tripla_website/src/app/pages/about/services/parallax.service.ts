import { Injectable, NgZone } from '@angular/core';

export interface ParallaxState {
  /** scroll đã được làm mượt (lerp) */
  scroll: number;
  vh: number;
  /** vị trí chuột chuẩn hoá -1..1 (đã làm mượt) */
  mx: number;
  my: number;
  /** tăng lên mỗi khi layout trang thay đổi -> directive đo lại vị trí */
  layout: number;
  /** tiến độ cuộn 0..1 */
  progress: number;
}

type Listener = (s: ParallaxState) => void;

/**
 * Một vòng lặp requestAnimationFrame duy nhất cho toàn bộ hiệu ứng parallax.
 * Chạy ngoài NgZone nên không kích hoạt change detection khi cuộn / rê chuột.
 */
@Injectable({ providedIn: 'root' })
export class ParallaxService {
  readonly reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly state: ParallaxState = { scroll: 0, vh: 800, mx: 0, my: 0, layout: 0, progress: 0 };

  private subs = new Set<Listener>();
  private target = { scroll: 0, mx: 0, my: 0 };
  private raf = 0;

  constructor(zone: NgZone) {
    if (typeof window === 'undefined') return;

    zone.runOutsideAngular(() => {
      this.state.scroll = this.target.scroll = window.scrollY;
      this.state.vh = window.innerHeight;

      window.addEventListener('scroll', () => { this.target.scroll = window.scrollY; this.kick(); }, { passive: true });
      window.addEventListener('mousemove', (e) => {
        this.target.mx = (e.clientX / window.innerWidth) * 2 - 1;
        this.target.my = (e.clientY / window.innerHeight) * 2 - 1;
        this.kick();
      }, { passive: true });
      window.addEventListener('resize', () => { this.state.vh = window.innerHeight; this.state.layout++; this.kick(); });
      new ResizeObserver(() => { this.state.layout++; this.kick(); }).observe(document.body);
    });
  }

  /** Đăng ký nhận state mỗi frame. Trả về hàm huỷ đăng ký. */
  subscribe(fn: Listener): () => void {
    this.subs.add(fn);
    fn(this.state);
    return () => this.subs.delete(fn);
  }

  private kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = () => {
    this.raf = 0;
    const s = this.state;
    const t = this.target;
    const k = this.reduced ? 1 : 0.1; // độ "trễ" mượt của chuyển động

    s.scroll += (t.scroll - s.scroll) * k;
    s.mx += (t.mx - s.mx) * k;
    s.my += (t.my - s.my) * k;

    const max = document.documentElement.scrollHeight - s.vh;
    s.progress = max > 0 ? Math.min(1, Math.max(0, s.scroll / max)) : 0;
    document.documentElement.style.setProperty('--progress', s.progress.toFixed(4));

    this.subs.forEach((fn) => fn(s));

    const moving =
      Math.abs(t.scroll - s.scroll) > 0.1 ||
      Math.abs(t.mx - s.mx) > 0.001 ||
      Math.abs(t.my - s.my) > 0.001;
    if (moving) this.raf = requestAnimationFrame(this.loop);
  };
}
