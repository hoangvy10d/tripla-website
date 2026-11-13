import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, take } from 'rxjs';
import { TripshortService } from '../../services/tripshort-service';
import { demoHotels, offlineCatalogHotels } from '../../hotel-search/services/hotel-demo';
import { ActivitySearchService } from '../../activity-search/services/activity-search';
import { PlanningPlace } from '../models/planning-place.model';
import { injectLiveHttp } from '../../services/live-http';

@Injectable({ providedIn: 'root' })
export class PlanningPlacesService {
  private readonly shorts = inject(TripshortService);
  private readonly activities = inject(ActivitySearchService);
  private readonly http = injectLiveHttp();
  private readonly apiBase = 'http://localhost:3000/api/v1';

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
      const coords =
        key === 'resort'
          ? { latitude: 11.7145, longitude: 109.1932 }
          : key === 'dining'
            ? { latitude: 11.7182, longitude: 109.1951 }
            : { latitude: 11.7095, longitude: 109.2012 };
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
              coordinates: coords,
            }
          : unavailable,
      );
    }

    if (key.startsWith('hotel:')) {
      const hotelId = key.slice(6);
      const demoMatch = [...demoHotels, ...offlineCatalogHotels].find((item) => item.id === hotelId);
      const demoPlace: PlanningPlace | null = demoMatch
        ? {
            key,
            title: demoMatch.name,
            location: demoMatch.address,
            imageUrl: demoMatch.imageUrl,
            priceLabel:
              demoMatch.pricePerNight === undefined
                ? undefined
                : `${this.money(demoMatch.pricePerNight, demoMatch.currency)} / phòng / đêm`,
            description: demoMatch.description,
            kind: 'hotel',
            detailsPath: demoMatch.hotel_slug ? `/hotel/${demoMatch.hotel_slug}` : `/hotels/${demoMatch.id}`,
            ...(demoMatch.id.startsWith('demo-') ? { detailsQuery: { demo: 'true' } } : {}),
            coordinates: { latitude: 11.9404, longitude: 108.4383 },
          }
        : null;

      if (this.http) {
        return this.http.get<{ success: boolean; hotel?: any }>(`${this.apiBase}/hotels/${hotelId}`).pipe(
          take(1),
          map((res): PlanningPlace => {
            const h = res?.hotel;
            if (!h) return demoPlace || unavailable;
            const coords = h.geo?.coordinates;
            const lng = Array.isArray(coords) ? coords[0] : h.longitude;
            const lat = Array.isArray(coords) ? coords[1] : h.latitude;
            return {
              key,
              title: h.hotel_name || h.name || 'Khách sạn TRIPLA',
              location: h.address || h.city,
              imageUrl: h.image_url || h.images?.[0] || '/images/trangan.jpg',
              priceLabel: h.price_per_night || h.pricePerNight
                ? `${this.money(h.price_per_night || h.pricePerNight)} / phòng / đêm`
                : undefined,
              description: h.description,
              kind: 'hotel',
              detailsPath: h.hotel_slug ? `/hotel/${h.hotel_slug}` : `/hotels/${h.id || hotelId}`,
              coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: Number(lat), longitude: Number(lng) } : undefined,
            };
          }),
          catchError(() => of(demoPlace || unavailable)),
        );
      }
      return of(demoPlace || unavailable);
    }

    if (key.startsWith('location:') && this.http) {
      const locId = key.slice(9);
      return this.http.get<{ success: boolean; location?: any }>(`${this.apiBase}/locations/${locId}`).pipe(
        take(1),
        map((res): PlanningPlace => {
          const l = res?.location;
          if (!l) return unavailable;
          const coords = l.geo?.coordinates;
          const lng = Number(Array.isArray(coords) ? coords[0] : l.longitude);
          const lat = Number(Array.isArray(coords) ? coords[1] : l.latitude);
          return {
            key,
            title: l.name || 'Địa điểm tham quan',
            location: l.address || l.city,
            imageUrl: l.image_url || '/images/Grassland.jpeg',
            priceLabel: l.entry_fee ? `${this.money(l.entry_fee)} ${l.unit || '/ người'}` : 'Miễn phí vé vào cổng',
            description: l.location_description,
            kind: 'activity',
            detailsPath: '/map',
            detailsQuery: { focus: String(l._id || locId) },
            coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : undefined,
          };
        }),
        catchError(() => of(unavailable)),
      );
    }

    if (key.startsWith('activity:') || key.startsWith('location:')) {
      const actId = key.slice(9);
      if (this.http) {
        return this.http.get<{ success: boolean; activity?: any }>(`${this.apiBase}/activities/${actId}`).pipe(
          take(1),
          map((res): PlanningPlace => {
            const a = res?.activity;
            if (!a) return unavailable;
            const coords = a.coordinates;
            return {
              key,
              title: a.name || a.title || 'Địa điểm tham quan',
              location: a.location || a.address || a.city,
              imageUrl: a.imageUrl || a.image_url || a.images?.[0] || '/images/Grassland.jpeg',
              priceLabel: a.priceFrom ? `${this.money(a.priceFrom)} / người` : 'Miễn phí vé vào cổng',
              description: a.description,
              kind: 'activity',
              detailsPath: `/activities/${a.slug || a.id || actId}`,
              coordinates: coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
                ? { latitude: coords.latitude, longitude: coords.longitude }
                : undefined,
            };
          }),
          catchError(() =>
            this.activities.getDetails(actId).pipe(
              take(1),
              map((item): PlanningPlace =>
                item
                  ? {
                      key,
                      title: item.name,
                      location: item.address || item.city,
                      imageUrl: item.imageUrl,
                      priceLabel: item.priceFrom ? `${this.money(item.priceFrom, item.currency)} / người` : undefined,
                      description: item.description,
                      kind: 'activity',
                      detailsPath: `/activities/${item.slug || item.id}`,
                    }
                  : unavailable,
              ),
              catchError(() => of(unavailable)),
            ),
          ),
        );
      }

      return this.activities.getDetails(actId).pipe(
        take(1),
        map((item): PlanningPlace =>
          item
            ? {
                key,
                title: item.name,
                location: item.address || item.city,
                imageUrl: item.imageUrl,
                priceLabel: item.priceFrom ? `${this.money(item.priceFrom, item.currency)} / người` : undefined,
                description: item.description,
                kind: 'activity',
                detailsPath: `/activities/${item.slug || item.id}`,
              }
            : unavailable,
        ),
        catchError(() => of(unavailable)),
      );
    }

    if (key.startsWith('bus:')) {
      const busId = key.slice(4);
      const busCityCoords = (city: string) => {
        const c = city.toLowerCase();
        if (c.includes('đà lạt') || c.includes('da lat')) return { latitude: 11.9404, longitude: 108.4383 };
        if (c.includes('hồ chí minh') || c.includes('sài gòn')) return { latitude: 10.7769, longitude: 106.7009 };
        if (c.includes('nha trang')) return { latitude: 12.2388, longitude: 109.1967 };
        if (c.includes('hà nội')) return { latitude: 21.0285, longitude: 105.8542 };
        if (c.includes('đà nẵng')) return { latitude: 16.0544, longitude: 108.2208 };
        if (c.includes('phú quốc')) return { latitude: 10.2899, longitude: 103.984 };
        return undefined;
      };
      const busFallback: PlanningPlace = {
        key,
        title: 'Chuyến xe khách TRIPLA',
        location: 'Tuyến xe đã đặt qua hệ thống',
        imageUrl: '/images/Grassland.jpeg',
        priceLabel: '330.000 ₫ / vé',
        description: 'Vé xe khách giường nằm / Limousine đã được ghi nhận vào kế hoạch chuyến đi.',
        kind: 'activity',
        detailsPath: '/trip-shop',
        detailsQuery: { tab: 'bus' },
      };
      if (this.http && busId && !busId.startsWith('demo-')) {
        return this.http.get<{ success: boolean; bus?: any }>(`${this.apiBase}/bus-trips/${busId}`).pipe(
          take(1),
          map((res): PlanningPlace => {
            const b = res?.bus;
            if (!b) return busFallback;
            const from = b.from || b.origin || 'Xuất phát';
            const to = b.to || b.destination || 'Đến nơi';
            return {
              key,
              title: `Xe khách ${b.operatorName || b.operator || 'Tripla'}`,
              location: `${from} → ${to}`,
              imageUrl: b.image || '/images/Grassland.jpeg',
              priceLabel: `${this.money(b.price || b.priceVnd || 330000)} / vé`,
              description: `${b.vehicle || b.classType || 'Limousine'} · Giờ đi: ${b.departureTime || b.departureAt || '07:30'}`,
              kind: 'activity',
              detailsPath: '/trip-shop',
              detailsQuery: { tab: 'bus' },
              coordinates: busCityCoords(String(to)) || busCityCoords(String(from)),
            };
          }),
          catchError(() => of(busFallback)),
        );
      }
      return of(busFallback);
    }

    if (key.startsWith('flight:')) {
      const parts = key.slice(7).split(':');
      const routeLabel = (parts[0] || 'HAN-SGN').replace('-', ' → ');
      const airline = parts[1] || 'Hãng hàng không';
      const code = parts[2] || '';
      return of({
        key,
        title: `Chuyến bay ${airline} (${routeLabel})`,
        location: `Hành trình ${routeLabel}${code ? ` · Mã ${code}` : ''}`,
        imageUrl: '/images/trangan.jpg',
        priceLabel: 'Vé máy bay đã đặt',
        description: `Chuyến bay ${airline} chặng ${routeLabel} đã được ghi nhận vào kế hoạch hành trình TRIPLA.`,
        kind: 'activity',
        detailsPath: '/trip-shop',
        detailsQuery: { tab: 'flight' },
      });
    }

    if (key.startsWith('booked')) {
      const code = key.replace(/^(booked_|booked:)/, '');
      return of({
        key,
        title: `Dịch vụ đã đặt chỗ #${code}`,
        location: 'Đã thanh toán (Booking VIP)',
        priceLabel: 'ĐÃ THANH TOÁN',
        kind: 'tripshort',
        description: 'Đơn đặt chỗ đã được xác nhận và thanh toán trực tiếp qua cổng TRIPLA.',
      });
    }

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
