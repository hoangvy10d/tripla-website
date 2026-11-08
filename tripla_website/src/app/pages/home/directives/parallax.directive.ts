import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, inject, numberAttribute } from '@angular/core';
import { ParallaxService, ParallaxState } from './parallax.service';


/**
 * Parallax đa tầng.
 *
 *  [appParallax]  hệ số dịch chuyển dọc  (dương = trôi chậm hơn nền, âm = trôi nhanh hơn / nổi lên)
 *  [pxX]          hệ số dịch chuyển ngang
 *  [pxRotate]     độ xoay (deg) cho mỗi 1 chiều cao viewport cuộn qua
 *  [pxScale]      thay đổi scale cho mỗi 1 chiều cao viewport cuộn qua
 *  [pxMouse]      biên độ (px) lệch theo chuột
 *  pxMode         'element' = tính theo vị trí phần tử so với giữa màn hình
 *                 'scroll'  = tính thẳng theo scrollY
 *  pxBase         transform gốc (vd: "scale(1.1)")
 */
@Directive({ selector: '[appParallax]', standalone: true })
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  @Input({ alias: 'appParallax', transform: numberAttribute }) speed = 0;
  @Input({ transform: numberAttribute }) pxX = 0;
  @Input({ transform: numberAttribute }) pxRotate = 0;
  @Input({ transform: numberAttribute }) pxScale = 0;
  @Input({ transform: numberAttribute }) pxMouse = 0;
  @Input() pxMode: 'element' | 'scroll' = 'element';
  @Input() pxBase = '';

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly svc = inject(ParallaxService);
  private off?: () => void;
  private center = 0;
  private layout = -1;

  ngAfterViewInit(): void {
    if (this.svc.reduced) return;
    this.el.style.willChange = 'transform';
    this.off = this.svc.subscribe((s) => this.update(s));
  }

  ngOnDestroy(): void {
    this.off?.();
  }

  /** Đo tâm phần tử trong toàn trang (chỉ khi layout đổi, không đo mỗi frame). */
  private measure(s: ParallaxState): void {
    const prev = this.el.style.transform;
    this.el.style.transform = this.pxBase || 'none';
    const r = this.el.getBoundingClientRect();
    this.center = r.top + r.height / 2 + window.scrollY;
    this.el.style.transform = prev;
    this.layout = s.layout;
  }

  private update(s: ParallaxState): void {
    let d: number;
    if (this.pxMode === 'scroll') {
      d = s.scroll;
    } else {
      if (this.layout !== s.layout) this.measure(s);
      d = s.scroll + s.vh / 2 - this.center;
    }
    const x = d * this.pxX + s.mx * this.pxMouse;
    const y = d * this.speed + s.my * this.pxMouse;
    const rot = (d / s.vh) * this.pxRotate;
    const sc = 1 + (d / s.vh) * this.pxScale;

    this.el.style.transform =
      `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) ${this.pxBase} rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
  }
}
