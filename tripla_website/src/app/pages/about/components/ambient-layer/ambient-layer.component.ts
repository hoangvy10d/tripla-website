import { Component } from '@angular/core';
import { ParallaxDirective } from '../../directives/parallax.directive';

interface Blob { top: string; left?: string; right?: string; size: number; rgb: string; alpha: number; speed: number; mouse: number; delay: number; }
interface Firefly { top: string; left?: string; right?: string; size: number; color: string; dur: number; delay: number; }

/** Lớp nền "ảo diệu": các đốm sáng aurora trôi theo parallax + đom đóm lấp lánh phía trên nội dung. */
@Component({
  selector: 'app-ambient-layer',
  standalone: true,
  imports: [ParallaxDirective],
  templateUrl: './ambient-layer.component.html',
  styleUrl: './ambient-layer.component.css',
})
export class AmbientLayerComponent {
  readonly blobs: Blob[] = [
    { top: '2%',  left: '-10%', size: 620, rgb: '255,140,60',  alpha: 0.30, speed: -0.10, mouse: 30,  delay: 0 },
    { top: '14%', right: '-12%', size: 520, rgb: '254,166,25', alpha: 0.28, speed: 0.14,  mouse: -40, delay: -4 },
    { top: '30%', left: '6%',   size: 440, rgb: '255,120,140', alpha: 0.18, speed: -0.2,  mouse: 24,  delay: -8 },
    { top: '46%', right: '2%',  size: 600, rgb: '255,94,0',    alpha: 0.18, speed: 0.1,   mouse: -28, delay: -2 },
    { top: '62%', left: '-8%',  size: 560, rgb: '254,190,90',  alpha: 0.30, speed: -0.14, mouse: 36,  delay: -6 },
    { top: '78%', right: '-10%', size: 520, rgb: '255,150,110', alpha: 0.26, speed: 0.18,  mouse: -32, delay: -10 },
    { top: '90%', left: '30%',  size: 480, rgb: '255,170,80',  alpha: 0.22, speed: -0.08, mouse: 20,  delay: -3 },
  ];

  readonly fireflies: Firefly[] = [
    { top: '22%', left: '18%',  size: 8,  color: '#fea619', dur: 6,   delay: 0 },
    { top: '38%', right: '14%', size: 6,  color: '#ff5e00', dur: 8,   delay: 1.5 },
    { top: '65%', left: '12%',  size: 10, color: '#ffb84d', dur: 7,   delay: 2.8 },
    { top: '80%', right: '24%', size: 8,  color: '#ff5e00', dur: 6.5, delay: 0.8 },
    { top: '48%', left: '45%',  size: 6,  color: '#ffc46b', dur: 9,   delay: 3.2 },
    { top: '12%', right: '32%', size: 7,  color: '#ff7a1f', dur: 7.5, delay: 4 },
    { top: '58%', right: '6%',  size: 6,  color: '#fea619', dur: 8.5, delay: 2 },
    { top: '88%', left: '28%',  size: 9,  color: '#ff8a3d', dur: 6.8, delay: 5 },
  ];
}
