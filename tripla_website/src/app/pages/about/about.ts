import { Component, ViewEncapsulation } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { CommunityComponent } from './components/community/community.component';
import { StepsComponent } from './components/steps/steps.component';
import { TripshortsComponent } from './components/tripshorts/tripshorts.component';
import { CtaComponent } from './components/cta/cta.component';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';

@Component({
  selector: 'app-about-page',
  host: { id: 'tripla-about' },
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./about-theme.css'],
  standalone: true,
  imports: [
    HeaderComponent,
    HeroComponent,
    CommunityComponent,
    StepsComponent,
    TripshortsComponent,
    CtaComponent,
    SiteFooterComponent,
  ],
  template: `
    <app-header></app-header>
    <main class="about-page">
      <app-hero></app-hero>
      <app-community></app-community>
      <app-steps></app-steps>
      <app-tripshorts></app-tripshorts>
      <app-cta></app-cta>
      <app-site-footer></app-site-footer>
    </main>
  `,
  styles: [
    `
      app-about-page {
        display: block;
        --primary: #30624b;
        --primary-2: #173b32;
        --amber: #b4c68c;
        --amber-d: #526b48;
        --ink: #173b32;
        --ink-2: #50675b;
        --ink-3: #64766c;
        --line: #173b3220;
        --font-head: 'Tripla Sans', 'Be Vietnam Pro', Arial, sans-serif;
        --font-body: 'Tripla Sans', 'Be Vietnam Pro', Arial, sans-serif;
        --font-editorial: 'Tripla Editorial', 'Times New Roman', serif;
        font-family: var(--font-body);
        background: #f3f3e9;
        color: #173b32;
      }

      app-about-page .about-page {
        width: 100%;
      }
    `,
  ],
})
export class AboutComponent {}
