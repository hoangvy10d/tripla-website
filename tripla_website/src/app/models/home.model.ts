export interface TripCard {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  price: number;
  rating: number;
  reviewCount: number | string;
  image: string;
  tagText: string;
  isSelected?: boolean; // Thuộc tính tạm thời của UI
}

export interface StatPill {
  id: string;
  icon: string;
  value: string;
  label: string;
  isActive?: boolean;
}