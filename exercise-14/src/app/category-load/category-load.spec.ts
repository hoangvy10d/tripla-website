import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryLoad } from './category-load';

describe('CategoryLoad', () => {
  let component: CategoryLoad;
  let fixture: ComponentFixture<CategoryLoad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryLoad],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryLoad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
