import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DrawerKey } from '../models/trip-shorts.models';
import { TripItinerary, itineraryProblem } from '../trip-planning/models/itinerary.model';
import { injectLiveHttp } from './live-http';

export type SavedPlaceKey =
  | DrawerKey
  | `hotel:${string}`
  | `activity:${string}`
  | `location:${string}`
  | `bus:${string}`
  | `flight:${string}`
  | `booked_${string}`;
export interface SavedTrip {
  id: string;
  name: string;
  createdAt: string;
  places: SavedPlaceKey[];
  itinerary?: TripItinerary;
}

@Injectable({ providedIn: 'root' })
export class SavedTrips {
  private readonly storageKey = 'tripla.savedTrips';
  private readonly http = injectLiveHttp();
  private readonly apiBase = 'http://localhost:3000/api/v1';
  private readonly state = signal<SavedTrip[]>([]);
  readonly trips = this.state.asReadonly();
  readonly error = signal('');
  readonly readError = signal('');

  private get storage(): Storage | null {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? window.localStorage
      : null;
  }

  constructor() {
    this.refresh();
    const storage = this.storage;
    if (this.http && (!storage || storage.getItem(this.storageKey) === null)) {
      this.http
        .get<{ success: boolean; items?: SavedTrip[] }>(`${this.apiBase}/saved-trips`)
        .subscribe({
          next: (res) => {
            const currentStorage = this.storage;
            if (
              res?.items &&
              res.items.length > 0 &&
              (!currentStorage || currentStorage.getItem(this.storageKey) === null)
            ) {
              this.persist(res.items);
            }
          },
          error: () => {
            // Giữ trạng thái localStorage nếu backend chưa chạy
          },
        });
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const onStorage = (event: StorageEvent) => {
        if (event.key === this.storageKey || event.key === null) this.refresh();
      };
      window.addEventListener('storage', onStorage);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
    }
  }

  refresh(): boolean {
    try {
      const storage = this.storage;
      if (!storage) {
        this.state.set([]);
        this.readError.set('');
        this.error.set('');
        return true;
      }
      const value: unknown = JSON.parse(storage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(value) || !value.every(trip => trip && typeof trip.id === 'string'
        && typeof trip.name === 'string' && typeof trip.createdAt === 'string'
        && Array.isArray(trip.places) && trip.places.every((place: unknown) => typeof place === 'string'))) {
        throw new Error('Invalid trip data');
      }
      this.state.set(value);
      this.readError.set('');
      this.error.set('');
      return true;
    } catch {
      this.readError.set('Không thể đọc chuyến đi trên trình duyệt. Vui lòng thử lại.');
      this.error.set('Không thể đọc chuyến đi trên trình duyệt. Vui lòng thử lại.');
      return false;
    }
  }

  create(name: string): boolean {
    name = name.trim();
    if (!name || name.length > 100 || !this.refresh()) return false;
    const newTrip: SavedTrip = {
      id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), places: [],
    };
    const ok = this.persist([...this.trips(), newTrip]);
    if (ok && this.http) {
      this.http.post(`${this.apiBase}/saved-trips`, newTrip).subscribe({ error: () => {} });
    }
    return ok;
  }

  delete(id: string): boolean {
    if (!this.refresh()) return false;
    const nextTrips = this.trips().filter((trip) => trip.id !== id);
    const ok = this.persist(nextTrips);
    if (ok && this.http) {
      this.http.delete(`${this.apiBase}/saved-trips/${id}`).subscribe({ error: () => {} });
    }
    return ok;
  }

  toggle(id: string, key: SavedPlaceKey): boolean {
    if (!this.refresh() || !this.trips().some(trip => trip.id === id)) return false;
    const nextTrips = this.trips().map(trip => trip.id !== id ? trip : {
      ...trip, places: trip.places.includes(key)
        ? trip.places.filter(place => place !== key) : [...trip.places, key],
    });
    const ok = this.persist(nextTrips);
    const updated = nextTrips.find(trip => trip.id === id);
    if (ok && updated && this.http) {
      this.http.put(`${this.apiBase}/saved-trips/${id}`, updated).subscribe({ error: () => {} });
    }
    return ok;
  }

  private persist(trips: SavedTrip[]): boolean {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(trips));
      this.state.set(trips);
      this.error.set('');
      return true;
    } catch {
      this.error.set('Không thể lưu chuyến đi trên trình duyệt. Vui lòng thử lại.');
      return false;
    }
  }
  saveItinerary(id:string,plan:TripItinerary,expectedRevision:number):boolean {
    if(!this.refresh())return false;
    const trip=this.trips().find(trip=>trip.id===id);
    if(!trip){this.error.set('Chuyến đi không còn tồn tại.');return false;}
    if(trip.itinerary&&itineraryProblem(trip.itinerary,id)){this.error.set('Lịch trình đã lưu bị lỗi. Không tự ghi đè dữ liệu cũ.');return false;}
    if((trip.itinerary?.revision??0)!==expectedRevision){this.error.set('Lịch trình đã thay đổi ở tab khác. Hãy tải lại bản đã lưu trước khi tiếp tục.');return false;}
    const problem=itineraryProblem(plan,id);if(problem){this.error.set(problem);return false;}
    const itinerary:TripItinerary={...structuredClone(plan),revision:expectedRevision+1,updatedAt:new Date().toISOString()};
    const nextTrips = this.trips().map(trip=>trip.id===id?{...trip,itinerary}:trip);
    const ok = this.persist(nextTrips);
    const updated = nextTrips.find(trip=>trip.id===id);
    if (ok && updated && this.http) {
      this.http.put(`${this.apiBase}/saved-trips/${id}`, updated).subscribe({ error: () => {} });
    }
    return ok;
  }

  upsertCloudTrip(cloudTrip: SavedTrip): boolean {
    if (!this.refresh()) return false;
    const exists = this.trips().some((trip) => trip.id === cloudTrip.id);
    const nextTrips = exists
      ? this.trips().map((trip) => (trip.id === cloudTrip.id ? cloudTrip : trip))
      : [cloudTrip, ...this.trips()];
    return this.persist(nextTrips);
  }
}
