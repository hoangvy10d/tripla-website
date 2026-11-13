import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Hotel } from '../../models/hotel.model';
import { HotelCard } from '../hotel-card/hotel-card';

@Component({
  selector: 'app-hotel-results-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HotelCard],
  templateUrl: './hotel-results-list.html',
  styleUrl: './hotel-results-list.css',
})
export class HotelResultsList {
  readonly hotels = input<Hotel[]>([]);
  readonly loading = input(false);
  readonly location = input('');
  readonly demo = input(false);
  readonly keyword = input('');
  readonly sortByPrice = input<'asc' | 'desc' | ''>('');
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly total = input(0);
  readonly viewMode = input<'grid' | 'list'>('grid');

  readonly keywordChange = output<string>();
  readonly sortChange = output<'asc' | 'desc' | ''>();
  readonly pageChange = output<number>();
  readonly viewModeChange = output<'grid' | 'list'>();

  readonly pageNumbers = computed(() => {
    const count = Math.max(1, this.totalPages());
    return Array.from({ length: count }, (_, idx) => idx + 1);
  });

  submitKeyword(val: string): void {
    this.keywordChange.emit((val || '').trim());
  }
}
