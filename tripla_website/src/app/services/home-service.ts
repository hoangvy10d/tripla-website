import { Injectable } from '@angular/core';
import { StatPill, TripCard } from '../models/home.model';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MOCK_STAT_PILLS, MOCK_TRIP_CARDS } from '../mock/home.mock';
import { injectLiveHttp } from './live-http';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly http = injectLiveHttp();
  private readonly apiBase = '/api/v1';

  private normalizeTripCard(raw: any, idx: number): TripCard {
    const rawPrice = raw?.price ?? raw?.pricePerNight ?? raw?.price_per_night;
    const numericPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : Number(String(rawPrice ?? '').replace(/[^\d]/g, '')) || 1500000;
    const rawTitle = String(raw?.title || raw?.name || raw?.hotel_name || '').trim();
    const city = String(raw?.city || raw?.location || (rawTitle.includes('•') ? rawTitle.split('•')[0].trim() : 'Việt Nam')).trim();
    const accommodation = String(raw?.accommodation || raw?.accommodationType || 'Khách sạn').replace(/\s*\(.*?\)/, '').trim();

    const formattedTitle = rawTitle.includes('•') ? rawTitle : `${city} • ${rawTitle}`;
    const formattedSub = raw?.subtitle || `${accommodation} • ${city}`;

    const image =
      raw?.image ||
      raw?.imageUrl ||
      raw?.image_url ||
      (Array.isArray(raw?.images) && raw.images[0]) ||
      MOCK_TRIP_CARDS[idx % MOCK_TRIP_CARDS.length]?.image ||
      '/images/trangan.jpg';
    const ratingMatch = String(raw?.subtitle || '').match(/★\s*([\d.]+)/);
    const rating = Number(raw?.rating || ratingMatch?.[1] || 4.9);
    const rawReview = raw?.reviewCount ?? raw?.review_count ?? (120 + idx * 30);

    return {
      id: String(raw?.hotelId || raw?.id || raw?._id || `trip-${idx + 1}`),
      hotelSlug: raw?.hotel_slug || raw?.hotelSlug || raw?.slug || '',
      title: formattedTitle || MOCK_TRIP_CARDS[idx % MOCK_TRIP_CARDS.length].title,
      subtitle: formattedSub,
      location: city,
      price: numericPrice,
      rating: Number.isFinite(rating) ? rating : 4.9,
      reviewCount: rawReview,
      image,
      tagText: String(raw?.tagText || raw?.badge || 'Nổi bật'),
      isSelected: Boolean(raw?.isSelected)
    };
  }

  getTripCards(): Observable<TripCard[]> {
    if (!this.http) {
      return of(MOCK_TRIP_CARDS);
    }
    return this.http
      .get<{ success: boolean; trips?: any[] }>(`${this.apiBase}/home/highlights`)
      .pipe(
        map((res) =>
          res?.trips && res.trips.length > 0
            ? res.trips.map((t, idx) => this.normalizeTripCard(t, idx))
            : MOCK_TRIP_CARDS
        ),
        catchError(() => of(MOCK_TRIP_CARDS))
      );
  }

  getStatPills(): Observable<StatPill[]> {
    if (!this.http) {
      return of(MOCK_STAT_PILLS);
    }
    return this.http
      .get<{ success: boolean; statPills?: StatPill[] }>(`${this.apiBase}/home/highlights`)
      .pipe(
        map((res) => (res?.statPills && res.statPills.length > 0 ? res.statPills : MOCK_STAT_PILLS)),
        catchError(() => of(MOCK_STAT_PILLS))
      );
  }
}
