import { HttpClient } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';

/**
 * Explicitly opt-in token for live backend HTTP requests in application runtime.
 * Angular v22 provides HttpClient in root with FetchBackend by default, so unit tests
 * without appConfig remain isolated to synchronous/fixture behavior unless opted in.
 */
export const TRIPLA_LIVE_API_ENABLED = new InjectionToken<boolean>('TRIPLA_LIVE_API_ENABLED');

export function injectLiveHttp(): HttpClient | null {
  return inject(TRIPLA_LIVE_API_ENABLED, { optional: true })
    ? inject(HttpClient, { optional: true })
    : null;
}

