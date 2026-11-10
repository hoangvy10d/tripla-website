import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlightSort, sortOptions } from '../../models/flight-filter.model';
@Component({
  selector: 'app-flight-sort-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-sort-bar.html',
  styleUrl: './flight-sort-bar.css',
})
export class FlightSortBar {
  readonly sort = input<FlightSort>('cheapest');
  readonly sortChange = output<FlightSort>();
  readonly options = sortOptions;
}
