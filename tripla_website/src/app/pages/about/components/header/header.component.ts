import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AmbientAudioService } from '../../services/ambient-audio.service';
import { ParallaxService } from '../../services/parallax.service';
import { SiteHeaderComponent } from '../../../../shared/components/site-header/site-header';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  readonly audio = inject(AmbientAudioService);
  readonly isScrolled = signal(false);

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
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const off = inject(ParallaxService).subscribe((s) => {
      const scrolled = s.scroll > 40;
      this.isScrolled.set(scrolled);
      host.classList.toggle('scrolled', scrolled);
    });
    inject(DestroyRef).onDestroy(off);
    inject(DestroyRef).onDestroy(() => this.audio.stop());
  }
}
