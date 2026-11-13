import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly ecosystem = [
    { label: 'TripShorts', route: '/tripshort' },
    { label: 'Bộ Sưu Tập Nghỉ Dưỡng Thiên Nhiên', route: '/trip-shop' },
    { label: 'Đặc Quyền Khách VIP', route: '/profile' },
  ];
  readonly email = 'concierge@tripla.luxury';
  readonly places = 'Sài Gòn • Vịnh Vĩnh Hy • Phú Quốc • Đà Lạt';
  readonly legal = [
    { label: 'Điều Khoản Dịch Vụ', route: '/policies', fragment: 'dieu-khoan' },
    { label: 'Chính Sách Bảo Mật', route: '/policies', fragment: 'bao-mat' },
  ];
}
