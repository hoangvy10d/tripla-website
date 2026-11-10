import { Injectable } from '@angular/core';
import { FlightSearchCriteria } from '../models/flight-search-criteria.model';

/** Preserves only the TripShop form. Applied results always come from the URL. */
@Injectable({ providedIn: 'root' })
export class FlightSearchDraft {
  value: { criteria: FlightSearchCriteria; directFlight: boolean; active: boolean } | null = null;
}
