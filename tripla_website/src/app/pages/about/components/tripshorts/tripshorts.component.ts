import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';
import { ParallaxService } from '../../services/parallax.service';
import { IMAGES } from '../../shared/images';

@Component({
  selector: 'app-tripshorts',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective],
  templateUrl: './tripshorts.component.html',
  styleUrl: './tripshorts.component.css',
})
export class TripshortsComponent implements AfterViewInit, OnDestroy {
  readonly img = IMAGES.dusk;

  readonly pillars = [
    { icon: 'graphic_eq', title: 'Âm Thanh Bản Nguyên', text: 'Tiếng sóng biển, gió ngàn và âm hưởng thiên nhiên sống động 360 độ.', tone: 'primary' },
    { icon: 'panorama_photosphere', title: 'Điện Ảnh Dọc 9:16', text: 'Góc nhìn chân thực, bắt trọn từng vệt nắng rực rỡ không dùng bộ lọc ảo.', tone: 'amber' },
    { icon: 'flight_takeoff', title: '1 Chạm Cất Cánh', text: 'Biến cảm xúc khao khát phiêu lưu thành tấm vé phòng hạng sang tức khắc.', tone: 'primary' },
  ];

  /** Nút tim */
  readonly liked = signal(false);
  readonly likes = computed(() => (this.liked() ? '24.9K' : '24.8K'));
  toggleLike(): void { this.liked.update((v) => !v); }

  /** Nghiêng 3D theo chuột */
  @ViewChild('tilt', { static: true }) private tilt!: ElementRef<HTMLElement>;
  private readonly svc = inject(ParallaxService);
  private off?: () => void;

  ngAfterViewInit(): void {
    if (this.svc.reduced) return;
    this.off = this.svc.subscribe((s) => {
      this.tilt.nativeElement.style.transform =
        `perspective(1000px) rotateY(${(s.mx * 8).toFixed(2)}deg) rotateX(${(-s.my * 8).toFixed(2)}deg)`;
    });
  }
  ngOnDestroy(): void { this.off?.(); }
}
