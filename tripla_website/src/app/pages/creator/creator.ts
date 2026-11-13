import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth-service';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';

@Component({
  selector: 'app-creator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './creator.html',
  styleUrls: ['./creator.css']
})
export class CreatorComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private readonly apiBase = 'http://localhost:3000/api/v1';

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
    let safe = this.youtubeSafeUrlCache.get(id);
    if (!safe) {
      const embed = `https://www.youtube.com/embed/${id}?autoplay=1&mute=0&controls=1&loop=1&playlist=${id}&enablejsapi=1&modestbranding=1&rel=0`;
      safe = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
      this.youtubeSafeUrlCache.set(id, safe);
    }
    return safe;
  }

  readonly creators = [
    { code: 'u1', name: 'Nguyễn Hoàng Vy' },
    { code: 'u2', name: 'Ngô Minh Thùy' },
    { code: 'u3', name: 'Trần Thị Nhật Minh' },
    { code: 'u4', name: 'Võ Lê Quỳnh Nga' },
    { code: 'a1', name: 'Trần Duy Thanh' }
  ];

  activeCreatorCode =
    this.authService.currentUser()?.id ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('tripla_active_profile') : null) ||
    'u1';
  user: any = null;
  contents: any[] = [];
  hotels: any[] = [];
  locations: any[] = [];

  isLoading = true;
  errorMessage: string | null = null;
  toastMessage: string | null = null;

  isUploadOpen = false;
  isSubmitting = false;
  isUploadingFile = false;
  form = this.emptyForm();

  ngOnInit(): void {
    this.loadAll();
  }

  private emptyForm() {
    return {
      title: '',
      caption: '',
      video_url: 'http://localhost:3000/data/community/reels/r1/BANAHILL.mp4',
      hotel_id: '',
      location_id: '',
      hashtags: '#Tripla #VietnamTravel'
    };
  }

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = null;
    forkJoin({
      profile: this.http.get<any>(`${this.apiBase}/users/${this.activeCreatorCode}/profile`),
      hotels: this.http.get<any>(`${this.apiBase}/hotels`).pipe(catchError(() => of({ items: [] }))),
      locations: this.http.get<any>(`${this.apiBase}/locations`).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ profile, hotels, locations }) => {
        this.user = profile.user;
        this.contents = profile.contents || [];
        this.hotels = hotels.items || [];
        this.locations = locations.items || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Không kết nối được server (http://localhost:3000). Hãy chạy "npm start" trong my-server-mongodb.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  switchCreator(code: string): void {
    this.activeCreatorCode = code;
    localStorage.setItem('tripla_active_profile', code);
    this.loadAll();
  }

  get totalViews(): number {
    return this.contents.reduce((s, c) => s + (Number(c.stats?.views) || 0), 0);
  }

  get totalLikes(): number {
    return this.contents.reduce((s, c) => s + (Number(c.stats?.likes) || 0), 0);
  }

  /** Ước tính doanh thu affiliate: 0,5% giá trị booking giả định trên mỗi 1.000 lượt xem. */
  get estimatedRevenue(): number {
    return Math.round(this.totalViews * 35);
  }

  openUpload(): void {
    this.form = this.emptyForm();
    this.isUploadOpen = true;
  }

  closeUpload(): void {
    this.isUploadOpen = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    this.isUploadingFile = true;
    this.http.post<any>(`${this.apiBase}/upload`, data).subscribe({
      next: (res) => {
        if (res?.url) this.form.video_url = res.url;
        this.isUploadingFile = false;
        this.showToast('Đã tải video lên server.');
      },
      error: () => {
        this.isUploadingFile = false;
        this.showToast('Tải file thất bại — bạn có thể dán URL video thay thế.');
      }
    });
  }

  submitContent(): void {
    if (!this.form.title.trim()) {
      this.showToast('Vui lòng nhập tiêu đề video.');
      return;
    }
    this.isSubmitting = true;
    const payload = {
      user_id: this.user?._id,
      userCode: this.activeCreatorCode,
      content_title: this.form.title.trim(),
      caption: this.form.caption.trim() || this.form.title.trim(),
      video_url: this.form.video_url.trim(),
      hotel_id: this.form.hotel_id || undefined,
      location_id: this.form.location_id || undefined,
      hashtags: this.form.hashtags.split(/\s+/).filter((t) => t.startsWith('#'))
    };
    this.http.post<any>(`${this.apiBase}/contents`, payload).subscribe({
      next: (res) => {
        if (res?.content) this.contents = [res.content, ...this.contents];
        this.isSubmitting = false;
        this.isUploadOpen = false;
        this.showToast('Đã đăng Reel mới kèm Hotspot đặt chỗ!');
      },
      error: () => {
        this.isSubmitting = false;
        this.showToast('Đăng bài thất bại.');
      }
    });
  }

  deleteContent(c: any): void {
    if (!confirm(`Xóa video "${c.content_title || c.title}"?`)) return;
    this.http.delete<any>(`${this.apiBase}/contents/${c._id}`).subscribe({
      next: () => {
        this.contents = this.contents.filter((x) => x._id !== c._id);
        this.showToast('Đã xóa video.');
      }
    });
  }

  hotelName(h: any): string {
    return h.hotel_name || h.name;
  }

  formatVnd(val: number): string {
    return `${(Number(val) || 0).toLocaleString('vi-VN')} ₫`;
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 3000);
  }
}

