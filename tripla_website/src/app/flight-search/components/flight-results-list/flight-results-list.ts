import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';
import { FlightCard } from '../flight-card/flight-card';
@Component({
  selector: 'app-flight-results-list',
  standalone: true,
  imports: [CommonModule, FlightCard],
  templateUrl: './flight-results-list.html',
  styleUrl: './flight-results-list.css',
})
export class FlightResultsList {
  readonly flights = input<Flight[]>([]);
  readonly loading = input(false);
  readonly hasSource = input(false);
  readonly selected = output<Flight>();
}
