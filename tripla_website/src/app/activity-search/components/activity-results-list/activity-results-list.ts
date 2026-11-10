import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../models/activity.model';
import { ActivityCard } from '../activity-card/activity-card';
@Component({
  selector: 'app-activity-results-list',
  standalone: true,
  imports: [CommonModule, ActivityCard],
  templateUrl: './activity-results-list.html',
  styleUrl: './activity-results-list.css',
})
export class ActivityResultsList {
  readonly activities = input<Activity[]>([]);
  readonly location = input('');
  readonly loading = input(false);
  readonly sort = input('relevant');
  readonly sortChange = output<'relevant' | 'price-asc' | 'price-desc'>();
}
