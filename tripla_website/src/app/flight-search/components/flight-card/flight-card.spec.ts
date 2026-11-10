import { TestBed } from '@angular/core/testing';
import { FlightCard } from './flight-card';
import { Flight } from '../../models/flight.model';

const flight: Flight = {
  id: 'offer-1', airlineCode: 'VN', airlineName: 'Vietnam Airlines', flightNumber: 'VN123',
  from: 'SGN', to: 'HAN', departureAt: '2099-12-12T23:00:00+07:00',
  arrivalAt: '2099-12-13T01:10:00+07:00', durationMinutes: 130, stops: 0,
  price: 2549070, currency: 'VND',
};

describe('Flight card', () => {
  it('renders the airline, local times, overnight arrival and emits the exact offer', () => {
    const fixture = TestBed.createComponent(FlightCard);
    fixture.componentRef.setInput('flight', flight);
    fixture.detectChanges();
    const selected: Flight[] = [];
    fixture.componentInstance.selected.subscribe(value => selected.push(value));
    expect(fixture.nativeElement.textContent).toContain('Vietnam Airlines');
    expect(fixture.nativeElement.textContent).toContain('VN123');
    expect(fixture.nativeElement.textContent).toContain('23:00');
    expect(fixture.nativeElement.textContent).toContain('+1 ngày');
    expect(fixture.nativeElement.textContent).toContain('2h 10m');
    fixture.nativeElement.querySelector('.select-flight').click();
    expect(selected).toEqual([flight]);
  });

  it('shows genuine price reductions, promotions and supplied price conventions', () => {
    const fixture = TestBed.createComponent(FlightCard);
    fixture.componentRef.setInput('flight', { ...flight, originalPrice: 2800000,
      priceBasis: 'adult', taxesIncluded: true,
      promotions: [{ id: 'promo-1', label: 'Ưu đãi mùa hè' }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.original-price')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.promotion').textContent).toContain('Ưu đãi mùa hè');
    expect(fixture.nativeElement.textContent).toContain('Đã gồm thuế, phí');
    expect(fixture.nativeElement.textContent).toContain('/ người lớn');
    fixture.componentRef.setInput('flight', { ...flight, originalPrice: flight.price });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.original-price')).toBeNull();
  });

  it('handles missing price, unknown baggage and broken airline logos', () => {
    const fixture = TestBed.createComponent(FlightCard);
    fixture.componentRef.setInput('flight', { ...flight, price: undefined, airlineLogo: '/missing.png' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.airline-logo').textContent).toContain('VN');
    expect(fixture.nativeElement.textContent).toContain('Chưa có giá vé');
    expect(fixture.nativeElement.textContent).toContain('Hành lý: xem điều kiện vé');
    expect(fixture.nativeElement.querySelector('.select-flight').disabled).toBe(true);
  });
});
