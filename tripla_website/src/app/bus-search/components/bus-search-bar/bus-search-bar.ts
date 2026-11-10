import { Component, OnChanges, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusCriteria, validateBusCriteria } from '../../models/bus-search.model';
import { vietnamDestinations } from '../../../models/vietnam-destinations';
import { localDateString } from '../../../hotel-search/models/hotel-search-criteria.model';
@Component({
  selector: 'app-bus-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bus-search-bar.html',
  styleUrl: './bus-search-bar.css',
})
export class BusSearchBar implements OnChanges {
  readonly criteria = input.required<BusCriteria>();
  readonly search = output<BusCriteria>();
  draft!: BusCriteria;
  error = '';
  readonly today = localDateString(new Date());
  readonly cities = vietnamDestinations;
  ngOnChanges(): void {
    this.draft = { ...this.criteria() };
    this.error = '';
  }
  swap(): void {
    [this.draft.from, this.draft.to] = [this.draft.to, this.draft.from];
  }
  toggleReturn(): void {
    this.draft.returnDate = this.draft.returnDate ? null : this.draft.departureDate;
  }
  submit(): void {
    this.error = validateBusCriteria(this.draft);
    if (!this.error) this.search.emit({ ...this.draft });
  }
}
