import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SiteHeaderComponent } from '../../../shared/components/site-header/site-header';

@Component({
  selector: 'app-activity-navigation',
  standalone: true,
  imports: [RouterLink, CommonModule, SiteHeaderComponent],
  templateUrl: './activity-navigation.html',
  styleUrl: './activity-navigation.css',
})
export class ActivityNavigation {
  readonly activeService = input<'hotel' | 'flight' | 'tour' | 'bus' | 'planning'>('tour');
  readonly showServiceNav = input<boolean>(true);
  readonly backLabel = input<string>('← TripShop');
  readonly backRoute = input<string | any[] | null>(null);
  readonly backPreserveQuery = input<boolean>(false);

  readonly services = [
    { tab: 'hotel', icon: 'hotel', label: 'Khách sạn & Resort' },
    { tab: 'flight', icon: 'flight', label: 'Vé máy bay' },
    { tab: 'tour', icon: 'local_activity', label: 'Hoạt động & Vui chơi' },
    { tab: 'bus', icon: 'directions_bus', label: 'Vé xe khách' },
  ];

  readonly subBrandLabel = computed(() => {
    switch (this.activeService()) {
      case 'hotel':
        return 'Khách sạn';
      case 'flight':
        return 'Chuyến bay';
      case 'bus':
        return 'Xe khách';
      case 'planning':
        return 'Lịch trình';
      default:
        return 'Hoạt động';
    }
  });

  readonly resolvedBackRoute = computed(() => this.backRoute() || '/trip-shop');

  readonly resolvedBackQuery = computed(() =>
    this.backRoute()
      ? null
      : { tab: this.activeService() === 'planning' ? 'hotel' : this.activeService() }
  );
}
