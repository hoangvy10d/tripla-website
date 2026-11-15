import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { AuthService } from './auth-service';
import { injectLiveHttp } from './live-http';
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
export class TripShortService {
  private readonly http = injectLiveHttp();
  private readonly authService = inject(AuthService);
  readonly apiBaseUrl = '/api/v1';

  // 1. DATA SIGNALS (Tự động đồng bộ từ MongoDB REST API `Contents`, `Hotels`, `Rooms`, `Locations`)
  private readonly basePointDataMap = signal<Record<DrawerKey, PointData>>(POINT_DATA_MOCK);
  readonly hubVideos = signal<HubVideo[]>(HUB_VIDEOS_MOCK);
  readonly comments = signal<CommentItem[]>(COMMENTS_MOCK);
  readonly liveCards = signal<LiveStreamCard[]>(LIVE_CARDS_MOCK);
  readonly activeHotelRooms = signal<any[]>([]);
  readonly lastBookingCode = signal<string>('');
  readonly lastBookingTotalPrice = signal<number>(0);

  // Pagination & Loading Signals cho Infinite Scroll Feed (page/limit Q11)
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(1);
  readonly nextCursor = signal<string | null>(null);
  readonly hasMoreReels = signal<boolean>(true);
  readonly isLoadingFeed = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Visual search
  readonly scannedLocationResult = signal<any | null>(null);

  applyVisualSearchResult(result: any): void {
    this.scannedLocationResult.set(result);
  }

  clearScannedLocationResult(): void {
    this.scannedLocationResult.set(null);
  }

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
  currentVideo = computed(() => {
    const list = this.hubVideos();
    return list[this.currentVideoIndex()] || list[0] || HUB_VIDEOS_MOCK[0];
  });

  // Tự động cập nhật 3 Hotspot (resort, dining, yacht) theo đúng Video Reel (`Contents`) đang phát từ MongoDB
  readonly pointDataMap = computed<Record<DrawerKey, PointData>>(() => {
    const activeReel = this.currentVideo();
    if (activeReel?.hotspots) {
      return activeReel.hotspots;
    }
    return this.basePointDataMap();
  });

  activeDrawerData = computed(() => this.pointDataMap()[this.selectedDrawerKey()]);

  likeCountText = computed(() => {
    const video = this.currentVideo();
    if (video?.likes !== undefined && video.likes !== '') return video.likes;
    return String(this.isLiked() ? 1 : 0);
  });

  bookmarkCountText = computed(() => {
    const video = this.currentVideo();
    if (video?.bookmarks !== undefined && video.bookmarks !== '') return video.bookmarks;
    return String(this.isBookmarked() ? 1 : 0);
  });

  commentCountText = computed(() => {
    const video = this.currentVideo();
    if (typeof video?.commentsCount === 'number') {
      return video.commentsCount.toLocaleString('vi-VN');
    }
    return String(this.comments().length);
  });

  constructor() {
    this.fetchFeed('for-you', true);
    this.fetchLiveStreams();
  }

  // ===========================================================================
  // RAW OBSERVABLE API METHODS (Chuẩn ERD RESTful APIs trên Port 3000)
  // ===========================================================================

  getReelsFeed(tab = 'for-you', limit = 6, page = 1): Observable<any> {
    if (!this.http) return of({ items: HUB_VIDEOS_MOCK, nextCursor: null, hasMore: false, page: 1 });
    const params = new HttpParams()
      .set('tab', tab)
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<any>(`${this.apiBaseUrl}/contents`, {
      params,
      headers: this.authService.getAuthHeaders()
    });
  }

