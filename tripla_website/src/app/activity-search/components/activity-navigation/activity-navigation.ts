import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-activity-navigation',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './activity-navigation.html',
  styleUrl: './activity-navigation.css',
})
export class ActivityNavigation {
  readonly activeService = input<'tour' | 'bus' | 'planning'>('tour');
  readonly services = [
    { tab: 'hotel', icon: 'hotel', label: 'Khách sạn & Resort' },
    { tab: 'flight', icon: 'flight', label: 'Vé máy bay' },
    { tab: 'tour', icon: 'local_activity', label: 'Hoạt động & Vui chơi' },
    { tab: 'bus', icon: 'directions_bus', label: 'Vé xe khách' },
  ];
}
