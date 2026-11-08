import { Component } from '@angular/core';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';
import { IMAGES } from '../../shared/images';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective],
  templateUrl: './community.component.html',
  styleUrl: './community.component.css',
})
export class CommunityComponent {
  readonly img = IMAGES.hero;

  readonly stats = [
    { value: '500+', label: 'Resort & Điểm Đến VIP', hot: false },
    { value: '1.200+', label: 'Video Điện Ảnh Thật', hot: true },
    { value: '99%', label: 'Cảm Xúc Thăng Hoa', hot: false },
  ];
}
