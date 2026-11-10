import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { BusSearchState, BusFilters, busTimeBands, shiftBusDate } from '../models/bus-search.model';
import { BusTrip, BusDetails } from '../models/bus.model';
import { normalizeDestination } from '../../models/vietnam-destinations';
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
  details(id: string, state: BusSearchState): Observable<BusDetails | null> {
    return this.search(state).pipe(
      map((trips) => {
        const trip = trips.find((trip) => trip.id === id);
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
    if (!date || !supported.includes(key)) return of([]);
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
    return of(
      fixtures.map((f, index) => {
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
      }),
    );
  }
}
