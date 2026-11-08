export type DrawerKey = 'resort' | 'dining' | 'yacht';
export type DrawerViewState = 'details' | 'checkout' | 'success';
export type CommunityTab = 'trending' | 'latest' | 'saved' | 'live';
export type NavItem = 'nav-home' | 'nav-for-you' | 'nav-community' | 'nav-tripshop' | 'nav-saved';

export interface PointData {
  title: string;
  location: string;
  price: string;
  img: string;
}

export interface HubVideo {
  title: string;
  desc: string;
  location: string;
  creator: string;
  creatorAvatar: string;
  media: string;
  drawerKey: DrawerKey;
}

export interface CommentItem {
  author: string;
  avatar: string;
  time: string;
  content: string;
  badgeRing?: string;
}

export interface LiveStreamCard {
  hostName: string;
  hostAvatar: string;
  location: string;
  title: string;
  viewerCount: string;
  coverImage: string;
}