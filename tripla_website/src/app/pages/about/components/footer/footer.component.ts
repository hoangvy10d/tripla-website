import { Component } from '@angular/core';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly ecosystem = ['TripShorts', 'Bộ Sưu Tập Nghỉ Dưỡng Thiên Nhiên', 'Đặc Quyền Khách VIP'];
  readonly email = 'concierge@tripla.luxury';
  readonly places = 'Sài Gòn • Vịnh Vĩnh Hy • Phú Quốc • Đà Lạt';
  readonly legal = ['Điều Khoản Dịch Vụ', 'Chính Sách Bảo Mật'];
}
