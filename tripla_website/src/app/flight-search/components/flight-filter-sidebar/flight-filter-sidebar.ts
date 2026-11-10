import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlightFilter, TimeBand, timeBands } from '../../models/flight-filter.model';
@Component({
  selector: 'app-flight-filter-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-filter-sidebar.html',
  styleUrl: './flight-filter-sidebar.css',
})
export class FlightFilterSidebar {
  readonly filters = input.required<FlightFilter>();
  readonly airlines = input<{ code: string; name: string }[]>([]);
  readonly filtersChange = output<FlightFilter>();
  readonly reset = output<void>();
  readonly bands = timeBands;
  patch(p: Partial<FlightFilter>) {
    this.filtersChange.emit({ ...this.filters(), ...p });
  }
  toggleStop(n: number) {
    const a = this.filters().stops;
    this.patch({ stops: a.includes(n) ? a.filter((v) => v !== n) : [...a, n] });
  }
  toggleAirline(code: string) {
    const a = this.filters().airlines;
    this.patch({ airlines: a.includes(code) ? a.filter((v) => v !== code) : [...a, code] });
  }
  toggleBand(key: 'departureBands' | 'arrivalBands', band: TimeBand) {
    const a = this.filters()[key];
    this.patch({ [key]: a.includes(band) ? a.filter((v) => v !== band) : [...a, band] });
  }
}
