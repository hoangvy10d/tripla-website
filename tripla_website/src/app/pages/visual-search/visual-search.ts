import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  VisualSearchResponse,
  VisualSearchService,
  VisualSearchVideo
} from '../../services/visualSearchService';
import { TripShortService } from '../../services/trip-short.service';
import { HotelSearchCriteria, hotelSearchParams, localDateString } from '../../hotel-search/models/hotel-search-criteria.model';
import { defaultHotelFilters } from '../../hotel-search/models/hotel-filter.model';
import { activitySearchParams } from '../../activity-search/models/activity-search.model';

type ReticleAction = 'move' | 'nw' | 'ne' | 'sw' | 'se';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-visual-search',
  styleUrl: './visual-search.css',
  templateUrl: './visual-search.html'
})
export class VisualSearch implements AfterViewInit, OnChanges, OnDestroy {
  @Input() x = 0;
  @Input() y = 0;
  @Input() videoElement: HTMLVideoElement | null = null;
  @Input() iframeElement: HTMLIFrameElement | null = null;
  @Input() clickSurface: HTMLElement | null = null;
  @Input() videoId = '';
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly resumeRequested = new EventEmitter<void>();
  @Output() readonly hotelDrawerRequested = new EventEmitter<any>();
  @ViewChild('resultDialog') private resultDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('reticle') private reticle?: ElementRef<HTMLElement>;

  loading = false;
  result: VisualSearchResponse | null = null;
  cropX = 0;
  cropY = 0;
  cropW = 220;
  cropH = 220;
  dragAnnouncement = '';

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly visualSearchService = inject(VisualSearchService);
  private readonly router = inject(Router);
  readonly store = inject(TripShortService);

  private boundVideo?: HTMLVideoElement;
  private readonly minReticleSize = 80;
  private activePointerId: number | null = null;
  private activeAction: ReticleAction | null = null;
  private startClientX = 0;
  private startClientY = 0;
  private startCropX = 0;
  private startCropY = 0;
  private startCropW = 220;
  private startCropH = 220;

  get controlsLeft(): number {
    return this.cropX + this.cropW / 2;
  }

  get controlsTop(): number {
    const hostHeight = this.elementRef.nativeElement.clientHeight || 600;
    const belowPosition = this.cropY + this.cropH + 14;
    return belowPosition + 52 > hostHeight ? Math.max(12, this.cropY - 54) : belowPosition;
  }

  get matchedHotel(): any {
    return (this.result as any)?.matched_hotel || null;
  }

  get nearbyHotels(): any[] {
    return (this.result as any)?.nearby_hotels || [];
  }

  get nearbyVenues(): any[] {
    return (this.result as any)?.nearby_venues || [];
  }

  get relatedVideos(): VisualSearchVideo[] {
    return this.result?.related_videos || [];
  }

