import { CheckoutPage } from '../../../checkout/pages/checkout-page/checkout-page';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { FlightOfferDialog } from './flight-offer-dialog';
import { FlightSearchResults } from '../../pages/flight-search-results/flight-search-results';
import { airports, FlightSearchCriteria } from '../../models/flight-search-criteria.model';
import { demoFlightData } from '../../services/flight-demo';

const criteria: FlightSearchCriteria = {
  service: 'flight',
  tripType: 'one-way',
  from: airports[0],
  to: airports[1],
  departureDate: '2099-12-12',
  returnDate: null,
  adults: 1,
  children: 0,
  infants: 0,
  cabin: 'Phổ thông',
};
function createDialog(c = criteria) {
  const fixture = TestBed.createComponent(FlightOfferDialog);
  fixture.componentRef.setInput('criteria', c);
  fixture.componentRef.setInput('flight', demoFlightData(c).outbound[0]);
  const showModal = vi.fn();
  Object.defineProperty(fixture.nativeElement.querySelector('dialog'), 'showModal', {
    value: showModal,
  });
  fixture.detectChanges();
  return { fixture, showModal };
}

describe('Flight offer popup', () => {
  afterEach(() => vi.restoreAllMocks());
  it('opens a one-way dialog with only the outbound column and switches cabin tabs', () => {
    const { fixture, showModal } = createDialog();
    expect(showModal).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelectorAll('.journey-column')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.fare-card')).toHaveLength(3);
    (fixture.nativeElement.querySelectorAll('.cabin-tabs button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.fare-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Phổ thông đặc biệt');
  });
  it('shows a separate return column without inventing an unselected return flight', () => {
    const c: FlightSearchCriteria = {
      ...criteria,
      tripType: 'round-trip',
      returnDate: '2099-12-15',
    };
    const { fixture } = createDialog(c);
    expect(fixture.nativeElement.querySelectorAll('.journey-column')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Chưa chọn chuyến về');
    const data = demoFlightData(c);
    fixture.componentRef.setInput('leg', 'inbound');
    fixture.componentRef.setInput('flight', data.inbound[0]);
    fixture.componentRef.setInput('selection', { outbound: data.outbound[0], inbound: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline')).toHaveLength(2);
    expect(fixture.componentInstance.journeyColumns()[1].flight!.from).toBe('HAN');
  });
  it('emits the chosen fare and closes on Escape', () => {
    const { fixture } = createDialog();
    const confirmed = vi.fn(),
      closed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.closed.subscribe(closed);
    (fixture.nativeElement.querySelectorAll('.choose-fare')[1] as HTMLButtonElement).click();
    expect(confirmed.mock.calls[0][0].fare.id).toContain('-flex');
    fixture.nativeElement
      .querySelector('dialog')
      .dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closed).toHaveBeenCalledOnce();
  });
  it('selects both round-trip flights before opening fare choices and preserves outbound on return-date edits', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'flight-search-results', component: FlightSearchResults },
          { path: 'checkout/:bookingType', component: CheckoutPage },
        ]),
      ],
    });
    vi.spyOn(FlightOfferDialog.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      '/flight-search-results?demo=true&tripType=round-trip&from=SGN&to=HAN&departureDate=2099-12-12&returnDate=2099-12-15&adults=1&children=0&infants=0&cabin=' +
        encodeURIComponent('Phổ thông'),
      FlightSearchResults,
    );
    (harness.routeNativeElement!.querySelector('.select-flight') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.pendingFlight()).toBeNull();
    expect(page.selection().outbound).not.toBeNull();
    expect(page.state()!.leg).toBe('inbound');
    const outbound = page.selection().outbound!;
    page.changeDate('2099-12-16');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.selection().outbound!.id).toBe(outbound.id);
    expect(page.selection().inbound).toBeNull();
    (harness.routeNativeElement!.querySelector('.select-flight') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(page.pendingFlight()).not.toBeNull();
    expect(page.selection().inbound!.departureAt).toContain('2099-12-16');
    expect(harness.routeNativeElement!.querySelectorAll('.journey-column')).toHaveLength(2);
    (harness.routeNativeElement!.querySelector('.choose-fare') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.pendingFlight()).toBeNull();
    expect(page.selection().outbound).not.toBeNull();
    expect(page.fareSelection().outbound).not.toBeNull();
    expect(page.fareSelection().inbound).not.toBeNull();
    expect(page.state()!.leg).toBe('inbound');
    expect(harness.routeDebugElement!.componentInstance instanceof CheckoutPage).toBe(true);
    expect(harness.routeNativeElement!.querySelector('app-flight-passenger-form')).not.toBeNull();
  });
  it('opens fare choices immediately for a one-way flight', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'flight-search-results', component: FlightSearchResults },
          { path: 'checkout/:bookingType', component: CheckoutPage },
        ]),
      ],
    });
    vi.spyOn(FlightOfferDialog.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      '/flight-search-results?demo=true&tripType=one-way&from=SGN&to=HAN&departureDate=2099-12-12&adults=1&children=0&infants=0&cabin=' +
        encodeURIComponent('Phổ thông'),
      FlightSearchResults,
    );
    (harness.routeNativeElement!.querySelector('.select-flight') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(page.pendingFlight()).not.toBeNull();
    expect(page.selection().outbound).toBeNull();
    expect(harness.routeNativeElement!.querySelectorAll('.journey-column')).toHaveLength(1);
  });
  it('adds only compatible sample fares into round-trip options', () => {
    const c: FlightSearchCriteria = {
      ...criteria,
      tripType: 'round-trip',
      returnDate: '2099-12-15',
    };
    const { fixture } = createDialog(c);
    const data = demoFlightData(c);
    fixture.componentRef.setInput('demo', true);
    fixture.componentRef.setInput('leg', 'inbound');
    fixture.componentRef.setInput('flight', data.inbound[0]);
    fixture.componentRef.setInput('selection', {
      outbound: data.outbound[0],
      inbound: data.inbound[0],
    });
    fixture.detectChanges();
    const option = fixture.componentInstance.fares()[0];
    expect(option.price).toBe(option.outboundFare!.price + option.inboundFare!.price);
    expect(option.outboundFare!.currency).toBe(option.inboundFare!.currency);
    expect(option.outboundFare!.cabin).toBe(option.inboundFare!.cabin);
  });
});
