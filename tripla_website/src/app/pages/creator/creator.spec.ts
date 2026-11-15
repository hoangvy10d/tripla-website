import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CreatorComponent } from './creator';

describe('CreatorComponent', () => {
  let component: CreatorComponent;
  let fixture: ComponentFixture<CreatorComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreatorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load creator profile', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();

    const profileReq = httpMock.expectOne('/api/v1/users/u1/profile');
    const hotelsReq = httpMock.expectOne('/api/v1/hotels');
    const locationsReq = httpMock.expectOne('/api/v1/locations');

    profileReq.flush({
      user: {
        _id: 'u1',
        full_name: 'Nguyễn Hoàng Vy',
        avatar: '/images/Grassland.jpeg',
        followers: 12500
      },
      contents: [
        {
          _id: 'c1',
          content_title: 'Hoàng hôn Sơn Trà',
          stats: { views: 10000, likes: 2500, commentsCount: 40, bookmarks: 80 },
          hotspots: { resort: { hotel_id: { hotel_name: 'InterContinental Danang' } } }
        }
      ]
    });
    hotelsReq.flush({ items: [] });
    locationsReq.flush({ items: [] });

    expect(component.user.full_name).toBe('Nguyễn Hoàng Vy');
    expect(component.contents.length).toBe(1);
    expect(component.totalViews).toBe(10000);
    expect(component.totalLikes).toBe(2500);
    expect(component.estimatedRevenue).toBe(350000);
    expect(component.formatVnd(350000)).toContain('350.000');
  });

  it('should toggle upload modal', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/users/u1/profile').flush({ user: {}, contents: [] });
    httpMock.expectOne('/api/v1/hotels').flush({ items: [] });
    httpMock.expectOne('/api/v1/locations').flush({ items: [] });

    expect(component.isUploadOpen).toBe(false);
    component.openUpload();
    expect(component.isUploadOpen).toBe(true);
    component.closeUpload();
    expect(component.isUploadOpen).toBe(false);
  });
});

