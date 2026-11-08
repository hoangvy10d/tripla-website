import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { AboutComponent } from './pages/about/about';
import { Tripshort } from './pages/tripshort/tripshort';
import { TripShopComponent } from './pages/trip-shop/trip-shop';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'tripshort', component: Tripshort },
  { path: 'trip-shop', component: TripShopComponent },
  { path: '**', redirectTo: 'home' }
];