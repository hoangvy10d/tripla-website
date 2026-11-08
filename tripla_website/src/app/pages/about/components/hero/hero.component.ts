import { Component } from '@angular/core';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent {
  readonly img = '/images/tranganedit.jpeg';

  readonly features = [
    { icon: 'nature_people', text: '100% Khung Cảnh Thật', color: '#52734c' },
    { icon: 'touch_app', text: '1 Chạm Đến Thiên Đường', color: '#30624b' },
    { icon: 'waves', text: 'Sóng Biển & Gió Rừng 3D', color: '#648459' },
  ];
}
