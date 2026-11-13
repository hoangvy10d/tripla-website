export interface Hotel {
  _id?: string;
  id: string;
  hotel_slug?: string;
  name: string;
  hotel_name?: string;
  address: string;
  imageUrl?: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  pricePerNight?: number;
  lowestPrice?: number;
  stock?: number;
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
  _id?: string;
  id: string;
  name: string;
  room_name?: string;
  size: number;
  bed: string;
  guests: number;
  pricePerNight: number;
  room_price?: number;
  breakfast: boolean;
  total_units?: number;
  stock?: number;
  room_images?: string[];
  rateId?: string;
}
