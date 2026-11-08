export interface NavItem {
  id: string;
  label: string;
  path: string;
  isActive?: boolean;
}

export interface ValueProposition {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  accentColor: string;
}

export interface FlashDeal {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  remainingRooms: number;
  soldPercent: number;
  rating: number;
  ratingText: string;
  reviewCount: number;
  badge?: string;
  tag?: string;
}

export interface Destination {
  id: string;
  name: string;
  subtitle: string;
  startingPrice: number;
  imageUrl: string;
  badge: string;
  isLargeHero?: boolean;
}

export interface LuxuryStay {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  rating: number;
  ratingText: string;
  reviewCount: number;
  description: string;
  category: string; // 'resort' | 'villa' | 'city' | 'eco'
  roomType: string;
  originalPrice: number;
  discountPrice: number;
  perks: string[];
  specialOffer: string;
  videoCount: number;
  isBestSeller?: boolean;
  isTopLuxury?: boolean;
}