import { TestBed } from '@angular/core/testing';
import { TripshortService} from './tripshort-service';

describe('TripshortService', () => {
  let service: TripshortService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripshortService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
