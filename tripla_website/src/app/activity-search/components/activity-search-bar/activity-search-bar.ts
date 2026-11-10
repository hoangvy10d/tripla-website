import {
  Component,
  ElementRef,
  HostListener,
  OnChanges,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivitySearchCriteria } from '../../models/activity-search.model';
import {
  matchesDestination,
  popularVietnamDestinations,
  vietnamDestinations,
} from '../../../models/vietnam-destinations';
@Component({
  selector: 'app-activity-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-search-bar.html',
  styleUrl: './activity-search-bar.css',
})
export class ActivitySearchBar implements OnChanges {
  readonly criteria = input.required<ActivitySearchCriteria>();
  readonly search = output<ActivitySearchCriteria>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  draft!: ActivitySearchCriteria;
  open = false;
  placeQuery = '';
  error = '';
  get places() {
    return this.placeQuery.trim()
      ? vietnamDestinations.filter((place) => matchesDestination(place, this.placeQuery))
      : popularVietnamDestinations;
  }
  ngOnChanges(): void {
    this.draft = { ...this.criteria(), categories: [...this.criteria().categories] };
    this.open = false;
    this.error = '';
  }
  openPlaces(): void {
    if (!this.open) this.placeQuery = '';
    this.open = true;
  }
  choose(name: string): void {
    this.draft.location = name;
    this.open = false;
    this.error = '';
  }
  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.open = false;
  }
  submit(): void {
    if (!this.draft.location.trim()) {
      this.error = 'Vui lòng chọn hoặc nhập điểm đến.';
      return;
    }
    this.open = false;
    this.search.emit({
      ...this.draft,
      location: this.draft.location.trim(),
      query: this.draft.query.trim(),
    });
  }
}
