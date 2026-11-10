import { Injectable } from '@angular/core';
import { HotelSearchState } from '../models/hotel-search-criteria.model';

/** Only the TripShop draft. Applied results are always restored from the URL. */
@Injectable({ providedIn: 'root' })
export class HotelSearchDraft {
  value: HotelSearchState | null = null;
}
