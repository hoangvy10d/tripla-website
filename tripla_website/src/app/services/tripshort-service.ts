import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { 
  PointData, 
  HubVideo, 
  CommentItem, 
  LiveStreamCard, 
  DrawerKey, 
  DrawerViewState, 
  CommunityTab, 
  NavItem 
} from '../models/trip-shorts.models';
import { 
  POINT_DATA_MOCK, 
  HUB_VIDEOS_MOCK, 
  COMMENTS_MOCK, 
  LIVE_CARDS_MOCK 
} from '../mock/trip-short.mock';

@Injectable({
  providedIn: 'root'
})
export class TripshortService {
  // 1. DATA SIGNALS (Sau này chỉ cần thay HTTP client call vào đây)
  readonly pointDataMap = signal<Record<DrawerKey, PointData>>(POINT_DATA_MOCK);
  readonly hubVideos = signal<HubVideo[]>(HUB_VIDEOS_MOCK);
  readonly comments = signal<CommentItem[]>(COMMENTS_MOCK);
  readonly liveCards = signal<LiveStreamCard[]>(LIVE_CARDS_MOCK);

  // 2. STATE SIGNALS GIAO DIỆN
  isSidebarCollapsed = signal<boolean>(false);
  activeNav = signal<NavItem>('nav-for-you');
  isCommunityHubVisible = signal<boolean>(false);
  activeCommunityTab = signal<CommunityTab>('trending');

  // Video State
  currentVideoIndex = signal<number>(0);
  isTagsVisible = signal<boolean>(false);
  isPlayOverlayVisible = signal<boolean>(false);
  isLiked = signal<boolean>(false);
  isBookmarked = signal<boolean>(false);
  isAudioOn = signal<boolean>(true);

  // Drawer State
  isDrawerOpen = signal<boolean>(false);
  selectedDrawerKey = signal<DrawerKey>('resort');
  drawerView = signal<DrawerViewState>('details');
  isCommentDrawerOpen = signal<boolean>(false);
  isShareModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  copyLabelText = signal<string>('Sao Chép');

  // 3. COMPUTED SIGNALS
  currentVideo = computed(() => this.hubVideos()[this.currentVideoIndex()]);
  activeDrawerData = computed(() => this.pointDataMap()[this.selectedDrawerKey()]);
  likeCountText = computed(() => this.isLiked() ? '128.5K' : '128.4K');
  bookmarkCountText = computed(() => this.isBookmarked() ? '39.0K' : '38.9K');

  // --- SAU NÀY KẾT NỐI DATABASE / API BẠN CHỈ CẦN THÊM CÁC HÀM NÀY ---
  // fetchVideosFromApi(): void {
  //   this.http.get<HubVideo[]>('/api/videos').subscribe(data => this.hubVideos.set(data));
  // }

  // THÊM CÁC HÀM XỬ LÝ CHUYỂN VIDEO:
  nextVideo(): void {
    if (this.currentVideoIndex() < this.hubVideos().length - 1) {
      this.currentVideoIndex.update(idx => idx + 1);
    } else {
      this.currentVideoIndex.set(0); // Quay lại video đầu tiên khi lướt hết
    }
  }

  prevVideo(): void {
    if (this.currentVideoIndex() > 0) {
      this.currentVideoIndex.update(idx => idx - 1);
    } else {
      this.currentVideoIndex.set(this.hubVideos().length - 1); // Lên video cuối
    }
  }
}