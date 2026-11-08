import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-cta',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective, RouterLink],
  templateUrl: './cta.component.html',
  styleUrl: './cta.component.css',
})
export class CtaComponent {
  readonly img = '/images/Grassland.jpeg';
}
