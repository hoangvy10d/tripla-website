import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityCategory, activityCategories } from '../../models/activity-search.model';
@Component({
  selector: 'app-activity-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-categories.html',
  styleUrl: './activity-categories.css',
})
export class ActivityCategories {
  readonly selected = input<ActivityCategory[]>([]);
  readonly selectionChange = output<ActivityCategory[]>();
  readonly categories = activityCategories;
  toggle(category: ActivityCategory): void {
    this.selectionChange.emit(
      this.selected().includes(category)
        ? this.selected().filter((value) => value !== category)
        : [...this.selected(), category],
    );
  }
}
