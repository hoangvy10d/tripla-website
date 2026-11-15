import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { TRIPLA_LIVE_API_ENABLED } from './services/live-http';

export const apiOriginInterceptor: HttpInterceptorFn = (req, next) => {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    req.url.startsWith('http://localhost:3000')
  ) {
    const prodUrl = req.url.replace('http://localhost:3000', window.location.origin);
    return next(req.clone({ url: prodUrl }));
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([apiOriginInterceptor])),
    { provide: TRIPLA_LIVE_API_ENABLED, useValue: true },
    provideRouter(routes)
  ]
};
