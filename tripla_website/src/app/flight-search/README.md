# Flight Search Results

Frontend Angular 22, standalone components. Route: `/flight-search-results`.
Giữ nguyên Hotel Search, TripShop và các tab dịch vụ còn lại.
Thanh điều hướng, logo, màu xanh–kem, nền ombre và font Tripla lấy theo format Hotel Search.

## File tạo mới và trách nhiệm

```text
src/app/flight-search/
├── pages/flight-search-results/
│   └── flight-search-results.{ts,html,css}
├── components/
│   ├── flight-search-bar/flight-search-bar.{ts,html,css}
│   ├── flight-filter-sidebar/flight-filter-sidebar.{ts,html,css}
│   ├── flight-date-navigation/flight-date-navigation.{ts,html,css}
│   ├── flight-sort-bar/flight-sort-bar.{ts,html,css}
│   ├── flight-results-list/flight-results-list.{ts,html,css}
│   └── flight-card/flight-card.{ts,html,css}
├── models/
│   ├── flight-search-criteria.model.ts
│   ├── flight-filter.model.ts
│   └── flight.model.ts
├── services/flight-search-draft.ts
├── flight-search.spec.ts
└── README.md
```

| Component | Trách nhiệm |
| --- | --- |
| FlightSearchResults | Applied criteria/filter/sort/chiều bay từ URL; điều phối dữ liệu và lựa chọn |
| FlightSearchBar | Bản nháp sân bay, ngày, số khách/hạng vé; chỉ emit khi xác nhận tìm kiếm |
| FlightFilterSidebar | Bộ lọc đóng/mở, typed output; không routing, không hiển thị giá cạnh lựa chọn |
| FlightDateNavigation | Ngày lân cận, ngày trước/sau; không cho chọn quá khứ, không bịa giá từng ngày |
| FlightSortBar | Emit giá thấp nhất/thời gian ngắn nhất/khởi hành sớm nhất/muộn nhất |
| FlightResultsList | Loading, chưa có nguồn dữ liệu, không có kết quả phù hợp, danh sách |
| FlightCard | Chỉ hiển thị dữ liệu model; emit chuyến bay được chọn |

Mỗi component có TS, HTML, CSS riêng. Chưa tạo service API vì không có data source.
`FlightSearchDraft` chỉ giữ bản nháp TripShop trong bộ nhớ, không phải fake API.

## File hiện có đã sửa trong task này

- `src/app/app.routes.ts`: thêm lazy route trước wildcard.
- `src/app/pages/trip-shop/trip-shop.ts`: `searchFlights()` snapshot các biến thực tế,
  validate, navigate; lưu/khôi phục bản nháp khi Back. Không refactor logic dịch vụ khác.
- `src/app/pages/trip-shop/trip-shop.html`: nối click vào nút tìm chuyến bay,
  thêm thông báo validation; không thay đổi thiết kế form.

Không sửa file Hotel Search trong task Flight này.

## Data flow

1. Người dùng chọn thông tin trong form Vé Máy Bay hiện có của TripShop.
2. `searchFlights()` lấy snapshot từ `flightFrom`, `flightTo`, `flightDeparture`,
   `flightReturn`, `flightRoundTrip`, `flightAdults`, `flightChildren`,
   `flightInfants`, `cabin`, `directFlight`.
3. Validate và Router.navigate tới `/flight-search-results?...`.
4. Parent đọc `ActivatedRoute.queryParamMap` với `takeUntilDestroyed`.
5. Typed inputs truyền xuống các component; outputs gọi parent cập nhật URL.

Query parameters gồm sân bay/code và nhãn hiển thị, ngày đi/ngày về, tripType,
số khách, cabin, airlines, stops, departureBands, arrivalBands, carryOn,
checkedBaggage, sort, leg. Không có thông tin hành khách cá nhân hay thanh toán.

URL là nguồn applied state, nên direct link/refresh/Back/Forward khôi phục được.
Filter-only navigation giữ reference criteria, tránh ghi đè draft chưa submit.
Không có subscription ghi URL ngược lại nên không tạo vòng lặp.

## Một chiều / khứ hồi

