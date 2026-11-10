import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingDraft } from '../../../models/booking-draft.model';
@Component({
  selector: 'app-checkout-booking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-summary.html',
  styleUrl: './booking-summary.css',
})
export class BookingSummary {
  readonly draft = input.required<BookingDraft>();
  readonly hotel = computed(() => {
    const draft = this.draft();
    return draft.type === 'hotel' ? draft : null;
  });
  readonly view = computed(() => {
    const draft = this.draft();
    switch (draft.type) {
      case 'hotel': {
        const s = draft.selection,
          c = s.criteria;
        return {
          title: s.hotelName,
          subtitle: s.roomName,
          rows: [
            { label: 'Nhận phòng', value: c.checkIn },
            { label: 'Trả phòng', value: c.checkOut },
            { label: 'Khách', value: `${c.adults} người lớn · ${c.children} trẻ em` },
            { label: 'Số phòng', value: String(c.rooms) },
            ...(s.cancellationPolicy
              ? [{ label: 'Chính sách hủy', value: s.cancellationPolicy }]
              : []),
          ],
        };
      }
      case 'flight': {
        const s = draft.selection;
        return {
          title: s.airline,
          subtitle: `${s.from} → ${s.to}`,
          rows: [
            { label: 'Khởi hành', value: s.departureAt },
            { label: 'Đến nơi', value: s.arrivalAt },
            { label: 'Hành trình', value: s.inboundId ? 'Khứ hồi' : 'Một chiều' },
            { label: 'Hành khách', value: String(s.adults + s.children + s.infants) },
            { label: 'Hạng vé', value: s.cabin },
            { label: 'Gói chiều đi', value: s.fares.outbound.name },
            ...(s.inbound
              ? [
                  {
                    label: 'Chiều về',
                    value: `${s.inbound.from} → ${s.inbound.to} · ${s.inbound.departureAt}`,
                  },
                  { label: 'Gói chiều về', value: s.fares.inbound?.name || 'Chưa xác nhận' },
                ]
              : []),
          ],
        };
      }
      case 'activity': {
        const s = draft.selection;
        return {
          title: s.activityName,
          subtitle: s.ticketName,
          rows: [
            { label: 'Ngày trải nghiệm', value: s.visitDate },
            { label: 'Số vé', value: String(s.quantity) },
            {
              label: 'Thông tin người tham gia',
              value: s.requiresParticipants ? 'Yêu cầu theo từng vé' : 'Không yêu cầu riêng',
            },
          ],
        };
      }
      case 'bus': {
        const s = draft.selection;
        return {
          title: s.operator,
          subtitle: `${s.from} → ${s.to}`,
          rows: [
            { label: 'Khởi hành', value: s.departureAt },
            { label: 'Ghế đã chọn', value: s.seats.map((seat) => seat.label).join(', ') },
            { label: 'Hành khách', value: String(s.passengers) },
            { label: 'Điểm đón', value: s.pickup },
            { label: 'Điểm trả', value: s.dropoff },
            { label: 'Phạm vi', value: 'Chiều đã chọn ghế; chưa bao gồm chiều còn lại' },
            ...(s.infants ? [{ label: 'Em bé đi cùng', value: String(s.infants) }] : []),
          ],
        };
      }
    }
  });
}
