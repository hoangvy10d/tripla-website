import { Service } from '@angular/core';
import { StatPill, TripCard } from '../models/home.model';
import { Observable,  } from 'rxjs/internal/Observable';
import { delay } from 'rxjs/internal/operators/delay';
import { MOCK_STAT_PILLS, MOCK_TRIP_CARDS } from '../mock/home.mock';
import { of } from 'rxjs';

@Service()
export class HomeService {
    // Giả lập gọi API lấy danh sách chuyến đi
  getTripCards(): Observable<TripCard[]> {
    return of(MOCK_TRIP_CARDS).pipe(delay(300)); // Delay 300ms cho giống mạng thật
  }

  // Giả lập gọi API lấy thống kê StatPills
  getStatPills(): Observable<StatPill[]> {
    return of(MOCK_STAT_PILLS).pipe(delay(200));
  }
}
