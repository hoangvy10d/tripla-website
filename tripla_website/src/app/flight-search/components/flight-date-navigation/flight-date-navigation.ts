import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { localDateString } from '../../models/flight-search-criteria.model';
@Component({
  selector: 'app-flight-date-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-date-navigation.html',
  styleUrl: './flight-date-navigation.css',
})
export class FlightDateNavigation {
  readonly date = input.required<string>();
  readonly dateChange = output<string>();
  readonly today = localDateString(new Date());
  get dates() {
    const base = new Date(this.date() + 'T12:00:00');
    return [-1, 0, 1, 2].map((n) => {
      const d = new Date(base);
      d.setDate(d.getDate() + n);
      return localDateString(d);
    });
  }
  shift(step: number) {
    const d = new Date(this.date() + 'T12:00:00');
    d.setDate(d.getDate() + step);
    const value = localDateString(d);
    if (value >= this.today) this.dateChange.emit(value);
  }
}
