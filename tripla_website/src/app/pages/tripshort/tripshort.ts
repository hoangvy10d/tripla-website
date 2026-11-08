import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DrawerKey, CommunityTab, NavItem } from '../../models/trip-shorts.models';
import {  TripshortService } from '../../services/tripshort-service';

@Component({
  selector: 'app-tripshort',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tripshort.html',
  styleUrls: ['./tripshort.css']
})
export class Tripshort{
  private lastWheelScrollAt = 0;
  private readonly router = inject(Router);
  readonly currentUserName = 'Victoria Chen';
  readonly currentUserHandle = '@victoriachen';

  constructor() {
    this.store.activeNav.set('nav-for-you');
    this.store.isCommunityHubVisible.set(false);
  }

  isSlideDrawerOpen = false;
  isCommentDrawerOpen = false;

  // Inject Service vào Component
  readonly store = inject(TripshortService);

  // Alias các signal từ service để template hoạt động như phiên bản cũ
  readonly pointDataMap = this.store.pointDataMap();
  readonly hubVideos = this.store.hubVideos();
  readonly comments = this.store.comments();
  readonly liveCards = this.store.liveCards();
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
    this.store.activeNav.set(id);
    if (id !== 'nav-for-you') {
      this.store.isTagsVisible.set(false);
      this.closeAllDrawers();
    }

    if (id === 'nav-tripshop') {
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

  openVideoFromHub(index: number): void {
    this.switchToFeed();
    this.store.currentVideoIndex.set(index);
    this.store.isCommunityHubVisible.set(false);
    this.store.isTagsVisible.set(true);
  }

  switchCommunityTab(tab: CommunityTab): void {
    this.store.activeCommunityTab.set(tab);
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
    this.isSlideDrawerOpen = true;
    this.store.selectedDrawerKey.set(key);
    this.store.drawerView.set('details');
    this.store.isDrawerOpen.set(true);
  }

  openCommentDrawer(event?: Event): void {
    event?.stopPropagation();
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
  this.store.drawerView.set('checkout');
}

// Quay lại màn hình Chi tiết
backToDetails(): void {
  this.store.drawerView.set('details');
}

// Chuyển sang màn hình Đặt chỗ thành công (Hình 4)
processFakePayment(): void {
  this.store.drawerView.set('success');
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
    this.store.isLiked.update(v => !v);
  }

  toggleBookmark(event?: Event): void {
    event?.stopPropagation();
    this.store.isBookmarked.update(v => !v);
  }

  toggleAudio(event?: Event): void {
    event?.stopPropagation();
    this.store.isAudioOn.update(v => !v);
  }

  triggerUploadModal(): void {
    this.store.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.store.isUploadModalOpen.set(false);
  }

  submitVideoUpload(): void {
    alert('Video của bạn đã được tải lên thành công!');
    this.closeUploadModal();
  }

  closeAllDrawers(): void {
    this.isSlideDrawerOpen = false;
    this.isCommentDrawerOpen = false;
    this.store.isDrawerOpen.set(false);
    this.store.isCommentDrawerOpen.set(false);
    this.store.isShareModalOpen.set(false);
  }
}
