import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeopleLoad } from './people-load';

describe('PeopleLoad', () => {
  let component: PeopleLoad;
  let fixture: ComponentFixture<PeopleLoad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PeopleLoad],
    }).compileComponents();

    fixture = TestBed.createComponent(PeopleLoad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
