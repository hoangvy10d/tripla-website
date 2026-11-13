import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { EMPTY, Observable, catchError, concat, map, of } from 'rxjs';
import { BusSearchState, BusFilters, busTimeBands, shiftBusDate } from '../models/bus-search.model';
import { BusTrip, BusDetails } from '../models/bus.model';
import { normalizeDestination } from '../../models/vietnam-destinations';
import { injectLiveHttp } from '../../services/live-http';
export function filterBusTrips(trips: readonly BusTrip[], filters: BusFilters): BusTrip[] {
  return trips.filter(
    (trip) =>
      (!filters.operators.length || filters.operators.includes(trip.operatorId)) &&
      (!filters.departureBands.length ||
        filters.departureBands.some((id) => {
          const band = busTimeBands.find((band) => band.id === id),
            hour = Number(trip.departureAt.slice(11, 13));
          return !!band && hour >= band.start && hour < band.end;
        })),
  );
}
@Injectable({ providedIn: 'root' })
export class BusSearchService {
  private readonly http = injectLiveHttp();
  private readonly apiBase = 'http://localhost:3000/api/v1';

  details(id: string, state: BusSearchState): Observable<BusDetails | null> {
    if (this.http && id && !id.startsWith('demo-')) {
      const date =
        (state.leg === 'inbound' ? state.criteria.returnDate : state.criteria.departureDate) ||
        new Date().toISOString().slice(0, 10);
      return this.http.get<{ success: boolean; bus?: Record<string, unknown> }>(`${this.apiBase}/bus-trips/${encodeURIComponent(id)}`).pipe(
        map((res) => {
          const b = res?.bus;
          if (!b) return null;
          const hour = Number(b['hour'] ?? 7);
          const minute = Number(b['minute'] ?? 30);
          const duration = Number(b['durationMinutes'] || b['duration'] || 390);
          const arrival = hour * 60 + minute + duration;
          const time = (minutes: number) =>
            `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
          const from = String(b['from'] || b['origin'] || state.criteria.from);
          const to = String(b['to'] || b['destination'] || state.criteria.to);
          const vehicle = String(b['vehicle'] || b['classType'] || 'Limousine 24 phòng');
          const trip: BusTrip = {
            id: String(b['id'] || b['_id'] || id),
            slug: b['slug'] ? String(b['slug']) : undefined,
            operatorId: String(b['operatorId'] || 'minh-tai'),
            operatorName: String(b['operatorName'] || b['operator'] || 'Bình Minh Tải'),
            vehicle,
            from,
            to,
            departureAt: `${date}T${time(hour * 60 + minute)}:00+07:00`,
            arrivalAt: `${shiftBusDate(date, Math.floor(arrival / 1440))}T${time(arrival)}:00+07:00`,
            durationMinutes: duration,
            pickup: String(b['pickup'] || `Điểm đón tại ${from}`),
            dropoff: String(b['dropoff'] || `Điểm trả tại ${to}`),
            price: Number(b['price'] || 330000),
            currency: 'VND',
            amenities: Array.isArray(b['amenities'])
              ? (b['amenities'] as string[])
              : ['Điều hòa', 'Cổng sạc', 'Nước uống'],
          };
          const rawSeats = Array.isArray(b['seats']) ? (b['seats'] as Record<string, unknown>[]) : [];
          const count = rawSeats.length || (vehicle.includes('40') ? 40 : vehicle.includes('22') ? 22 : 24);
          const seats = rawSeats.length
            ? rawSeats.map((s, idx) => ({
                id: String(s['id'] || `seat-${idx + 1}`),
                label: String(s['label'] || `${idx < count / 2 ? 'A' : 'B'}${(idx % Math.ceil(count / 2)) + 1}`),
                deck: (idx < count / 2 ? 1 : 2) as 1 | 2,
                available: s['status'] !== 'booked',
              }))
            : Array.from({ length: count }, (_, index) => ({
                id: `seat-${index + 1}`,
                label: `${index < count / 2 ? 'A' : 'B'}${(index % Math.ceil(count / 2)) + 1}`,
                deck: (index < count / 2 ? 1 : 2) as 1 | 2,
                available: ![3, 8, 15, 19].includes(index),
              }));
          return { trip, seats };
        }),
        catchError(() => of(null)),
      );
    }

    return this.search(state).pipe(
      map((trips) => {
        const trip = trips.find((trip) => trip.id === id || trip.slug === id);
        if (!trip) return null;
        const count = trip.vehicle.includes('40') ? 40 : trip.vehicle.includes('22') ? 22 : 24;
        return {
          trip,
          seats: Array.from({ length: count }, (_, index) => ({
            id: `seat-${index + 1}`,
            label: `${index < count / 2 ? 'A' : 'B'}${(index % (count / 2)) + 1}`,
            deck: index < count / 2 ? 1 : 2,
            available: ![3, 8, 15, 19].includes(index),
          })),
        };
      }),
    );
  }
  search(state: BusSearchState): Observable<BusTrip[]> {
    const c = state.criteria,
      inbound = state.leg === 'inbound';
    const from = inbound ? c.to : c.from,
      to = inbound ? c.from : c.to,
      date = inbound ? c.returnDate! : c.departureDate;
    const normalize = (value: string) =>
      ['tphcm', 'sai gon', 'tp hcm'].includes(normalizeDestination(value))
        ? 'ho chi minh'
        : normalizeDestination(value);
    const key = [normalize(from), normalize(to)].sort().join('|');
    const supported = ['da lat|ho chi minh', 'ho chi minh|nha trang', 'ha noi|ninh binh'];
    if (!date) return of([]);
    if (!this.http && !supported.includes(key)) return of([]);
    // Fictional schedules/prices only; these are not live operator inventory.
    const fixtures = [
      {
        id: 'minh-tai',
        name: 'Bình Minh Tải',
        hour: 1,
        minute: 0,
        price: 330000,
        type: 'Limousine 24 phòng',
        duration: 390,
      },
      {
        id: 'bon-luyen',
        name: 'Bốn Luyện Express',
        hour: 7,
        minute: 30,
        price: 290000,
        type: 'Giường nằm 40 chỗ',
        duration: 420,
      },
      {
        id: 'trong-minh',
        name: 'Trọng Minh',
        hour: 13,
        minute: 0,
        price: 350000,
        type: 'Limousine 22 phòng',
        duration: 390,
      },
      {
        id: 'minh-tai',
        name: 'Bình Minh Tải',
        hour: 22,
        minute: 30,
        price: 380000,
        type: 'Limousine 24 phòng',
        duration: 390,
      },
    ];
    const localTrips: BusTrip[] = fixtures.map((f, index) => {
      const duration = key === 'ha noi|ninh binh' ? 120 : f.duration;
      const arrival = f.hour * 60 + f.minute + duration;
      const time = (minutes: number) =>
        `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      return {
        id: `demo-${state.leg}-${date}-${index}`,
        operatorId: f.id,
        operatorName: f.name,
        vehicle: f.type,
        from,
        to,
        departureAt: `${date}T${time(f.hour * 60 + f.minute)}:00+07:00`,
        arrivalAt: `${shiftBusDate(date, Math.floor(arrival / 1440))}T${time(arrival)}:00+07:00`,
        durationMinutes: duration,
        pickup: `Điểm đón mẫu tại ${from}`,
        dropoff: `Điểm trả mẫu tại ${to}`,
        price: f.price,
        currency: 'VND',
        amenities: ['Điều hòa', 'Cổng sạc', 'Nước uống'],
      };
    });

    if (!this.http) {
      return of(localTrips);
    }

    const params = new HttpParams().set('from', from).set('to', to).set('date', date);
    const remote$ = this.http
      .get<{ success: boolean; items?: Record<string, unknown>[] }>(`${this.apiBase}/bus-trips`, {
        params,
      })
      .pipe(
        map((res) => {
          const items = res?.items || [];
          if (!items.length) return supported.includes(key) ? localTrips : [];
          const mapped: BusTrip[] = items.map((raw, index) => {
            const hour = Number(raw['hour'] ?? 7);
            const minute = Number(raw['minute'] ?? 30);
            const duration = Number(raw['durationMinutes'] || raw['duration'] || 390);
            const arrival = hour * 60 + minute + duration;
            const time = (minutes: number) =>
              `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
            return {
              id: String(raw['id'] || raw['_id'] || `demo-${state.leg}-${date}-${index}`),
              slug: raw['slug'] ? String(raw['slug']) : undefined,
              operatorId: String(raw['operatorId'] || 'minh-tai'),
              operatorName: String(raw['operatorName'] || raw['operator'] || 'Bình Minh Tải'),
              vehicle: String(raw['vehicle'] || raw['classType'] || raw['type'] || 'Limousine 24 phòng'),
              from: String(raw['from'] || raw['origin'] || from),
              to: String(raw['to'] || raw['destination'] || to),
              departureAt: `${date}T${time(hour * 60 + minute)}:00+07:00`,
              arrivalAt: `${shiftBusDate(date, Math.floor(arrival / 1440))}T${time(arrival)}:00+07:00`,
              durationMinutes: duration,
              pickup: String(raw['pickup'] || `Điểm đón tại ${raw['from'] || from}`),
              dropoff: String(raw['dropoff'] || `Điểm trả tại ${raw['to'] || to}`),
              price: Number(raw['price'] || 330000),
              currency: 'VND',
              amenities: Array.isArray(raw['amenities'])
                ? (raw['amenities'] as string[])
                : ['Điều hòa', 'Cổng sạc', 'Nước uống'],
            };
          });
          return mapped.length > 0 ? mapped : supported.includes(key) ? localTrips : [];
        }),
        catchError(() => EMPTY),
      );

    return concat(of(supported.includes(key) ? localTrips : []), remote$);
  }
}
