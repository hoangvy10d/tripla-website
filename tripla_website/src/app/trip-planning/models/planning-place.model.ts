// Read-only projections of existing saved IDs. This is not a second trip schema.
export interface PlanningPlace {
  key: string;
  title: string;
  location?: string;
  imageUrl?: string;
  priceLabel?: string;
  kind: 'tripshort' | 'hotel' | 'activity' | 'unavailable';
  description?: string;
  detailsPath?: string;
  detailsQuery?: Record<string, string>;
  coordinates?: { latitude: number; longitude: number };
}
export interface PlanningScheduleEntry {
  id: string;
  tripId: string;
  placeKey: string;
  day: number;
  startMinute: number;
  durationMinutes: number;
  title: string;
  note: string;
}
export interface PlanningViewState {
  dayCount: number;
  activeDay: number;
  selectedPlaceKey: string | null;
  selectedEntryId?: string | null;
  note: string;
}
