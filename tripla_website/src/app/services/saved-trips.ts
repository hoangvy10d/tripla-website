import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DrawerKey } from '../models/trip-shorts.models';
import { TripItinerary,itineraryProblem } from '../trip-planning/models/itinerary.model';

export type SavedPlaceKey = DrawerKey | `hotel:${string}` | `activity:${string}`;
export interface SavedTrip {
  id: string;
  name: string;
  createdAt: string;
  places: SavedPlaceKey[];
  itinerary?:TripItinerary;
}

@Injectable({ providedIn: 'root' })
export class SavedTrips {
  private readonly storageKey = 'tripla.savedTrips';
  private readonly state = signal<SavedTrip[]>([]);
  readonly trips = this.state.asReadonly();
  readonly error = signal('');
  readonly readError = signal('');

  constructor() {
    this.refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === this.storageKey || event.key === null) this.refresh();
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  refresh(): boolean {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(this.storageKey) || '[]');
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
    return this.persist([...this.trips(), {
      id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), places: [],
    }]);
  }

  toggle(id: string, key: SavedPlaceKey): boolean {
    if (!this.refresh() || !this.trips().some(trip => trip.id === id)) return false;
    return this.persist(this.trips().map(trip => trip.id !== id ? trip : {
      ...trip, places: trip.places.includes(key)
        ? trip.places.filter(place => place !== key) : [...trip.places, key],
    }));
  }

  private persist(trips: SavedTrip[]): boolean {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(trips));
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
    return this.persist(this.trips().map(trip=>trip.id===id?{...trip,itinerary}:trip));
  }
}
