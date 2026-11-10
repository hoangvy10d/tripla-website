import { Component, input, output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  airports,
  cabinClasses,
  FlightSearchCriteria,
  localDateString,
  validateFlightCriteria,
} from '../../models/flight-search-criteria.model';
@Component({
  selector: 'app-flight-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flight-search-bar.html',
  styleUrl: './flight-search-bar.css',
})
export class FlightSearchBar implements OnChanges {
  readonly criteria = input.required<FlightSearchCriteria>();
  readonly search = output<FlightSearchCriteria>();
  readonly airports = airports;
  readonly cabins = cabinClasses;
  readonly today = localDateString(new Date());
  draft!: FlightSearchCriteria;
  error = '';
  ngOnChanges() {
    this.draft = {
      ...this.criteria(),
      from: { ...this.criteria().from },
      to: { ...this.criteria().to },
    };
    this.error = '';
  }
  get airportOptions() {
    return [
      ...new Map(
        [...this.airports, this.draft.from, this.draft.to]
          .filter((a) => a.code)
          .map((a) => [a.code, a]),
      ).values(),
    ];
  }
  setAirport(side: 'from' | 'to', code: string) {
    this.draft[side] = { ...this.airportOptions.find((a) => a.code === code)! };
  }
  swap() {
    [this.draft.from, this.draft.to] = [this.draft.to, this.draft.from];
  }
  setRoundTrip(value: boolean) {
    this.draft.tripType = value ? 'round-trip' : 'one-way';
    if (value && !this.draft.returnDate) this.draft.returnDate = this.draft.departureDate;
  }
  submit() {
    this.error = validateFlightCriteria(this.draft) || '';
    if (!this.error)
      this.search.emit({
        ...this.draft,
        returnDate: this.draft.tripType === 'round-trip' ? this.draft.returnDate : null,
      });
  }
}
