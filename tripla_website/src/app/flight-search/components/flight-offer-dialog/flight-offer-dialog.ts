import { AfterViewInit, Component, ElementRef, ViewChild, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight, FlightFare, FlightSelection } from '../../models/flight.model';
import { FlightSearchCriteria } from '../../models/flight-search-criteria.model';
export interface FlightFareOption extends FlightFare { outboundFare?:FlightFare; inboundFare?:FlightFare; }

@Component({
  selector: 'app-flight-offer-dialog', standalone: true, imports: [CommonModule],
  templateUrl: './flight-offer-dialog.html', styleUrl: './flight-offer-dialog.css',
})
export class FlightOfferDialog implements AfterViewInit {
  readonly flight = input.required<Flight>();
  readonly criteria = input.required<FlightSearchCriteria>();
  readonly leg = input<'outbound' | 'inbound'>('outbound');
  readonly selection = input<FlightSelection>({ outbound: null, inbound: null });
  readonly demo = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<{ flight: Flight; fare: FlightFareOption }>();
  readonly activeCabin = signal('');
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('fareRail') private fareRail?: ElementRef<HTMLElement>;

  readonly isRoundTrip = computed(() => this.criteria().tripType === 'round-trip' && !!this.criteria().returnDate);
  readonly journeyColumns = computed(() => {
    const c = this.criteria();
    return [
      { leg: 'outbound', label: 'Chuyến đi', from: c.from, to: c.to, date: c.departureDate,
        flight: this.leg() === 'outbound' ? this.flight() : this.selection().outbound },
      ...(this.isRoundTrip() ? [{ leg: 'inbound', label: 'Chuyến về', from: c.to, to: c.from, date: c.returnDate!,
        flight: this.leg() === 'inbound' ? this.flight() : this.selection().inbound }] : []),
    ];
  });
  readonly combinedPreview = computed(() => this.isRoundTrip() && this.demo() && !!this.selection().outbound && this.leg()==='inbound');
  private flightFares(f:Flight):FlightFare[] {
    if(f.fares?.length) return f.fares.filter(fare=>Number.isFinite(fare.price)&&fare.price>=0);
    return typeof f.price==='number'&&Number.isFinite(f.price)&&f.price>=0?[{id:f.id,name:'Giá vé hiện tại',cabin:this.criteria().cabin,price:f.price,currency:f.currency||'VND',carryOn:f.carryOnIncluded?'Có hành lý xách tay':undefined,checkedBaggage:f.baggageDescription}]:[];
  }
  readonly fares = computed<FlightFareOption[]>(() => {
    const f = this.flight();
    if(this.combinedPreview()) {
      const outbound=this.flightFares(this.selection().outbound!), inbound=this.flightFares(f);
      return inbound.flatMap((back,index)=>{
        const sameCabin=outbound.filter(go=>go.cabin===back.cabin&&go.currency===back.currency);
        const cabinIndex=inbound.slice(0,index).filter(fare=>fare.cabin===back.cabin).length;
        const go=sameCabin[cabinIndex]; if(!go)return [];
        return [{...back,id:`${go.id}+${back.id}`,name:`Khứ hồi · ${back.name}`,price:go.price+back.price,
          outboundFare:go,inboundFare:back,
          carryOn:`Đi: ${go.carryOn||'chưa có thông tin'} · Về: ${back.carryOn||'chưa có thông tin'}`,
          checkedBaggage:`Đi: ${go.checkedBaggage||'chưa có thông tin'} · Về: ${back.checkedBaggage||'chưa có thông tin'}`,
          changePolicy:`Đi: ${go.changePolicy||'chờ xác nhận'} · Về: ${back.changePolicy||'chờ xác nhận'}`,
          refundPolicy:`Đi: ${go.refundPolicy||'chờ xác nhận'} · Về: ${back.refundPolicy||'chờ xác nhận'}`,
          notes:['Tổng giá mẫu của hai chiều, chưa phải báo giá combo được nhà cung cấp xác nhận.']}];
      });
    }
    if (f.fares?.length) return f.fares.filter(fare => Number.isFinite(fare.price) && fare.price >= 0);
    return typeof f.price === 'number' && Number.isFinite(f.price) && f.price >= 0 ? [{
      id: f.id, name: 'Giá vé hiện tại', cabin: this.criteria().cabin, price: f.price,
      currency: f.currency || 'VND',
      carryOn: f.carryOnIncluded === true ? 'Có hành lý xách tay' : f.carryOnIncluded === false ? 'Chưa gồm hành lý xách tay' : undefined,
      checkedBaggage: f.baggageDescription || (f.checkedBaggageIncluded === true ? 'Có hành lý ký gửi' : f.checkedBaggageIncluded === false ? 'Chưa gồm hành lý ký gửi' : undefined),
    }] : [];
  });
  readonly cabins = computed(() => [...new Set(this.fares().map(fare => fare.cabin))]);
  readonly visibleFares = computed(() => this.fares().filter(fare => fare.cabin === (this.activeCabin() || this.cabins()[0])));
  ngAfterViewInit(): void { this.dialog.nativeElement.showModal(); }
  duration(flight: Flight): string {
    return `${Math.floor(flight.durationMinutes / 60)}h ${flight.durationMinutes % 60}m`;
  }
  backdropClick(event: MouseEvent): void {
    if (event.target === this.dialog.nativeElement) this.closed.emit();
  }
  scrollFares(direction: number): void {
    this.fareRail?.nativeElement.scrollBy({ left: direction * 270, behavior: 'smooth' });
  }
}
