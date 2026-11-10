import { ParamMap, Params } from '@angular/router';
export const activityCategories = [
  'Công viên giải trí',
  'Công viên nước',
  'Sở thú & thủy cung',
  'Công viên & vườn',
  'Vé tham quan',
  'Bảo tàng & Phòng trưng bày',
  'Điểm mốc',
  'Sự kiện & Buổi diễn',
  'Các điểm tham quan khác',
  'Trò chơi & giải trí',
  'Food & Dining',
] as const;
export type ActivityCategory = (typeof activityCategories)[number];
export interface ActivitySearchCriteria {
  location: string;
  query: string;
  categories: ActivityCategory[];
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevant' | 'price-asc' | 'price-desc';
}
export function readActivitySearch(params: ParamMap): ActivitySearchCriteria {
  const price = (key: string) => {
    const raw = params.get(key);
    const value = raw !== null && String(raw).trim() ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  };
  const minPrice = price('minPrice');
  const maxPrice = price('maxPrice');
  const sort = params.get('sort');
  return {
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined && (minPrice === undefined || maxPrice >= minPrice)
      ? { maxPrice }
      : {}),
    ...(sort === 'price-asc' || sort === 'price-desc' ? { sort } : {}),
    location: (params.get('location') || '').trim(),
    query: (params.get('query') || '').trim(),
    categories: [
      ...new Set(params.getAll('categories').flatMap((value) => value.split('|'))),
    ].filter((value): value is ActivityCategory =>
      activityCategories.includes(value as ActivityCategory),
    ),
  };
}
export function activitySearchParams(criteria: ActivitySearchCriteria): Params {
  return {
    location: criteria.location.trim(),
    query: criteria.query.trim() || null,
    categories: criteria.categories.length ? criteria.categories.join('|') : null,
    minPrice: criteria.minPrice ?? null,
    maxPrice: criteria.maxPrice ?? null,
    sort: criteria.sort && criteria.sort !== 'relevant' ? criteria.sort : null,
  };
}
