import { Component, ElementRef, HostListener, inject, input, output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { matchesDestination, popularVietnamDestinations, vietnamDestinations } from '../../../models/vietnam-destinations';
import {
  HotelSearchCriteria,
  hotelNights,
  localDateString,
  validateHotelCriteria,
} from '../../models/hotel-search-criteria.model';
@Component({
  selector: 'app-hotel-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotel-search-bar.html',
  styleUrl: './hotel-search-bar.css',
})
export class HotelSearchBar implements OnChanges {
  readonly criteria = input.required<HotelSearchCriteria>();
  readonly search = output<HotelSearchCriteria>();
  draft!: HotelSearchCriteria;
  error = '';
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  destinationOpen = false;
  destinationQuery = '';
  get matchingDestinations() {
    return this.destinationQuery.trim()
      ? vietnamDestinations.filter(place => matchesDestination(place, this.destinationQuery))
      : popularVietnamDestinations;
  }
  openDestinations(): void {
    if (!this.destinationOpen) this.destinationQuery = '';
    this.destinationOpen = true;
  }
  chooseDestination(name: string): void {
    this.draft.location = name;
    this.error = '';
    this.destinationOpen = false;
  }
  @HostListener('document:pointerdown', ['$event'])
  closeOutside(event: PointerEvent): void {
    if (!this.element.nativeElement.querySelector('.location-container')?.contains(event.target as Node))
      this.destinationOpen = false;
  }
  closeOnFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
      this.destinationOpen = false;
  }
  readonly today = localDateString(new Date());
  get nights() {
    return hotelNights(this.draft);
  }
  ngOnChanges() {
    this.draft = { ...this.criteria() };
    this.error = '';
    this.destinationOpen = false;
  }
  submit() {
    this.destinationOpen = false;
    this.error = validateHotelCriteria(this.draft) || '';
    if (!this.error) this.search.emit({ ...this.draft, location: this.draft.location.trim() });
  }
}
