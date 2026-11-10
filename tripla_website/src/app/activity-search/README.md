# Hoạt động & Vui chơi

Route: `/activity-search?location=...&query=...&categories=...`.

`models/` định nghĩa địa điểm, tiêu chí và danh mục dùng chung với TripShop.
`services/activity-search.ts` cung cấp nguồn dữ liệu minh họa và lọc kết quả.
`pages/activity-search-results/` đọc URL và điều phối tìm kiếm.
`components/` gồm thanh tìm kiếm, bộ chọn nhiều danh mục, card và danh sách kết quả.
Mỗi component có file TS, HTML và CSS riêng.

- Chỉ chọn thành phố: hiện toàn bộ gợi ý của thành phố có trong nguồn dữ liệu.
- Chọn thêm danh mục: lọc theo ít nhất một danh mục đã chọn (OR).
- Từ khóa được kết hợp với địa điểm/danh mục (AND), có hỗ trợ không dấu.
- Các danh mục trong URL phân cách bằng `|`; giá trị không hỗ trợ được bỏ qua.
- Refresh và liên kết trực tiếp khôi phục tiêu chí, không phụ thuộc draft trong bộ nhớ.
- Hiện dùng fixtures có thông báo trên trang; ảnh chỉ minh họa, không phải ảnh xác thực của điểm đến.
- Giá và đánh giá trên card là dữ liệu mẫu, không phải giá bán/đánh giá thực tế.
- Bộ lọc checkbox gồm Food & Dining, có bỏ từng mục và đặt lại. Khoảng giá lọc
  theo `priceFrom` bằng VND/người; mức tối đa 4.000.000+ nghĩa là không giới hạn trần.
  Kết quả thiếu giá bị loại khi áp dụng khoảng giá.
- `minPrice`, `maxPrice`, `sort` được lưu trong URL; hỗ trợ sắp xếp theo giá tăng/giảm.
- Không có lịch mở cửa, vé trống hay thao tác đặt vé giả.
- Điểm đến không có trong fixtures hiện trạng thái chưa có gợi ý, không tự sinh địa điểm.

Khi tích hợp API, thay implementation `ActivitySearchService.search(criteria)` và
chuyển kết quả về `Activity[]`. Trang dùng `switchMap` để hủy nguồn kết quả cũ;
component tìm kiếm, danh mục và card không tự gọi API hay điều khiển Router.

Kiểm tra: `npm.cmd test -- --watch=false --include=src/app/activity-search/*.spec.ts`.

## Trang chi tiết địa điểm

- `/activities/:id` mở từ toàn bộ card (nút lưu là thao tác riêng). Query tìm kiếm
  được giữ khi mở và quay lại danh sách.
- `ActivityNavigation` dùng chung cho trang danh sách và chi tiết.
- `ActivitySearchService.getDetails(id)` cung cấp `ActivityDetails`, gồm ảnh,
  highlights, experiences, reviews và tickets; không fetch trong card.
- Gallery xem ảnh trong native dialog; nút mục nội dung cuộn ngay trong trang.
- Các gói vé có thể lọc nhóm, mở điều kiện và xem thông tin theo ngày đã chọn.
  Ngày quá khứ/không hợp lệ không được chọn gói. Chưa xác nhận tồn vé, giữ chỗ
  hay thanh toán. Tất cả giá, đánh giá, nội dung gói và ảnh đều là minh họa.
- Lưu trên details dùng cùng khóa `activity:<id>` và store SavedTrips với card.
- ID không tồn tại hiện trạng thái chưa tìm thấy; nguồn lỗi hiện thông báo tải lỗi.
