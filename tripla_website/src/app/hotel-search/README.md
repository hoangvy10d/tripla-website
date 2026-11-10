# Hotel Search

## Phạm vi và cấu trúc

Triển khai frontend cho Khách sạn & Resort trên Angular 22 standalone. Giữ
`TripShopComponent` hiện có thay vì đổi tên class gây ảnh hưởng routing/imports.
Không chuyển Flight, Hoạt động & Vui chơi hay Vé Xe Khách sang Hotel Results.

```text
src/app/hotel-search/
├── models/
│   ├── hotel-search-criteria.model.ts
│   ├── hotel-filter.model.ts
│   └── hotel.model.ts
├── services/hotel-search-draft.ts
├── pages/hotel-search-results/
│   └── hotel-search-results.{ts,html,css}
├── components/
│   ├── hotel-search-bar/hotel-search-bar.{ts,html,css}
│   ├── hotel-filter-sidebar/hotel-filter-sidebar.{ts,html,css}
│   ├── hotel-results-list/hotel-results-list.{ts,html,css}
│   └── hotel-card/hotel-card.{ts,html,css}
├── hotel-search.spec.ts
└── README.md
```

| Component | Trách nhiệm |
| --- | --- |
| TripShopComponent (giữ nguyên) | Form trang chủ; snapshot, validate và navigate khi bấm tìm khách sạn |
| HotelSearchResults | Đọc ActivatedRoute, giữ applied state, điều phối URL và component con |
| HotelSearchBar | Bản nháp địa điểm/ngày/khách/phòng; emit khi xác nhận tìm kiếm |
| HotelFilterSidebar | UI bộ lọc; emit thay đổi/reset; không gọi Router |
| HotelResultsList | Loading, empty state, danh sách; không quản lý URL |
| HotelCard | Typed input `Hotel`; chỉ hiển thị dữ liệu được cung cấp |

Mỗi component mới có HTML/CSS/TS riêng; CSS được giới hạn trong component.

## Những file hiện có đã sửa trong task này

- `src/app/pages/trip-shop/trip-shop.ts`: snapshot từ các biến hiện có,
  validation, navigation; lưu/khôi phục draft khi rời/quay lại TripShop.
- `src/app/pages/trip-shop/trip-shop.html`: nối nút tìm kiếm khách sạn và thông báo lỗi.
- `src/app/app.routes.ts`: lazy route `/hotel-search` trước wildcard.
- `src/app/services/trip-shop.ts`: bỏ dependency `HttpClient` không sử dụng.
  Service hiện trả `of(...)`; cấu hình ứng dụng không cung cấp HttpClient.
  Không thêm API hay thay đổi dữ liệu quảng bá hiện có.

Không sửa CSS, animation TripShop hoặc Tripshort trong task tìm kiếm này.

## Data flow

1. Người dùng sửa các biến `searchDestination`, `checkIn`, `checkOut`,
   `adults`, `children`, `rooms`, `accommodationType` sẵn có.
2. `searchHotels()` chỉ chạy cho tab hotel; lấy snapshot, validate và chuyển
   sang `/hotel-search` bằng Router query parameters.
3. `HotelSearchResults` subscribe `queryParamMap` với `takeUntilDestroyed()`.
   URL là nguồn duy nhất của applied criteria và filters.
4. `HotelSearchBar` nhận criteria qua typed input và tạo bản sao draft.
   Chỉ emit khi submit; không tự điều hướng khi thay input.
5. Sidebar emit filter mới; parent ghi toàn bộ criteria hiện tại và filters
   vào URL. Reset chỉ reset filters, giữ địa điểm/ngày/khách/phòng.
6. Refresh/direct link đọc lại URL. Back/Forward khôi phục state theo URL.

Query keys: `service`, `location`, `checkIn`, `checkOut`, `adults`, `children`,
`rooms`, `accommodation`, `minPrice`, `maxPrice`, `stars`, `minRating`,
`amenities`, `freeCancellation`, `payAtProperty`, `area`.
Không có thông tin tài khoản hay thanh toán trong URL.

## Applied state và draft

Filter-only navigation giữ reference criteria không đổi, do đó không gọi lại
`ngOnChanges` của thanh tìm kiếm và không ghi đè các chỉnh sửa chưa submit.
Thay criteria qua tìm kiếm hoặc browser history sẽ cập nhật draft theo URL.
Không có subscription ghi URL ngược lại, tránh vòng lặp đồng bộ.

`HotelSearchDraft` chỉ giữ form TripShop trong bộ nhớ để quay lại trang chủ
không mất thông tin; không phải kho dữ liệu kết quả, không thay thế URL và
không lưu thông tin vào localStorage. Refresh trang kết quả vẫn độc lập với service này.

Ô trống ở trang chủ có placeholder Đà Lạt; placeholder không được coi là lựa chọn.
Người dùng phải nhập/chọn địa điểm trước khi tìm kiếm. Ngày và số khách mặc
định lấy từ form hiện có, không thay bằng dữ liệu cố định khi navigate.