  likeContent(contentId: string, isLiked?: boolean, userId?: string): Observable<any> {
    if (!this.http) return of({ success: true, contentId, isLiked });
    const uid = userId || this.authService.currentUser()?.id;
    return this.http.post<any>(
      `${this.apiBaseUrl}/contents/${contentId}/like`,
      { isLiked, ...(uid ? { userId: uid } : {}) },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  likeReel(reelId: string, isLiked?: boolean, userId?: string): Observable<any> {
    return this.likeContent(reelId, isLiked, userId);
  }

  getComments(reelId: string, limit = 20): Observable<any> {
    if (!this.http) return of({ items: COMMENTS_MOCK });
    return this.http.get<any>(`${this.apiBaseUrl}/contents/${reelId}/comments?limit=${limit}`);
  }

  postComment(reelId: string, text: string, user?: string, avatar?: string): Observable<any> {
    if (!this.http) return of({ success: true });
    const curUser = this.authService.currentUser();
    return this.http.post<any>(
      `${this.apiBaseUrl}/contents/${reelId}/comments`,
      {
        user: user || curUser?.fullName || 'Du khách TRIPLA',
        avatar: avatar || curUser?.avatar,
        text
      },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getHotels(paramsObj?: Record<string, string>): Observable<any> {
    if (!this.http) return of({ items: [] });
    let params = new HttpParams();
    if (paramsObj) {
      Object.entries(paramsObj).forEach(([k, v]) => {
        if (v) params = params.set(k, v);
      });
    }
    return this.http.get<any>(`${this.apiBaseUrl}/hotels`, { params });
  }

  getRooms(hotelId?: string): Observable<any> {
    if (!this.http) return of({ items: [] });
    const url = hotelId
      ? `${this.apiBaseUrl}/rooms?hotel_id=${encodeURIComponent(hotelId)}`
      : `${this.apiBaseUrl}/rooms`;
    return this.http.get<any>(url);
  }

  getLocations(category?: string): Observable<any> {
    if (!this.http) return of({ items: [] });
    const url = category
      ? `${this.apiBaseUrl}/locations?category=${encodeURIComponent(category)}`
      : `${this.apiBaseUrl}/locations`;
    return this.http.get<any>(url);
  }

  getVenues(section?: 'flash-deals' | 'destinations' | 'luxury-stays'): Observable<any> {
    if (!this.http) return of({ items: [], tripShopCatalog: {} });
    const url = section ? `${this.apiBaseUrl}/venues?section=${section}` : `${this.apiBaseUrl}/venues`;
    return this.http.get<any>(url);
  }

  createBooking(payload: Record<string, unknown>): Observable<any> {
    if (!this.http) return of({ success: true });
    return this.http.post<any>(`${this.apiBaseUrl}/bookings`, payload, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getMyTripPlans(): Observable<any> {
    if (!this.http || !this.authService.isLoggedIn()) return of({ success: true, items: [] });
    return this.http.get<any>(`${this.apiBaseUrl}/trip-plans`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  createTripPlan(payload: {
    plan_name: string;
    start_date: string;
    end_date: string;
  }): Observable<any> {
    if (!this.http) return of({ success: false, message: 'Chưa bật API máy chủ.' });
    return this.http.post<any>(`${this.apiBaseUrl}/trip-plans`, payload, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getPlanWishlist(planId: string): Observable<any> {
    if (!this.http || !planId) return of({ success: true, items: [] });
    return this.http.get<any>(`${this.apiBaseUrl}/trip-plans/${planId}/wishlist`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  saveToWishlist(payload: {
    plan_id: string;
    location_id: string;
    hotel_id?: string | null;
  }): Observable<any> {
    if (!this.http) return of({ success: true });
    return this.http.post<any>(`${this.apiBaseUrl}/wishlist`, payload, {
      headers: this.authService.getAuthHeaders()
    });
  }

  submitReport(payload: {
    content_id: string;
    reason: string;
    details?: string;
  }): Observable<any> {
    if (!this.http) return of({ success: true });
    return this.http.post<any>(`${this.apiBaseUrl}/reports`, payload, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // ===========================================================================
  // REACTIVE SIGNAL FLOWS (Tích hợp trực tiếp cho Tripshort & TripShop)
  // ===========================================================================

  private extractObjectIdString(refOrId: any): string | null {
    if (!refOrId) return null;
    if (typeof refOrId === 'string') return refOrId;
    if (typeof refOrId === 'object' && refOrId._id) return String(refOrId._id);
    return null;
  }

  private normalizePointData(raw: any, fallbackKey: DrawerKey): PointData {
    const fallback = POINT_DATA_MOCK[fallbackKey];
    if (!raw) return fallback;

    const hotelId = this.extractObjectIdString(raw.hotel_id);
    const roomId = this.extractObjectIdString(raw.room_id);
    const locationId = this.extractObjectIdString(raw.location_id);

    const populatedHotel =
      raw.hotel_id && typeof raw.hotel_id === 'object' ? raw.hotel_id : null;
    const populatedRoom =
      raw.room_id && typeof raw.room_id === 'object' ? raw.room_id : null;
    const populatedLoc =
      raw.location_id && typeof raw.location_id === 'object' ? raw.location_id : null;

    const roomPrice = Number(
      raw.roomPrice ||
        populatedRoom?.room_price ||
        populatedHotel?.price_per_night ||
        populatedLoc?.entry_fee ||
        15000000
    );

    return {
      hotel_id: hotelId,
      room_id: roomId,
      location_id: locationId,
      venueId: hotelId || locationId || raw.venueId || raw._id,
      key: fallbackKey,
      tag: raw.tag || populatedLoc?.tag || 'Xác thực TRIPLA',
      title:
        raw.title ||
        populatedHotel?.hotel_name ||
        populatedLoc?.name ||
        raw.name ||
        fallback.title,
      location:
        raw.location ||
        populatedHotel?.address ||
        populatedLoc?.address ||
        fallback.location,
      price: raw.price || `${roomPrice.toLocaleString('vi-VN')}₫`,
      roomPrice,
      roomName: raw.roomName || populatedRoom?.room_name || 'Ocean Pool Pavilion',
      unit: raw.unit || (fallbackKey === 'resort' ? '/ đêm' : '/ người'),
      rating: String(raw.rating || populatedHotel?.rating || populatedLoc?.rating || '4.9'),
      reviews: String(
        raw.reviews || populatedHotel?.reviewCount || populatedLoc?.review_count || '0'
      ),
      desc:
        raw.desc ||
        populatedRoom?.room_description ||
        populatedHotel?.description ||
        populatedLoc?.location_description ||
        raw.description ||
        '',
      img:
        raw.img ||
        raw.image ||
        populatedHotel?.image_url ||
        populatedLoc?.image_url ||
        raw.imageUrl ||
        fallback.img,
      image:
        raw.image ||
        raw.img ||
        populatedHotel?.image_url ||
        populatedLoc?.image_url ||
        fallback.img,
      features: raw.features || populatedLoc?.features || []
    };
  }

  private mapApiContentToHubVideo(item: any, idx: number): HubVideo {
    const drawerKeys: DrawerKey[] = ['resort', 'yacht', 'dining'];
    const defaultKey = drawerKeys[idx % drawerKeys.length];
    const hotspots: Record<DrawerKey, PointData> = {
      resort: this.normalizePointData(item.hotspots?.resort, 'resort'),
      dining: this.normalizePointData(item.hotspots?.dining, 'dining'),
      yacht: this.normalizePointData(item.hotspots?.yacht, 'yacht')
    };

    const populatedCreator =
      item.user_id && typeof item.user_id === 'object' ? item.user_id : null;

    return {
      _id: String(item._id || item.id || `reel_${idx + 1}`),
      id: item.id || item.code || String(item._id || `v${idx + 1}`),
      user_id: populatedCreator?._id ? String(populatedCreator._id) : this.extractObjectIdString(item.user_id) || undefined,
      title: item.content_title || item.title || 'Hành trình thượng lưu TRIPLA',
      desc: item.caption || item.content_description || item.desc || item.content_title || '',
      location: item.location_name || item.location || 'Việt Nam',
      creator:
        populatedCreator?.handle ||
        item.author ||
        item.creator?.handle ||
        (populatedCreator?.full_name ? `@${populatedCreator.full_name}` : '@tripla_creator'),
      creatorTitle:
        item.creator?.role === 'provider'
          ? 'Đối tác nghỉ dưỡng TRIPLA'
          : populatedCreator?.full_name || item.creator?.displayName || 'Thành viên TRIPLA',
      creatorAvatar:
        populatedCreator?.avatar ||
        item.avatar ||
        item.creatorAvatar ||
        item.creator?.avatarUrl ||
        'images/logo (2).png',
      musicName: item.music_name || item.music?.trackName || 'Âm thanh gốc TRIPLA',
      media: item.image_url || item.image || item.media?.posterUrl || item.media || '',
      videoUrl: item.video_url || item.videoUrl || item.media?.videoUrl,
      drawerKey: (item.drawerKey as DrawerKey) || defaultKey,
      likes: item.likes ?? String(item.likeCount ?? item.stats?.likes ?? 0),
      likeCount: Number(item.likeCount ?? item.stats?.likes ?? 0),
      views: item.views ?? String(item.stats?.views ?? 0),
      commentsCount: Number(item.commentCount ?? item.commentsCount ?? item.stats?.commentsCount ?? 0),
      bookmarks: item.bookmarks ?? String(item.stats?.bookmarks ?? 0),
      isLiked: Boolean(item.isLiked),
      isBookmarked: Boolean(item.isBookmarked),
      category: item.category || 'for-you',
      location_tags: item.location_tags || [],
      hotspots
    };
  }

  fetchFeed(tab = 'for-you', reset = true): void {
    if (!this.http || this.isLoadingFeed()) return;

    this.isLoadingFeed.set(true);
    const targetPage = reset ? 1 : this.currentPage() + 1;
    let params = new HttpParams()
      .set('tab', tab)
      .set('page', String(targetPage))
      .set('limit', '6');
    const q = this.searchQuery().trim();
    if (q) params = params.set('q', q);

    this.http
      .get<any>(`${this.apiBaseUrl}/contents`, {
        params,
        headers: this.authService.getAuthHeaders()
      })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.isLoadingFeed.set(false);
        if (!res || !Array.isArray(res.items)) {
          return;
        }
        if (res.items.length === 0) {
          if (reset && (tab === 'saved' || q.length > 0)) {
            this.hubVideos.set([]);
            this.currentVideoIndex.set(0);
          }
          this.hasMoreReels.set(false);
          return;
        }

        const mapped: HubVideo[] = res.items.map((item: any, idx: number) =>
          this.mapApiContentToHubVideo(item, idx)
        );

        if (reset) {
          this.hubVideos.set(mapped);
          this.currentVideoIndex.set(0);
          this.syncCurrentReelInteractiveState();
        } else {
          const existingIds = new Set(this.hubVideos().map((v) => v._id || v.title));
          const uniqueNext = mapped.filter((v) => !existingIds.has(v._id || v.title));
          if (uniqueNext.length > 0) {
            this.hubVideos.update((prev) => [...prev, ...uniqueNext]);
          }
        }

        this.currentPage.set(Number(res.page || targetPage));
        this.totalPages.set(Number(res.totalPages || 1));
        this.nextCursor.set(res.nextCursor || null);
        this.hasMoreReels.set(Boolean(res.hasMore));
      });
  }

  loadMoreReels(): void {
    if (!this.hasMoreReels() || this.isLoadingFeed()) return;
    const tab =
      this.activeNav() === 'nav-saved'
        ? 'saved'
        : this.isCommunityHubVisible()
          ? this.activeCommunityTab()
          : 'for-you';
    this.fetchFeed(tab, false);
  }

  syncCurrentReelInteractiveState(): void {
    const active = this.currentVideo();
    if (!active) return;

    this.isLiked.set(Boolean(active.isLiked));
    this.isBookmarked.set(Boolean(active.isBookmarked));

    if (active._id) {
      this.fetchCommentsForReel(active._id);
      this.recordViewForCurrentReel(active._id, 8);
    }
  }

  /**
   * Khi người dùng click vào Hotspot Drawer trong Video Reel:
   * - Nhận `hotel_id` / `location_id` để query thông tin giá và phòng (`rooms`) trực tiếp từ MongoDB
   */
  fetchVenueDetail(key: DrawerKey): void {
    if (!this.http) return;
    const currentSpot = this.pointDataMap()[key];
    const hotelId = currentSpot?.hotel_id;
    const locationId = currentSpot?.location_id;
    const venueId = hotelId || locationId || currentSpot?.venueId;
    if (!venueId) return;

    if (hotelId) {
      this.http
        .get<any>(`${this.apiBaseUrl}/hotels/${hotelId}`)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.rooms && Array.isArray(res.rooms)) {
            this.activeHotelRooms.set(res.rooms);
          }
          if (res?.pointData) {
            const updatedSpot = this.normalizePointData(res.pointData, key);
            this.updateCurrentVideoHotspot(key, updatedSpot);
          }
        });
      return;
    }

    if (locationId) {
      this.http
        .get<any>(`${this.apiBaseUrl}/locations/${locationId}`)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.pointData) {
            const updatedSpot = this.normalizePointData(res.pointData, key);
            this.updateCurrentVideoHotspot(key, updatedSpot);
          }
        });
      return;
    }

    this.http
      .get<any>(`${this.apiBaseUrl}/venues/${venueId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.pointData) {
          const updatedSpot = this.normalizePointData(res.pointData, key);
          this.updateCurrentVideoHotspot(key, updatedSpot);
        }
      });
  }

  private updateCurrentVideoHotspot(key: DrawerKey, updatedSpot: PointData): void {
    const idx = this.currentVideoIndex();
    this.hubVideos.update((list) =>
      list.map((v, i) =>
        i === idx && v.hotspots
          ? {
              ...v,
              hotspots: {
                ...v.hotspots,
                [key]: updatedSpot
              }
            }
          : v
      )
    );
  }

  toggleLikeCurrentReel(): void {
    const nextState = !this.isLiked();
    this.isLiked.set(nextState);

    const active = this.currentVideo();
    const idx = this.currentVideoIndex();
    if (!active) return;

    const currentCount = Number(active.likeCount ?? 0);
    const optimisticCount = Math.max(0, currentCount + (nextState ? 1 : -1));
    this.hubVideos.update((list) =>
      list.map((v, i) =>
        i === idx
          ? {
              ...v,
              isLiked: nextState,
              likeCount: optimisticCount,
              likes: optimisticCount < 10000 ? optimisticCount.toLocaleString('vi-VN') : v.likes
            }
          : v
      )
    );

    if (!this.http || !active._id) return;

    this.likeContent(active._id, nextState)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.success) {
          const exactLikes = Number(res.likeCount ?? res.likesCount ?? optimisticCount);
          const displayLikes =
            exactLikes < 10000 ? exactLikes.toLocaleString('vi-VN') : res.likes || active.likes;
          this.isLiked.set(Boolean(res.isLiked));
          this.hubVideos.update((list) =>
            list.map((v, i) =>
              i === idx ? { ...v, isLiked: Boolean(res.isLiked), likeCount: exactLikes, likes: displayLikes } : v
            )
          );
        }
      });
  }

  toggleBookmarkCurrentReel(): void {
    const nextState = !this.isBookmarked();
    this.isBookmarked.set(nextState);

    const active = this.currentVideo();
    const idx = this.currentVideoIndex();
    if (!active) return;

    this.hubVideos.update((list) =>
      list.map((v, i) => (i === idx ? { ...v, isBookmarked: nextState } : v))
    );

    if (!this.http || !active._id) return;

    const uid = this.authService.currentUser()?.id;
    this.http
      .post<any>(
        `${this.apiBaseUrl}/contents/${active._id}/bookmark`,
        { isBookmarked: nextState, ...(uid ? { userId: uid } : {}) },
        { headers: this.authService.getAuthHeaders() }
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.success) {
          this.isBookmarked.set(Boolean(res.isBookmarked));
          this.hubVideos.update((list) =>
            list.map((v, i) =>
              i === idx
                ? { ...v, isBookmarked: res.isBookmarked, bookmarks: res.bookmarks || v.bookmarks }
                : v
            )
          );
        }
      });
  }

  recordViewForCurrentReel(reelId: string, watchDurationSec = 10, clickedHotspotKey?: DrawerKey): void {
    if (!this.http || !reelId) return;
    const uid = this.authService.currentUser()?.id || 'guest';
    this.http
      .post<any>(`${this.apiBaseUrl}/contents/${reelId}/view`, {
        userId: uid,
        watchDurationSec,
        clickedHotspotKey
      })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  fetchCommentsForReel(reelId: string): void {
    if (!this.http || !reelId) return;
    this.getComments(reelId, 20)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.items && Array.isArray(res.items)) {
          const mapped: CommentItem[] = res.items.map((c: any) => ({
            _id: c._id,
            reelId: c.reelId,
            author: c.user_id?.full_name || c.user || c.author || 'Du khách TRIPLA',
            avatar:
              c.user_id?.avatar ||
              c.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
            time: c.time || 'Vừa xong',
            content: c.text || c.content || ''
          }));
          this.comments.set(mapped);
        }
      });
  }

  addComment(content: string, authorName?: string, avatarUrl?: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;

    const curUser = this.authService.currentUser();
    const resolvedAuthor = authorName || curUser?.fullName || 'Du khách TRIPLA';
    const resolvedAvatar =
      avatarUrl ||
      curUser?.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

    const active = this.currentVideo();
    const idx = this.currentVideoIndex();
    const optimisticComment: CommentItem = {
      _id: `local_${Date.now()}`,
      reelId: active?._id,
      author: resolvedAuthor,
      avatar: resolvedAvatar,
      time: 'Vừa xong',
      content: trimmed
    };

    this.comments.update((prev) => [optimisticComment, ...prev]);
    this.hubVideos.update((list) =>
      list.map((v, i) =>
        i === idx ? { ...v, commentsCount: (v.commentsCount || 0) + 1 } : v
      )
    );

    if (!this.http || !active?._id) return;

    this.postComment(active._id, trimmed, resolvedAuthor, resolvedAvatar)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.success && typeof res.commentsCount === 'number') {
          this.hubVideos.update((list) =>
            list.map((v, i) =>
              i === idx ? { ...v, commentsCount: res.commentsCount } : v
            )
          );
        }
      });
  }

  fetchLiveStreams(): void {
    if (!this.http) return;
    this.http
      .get<any>(`${this.apiBaseUrl}/live-streams`)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.items && Array.isArray(res.items) && res.items.length > 0) {
          const mapped: LiveStreamCard[] = res.items.map((item: any) => ({
            _id: item._id,
            id: item.id,
            hostName: item.host || item.hostName,
            hostAvatar: item.avatar || item.hostAvatar,
            location: item.location,
            title: item.title,
            viewerCount: item.viewers || String(item.viewerCount || '1.2K'),
            coverImage: item.image || item.coverImage
          }));
          this.liveCards.set(mapped);
        }
      });
  }

  nextVideo(): void {
    const total = this.hubVideos().length;
    if (this.currentVideoIndex() < total - 1) {
      this.currentVideoIndex.update((idx) => idx + 1);
      this.syncCurrentReelInteractiveState();

      if (this.currentVideoIndex() >= total - 2 && this.hasMoreReels()) {
        this.loadMoreReels();
      }
    } else if (this.hasMoreReels()) {
      this.loadMoreReels();
    } else {
      this.currentVideoIndex.set(0);
      this.syncCurrentReelInteractiveState();
    }
  }

  prevVideo(): void {
    if (this.currentVideoIndex() > 0) {
      this.currentVideoIndex.update((idx) => idx - 1);
    } else {
      this.currentVideoIndex.set(this.hubVideos().length - 1);
    }
    this.syncCurrentReelInteractiveState();
  }

  uploadReel(payload: {
    content_title: string;
    caption?: string;
    location_name?: string;
    video_url?: string;
  }): Observable<any> {
    if (!this.http) return of({ success: false });
    return this.http
      .post<any>(`${this.apiBaseUrl}/contents`, payload, {
        headers: this.authService.getAuthHeaders()
      })
      .pipe(
        tap((res) => {
          if (res?.success && res.content) {
            const mapped = this.mapApiContentToHubVideo(res.content, 0);
            this.hubVideos.update((prev) => [mapped, ...prev]);
            this.currentVideoIndex.set(0);
            this.syncCurrentReelInteractiveState();
          }
        })
      );
  }

  /**
   * Kích hoạt API `POST /api/v1/bookings` với khóa ngoại `user_id`, `room_id`, `hotel_id`, `location_id`
   */
  submitDrawerBooking(payload: Record<string, unknown>): void {
    if (!this.http) return;
    this.createBooking(payload)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.booking) {
          this.lastBookingCode.set(res.booking.booking_code || res.booking.bookingCode || '');
          this.lastBookingTotalPrice.set(
            Number(res.booking.total_price || res.booking.totalPriceVnd || 0)
          );
        }
      });
  }
}

export { TripShortService as TripshortService };
