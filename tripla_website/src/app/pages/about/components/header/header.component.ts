import { Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AmbientAudioService } from '../../services/ambient-audio.service';
import { ParallaxService } from '../../services/parallax.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  readonly audio = inject(AmbientAudioService);

  readonly nav = [
    { label: 'Câu Chuyện', href: '#top', anchor: 'top' },
    { label: 'Khái Niệm TripShorts', href: '#tripshorts', anchor: 'tripshorts' },
    { label: 'Tầm Nhìn', href: '#tam-nhin', anchor: 'tam-nhin' },
    { label: 'Trải Nghiệm', href: '#trai-nghiem', anchor: 'trai-nghiem' },
  ];

  readonly tripshortCtaRoute = '/tripshort';

  ngOnInit(): void {
    this.audio.startDefault();
  }

  goToSection(sectionId: string | null, event: Event): void {
    if (!sectionId) {
      return;
    }

    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  constructor() {
    // Thu gọn header khi cuộn (đổi class trực tiếp, không kích hoạt change detection)
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const off = inject(ParallaxService).subscribe((s) => host.classList.toggle('scrolled', s.scroll > 40));
    inject(DestroyRef).onDestroy(off);
    inject(DestroyRef).onDestroy(() => this.audio.stop());
  }
}