  get googleMapsUrl(): string {
    const address = this.result?.location?.formatted_address || this.result?.location?.landmark_name || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  buildItemMapsUrl(name: string, address?: string): string {
    const query = [name, address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  buildNearbySearchMapsUrl(categoryKeyword: string): string {
    const place = this.result?.location?.landmark_name || this.result?.location?.formatted_address || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${categoryKeyword} gần ${place}`)}`;
  }

  formatHotelPrice(hotel: any): string {
    const price = Number(hotel?.lowestPrice || hotel?.pricePerNight || hotel?.rooms?.[0]?.pricePerNight || 0);
    return price > 0 ? `${new Intl.NumberFormat('vi-VN').format(price)}₫` : 'Liên hệ giá';
  }

  openRealHotelInDrawer(hotel: any): void {
    const dialog = this.resultDialog?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
    this.hotelDrawerRequested.emit(hotel);

    const destination = hotel?.name || hotel?.hotel_name || this.result?.location?.landmark_name || '';
    const location = hotel?.address || this.result?.location?.formatted_address || '';
    void this.router.navigate(['/trip-shop'], {
      queryParams: {
        service: 'hotel',
        destination,
        location
      }
    });
  }
  get nearbyPlaces(): any[] {
    return (this.result as any)?.nearby_places || [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['x'] || changes['y']) {
      this.cropW = 220;
      this.cropH = 220;
      this.cropX = this.x - this.cropW / 2;
      this.cropY = this.y - this.cropH / 2;
      this.clampReticleBounds();
    }
    if (changes['videoElement']) {
      this.boundVideo?.removeEventListener('play', this.onVideoPlay);
      this.boundVideo = this.videoElement || undefined;
      this.boundVideo?.addEventListener('play', this.onVideoPlay);
    }
  }

  ngAfterViewInit(): void {
    this.clampReticleBounds();
  }

  ngOnDestroy(): void {
    this.boundVideo?.removeEventListener('play', this.onVideoPlay);
  }

  @HostListener('document:pointerdown', ['$event'])
  dismissOnOutsidePointer(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Node && this.elementRef.nativeElement.contains(target)) return;
    if (target === this.videoElement) return;
    if (target instanceof Node && this.clickSurface?.contains(target)) return;
    if (this.iframeElement) {
      this.resumeRequested.emit();
      return;
    }
    this.dismissed.emit();
  }

  async search(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (this.loading || (!this.videoElement && !this.iframeElement) || !this.videoId) return;

    this.loading = true;
    try {
      const image = this.videoElement
        ? { imageBase64: await this.captureFrame(this.videoElement) }
        : { imageUrl: this.getYouTubeThumbnailUrl(this.iframeElement!) };
      this.result = await firstValueFrom(
        this.visualSearchService.searchLocation(this.videoId, image, this.getCropBox())
      );

      // 👉 THÊM DÒNG NÀY: Đồng bộ kết quả thật sang TripShortService
      if (this.result?.found) {
        this.store.applyVisualSearchResult(this.result);
      }
    } catch (error: any) {
      this.result = {
        success: false,
        found: false,
        message: error?.error?.message || error?.message || 'Không thể tìm kiếm địa điểm lúc này.'
      };
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
      setTimeout(() => {
        const dialog = this.resultDialog?.nativeElement;
        if (dialog && !dialog.open) {
          dialog.showModal();
        }
      }, 0);
    }
  }

  dismissOnBackdrop(event: MouseEvent): void {
    const dialog = this.resultDialog?.nativeElement;
    if (event.target !== dialog || !dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  }

  resume(event: MouseEvent): void {
    event.stopPropagation();
    this.resumeRequested.emit();
  }

  onDialogClosed(): void {
    if (this.iframeElement) {
      this.resumeRequested.emit();
      return;
    }
    this.dismissed.emit();
  }

  startReticleAction(event: PointerEvent, action: ReticleAction): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.activeAction = action;
    this.activePointerId = event.pointerId;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.startCropX = this.cropX;
    this.startCropY = this.cropY;
    this.startCropW = this.cropW;
    this.startCropH = this.cropH;
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId || !this.activeAction) return;

    const host = this.elementRef.nativeElement;
    const hostW = host.clientWidth || 400;
    const hostH = host.clientHeight || 700;
    const dx = event.clientX - this.startClientX;
    const dy = event.clientY - this.startClientY;

    if (this.activeAction === 'move') {
      this.cropX = Math.max(0, Math.min(this.startCropX + dx, hostW - this.cropW));
      this.cropY = Math.max(0, Math.min(this.startCropY + dy, hostH - this.cropH));
      return;
    }

    let newX = this.startCropX;
    let newY = this.startCropY;
    let newW = this.startCropW;
    let newH = this.startCropH;

    if (this.activeAction.includes('e')) {
      newW = Math.max(this.minReticleSize, Math.min(this.startCropW + dx, hostW - this.startCropX));
    }
    if (this.activeAction.includes('s')) {
      newH = Math.max(this.minReticleSize, Math.min(this.startCropH + dy, hostH - this.startCropY));
    }
    if (this.activeAction.includes('w')) {
      const rightEdge = this.startCropX + this.startCropW;
      newX = Math.max(0, Math.min(this.startCropX + dx, rightEdge - this.minReticleSize));
      newW = rightEdge - newX;
    }
    if (this.activeAction.includes('n')) {
      const bottomEdge = this.startCropY + this.startCropH;
      newY = Math.max(0, Math.min(this.startCropY + dy, bottomEdge - this.minReticleSize));
      newH = bottomEdge - newY;
    }

    this.cropX = newX;
    this.cropY = newY;
    this.cropW = newW;
    this.cropH = newH;
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  endReticleAction(event?: PointerEvent): void {
    if (this.activePointerId === null) return;
    if (event && event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.activeAction = null;
    this.dragAnnouncement = 'Khung quét đã được điều chỉnh.';
  }

  moveReticleWithKeyboard(event: KeyboardEvent): void {
    const delta = 15;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-delta, 0],
      ArrowRight: [delta, 0],
      ArrowUp: [0, -delta],
      ArrowDown: [0, delta]
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    this.cropX += offset[0];
    this.cropY += offset[1];
    this.clampReticleBounds();
    this.dragAnnouncement = 'Khung quét đã được di chuyển.';
  }

  @HostListener('window:resize')
  clampReticleOnResize(): void {
    this.clampReticleBounds();
  }

  private readonly onVideoPlay = (): void => this.dismissed.emit();

  private clampReticleBounds(): void {
    const host = this.elementRef.nativeElement;
    const hostW = host.clientWidth || 400;
    const hostH = host.clientHeight || 700;
    this.cropW = Math.min(this.cropW, hostW);
    this.cropH = Math.min(this.cropH, hostH);
    this.cropX = Math.max(0, Math.min(this.cropX, Math.max(0, hostW - this.cropW)));
    this.cropY = Math.max(0, Math.min(this.cropY, Math.max(0, hostH - this.cropH)));
  }

  private getCropBox(): { x: number; y: number; width: number; height: number } {
    const media = this.videoElement || this.iframeElement;
    const reticle = this.reticle?.nativeElement;
    if (!media || !reticle) return { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };

    const mediaRect = media.getBoundingClientRect();
    const reticleRect = reticle.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (reticleRect.left - mediaRect.left) / mediaRect.width));
    const y = Math.max(0, Math.min(1, (reticleRect.top - mediaRect.top) / mediaRect.height));
    const width = Math.max(0, Math.min(1 - x, reticleRect.width / mediaRect.width));
    const height = Math.max(0, Math.min(1 - y, reticleRect.height / mediaRect.height));

    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(width.toFixed(4)),
      height: Number(height.toFixed(4))
    };
  }

  private getYouTubeThumbnailUrl(iframe: HTMLIFrameElement): string {
    const match = iframe.src.match(/youtube\.com\/embed\/([\w-]{11})(?:[?&#/]|$)/);
    if (!match) throw new Error('Không thể xác định YouTube ID của video.');
    return `https://img.youtube.com/vi/${match[1]}/sddefault.jpg`;
  }

  private async captureFrame(video: HTMLVideoElement): Promise<string> {
    video.pause();
    await this.ensureAnonymousVideo(video);

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video chưa sẵn sàng để chụp khung hình.');
    }

    const box = this.getCropBox();
    const sx = Math.floor(box.x * video.videoWidth);
    const sy = Math.floor(box.y * video.videoHeight);
    const sw = Math.max(32, Math.floor(box.width * video.videoWidth));
    const sh = Math.max(32, Math.floor(box.height * video.videoHeight));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể tạo canvas để chụp video.');

    // Cắt đúng vùng khung quét gửi cho Gemini
    context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  private async ensureAnonymousVideo(video: HTMLVideoElement): Promise<void> {
    if (video.crossOrigin === 'anonymous') return;

    const source = video.currentSrc || video.src;
    if (!source) throw new Error('Không tìm thấy nguồn video để chụp.');
    const currentTime = video.currentTime;
    video.crossOrigin = 'anonymous';
    video.setAttribute('crossorigin', 'anonymous');
    video.src = source;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Không thể tải video ở chế độ CORS.')); };
      const cleanup = () => {
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadeddata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.load();
    });

    if (Number.isFinite(currentTime) && currentTime > 0) {
      video.currentTime = Math.min(currentTime, video.duration || currentTime);
      if (video.seeking) {
        await new Promise<void>((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }));
      }
    }
    video.pause();
  }
  bookHotelInTripShop(hotel: any, isDbHotel = true): void {
    this.resultDialog?.nativeElement?.close();

    const today = new Date();
    const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    const hotelName = hotel?.name || hotel?.hotel_name || '';
    const cityFallback = (hotel?.address || this.result?.location?.formatted_address || '')
      .split(',')
      .pop()
      ?.trim();

    const criteria: HotelSearchCriteria = {
      service: 'hotel',
      location: hotelName || cityFallback || 'Đà Lạt',
      checkIn: localDateString(today),
      checkOut: localDateString(checkOut),
      adults: 2,
      children: 0,
      rooms: 1,
    };

    const queryParams = hotelSearchParams(criteria, defaultHotelFilters());
    const slug = hotel?.hotel_slug || hotel?.slug;
    const id = hotel?._id || hotel?.id;

    if (isDbHotel && (slug || id)) {
      void this.router.navigate(slug ? ['/hotel', slug] : ['/hotels', id], { queryParams });
    } else {
      void this.router.navigate(['/hotel-search'], { queryParams });
    }
  }

  explorePlaceInTripShop(place: any): void {
    const category = String(place?.category || '').toLowerCase();
    const isStay = /khách sạn|hotel|resort|villa|homestay|lưu trú/.test(category);

    if (isStay) {
      this.bookHotelInTripShop({ name: place.name, address: this.result?.location?.formatted_address }, false);
      return;
    }

    this.resultDialog?.nativeElement?.close();
    const city = (this.result?.location?.formatted_address || this.result?.location?.landmark_name || '')
      .split(',')
      .pop()
      ?.trim() || 'Đà Lạt';

    void this.router.navigate(['/activity-search'], {
      queryParams: activitySearchParams({
        location: city,
        query: place.name,
        categories: [],
      }),
    });
  }
}