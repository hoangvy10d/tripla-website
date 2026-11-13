export type DrawerKey = 'resort' | 'dining' | 'yacht';
export type DrawerViewState = 'details' | 'checkout' | 'success';
export type CommunityTab = 'trending' | 'latest' | 'saved' | 'live';
export type NavItem = 'nav-home' | 'nav-for-you' | 'nav-community' | 'nav-tripshop' | 'nav-saved';

export interface PointData {
  hotel_id?: string | null;
  room_id?: string | null;
  location_id?: string | null;
  venueId?: string;
  key?: DrawerKey;
  tag?: string;
  title: string;
  location: string;
  price: string;
  roomPrice?: number;
  roomName?: string;
  unit?: string;
  rating?: string;
  reviews?: string;
  desc?: string;
  img: string;
  image?: string;
  features?: Array<{ icon: string; label: string }>;
}

export interface HubVideo {
  _id?: string;
  id?: string;
  user_id?: string;
  title: string;
  desc: string;
  location: string;
  creator: string;
  creatorTitle?: string;
  creatorAvatar: string;
  musicName?: string;
  media: string;
  videoUrl?: string;
  drawerKey: DrawerKey;
  likes?: string;
  likeCount?: number;
  views?: string;
  commentsCount?: number;
  bookmarks?: string;
  location_tags?: any[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  category?: 'for-you' | 'trending' | 'latest';
  hotspots?: Record<DrawerKey, PointData>;
}

export interface CommentItem {
  _id?: string;
  reelId?: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  badgeRing?: string;
}

export interface LiveStreamCard {
  _id?: string;
  id?: string;
  hostName: string;
  hostAvatar: string;
  location: string;
  title: string;
  viewerCount: string;
  coverImage: string;
}
