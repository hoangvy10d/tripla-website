import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer';

interface PolicySub {
  title: string;
  paragraphs?: string[];
  items?: { label: string; text: string }[];
}

interface PolicyArticle {
  anchor: string;
  title: string;
  subs: PolicySub[];
}

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './policies.html',
  styleUrls: ['./policies.css']
})
export class PoliciesComponent implements AfterViewInit {
  private route = inject(ActivatedRoute);
  private scroller = inject(ViewportScroller);

  activeAnchor = 'thanh-toan';

  readonly articles: PolicyArticle[] = [
    {
      anchor: 'thanh-toan',
      title: 'ĐIỀU 1: CHÍNH SÁCH THANH TOÁN VÀ NIÊM YẾT GIÁ',
      subs: [
        {
          title: '1.1. Cơ chế hóa đơn tích hợp',
          paragraphs: [
            'Nền tảng áp dụng giải pháp thanh toán tổng hợp cho phép Người dùng gộp nhiều danh mục dịch vụ độc lập bao gồm lưu trú, tham quan, di chuyển và trải nghiệm vào một giỏ hàng duy nhất. Người dùng chỉ cần thực hiện một lệnh thanh toán toàn diện cho toàn bộ lịch trình. Hệ thống tự động phân tách, đối lưu dòng tiền và thực hiện nghĩa vụ quyết toán bảo mật với từng nhà cung cấp dịch vụ đối tác theo các cam kết thương mại đã thiết lập.'
          ]
        },
        {
          title: '1.2. Quy định về giá và đơn vị tiền tệ',
          paragraphs: [
            'Tất cả mức giá được công bố công khai trên Nền tảng đều là giá cuối cùng đã bao gồm thuế giá trị gia tăng (VAT) và các loại phí dịch vụ bắt buộc từ nhà cung cấp. Đơn vị tiền tệ giao dịch mặc định là Việt Nam Đồng (VNĐ) hoặc Đô la Mỹ (USD). Quy trình quy đổi tỷ giá và quy tắc làm tròn số được thực hiện tự động dựa trên thời điểm phát sinh giao dịch.'
          ]
        }
      ]
    },
    {
      anchor: 'hoan-huy',
      title: 'ĐIỀU 2: CHÍNH SÁCH HOÀN, HỦY VÀ THAY ĐỔI DỊCH VỤ',
      subs: [
        {
          title: '2.1. Nguyên tắc xử lý đơn hàng đa dịch vụ',
          paragraphs: [
            'Đối với các đơn hàng thuộc giỏ hàng tổng hợp, Người dùng có quyền yêu cầu hủy một hoặc một vài dịch vụ đơn lẻ trong hành trình mà không làm ảnh hưởng đến trạng thái vận hành của các dịch vụ còn lại. Tổng giá trị hoàn lại sẽ được hệ thống khấu trừ và tính toán tự động dựa trên chính sách độc lập của riêng nhà cung cấp dịch vụ bị hủy đó.'
          ]
        },
        {
          title: '2.2. Các cấp độ áp dụng chính sách hoàn tiền',
          paragraphs: [
            'Chính sách hoàn tiền cụ thể được ghi nhận rõ ràng tại bước xác nhận giao dịch và phân định thành ba cấp độ bắt buộc:'
          ],
          items: [
            {
              label: 'Cấp độ Linh hoạt:',
              text: 'Người dùng được phép hủy dịch vụ miễn phí trước thời điểm khởi hành hoặc nhận phòng tối thiểu 24 giờ. Hệ thống sẽ hoàn trả 100% giá trị giao dịch vào phương thức thanh toán ban đầu của Người dùng.'
            },
            {
              label: 'Cấp độ Tiêu chuẩn:',
              text: 'Người dùng được phép hủy dịch vụ miễn phí trước thời điểm sử dụng tối thiểu 05 ngày. Mọi hành vi hủy dịch vụ sau thời hạn nêu trên sẽ chịu phí phạt tương đương 50% tổng giá trị dịch vụ bị hủy.'
            },
            {
              label: 'Cấp độ Nghiêm ngặt:',
              text: 'Hoàn toàn không áp dụng chính sách hoàn tiền, hủy bỏ hoặc thay đổi lịch trình sau khi đơn đặt chỗ đã được hệ thống xác nhận thành công. Quy định này thường áp dụng đối với dịch vụ vé sự kiện hoặc các chương trình ưu đãi đặc biệt.'
            }
          ]
        }
      ]
    },
    {
      anchor: 'dieu-khoan',
      title: 'ĐIỀU 3: ĐIỀU KHOẢN SỬ DỤNG VÀ KIỂM DUYỆT NỘI DUNG SỐ',
      subs: [
        {
          title: '3.1. Trách nhiệm pháp lý của Nhà sáng tạo nội dung',
          paragraphs: [
            'Cá nhân tham gia đăng tải các đoạn video ngắn (Reels) truyền cảm hứng du lịch trên Nền tảng phải chịu trách nhiệm pháp lý độc lập và toàn diện về tính chính xác của thông tin. Nhà sáng tạo nội dung cam kết sở hữu hợp pháp hoặc có quyền sử dụng đối với toàn bộ hình ảnh, âm thanh và tư liệu xuất hiện trong video. Nghiêm cấm các hành vi đăng tải nội dung bóp méo thực tế hoặc gây hiểu lầm về chất lượng dịch vụ của các đối tác liên kết.'
          ]
        },
        {
          title: '3.2. Quy trình kiểm duyệt và xử lý vi phạm nội dung',
          paragraphs: [
            'Ban quản trị Nền tảng giữ toàn quyền biên tập, tạm ẩn hoặc gỡ bỏ vĩnh viễn các nội dung số vi phạm Tiêu chuẩn cộng đồng mà không cần thông báo trước. Các trường hợp bị xử lý bao gồm: nội dung chứa thông tin quảng cáo không lành mạnh, spam, sai lệch giá cả; video vi phạm bản quyền của bên thứ ba; hoặc video không đáp ứng đúng tiêu chuẩn kỹ thuật hiển thị dọc theo tỷ lệ 9:16, độ phân giải thấp, hình ảnh bị mờ hoặc nhiễu.'
          ]
        }
      ]
    },
    {
      anchor: 'bao-mat',
      title: 'ĐIỀU 4: CHÍNH SÁCH BẢO MẬT VÀ XỬ LÝ DỮ LIỆU CÁ NHÂN',
      subs: [
        {
          title: '4.1. Thu thập dữ liệu và giám sát hành vi',
          paragraphs: [
            'Nhằm mục đích tối ưu hóa trải nghiệm cá nhân, Nền tảng thực hiện thu thập hợp pháp các thông tin bao gồm: thông tin liên hệ, lịch sử tương tác video Reels, danh sách địa điểm lưu trữ cá nhân và dữ liệu định vị vị trí (GPS) của Người dùng trong quá trình truy cập.'
          ]
        },
        {
          title: '4.2. Mục đích sử dụng dữ liệu định vị',
          paragraphs: [
            'Dữ liệu định vị (GPS) được Nền tảng sử dụng để xác định vị trí thực tế của Người dùng trên giao diện Bản đồ tương tác (Map Planning). Thông qua đó, hệ thống tự động xử lý, đề xuất và ghim các dịch vụ du lịch phù hợp xung quanh vị trí của Người dùng một cách chính xác nhất.'
          ]
        },
        {
          title: '4.3. Cam kết lưu trữ và bảo mật thông tin',
          paragraphs: [
            'Nền tảng sử dụng các giải pháp mã hóa dữ liệu an toàn kết hợp với bộ nhớ đệm (Cookies, Localstorage) để duy trì trạng thái đăng nhập bảo mật và lưu giữ dữ liệu giỏ hàng tạm thời. Chúng tôi cam kết không mua bán, chia sẻ, chuyển nhượng hoặc tiết lộ dữ liệu cá nhân của Người dùng cho bất kỳ bên thứ ba nào khi chưa có sự đồng ý bằng văn bản từ chủ thể dữ liệu, ngoại trừ các trường hợp bắt buộc theo yêu cầu của cơ quan pháp luật có thẩm quyền.'
          ]
        }
      ]
    }
  ];

  readonly navLabels: Record<string, string> = {
    'thanh-toan': 'Chính sách thanh toán',
    'hoan-huy': 'Chính sách Hoàn/Hủy',
    'dieu-khoan': 'Điều khoản sử dụng & Kiểm duyệt',
    'bao-mat': 'Chính sách bảo mật dữ liệu'
  };

  ngAfterViewInit(): void {
    this.route.fragment.subscribe((frag) => {
      if (frag) {
        setTimeout(() => this.scrollTo(frag), 50);
      }
    });
  }

  scrollTo(anchor: string): void {
    this.activeAnchor = anchor;
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.scroller.scrollToAnchor(anchor);
    }
  }
}

