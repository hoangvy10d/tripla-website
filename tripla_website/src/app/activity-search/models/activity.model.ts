import { ActivityCategory } from './activity-search.model';
export interface Activity {
  id: string;
  name: string;
  city: string;
  categories: ActivityCategory[];
  description: string;
  imageUrl: string;
  priceFrom?: number;
  currency?: string;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
}

export interface ActivityTicket {
  requiresParticipants?: boolean;
  id: string;
  name: string;
  group: string;
  description: string;
  price: number;
  currency: string;
  includes: string[];
  conditions: string[];
}
export interface ActivityDetails extends Activity {
  images: string[];
  highlights: string[];
  experiences: { title: string; imageUrl: string }[];
  reviews: { id: string; author: string; rating: number; text: string }[];
  openingHours?: string;
  contact?: string;
  amenities: string[];
  tickets: ActivityTicket[];
}
