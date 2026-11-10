import { Injectable, computed, inject, signal } from '@angular/core';
import { SavedTrips } from '../../services/saved-trips';
import { TripItinerary, emptyItinerary, itineraryProblem } from '../models/itinerary.model';
import { PlanningScheduleEntry } from '../models/planning-place.model';
interface Draft {
  value: TripItinerary;
  baseRevision: number;
  dirty: boolean;
  error: string;
}
@Injectable({ providedIn: 'root' })
export class ItineraryStateService {
  private readonly saved = inject(SavedTrips);
  private readonly drafts = signal<Record<string, Draft>>({});
  readonly anyDirty = computed(() => Object.values(this.drafts()).some((draft) => draft.dirty));
  read(id: string): Draft {
    const local = this.drafts()[id],
      stored = this.saved.trips().find((trip) => trip.id === id)?.itinerary;
    if (local && (local.dirty || local.baseRevision === (stored?.revision ?? 0))) return local;
    const error = stored ? itineraryProblem(stored, id) : '';
    return {
      value: stored && !error ? structuredClone(stored) : emptyItinerary(),
      baseRevision: stored?.revision ?? 0,
      dirty: false,
      error,
    };
  }
  private commit(id: string, value: TripItinerary): boolean {
    if (!this.saved.trips().some(trip => trip.id === id)) return false;
    const current = this.read(id),
      stored = this.saved.trips().find((trip) => trip.id === id)?.itinerary;
    if (stored && itineraryProblem(stored, id)) return false;
    const error = itineraryProblem(value, id);
    this.drafts.update((drafts) => ({
      ...drafts,
      [id]: error
        ? { ...current, error }
        : {
            value: {
              ...value,
              entries: [...value.entries].sort(
                (a, b) => a.day - b.day || a.startMinute - b.startMinute,
              ),
            },
            baseRevision: current.baseRevision,
            dirty: true,
            error: '',
          },
    }));
    return !error;
  }
  patch(
    id: string,
    patch: Partial<Pick<TripItinerary, 'note' | 'dayCount' | 'startDate'>>,
  ): boolean {
    return this.commit(id, { ...this.read(id).value, ...patch });
  }
  add(
    id: string,
    placeKey: string,
    day: number,
    startMinute: number,
    durationMinutes = 60,
  ): PlanningScheduleEntry | null {
    const trip = this.saved.trips().find((trip) => trip.id === id);
    if (!trip?.places.some((key) => key === placeKey)) return null;
    const entry: PlanningScheduleEntry = {
      id: crypto.randomUUID(),
      tripId: id,
      placeKey,
      day,
      startMinute,
      durationMinutes,
      title: '',
      note: '',
    };
    return this.commit(id, {
      ...this.read(id).value,
      entries: [...this.read(id).value.entries, entry],
    })
      ? entry
      : null;
  }
  edit(
    id: string,
    entryId: string,
    patch: Partial<
      Pick<PlanningScheduleEntry, 'day' | 'startMinute' | 'durationMinutes' | 'title' | 'note'>
    >,
  ): boolean {
    const plan = this.read(id).value;
    if (!plan.entries.some((entry) => entry.id === entryId)) return false;
    return this.commit(id, {
      ...plan,
      entries: plan.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    });
  }
  remove(id: string, entryId: string): boolean {
    const plan = this.read(id).value;
    if (!plan.entries.some((entry) => entry.id === entryId)) return false;
    return this.commit(id, {
      ...plan,
      entries: plan.entries.filter((entry) => entry.id !== entryId),
    });
  }
  removeDay(id: string, day: number): boolean {
    const plan = this.read(id).value;
    if (plan.dayCount <= 1) return false;
    return this.commit(id, {
      ...plan,
      dayCount: plan.dayCount - 1,
      entries: plan.entries
        .filter((entry) => entry.day !== day)
        .map((entry) => ({ ...entry, day: entry.day > day ? entry.day - 1 : entry.day })),
    });
  }
  clear(id: string): boolean {
    return this.commit(id, { ...this.read(id).value, entries: [] });
  }
  save(id: string): boolean {
    const draft = this.read(id);
    if (itineraryProblem(draft.value, id)) return false;
    if (!this.saved.saveItinerary(id, draft.value, draft.baseRevision)) {
      this.drafts.update((drafts) => ({
        ...drafts,
        [id]: { ...draft, error: this.saved.error() },
      }));
      return false;
    }
    const value = this.saved.trips().find((trip) => trip.id === id)!.itinerary!;
    this.drafts.update((drafts) => ({
      ...drafts,
      [id]: {
        value: structuredClone(value),
        baseRevision: value.revision,
        dirty: false,
        error: '',
      },
    }));
    return true;
  }
  reload(id: string): void {
    this.saved.refresh();
    this.drafts.update((drafts) => {
      const next = { ...drafts };
      delete next[id];
      return next;
    });
  }
}
