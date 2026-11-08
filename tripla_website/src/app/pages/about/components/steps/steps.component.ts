import { Component } from '@angular/core';
import { ParallaxDirective } from '../../directives/parallax.directive';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-steps',
  standalone: true,
  imports: [ParallaxDirective, RevealDirective],
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.css',
})
export class StepsComponent {
  readonly steps = [
    {
      no: '01', icon: 'movie_filter', tone: 'primary', speed: 0.04,
      title: 'Cảm Hứng Thị Giác Bản Thật',
      text: 'Dòng chảy video review 9:16 sống động, tự động phát mượt mà không độ trễ, lưu giữ nguyên vẹn sắc màu tự nhiên và xúc cảm phiêu lưu.',
      footIcon: 'check_circle', foot: 'Khám phá không giới hạn',
    },
    {
      no: '02', icon: 'ads_click', tone: 'amber', speed: -0.07,
      title: 'Tag Tương Tác 1 Chạm Thông Minh',
      text: 'Chạm trực tiếp vào khung hình video để hiển thị vị trí resort, đánh giá Michelin/5-sao và mức giá ưu đãi độc quyền theo thời gian thực.',
      footIcon: 'verified', foot: 'Dữ liệu minh bạch 100%',
    },
    {
      no: '03', icon: 'credit_score', tone: 'primary', speed: 0.04,
      title: 'Đặt Chỗ Liền Mạch',
      text: 'Thanh điều khiển trượt ra nhẹ nhàng, tích hợp thanh toán Apple Pay/Thẻ quốc tế mà không hề làm gián đoạn thước phim đang xem.',
      footIcon: 'lock', foot: 'Bảo mật chuẩn Thụy Sĩ',
    },
  ];
}
