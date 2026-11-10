# Vé xe khách

Route `/bus-search` đọc điểm đi, điểm đến, ngày đi/về, người lớn/em bé,
chiều đang xem, nhà xe và khoảng giờ từ query parameters.

- `models/`: tiêu chí, bộ lọc, hợp đồng dữ liệu và validation.
- `services/`: nguồn dữ liệu mẫu, lọc theo nhà xe/giờ khởi hành (AND giữa hai nhóm).
- `components/`: thanh tìm kiếm, bộ lọc và card chuyến xe, có TS/HTML/CSS riêng.
- `pages/`: điều phối Router, nguồn kết quả, loading, lỗi và chọn chiều đi/về.
- Điều hướng dùng chung với Hoạt động, có activeService=bus.

Dữ liệu nhà xe, lịch chạy, giá, loại xe, điểm đón/trả và tiện ích đều minh họa.
Giá hiển thị / ghế người lớn; chính sách em bé cần API xác nhận. Không đặt vé,
giữ chỗ hay xác nhận số ghế trống. Tàu hỏa hiển thị chưa hỗ trợ, không phải tab giả.
Chọn chuyến chỉ lưu lựa chọn trong trang; khứ hồi chuyển sang kết quả chiều về.
Đổi tiêu chí tìm kiếm sẽ xóa lựa chọn cũ; đổi bộ lọc giữ nguyên tiêu chí và lựa chọn.

Khi có API, thay `BusSearchService.search()` và chuyển dữ liệu về `BusTrip[]`.
Trang dùng switchMap để hủy kết quả cũ khi URL đổi. Refresh/direct URL khôi phục
điều kiện tìm kiếm và bộ lọc. Tuyến không có dữ liệu hiển thị empty state.

Kiểm tra: `npm.cmd test -- --watch=false --include=src/app/bus-search/*.spec.ts`.
