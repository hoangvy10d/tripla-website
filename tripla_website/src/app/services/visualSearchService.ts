import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface VisualSearchLocation {
  landmark_name: string;
  formatted_address: string;
}

export interface VisualSearchVideo {
  _id?: string;
  code?: string;
  content_title?: string;
  caption?: string;
  video_url?: string;
  location_name?: string;
}

export interface VisualSearchResponse {
  success: boolean;
  found: boolean;
  cached?: boolean;
  message?: string;
  location?: VisualSearchLocation;
  related_videos?: VisualSearchVideo[];
}

export interface VisualSearchCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable({ providedIn: 'root' })
export class VisualSearchService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'http://localhost:3000/api/visual-search/search-location';

  searchLocation(
    videoId: string,
    image: { imageBase64?: string; imageUrl?: string },
    cropBox: VisualSearchCropBox
  ): Observable<VisualSearchResponse> {
    return this.http.post<VisualSearchResponse>(this.endpoint, {
      video_id: videoId,
      ...(image.imageBase64 ? { image_base64: image.imageBase64 } : {}),
      ...(image.imageUrl ? { image_url: image.imageUrl } : {}),
      crop_box: cropBox
    });
  }
}