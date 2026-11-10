import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusFilters, busTimeBands } from '../../models/bus-search.model';
@Component({
  selector: 'app-bus-filter-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bus-filter-sidebar.html',
  styleUrl: './bus-filter-sidebar.css',
})
export class BusFilterSidebar {
  readonly filters = input.required<BusFilters>();
  readonly operators = input<{ id: string; name: string }[]>([]);
  readonly filtersChange = output<BusFilters>();
  readonly bands = busTimeBands;
  toggle(key: 'operators' | 'departureBands', id: string): void {
    const f = this.filters();
    this.filtersChange.emit({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((value) => value !== id) : [...f[key], id],
    });
  }
  reset(): void {
    this.filtersChange.emit({ operators: [], departureBands: [] });
  }
}
