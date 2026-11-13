import { Component, HostListener, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DrawerKey, CommunityTab, NavItem, LiveStreamCard } from '../../models/trip-shorts.models';
import { AuthService } from '../../services/auth-service';
import { TripShortService } from '../../services/trip-short.service';
import { SavedTrips } from '../../services/saved-trips';
import { SiteHeaderComponent, SiteNavKey } from '../../shared/components/site-header/site-header';

@Component({
  selector: 'app-tripshort',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SiteHeaderComponent],
  templateUrl: './tripshort.html',
  styleUrls: ['./tripshort.css']
})
export class Tripshort {
  galleryIndex = 0;
  calendarOpen = false;
  readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  calendarMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  stayStart = this.today;
  visitDate = this.today;
  stayEnd = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 3);
  draftStart: Date | null = null;
  draftEnd: Date | null = null;
  readonly weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  get galleryImages(): string[] {
    return [...new Set([this.activeDrawerData().img, ...this.hubVideos
      .filter(video => video.drawerKey === this.selectedDrawerKey()).map(video => video.media)])];
  }
  changeGallery(step: number): void {
    this.galleryIndex = (this.galleryIndex + step + this.galleryImages.length) % this.galleryImages.length;
  }
  get stayNights(): number {
    return Math.round((Date.UTC(this.stayEnd.getFullYear(), this.stayEnd.getMonth(), this.stayEnd.getDate()) -
      Date.UTC(this.stayStart.getFullYear(), this.stayStart.getMonth(), this.stayStart.getDate())) / 86400000);
  }
  get calendarDays(): (Date | null)[] {
    const year = this.calendarMonth.getFullYear(), month = this.calendarMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    return [...Array(offset).fill(null), ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1))];
  }
  openCalendar(): void {
    this.draftStart = null;
    this.draftEnd = null;
    const date = this.selectedDrawerKey() === 'yacht' ? this.visitDate : this.stayStart;
    this.calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    this.calendarOpen = !this.calendarOpen;
  }
  changeMonth(step: number): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + step, 1);
  }
  selectStayDate(day: Date): void {
    if (day < this.today) return;
    if (this.selectedDrawerKey() === 'yacht') {
      this.draftStart = day;
      this.draftEnd = null;
      return;
    }
    if (!this.draftStart || this.draftEnd || day <= this.draftStart) {
      this.draftStart = day;
      this.draftEnd = null;
    } else this.draftEnd = day;
  }
  isRangeDay(day: Date): boolean {
    return !!this.draftStart && !!this.draftEnd && day > this.draftStart && day < this.draftEnd;
  }
  confirmStayDates(): void {
    if (this.selectedDrawerKey() === 'yacht' && this.draftStart) {
      this.visitDate = this.draftStart;
      this.calendarOpen = false;
      return;
    }
    if (!this.draftStart || !this.draftEnd) return;
    this.stayStart = this.draftStart;
    this.stayEnd = this.draftEnd;
    this.calendarOpen = false;
  }
  saveTripView: 'list' | 'create' | null = null;
  newTripName = '';
  newPlanStartDate = new Date().toISOString().slice(0, 10);
  newPlanEndDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  backendPlans: any[] = [];
  wishlistLocationIdsByPlan: Record<string, string[]> = {};
  saveTripToast = '';
  reportModalOpen = false;
  reportReason: 'spam' | 'inappropriate' | 'false_info' | 'copyright' | 'other' = 'spam';
  reportDetails = '';
  reportStatusMsg = '';
  reportSubmitting = false;

  private readonly savedTripStore = inject(SavedTrips);
  get tripStorageError() { return this.savedTripStore.error(); }
  get savedTrips() { return this.savedTripStore.trips(); }

  private loadBackendPlans(): void {
    this.store.getMyTripPlans().subscribe((res) => {
      if (res?.success && Array.isArray(res.items)) {
        this.backendPlans = res.items;
        res.items.forEach((p: any) => {
          const pid = String(p._id);
          this.store.getPlanWishlist(pid).subscribe((wRes) => {
            const locIds = (wRes?.items || [])
              .map((it: any) => String(it.location_id?._id || it.location_id || ''))
              .filter(Boolean);
            this.wishlistLocationIdsByPlan = {
              ...this.wishlistLocationIdsByPlan,
              [pid]: locIds
            };
          });
        });
      }
    });
  }

  resolveCurrentSpotLocationId(): string | null {
    const active = this.activeDrawerData();
    const vid = this.currentVideo();
    return (
      active?.location_id ||
      vid?.location_tags?.[0]?.location_id?._id ||
      vid?.location_tags?.[0]?.location_id ||
      vid?.hotspots?.dining?.location_id ||
      vid?.hotspots?.yacht?.location_id ||
      null
    );
  }

  isLocationInBackendPlan(planId: string): boolean {
    const locId = this.resolveCurrentSpotLocationId();
    if (!locId) return false;
    return (this.wishlistLocationIdsByPlan[String(planId)] || []).includes(String(locId));
  }

  openSaveTrips(): void {
    this.authService.requireAuth(() => {
      this.savedTripStore.refresh();
      this.saveTripToast = '';
      this.saveTripView = 'list';
      this.loadBackendPlans();
    }, 'Vui lòng đăng nhập để lưu điểm đến vào chuyến đi.');
  }

  createTrip(): void {
    const name = this.newTripName.trim();
    if (!name || name.length > 100) return;
    if (this.newPlanEndDate < this.newPlanStartDate) {
      this.saveTripToast = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.';
      return;
    }

    this.savedTripStore.create(name);
    this.store
      .createTripPlan({
        plan_name: name,
        start_date: this.newPlanStartDate,
        end_date: this.newPlanEndDate
      })
      .subscribe((res) => {
        if (res?.success && res.plan) {
          this.backendPlans = [res.plan, ...this.backendPlans];
          this.saveTripToast = `Đã tạo chuyến đi "${res.plan.plan_name}".`;
        }
      });

    this.newTripName = '';
    this.saveTripView = 'list';
  }

  toggleBackendPlanWishlist(planId: string): void {
    const locId = this.resolveCurrentSpotLocationId();
    if (!locId) {
      this.saveTripToast = 'Không xác định được địa điểm của thẻ này để lưu vào wishlist.';
      return;
    }
    this.store
      .saveToWishlist({
        plan_id: planId,
        location_id: String(locId),
        hotel_id: this.activeDrawerData()?.hotel_id || null
      })
      .subscribe({
        next: (res) => {
          if (res?.success) {
            const cur = this.wishlistLocationIdsByPlan[planId] || [];
            this.wishlistLocationIdsByPlan = {
              ...this.wishlistLocationIdsByPlan,
              [planId]: [...new Set([...cur, String(locId)])]
            };
            this.saveTripToast = 'Đã lưu địa điểm vào chuyến đi thành công!';
          }
        },
        error: (err) => {
          this.saveTripToast =
            err?.error?.message || 'Địa điểm này đã có trong chuyến đi của bạn.';
        }
      });
  }

  openReportModal(event?: Event): void {
    event?.stopPropagation();
    this.authService.requireAuth(() => {
      this.reportReason = 'spam';
      this.reportDetails = '';
      this.reportStatusMsg = '';
      this.reportModalOpen = true;
    }, 'Vui lòng đăng nhập để báo cáo nội dung vi phạm.');
  }

  submitContentReport(event?: Event): void {
    event?.preventDefault();
    const vid = this.currentVideo();
    if (!vid?._id || this.reportSubmitting) return;
    this.reportSubmitting = true;
    this.reportStatusMsg = '';
    this.store
      .submitReport({
        content_id: vid._id,
        reason: this.reportReason,
        details: this.reportDetails.trim()
      })
      .subscribe({
        next: (res) => {
          this.reportSubmitting = false;
          if (res?.success) {
            this.reportStatusMsg = 'Đã gửi báo cáo tới quản trị viên TRIPLA. Cảm ơn bạn!';
            setTimeout(() => {
              this.reportModalOpen = false;
            }, 900);
          }
        },
        error: (err) => {
          this.reportSubmitting = false;
          this.reportStatusMsg = err?.error?.message || 'Không thể gửi báo cáo lúc này.';
        }
      });
  }

  toggleTripPlace(id: string): void {
    const key = this.selectedDrawerKey();
    this.savedTripStore.toggle(id, key);
  }
  private lastWheelScrollAt = 0;
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private lastAuthUserId: string | null = this.authService.currentUser()?.id || null;

  get currentUser() {
    return this.authService.currentUser();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get currentUserName(): string {
    return this.authService.currentUser()?.fullName || 'Khách tham quan';
  }

  get currentUserAvatar(): string {
    return this.authService.currentUser()?.avatar || 'images/logo (2).png';
  }

  get currentUserBadge(): string {
    const u = this.authService.currentUser() as any;
    if (!u) return 'Đăng nhập để đồng bộ';
    return u.level || u.membershipTier || (u.role === 'admin' ? 'Quản trị viên' : 'Thành viên TRIPLA');
  }

  get currentUserInitials(): string {
    const name = this.currentUserName.trim();
    if (!name || name === 'Khách tham quan') return 'TR';
    const parts = name.split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  get currentUserHandle(): string {
    const user = this.authService.currentUser();
    if (!user?.email) return '@tripla_guest';
    return `@${user.email.split('@')[0]}`;
  }

  get savedCollectionCount(): number {
    if (!this.isLoggedIn) return 0;
    const bookmarked = this.hubVideos.filter((v) => v.isBookmarked).length;
    return bookmarked || this.savedTrips?.length || 0;
  }

  get activeUnitPriceVnd(): number {
    const point = this.activeDrawerData();
    if (point?.roomPrice && Number(point.roomPrice) > 0) return Number(point.roomPrice);
    const numeric = Number(String(point?.price || '').replace(/[^\d]/g, ''));
    return numeric > 0 ? numeric : 0;
  }

  get checkoutTotalVnd(): number {
    const unit = this.activeUnitPriceVnd;
    return this.selectedDrawerKey() === 'resort' ? unit * Math.max(1, this.stayNights || 1) : unit;
  }

  formatVnd(val: number): string {
    if (!val || val <= 0) return 'Liên hệ';
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(val))}₫`;
  }

  openProfileOrLogin(): void {
    this.authService.requireAuth(() => {
      void this.router.navigate(['/profile']);
    }, 'Vui lòng đăng nhập để xem hồ sơ cá nhân.');
  }

  constructor() {
    this.store.activeNav.set('nav-for-you');
    this.store.isCommunityHubVisible.set(false);
    effect(() => {
      const uid = this.authService.currentUser()?.id || null;
      if (uid !== this.lastAuthUserId) {
        this.lastAuthUserId = uid;
        this.store.fetchFeed('for-you', true);
      }
    });
  }

  isSlideDrawerOpen = false;
  isCommentDrawerOpen = false;
  searchInput = '';
  activeRegion = '';
  uploadStatus = '';
  uploadTitle = '';
  uploadLocation = '';
  uploadCaption = '';
  uploadVideoUrl = '';
  isUploadingReel = false;
  shareNotice = '';

  // Inject Service vào Component
  readonly store = inject(TripShortService);
  private sanitizer = inject(DomSanitizer);
  newCommentText = '';

  private readonly youtubeSafeUrlCache = new Map<string, SafeResourceUrl>();

  extractYouTubeId(url: string | undefined): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  isYouTubeVideo(url: string | undefined): boolean {
    return Boolean(this.extractYouTubeId(url));
  }

  getYouTubeEmbedUrl(url: string | undefined): SafeResourceUrl | null {
    if (!url) return null;
    const id = this.extractYouTubeId(url);
    if (!id) return null;
    const muteParam = this.isAudioOn() ? 0 : 1;
    const cacheKey = `${id}_${muteParam}`;
    let safe = this.youtubeSafeUrlCache.get(cacheKey);
    if (!safe) {
      const embed = `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muteParam}&controls=1&loop=1&playlist=${id}&enablejsapi=1&modestbranding=1&rel=0`;
      safe = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
      this.youtubeSafeUrlCache.set(cacheKey, safe);
    }
    return safe;
  }

  onSearchReelsInput(value: string): void {
    this.searchInput = value;
    if (!value.trim()) {
      this.activeRegion = '';
      this.store.searchQuery.set('');
      this.store.fetchFeed('for-you', true);
    }
  }

  applyReelsSearch(): void {
    this.activeRegion = '';
    this.store.searchQuery.set(this.searchInput.trim());
    this.store.fetchFeed('for-you', true);
  }

  filterByRegion(region: string): void {
    const regionPatterns: Record<string, string> = {
      'Miền Bắc': 'Hà Nội|Sapa|Sa Pa|Hạ Long|Ninh Bình|Tràng An',
      'Miền Trung': 'Vĩnh Hy|Ninh Thuận|Nha Trang|Đà Nẵng|Huế|Hội An|Phú Yên',
      'Miền Nam': 'Phú Quốc|Hồ Chí Minh|Sài Gòn|Đà Lạt|Côn Đảo',
    };
    this.activeRegion = this.activeRegion === region ? '' : region;
    this.searchInput = '';
    this.store.searchQuery.set(this.activeRegion ? regionPatterns[this.activeRegion] || this.activeRegion : '');
    this.store.fetchFeed('for-you', true);
  }

  // Getter reactive từ Signal của Service để tự động cập nhật giao diện khi API MongoDB trả dữ liệu
  get pointDataMap() { return this.store.pointDataMap(); }
  get hubVideos() { return this.store.hubVideos(); }
  get comments() { return this.store.comments(); }
  get liveCards() { return this.store.liveCards(); }
  readonly isSidebarCollapsed = this.store.isSidebarCollapsed;
  readonly activeNav = this.store.activeNav;
  readonly isCommunityHubVisible = this.store.isCommunityHubVisible;
  readonly activeCommunityTab = this.store.activeCommunityTab;
  readonly currentVideoIndex = this.store.currentVideoIndex;
  readonly isTagsVisible = this.store.isTagsVisible;
  readonly isPlayOverlayVisible = this.store.isPlayOverlayVisible;
  readonly isLiked = this.store.isLiked;
  readonly isBookmarked = this.store.isBookmarked;
  readonly isAudioOn = this.store.isAudioOn;
  readonly isDrawerOpen = this.store.isDrawerOpen;
  readonly selectedDrawerKey = this.store.selectedDrawerKey;
  readonly drawerView = this.store.drawerView;
  readonly isCommentDrawerState = this.store.isCommentDrawerOpen;
  readonly isShareModalOpen = this.store.isShareModalOpen;
  readonly isUploadModalOpen = this.store.isUploadModalOpen;
  readonly copyLabelText = this.store.copyLabelText;
  readonly currentVideo = this.store.currentVideo;
  readonly activeDrawerData = this.store.activeDrawerData;
  readonly likeCountText = this.store.likeCountText;
  readonly bookmarkCountText = this.store.bookmarkCountText;
  readonly commentCountText = this.store.commentCountText;

  // Chuyển video bằng nút bấm
  nextVideo(event?: Event): void {
    event?.stopPropagation();
    this.store.nextVideo();
  }

  prevVideo(event?: Event): void {
    event?.stopPropagation();
    this.store.prevVideo();
  }

  // Bắt sự kiện LĂN CHUỘT để trượt Video Shorts
  @HostListener('wheel', ['$event'])
  onWindowScroll(event: WheelEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('#video-container')) return;
    // Chỉ cuộn video khi không mở Community Hub hoặc các Drawer
    if (this.store.isCommunityHubVisible() || this.store.isDrawerOpen() || this.store.isCommentDrawerOpen()) {
      return;
    }

    const now = Date.now();
    const deltaY = event.deltaY;

    // Giảm tốc độ lướt bằng cách chỉ xử lý khoảng cách lớn và chặn xoay nhiều lần liên tiếp
    if (Math.abs(deltaY) < 120 || now - this.lastWheelScrollAt < 650) {
      return;
    }

    this.lastWheelScrollAt = now;
    event.preventDefault();

    if (deltaY > 0) {
      this.store.nextVideo();
    } else if (deltaY < 0) {
      this.store.prevVideo();
    }
  }

  // Bắt phím Mũi tên Lên / Xuống trên bàn phím
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.target instanceof Element && event.target.closest('#main-sidebar, input, textarea, select, [contenteditable="true"]')) return;
    if (this.store.isCommunityHubVisible()) return;
    if (event.key === 'ArrowDown') {
      this.store.nextVideo();
    } else if (event.key === 'ArrowUp') {
      this.store.prevVideo();
    }
  }
  // --- Handlers UI (Ủy quyền xử lý state cho Service) ---
  navigateToHome(): void {
    this.closeAllDrawers();
    this.store.activeNav.set('nav-home');
    this.router.navigate(['/']);
  }

  goToHome(): void {
    this.navigateToHome();
  }

  toggleSidebar(): void {
    this.store.isSidebarCollapsed.update(v => !v);
  }

  setActiveNav(id: NavItem): void {
    if (id === 'nav-saved') {
      this.authService.requireAuth(() => {
        this.store.activeNav.set('nav-saved');
        this.store.isTagsVisible.set(false);
        this.closeAllDrawers();
        this.store.fetchFeed('saved', true);
      }, 'Vui lòng đăng nhập để xem Bộ sưu tập đã lưu.');
      return;
    }

    this.store.activeNav.set(id);
    if (id !== 'nav-for-you') {
      this.store.isTagsVisible.set(false);
      this.closeAllDrawers();
    }

    if (id === 'nav-for-you') {
      this.store.fetchFeed('for-you', true);
    } else if (id === 'nav-tripshop') {
      this.router.navigate(['/trip-shop']);
    }
  }

  switchToCommunity(): void {
    this.setActiveNav('nav-community');
    this.closeAllDrawers();
    this.store.isCommunityHubVisible.set(true);
  }

  switchToFeed(): void {
    this.setActiveNav('nav-for-you');
    this.closeAllDrawers();
    this.store.isCommunityHubVisible.set(false);
  }

  onTopNavClick(key: SiteNavKey): void {
    if (key === 'tripshort') {
      this.switchToFeed();
    } else {
      this.closeAllDrawers();
    }
  }

  openVideoFromHub(index: number): void {
    this.setActiveNav('nav-for-you');
    this.store.currentVideoIndex.set(index);
    this.store.syncCurrentReelInteractiveState();
    this.store.isCommunityHubVisible.set(false);
    this.store.isTagsVisible.set(true);
  }

  openLiveStream(live: LiveStreamCard): void {
    const cityToken = String(live.location || '').split(',')[0].trim().toLowerCase();
    const matchIndex = this.hubVideos.findIndex((v) =>
      String(v.location || '').toLowerCase().includes(cityToken)
    );
    this.openVideoFromHub(matchIndex >= 0 ? matchIndex : 0);
  }

  onHubImageError(event: Event, isAvatar = false): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.dataset['fallbackApplied']) return;
    img.dataset['fallbackApplied'] = '1';
    img.src = isAvatar ? 'images/logo (2).png' : '/images/trangan.jpg';
  }

  switchCommunityTab(tab: CommunityTab): void {
    this.store.activeCommunityTab.set(tab);
    if (tab !== 'live') {
      this.store.fetchFeed(tab, true);
    } else {
      this.store.fetchLiveStreams();
    }
  }

  onHubScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 280) {
      this.store.loadMoreReels();
    }
  }

  handleVideoClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.pin-hotspot')) return;

    if (this.store.isDrawerOpen() || this.store.isCommentDrawerOpen() || this.store.isShareModalOpen()) {
      this.closeAllDrawers();
      return;
    }

    this.store.isTagsVisible.update(v => !v);
    this.store.isPlayOverlayVisible.set(true);
    setTimeout(() => this.store.isPlayOverlayVisible.set(false), 600);
  }

  closeDrawersOnBackdrop(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('#video-card, button, a, input, textarea')) return;
    if (this.store.isDrawerOpen() || this.isCommentDrawerOpen) this.closeAllDrawers();
  }

  toggleSlideDrawer(): void {
    if (this.isSlideDrawerOpen) {
      this.closeAllDrawers();
      return;
    }

    this.closeAllDrawers();
    this.isSlideDrawerOpen = true;
    this.store.isDrawerOpen.set(true);
  }

  toggleCommentDrawer(): void {
    if (this.isCommentDrawerOpen) {
      this.closeAllDrawers();
      return;
    }

    this.closeAllDrawers();
    this.isCommentDrawerOpen = true;
    this.store.isCommentDrawerOpen.set(true);
  }

  openDrawerWithData(key: DrawerKey, event?: Event): void {
    event?.stopPropagation();
    this.closeAllDrawers();
    this.galleryIndex = 0;
    this.calendarOpen = false;
    this.isSlideDrawerOpen = true;
    this.store.selectedDrawerKey.set(key);
    this.store.drawerView.set('details');
    this.store.isDrawerOpen.set(true);
    this.store.fetchVenueDetail(key);
    const activeReelId = this.currentVideo()?._id;
    if (activeReelId) {
      this.store.recordViewForCurrentReel(activeReelId, 12, key);
    }
  }

  openCommentDrawer(event?: Event): void {
    event?.stopPropagation();
    const activeReelId = this.currentVideo()?._id;
    if (activeReelId) {
      this.store.fetchCommentsForReel(activeReelId);
    }
    this.toggleCommentDrawer();
  }

  closeCommentDrawer(): void {
    this.isCommentDrawerOpen = false;
    this.store.isCommentDrawerOpen.set(false);
  }

  openShareModal(event?: Event): void {
    event?.stopPropagation();
    this.closeAllDrawers();
    this.store.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.store.isShareModalOpen.set(false);
  }

  // Chuyển sang màn hình Xác nhận & Thanh toán (Hình 3)
  goToCheckout(): void {
    this.authService.requireAuth(() => {
      this.store.drawerView.set('checkout');
    }, 'Vui lòng đăng nhập để đặt phòng hoặc trải nghiệm.');
  }

  // Điều hướng sang TripShop để đặt phòng/đặt chỗ thực tế với Venue từ MongoDB (Flow 2)
  navigateToTripShopWithVenue(event?: Event): void {
    event?.stopPropagation();
    const spot = this.activeDrawerData();
    this.closeAllDrawers();
    this.router.navigate(['/trip-shop'], {
      queryParams: {
        destination: spot.title,
        location: spot.location,
        type: this.selectedDrawerKey()
      }
    });
  }

  // Quay lại màn hình Chi tiết
  backToDetails(): void {
    this.store.drawerView.set('details');
  }

  // Chuyển sang màn hình Đặt chỗ thành công (Hình 4) & kích hoạt API `POST /api/v1/bookings` với khóa ngoại `user_id`, `room_id`, `hotel_id`, `location_id`
  processFakePayment(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.id) return;

    this.store.drawerView.set('success');
    const activePoint = this.activeDrawerData();
    const drawerKey = this.selectedDrawerKey();
    const rooms = this.store.activeHotelRooms();
    const selectedRoomId = activePoint?.room_id || rooms?.[0]?._id || null;
    const totalPrice = this.checkoutTotalVnd;

    this.store.submitDrawerBooking({
      user_id: currentUser.id,
      room_id: selectedRoomId,
      hotel_id: activePoint?.hotel_id || null,
      location_id: activePoint?.location_id || null,
      venueId: activePoint?.venueId || null,
      bookingType: `tripshorts_${drawerKey}`,
      title: activePoint?.title || 'Đặt chỗ TripShorts',
      location: activePoint?.location || '',
      customerName: this.currentUserName,
      check_in: this.stayStart.toISOString().slice(0, 10),
      check_out: this.stayEnd.toISOString().slice(0, 10),
      checkIn: this.stayStart.toISOString().slice(0, 10),
      checkOut: this.stayEnd.toISOString().slice(0, 10),
      guests: 2,
      total_price: totalPrice,
      totalPriceVnd: totalPrice,
      payment_method: 'e_wallet',
      status: 'CONFIRMED',
      details: {
        drawerKey,
        roomName: activePoint?.roomName || rooms?.[0]?.room_name || 'Ocean Pool Pavilion',
        priceDisplay: activePoint?.price || '',
        stayNights: Math.max(1, this.stayNights || 1),
        visitDate: this.visitDate.toISOString().slice(0, 10)
      }
    });
  }

  // Đóng bảng để lướt tiếp video
  closeDrawer(): void {
    this.isSlideDrawerOpen = false;
    this.store.isDrawerOpen.set(false);
  }

  copyLinkAction(): void {
    this.store.copyLabelText.set('Đã Chép!');
    setTimeout(() => this.store.copyLabelText.set('Sao Chép'), 2000);
  }

  toggleLike(event?: Event): void {
    event?.stopPropagation();
    this.authService.requireAuth(
      () => this.store.toggleLikeCurrentReel(),
      'Vui lòng đăng nhập để thả tim bài viết.'
    );
  }

  toggleBookmark(event?: Event): void {
    event?.stopPropagation();
    this.authService.requireAuth(
      () => this.store.toggleBookmarkCurrentReel(),
      'Vui lòng đăng nhập để lưu bài viết.'
    );
  }

  submitComment(event?: Event): void {
    event?.preventDefault();
    const commentText = this.newCommentText.trim();
    if (!commentText) return;
    this.authService.requireAuth(() => {
      const user = this.authService.currentUser();
      this.store.addComment(commentText, user?.fullName || this.currentUserName, user?.avatar);
      this.newCommentText = '';
    }, 'Vui lòng đăng nhập để gửi bình luận.');
  }

  toggleAudio(event?: Event): void {
    event?.stopPropagation();
    this.store.isAudioOn.update(v => !v);
  }

  triggerUploadModal(): void {
    this.authService.requireAuth(() => {
      this.uploadStatus = '';
      this.uploadTitle = '';
      this.uploadLocation = '';
      this.uploadCaption = '';
      this.uploadVideoUrl = '';
      this.store.isUploadModalOpen.set(true);
    }, 'Vui lòng đăng nhập để chia sẻ thước phim lên TRIPLA.');
  }

  closeUploadModal(): void {
    this.uploadStatus = '';
    this.store.isUploadModalOpen.set(false);
  }

  submitVideoUpload(): void {
    if (this.isUploadingReel) return;
    if (!this.uploadTitle.trim()) {
      this.uploadStatus = 'Vui lòng nhập tiêu đề thước phim.';
      return;
    }
    this.isUploadingReel = true;
    this.uploadStatus = '';
    this.store
      .uploadReel({
        content_title: this.uploadTitle.trim(),
        caption: this.uploadCaption.trim() || this.uploadTitle.trim(),
        location_name: this.uploadLocation.trim() || 'Việt Nam',
        video_url:
          this.uploadVideoUrl.trim() || 'http://localhost:3000/data/community/reels/r1/BANAHILL.mp4'
      })
      .subscribe({
        next: (res) => {
          this.isUploadingReel = false;
          if (res?.success) {
            this.uploadStatus = 'Thước phim của bạn đã được đăng thành công!';
            setTimeout(() => {
              if (this.store.isUploadModalOpen()) {
                this.closeUploadModal();
              }
            }, 900);
          } else {
            this.uploadStatus = res?.message || 'Không thể đăng thước phim lúc này.';
          }
        },
        error: (err) => {
          this.isUploadingReel = false;
          this.uploadStatus = err?.error?.message || 'Không thể đăng thước phim lúc này.';
        }
      });
  }

  shareViaChannel(channel: string): void {
    this.copyLinkAction();
    this.shareNotice = `Đã sao chép liên kết chia sẻ qua ${channel}!`;
  }

  closeAllDrawers(): void {
    this.isSlideDrawerOpen = false;
    this.isCommentDrawerOpen = false;
    this.store.isDrawerOpen.set(false);
    this.store.isCommentDrawerOpen.set(false);
    this.store.isShareModalOpen.set(false);
  }
}
