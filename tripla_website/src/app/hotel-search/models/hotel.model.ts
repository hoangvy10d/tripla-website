export interface Hotel {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  pricePerNight?: number;
  currency?: string;
  detailsUrl?: string;
  amenities?: string[];
  freeCancellation?: boolean;
  description?: string;
  images?: string[];
  policies?: string[];
  rooms?: HotelRoom[];
}

export interface HotelRoom {
  id: string;
  name: string;
  size: number;
  bed: string;
  guests: number;
  pricePerNight: number;
  breakfast: boolean;
}
