import { PlanningScheduleEntry } from './planning-place.model';
import { validDate } from '../../hotel-search/models/hotel-search-criteria.model';
export interface TripItinerary {
  version: 1;
  revision: number;
  dayCount: number;
  startDate: string | null;
  entries: PlanningScheduleEntry[];
  note: string;
  updatedAt: string | null;
}
export function emptyItinerary(): TripItinerary {
  return {
    version: 1,
    revision: 0,
    dayCount: 1,
    startDate: null,
    entries: [],
    note: '',
    updatedAt: null,
  };
}
export function itineraryProblem(value: unknown, tripId: string): string {
  if (!value || typeof value !== 'object') return 'Dữ liệu lịch trình không hợp lệ.';
  const plan = value as TripItinerary;
  if (
    plan.version !== 1 ||
    !Number.isInteger(plan.revision) ||
    plan.revision < 0 ||
    !Number.isInteger(plan.dayCount) ||
    plan.dayCount < 1 ||
    plan.dayCount > 30 ||
    (plan.startDate !== null && !validDate(plan.startDate)) ||
    typeof plan.note !== 'string' ||
    plan.note.length > 2000 ||
    !Array.isArray(plan.entries) ||
    (plan.updatedAt !== null && !Number.isFinite(Date.parse(plan.updatedAt)))
  )
    return 'Dữ liệu ngày hoặc ghi chú của lịch trình không hợp lệ.';
  const ids = new Set<string>();
  for (const entry of plan.entries) {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      !entry.id ||
      ids.has(entry.id) ||
      entry.tripId !== tripId ||
      typeof entry.placeKey !== 'string' ||
      !entry.placeKey ||
      !Number.isInteger(entry.day) ||
      entry.day < 1 ||
      entry.day > plan.dayCount ||
      !Number.isInteger(entry.startMinute) ||
      entry.startMinute < 0 ||
      !Number.isInteger(entry.durationMinutes) ||
      entry.durationMinutes < 15 ||
      entry.startMinute + entry.durationMinutes > 1440 ||
      typeof entry.note !== 'string' ||
      entry.note.length > 2000 ||
      typeof entry.title !== 'string' ||
      entry.title.length > 150
    )
      return 'Hoạt động có ngày, giờ, thời lượng hoặc ghi chú không hợp lệ.';
    ids.add(entry.id);
  }
  const ordered = [...plan.entries].sort((a, b) => a.day - b.day || a.startMinute - b.startMinute);
  if (
    ordered.some(
      (entry, i) =>
        i > 0 &&
        entry.day === ordered[i - 1].day &&
        entry.startMinute < ordered[i - 1].startMinute + ordered[i - 1].durationMinutes,
    )
  )
    return 'Các hoạt động bị chồng lấn thời gian. Hãy chọn khung giờ khác.';
  return '';
}