Các tag “Ưu điểm nổi bật” là nội dung giới thiệu theo yêu cầu trước đó,
không phải quick filters tương tác nên không tự áp chúng vào điều kiện tìm kiếm.
Các chính sách và tiện nghi có thể chọn ở Results và được lưu trong URL.

## Validation

- Điểm đến không trống; ngày đúng định dạng/ngày thực tế.
- Ngày nhận không trước hôm nay, ngày trả sau ngày nhận.
- Người lớn 1–30, trẻ em 0–10, phòng 1–10; số nguyên.
- URL sai trường bắt buộc hiển thị lỗi, không tự thay địa điểm/ngày của người dùng.
- Optional filters không hợp lệ được loại bỏ/khôi phục mặc định an toàn.
- Khoảng giá không âm và giá tối đa không thấp hơn giá tối thiểu.

## Kiểm tra

```sh
npm run build -- --configuration development
npm test -- --watch=false --include=src/app/hotel-search/hotel-search.spec.ts
```

9 tests đã qua, gồm:

- Round-trip URL giữ các bộ lọc, ngày và số khách/phòng.
- Validation điểm đến, ngày sai, khoảng ngày và số khách sai.
- Chuẩn hóa optional URL filters sai.
- Snapshot khác nhau cho Đà Lạt/Phú Quốc, ngày và số khách đã đổi.
- Không tự navigate khi thiếu địa điểm hoặc khi tab khác active.
- Direct URL khôi phục criteria và filters (cơ chế refresh).
- Sidebar không ghi đè draft chưa submit; tìm lại giữ filters.
- Đổi/reset bộ lọc và simulated browser Back/Forward.
- Template TripShop thật: chuyển ba tab khác và bấm nút tìm khách sạn.

Router tests dùng Angular RouterTestingHarness/jsdom; chưa xác nhận giao diện
trực quan, refresh trên hosting thực tế hay lịch hệ thống trên trình duyệt thật.
Hosting cần SPA fallback để URL `/hotel-search?...` mở trực tiếp được.

## Chờ tích hợp dữ liệu

Không sử dụng các mock quảng bá của TripShop làm kết quả khách sạn thật.
Results hiện trả danh sách rỗng có ghi rõ chưa kết nối nguồn dữ liệu.
Interface Hotel và HotelResultsList đã có chỗ cho ảnh, địa chỉ, sao, rating,
review count, giá/tiền tệ, details URL, loading và empty state.

Khi có API, thêm repository/service nhận `HotelSearchCriteria` và `HotelFilter`,
hủy request cũ khi URL thay đổi (ví dụ switchMap), rồi cập nhật loading/results/error
ở parent. Không để card/sidebar tự fetch hoặc tự ghi URL.

Mỗi dịch vụ tiếp theo nên có criteria model và results page riêng. Chỉ dùng
discriminated union ở tầng điều phối khi thực sự có nhiều luồng kết quả;
không ép thông tin chuyến bay/xe/hoạt động vào HotelSearchCriteria.

## Hotel card và trang chi tiết (xem trước)

- Mở `/hotel-search`, bấm **Xem giao diện mẫu** để xem card Đà Lạt.
- Chế độ mẫu dùng `demo=true` trên URL. Tìm `Đà Nẵng` hoặc `Phú Quốc`
  để xem mẫu khác. Không trộn fixtures với kết quả thật.
- Bấm ảnh, tên hoặc **Xem chi tiết** để mở `/hotels/:id`. Ngày ở, số khách,
  số phòng và bộ lọc được giữ qua query parameters; nút quay lại khôi phục danh sách.
- Trang chi tiết có chọn ảnh, tổng quan, tiện ích, loại phòng và chính sách.
  Giá/ảnh/nội dung là minh họa; các nút đặt phòng bị vô hiệu hóa.
- Bộ lọc chưa áp dụng trong chế độ mẫu, có thông báo trên giao diện.
- `services/hotel-demo.ts` chứa fixtures riêng. Khi nối API, thay nguồn dữ liệu
  tại `HotelSearchResults` và `HotelDetails`, không fetch trong card.
- `Hotel` được bổ sung các trường optional: `amenities`, `freeCancellation`,
  `description`, `images`, `policies`, `rooms`. `HotelRoom` là cấu trúc tạm cho UI;
  cần thống nhất mã phòng/gói giá, sức chứa và điều kiện giá với người làm API.
- Card dùng route nội bộ theo `id` thay cho `detailsUrl`. Backend chưa được nối;
  details ngoài chế độ mẫu hiển thị trạng thái chưa có thông tin.
- Giá card/phòng đang trình bày cho một phòng mỗi đêm, chưa gồm thuế/phí.
  Cần bổ sung dữ liệu giá theo gói và thuế khi tích hợp nhà cung cấp.
- Build development và các tests hotel-search/hotel-preview đã chạy.
  Chưa kiểm tra trực quan bằng trình duyệt trên các kích thước màn hình.
