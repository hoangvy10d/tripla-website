import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { authGuard } from './guards/auth-guard';
import { HomeComponent } from './pages/home/home';
import { AboutComponent } from './pages/about/about';
import { Tripshort } from './pages/tripshort/tripshort';
import { TripShopComponent } from './pages/trip-shop/trip-shop';
import { planningUnsavedGuard } from './trip-planning/planning-unsaved.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'tripshort', component: Tripshort },
  { path: 'trip-shop', component: TripShopComponent },
  { path: 'trip-planning', canDeactivate:[planningUnsavedGuard], loadComponent: () => import('./trip-planning/pages/trip-planning-page/trip-planning-page').then(m => m.TripPlanningPage) },
  { path: 'checkout/:bookingType', loadComponent: () => import('./checkout/pages/checkout-page/checkout-page').then(m => m.CheckoutPage) },
  { path: 'hotel-search', loadComponent: () => import('./hotel-search/pages/hotel-search-results/hotel-search-results').then(m => m.HotelSearchResults) },
  { path: 'activity-search', loadComponent: () => import('./activity-search/pages/activity-search-results/activity-search-results').then(m => m.ActivitySearchResults) },
  { path: 'bus-search', loadComponent: () => import('./bus-search/pages/bus-search-results/bus-search-results').then(m => m.BusSearchResults) },
  { path: 'buses/:id', loadComponent: () => import('./bus-search/pages/bus-details/bus-details').then(m => m.BusDetailsPage) },
  { path: 'bus/:id', loadComponent: () => import('./bus-search/pages/bus-details/bus-details').then(m => m.BusDetailsPage) },
  { path: 'activities/:id', loadComponent: () => import('./activity-search/pages/activity-details/activity-details').then(m => m.ActivityDetailsPage) },
  { path: 'activity/:id', loadComponent: () => import('./activity-search/pages/activity-details/activity-details').then(m => m.ActivityDetailsPage) },
  { path: 'hotel/:identifier', loadComponent: () => import('./hotel-search/pages/hotel-details/hotel-details').then(m => m.HotelDetails) },
  { path: 'hotels/:id', loadComponent: () => import('./hotel-search/pages/hotel-details/hotel-details').then(m => m.HotelDetails) },
  { path: 'bookings/detail/:bookingCode', loadComponent: () => import('./pages/booking-detail/booking-detail').then(m => m.BookingDetailComponent) },
  { path: 'flight-search-results', loadComponent: () => import('./flight-search/pages/flight-search-results/flight-search-results').then(m => m.FlightSearchResults) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
  { path: 'profile/:id', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
  { path: 'admin/login', loadComponent: () => import('./pages/admin-login/admin-login').then(m => m.AdminLoginComponent) },
  { path: 'login-failed', loadComponent: () => import('./pages/login-failed/login-failed').then(m => m.LoginFailedComponent) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent) },
  { path: 'creator', loadComponent: () => import('./pages/creator/creator').then(m => m.CreatorComponent) },
  { path: 'policies', loadComponent: () => import('./pages/policies/policies').then(m => m.PoliciesComponent) },
  { path: 'map', loadComponent: () => import('./pages/explore-map/explore-map').then(m => m.ExploreMapComponent) },
  { path: '**', redirectTo: 'home' }
];
