import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App, NOT_FOUND_IMAGE_PATH } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should apply global onerror fallback when an image fails to load', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const img = document.createElement('img');
    img.src = 'https://invalid.example.com/missing-photo.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe(NOT_FOUND_IMAGE_PATH);
    expect(img.dataset['fallbackApplied']).toBe('1');

    // Second error event must not loop endlessly
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe(NOT_FOUND_IMAGE_PATH);

    img.remove();
    fixture.destroy();
  });
});
