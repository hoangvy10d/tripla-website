import { Flight, FlightSearchData } from '../models/flight.model';
import { FlightSearchCriteria } from '../models/flight-search-criteria.model';

// Fictional offers for UI preview, never booking inventory.
export function demoFlightData(criteria: FlightSearchCriteria): FlightSearchData {
  const leg = (date: string, from: string, to: string, direction: string): Flight[] => {
    const tomorrow = new Date(`${date}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const nextDate = tomorrow.toISOString().slice(0, 10);
    return [
      { airlineCode: 'VN', airlineName: 'Vietnam Airlines', flightNumber: 'VN123',
        departure: '23:00', arrival: '01:10', price: 2549070, baggageDescription: '1 kiện × 23 kg ký gửi', checkedBaggageIncluded: true },
      { airlineCode: 'VJ', airlineName: 'Vietjet Air', flightNumber: 'VJ456',
        departure: '23:10', arrival: '01:20', price: 1655657, originalPrice: 1729845, baggageDescription: '7 kg xách tay', checkedBaggageIncluded: false },
      { airlineCode: 'VJ', airlineName: 'Vietjet Air', flightNumber: 'VJ458',
        departure: '23:55', arrival: '02:05', price: 1655657, originalPrice: 1680319, baggageDescription: '7 kg xách tay', checkedBaggageIncluded: false },
    ].map((offer, index) => ({ ...offer, id: `demo-${direction}-${index}`, from, to,
      departureAt: `${date}T${offer.departure}:00+07:00`, arrivalAt: `${nextDate}T${offer.arrival}:00+07:00`,
      durationMinutes: 130, stops: 0, carryOnIncluded: true, currency: 'VND', priceBasis: 'adult', taxesIncluded: true,
      promotions: [{ id: 'demo-offer', label: 'Ưu đãi minh họa · Không áp dụng đặt vé' }],
      aircraft: 'Airbus A321 (minh họa)', departureTerminal: '1', arrivalTerminal: '1',
      fares: [
        { id: `demo-${direction}-${index}-basic`, name: 'Phổ thông · Tiêu chuẩn', cabin: 'Phổ thông',
          price: offer.price, currency: 'VND', carryOn: 'Hành lý xách tay 7 kg',
          checkedBaggage: offer.checkedBaggageIncluded ? 'Hành lý ký gửi 23 kg' : 'Chưa gồm hành lý ký gửi',
          changePolicy: 'Không áp dụng đổi vé (minh họa)', refundPolicy: 'Không hoàn vé (minh họa)',
          notes: ['Điều kiện vé và giá chỉ dùng để minh họa giao diện.'] },
        { id: `demo-${direction}-${index}-flex`, name: 'Phổ thông · Linh hoạt', cabin: 'Phổ thông',
          price: offer.price + 250000, currency: 'VND', carryOn: 'Hành lý xách tay 7 kg', checkedBaggage: 'Hành lý ký gửi 23 kg',
          changePolicy: 'Có thể đổi vé, có thu phí (minh họa)', refundPolicy: 'Điều kiện hoàn vé tùy gói (minh họa)' },
        { id: `demo-${direction}-${index}-plus`, name: 'Phổ thông · Trọn gói', cabin: 'Phổ thông',
          price: offer.price + 450000, currency: 'VND', carryOn: 'Hành lý xách tay 7 kg', checkedBaggage: 'Hành lý ký gửi 32 kg',
          notes: ['Gói bổ sung chỉ dùng để xem trước bố cục.'] },
        { id: `demo-${direction}-${index}-premium`, name: 'Phổ thông đặc biệt', cabin: 'Phổ thông đặc biệt',
          price: offer.price + 1200000, currency: 'VND', carryOn: 'Hành lý xách tay 10 kg', checkedBaggage: 'Hành lý ký gửi 32 kg' },
      ],
    }));
  };
  return { outbound: leg(criteria.departureDate, criteria.from.code, criteria.to.code, 'outbound'),
    inbound: criteria.tripType === 'round-trip' && criteria.returnDate
      ? leg(criteria.returnDate, criteria.to.code, criteria.from.code, 'inbound') : [] };
}