- Một chiều: returnDate không bắt buộc và bị loại khỏi URL; ô ngày về bị khóa.
- Khứ hồi: cả hai ngày được giữ, ngày về không trước ngày đi.
- Đổi ngày đi vượt ngày về: ngày về điều chỉnh lên bằng ngày đi.
- Chuyến đi/chuyến về là hai tập dữ liệu độc lập (`FlightSearchData`).
- Tab chiều bay và ngày lân cận đồng bộ vào URL.
- `FlightSelection` lưu outbound/inbound riêng; chọn chuyến đi chuyển sang chuyến về.
- Không tính tổng giá khứ hồi khi chưa có giá cả hai chiều.
- Đổi criteria xóa dữ liệu/lựa chọn cũ; đổi bộ lọc/sắp xếp không làm mất criteria.

## Bộ lọc và sắp xếp

`filterAndSortFlights` là hàm thuần, không sửa mảng đầu vào:

- Hãng bay lấy từ dữ liệu thật của chiều bay hiện tại.
- Bay thẳng, 1 điểm dừng, 2+ điểm dừng.
- Khung giờ đi/đến dùng giờ địa phương trong timestamp có offset của provider.
- Hành lý xách tay và hành lý ký gửi là hai boolean độc lập;
  không coi trạng thái chưa biết là có hành lý.
- Giá tăng dần (giá chưa biết đặt sau), duration tăng dần,
  giờ khởi hành tăng/giảm.
- Tất cả điều kiện lưu trong URL. Reset chỉ xóa bộ lọc, giữ criteria và sort.

Không tạo giá gợi ý cạnh filter, giá từng ngày, khuyến mãi hay tình trạng ghế giả.

## Chuẩn bị nguồn dữ liệu

`FlightSearchResults.data` hiện là `null`, thể hiện chưa có nguồn dữ liệu,
không phải kết quả tìm kiếm thực tế rỗng. `FlightResultsList.hasSource` phân biệt
trạng thái này với danh sách thật bị lọc hết.

Khi có API, thêm adapter nhận `FlightSearchCriteria`, hủy request cũ khi criteria
đổi và cập nhật loading/error/data ở parent. Data shape:

```ts
interface FlightSearchData {
  outbound: Flight[];
  inbound: Flight[];
}
```

Mỗi chiều phải đúng sân bay/ngày trong criteria. Timestamp cần ISO với offset
và giờ địa phương của sân bay. Giá vé phải cùng currency để sort trực tiếp;
nếu API trả nhiều currency cần quy đổi qua nguồn tỷ giá thật trước khi sort.
Không fetch ở card/sidebar. Không có booking/payment flow trong task này.

## Kiểm tra

```sh
npm run build -- --configuration development
npm test -- --watch=false --include=src/app/flight-search/flight-search.spec.ts
npm test -- --watch=false --include=src/app/hotel-search/hotel-search.spec.ts
```

- Build development: thành công.
- Flight Search: 12 tests qua.
- Hotel Search regression: 9 tests qua.
- Tests gồm SGN→HAN từ button thật, đổi HAN→DAD, ngày đi/ngày về,
  one-way/round-trip, số khách/hạng vé, direct URL (cơ chế refresh),
  Back/Forward, bảo toàn draft, reset filters và chọn riêng hai chiều.
- Hàm filtering/sorting được kiểm tra bằng synthetic fixtures chỉ có trong test;
  fixtures không được đưa vào ứng dụng.
- Responsive CSS có breakpoint desktop/tablet/mobile; chưa kiểm tra giao diện
  trực quan trên browser/device thật. Router tests chạy bằng jsdom.
- Hosting cần SPA fallback cho direct link/refresh route mới.

Chờ nguồn dữ liệu thực tế: danh sách hãng/chuyến bay, giá/khả dụng, hành lý,
trạng thái request và chi tiết lựa chọn. Không thêm dependency hoặc backend.

## Luồng chọn chuyến đã cập nhật

- Một chiều: chọn card mở bảng gói vé ngay.
- Khứ hồi: chọn card chiều đi chuyển sang chiều về; chọn card chiều về mới mở bảng hai chiều.
- Đổi riêng ngày về giữ chuyến đi, xóa lựa chọn/gói giá chiều về. Đổi tuyến, ngày đi,
  số khách hoặc loại hành trình xóa lựa chọn cũ.
- Gói khứ hồi trong chế độ demo ghép cùng hạng/cùng tiền tệ và cộng giá mẫu hai chiều;
  không coi đó là báo giá combo thật. API thực tế cần trả gói khứ hồi đã xác nhận.
- Chọn gói khứ hồi demo lưu riêng fare ID và giá của từng chiều trong fareSelection.
