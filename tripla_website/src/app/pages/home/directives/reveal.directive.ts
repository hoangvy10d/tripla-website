import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, OnInit, inject, numberAttribute } from '@angular/core';

/**
 * Hiện dần khi phần tử cuộn vào màn hình.
 * Dùng thuộc tính CSS riêng (translate / scale / opacity) nên không đụng tới `transform`
 * của ParallaxDirective hay hiệu ứng hover.
 *
 *  <div appReveal="left" [revealDelay]="150">
 */
@Directive({ selector: '[appReveal]', standalone: true })
export class RevealDirective implements OnInit, AfterViewInit, OnDestroy {
  @Input('appReveal') variant: '' | 'up' | 'left' | 'right' | 'zoom' = 'up';
  @Input({ transform: numberAttribute }) revealDelay = 0;

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private io?: IntersectionObserver;

  ngOnInit(): void {
    this.el.classList.add('reveal', `reveal-${this.variant || 'up'}`);
    this.el.style.setProperty('--d', `${this.revealDelay}ms`);
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.el.classList.add('in', 'done');
      return;
    }
    this.io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        this.el.classList.add('in');
        // sau khi hiện xong bỏ delay để hiệu ứng hover không bị trễ
        setTimeout(() => this.el.classList.add('done'), this.revealDelay + 1100);
        this.io?.disconnect();
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    this.io.observe(this.el);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
  }
}
