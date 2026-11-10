import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { TripshortService } from '../../services/tripshort-service';
import { demoHotels } from '../../hotel-search/services/hotel-demo';
import { ActivitySearchService } from '../../activity-search/services/activity-search';
import { PlanningPlace } from '../models/planning-place.model';
@Injectable({ providedIn: 'root' })
export class PlanningPlacesService {
  private readonly shorts = inject(TripshortService);
  private readonly activities = inject(ActivitySearchService);
  resolve(keys: readonly string[]): Observable<PlanningPlace[]> {
    if (!keys.length) return of([]);
    return forkJoin([...new Set(keys)].map((key) => this.resolveOne(key)));
  }
  private resolveOne(key: string): Observable<PlanningPlace> {
    const unavailable: PlanningPlace = {
      key,
      title: 'Chưa lấy được thông tin địa điểm',
      description: `Mã đã lưu: ${key}. Nguồn dữ liệu có thể đã thay đổi.`,
      kind: 'unavailable',
    };
    if (key === 'resort' || key === 'dining' || key === 'yacht') {
      const point = this.shorts.pointDataMap()[key];
      return of(
        point
          ? {
              key,
              title: point.title,
              location: point.location,
              imageUrl: point.img,
              priceLabel: point.price,
              description:
                'Thông tin từ địa điểm đã lưu trong Tripshort. Giá giữ nguyên cách hiển thị của nguồn, chưa dùng để tính tổng lịch trình.',
              kind: 'tripshort',
              detailsPath: '/tripshort',
            }
          : unavailable,
      );
    }
    if (key.startsWith('hotel:')) {
      const hotel = demoHotels.find((item) => item.id === key.slice(6));
      return of(
        hotel
          ? {
              key,
              title: hotel.name,
              location: hotel.address,
              imageUrl: hotel.imageUrl,
              priceLabel:
                hotel.pricePerNight === undefined
                  ? undefined
                  : `${this.money(hotel.pricePerNight, hotel.currency)} / phòng / đêm (mẫu)`,
              description: hotel.description,
              kind: 'hotel',
              detailsPath: `/hotels/${hotel.id}`,
              detailsQuery: { demo: 'true' },
            }
          : unavailable,
      );
    }
    if (key.startsWith('activity:'))
      return this.activities.getDetails(key.slice(9)).pipe(
        map((item): PlanningPlace =>
          item
            ? {
                key,
                title: item.name,
                location: item.address || item.city,
                imageUrl: item.imageUrl,
                priceLabel:
                  item.priceFrom === undefined
                    ? undefined
                    : `${this.money(item.priceFrom, item.currency)} / người (mẫu)`,
                description: item.description,
                kind: 'activity',
                detailsPath: `/activities/${item.id}`,
              }
            : unavailable,
        ),
        catchError(() => of(unavailable)),
      );
    return of(unavailable);
  }
  private money(value: number, currency = 'VND'): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
