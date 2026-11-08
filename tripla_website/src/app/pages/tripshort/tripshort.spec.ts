import { ComponentFixture, TestBed } from '@angular/core/testing';
import {  Tripshort } from './tripshort';

describe('Tripshort', () => {
  let component: Tripshort;
  let fixture: ComponentFixture<Tripshort>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tripshort],
    }).compileComponents();

    fixture = TestBed.createComponent(Tripshort);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
