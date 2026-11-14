import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisualSearch } from './visual-search';

describe('VisualSearch', () => {
  let component: VisualSearch;
  let fixture: ComponentFixture<VisualSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualSearch],
    }).compileComponents();

    fixture = TestBed.createComponent(VisualSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
