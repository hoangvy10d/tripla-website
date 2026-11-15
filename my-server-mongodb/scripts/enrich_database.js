/**
 * Script nạp và làm giàu dữ liệu địa điểm, hoạt động, khách sạn cho toàn bộ TRIPLA
 * Phủ rộng 12 tỉnh thành du lịch hàng đầu Việt Nam
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tripla_db';

// Danh sách các địa điểm mẫu phong phú & chân thực
const NEW_LOCATIONS = [
  // === ĐÀ LẠT ===
  {
    slug: 'loc_dalat_lamvien_square',
    name: 'Quảng trường Lâm Viên',
    landmark_name: 'Quảng trường Lâm Viên',
    location_category: 'attraction',
    address: 'Đường Trần Quốc Toản, Phường 10, TP. Đà Lạt',
    formatted_address: 'Đường Trần Quốc Toản, Phường 10, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9360,
    longitude: 108.4455,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Biểu tượng check-in của xứ sở sương mù với đóa hoa dã quỳ và búp hoa atiso bằng kính màu khổng lồ nhìn ra hồ Xuân Hương.',
    image_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 3200,
    unit: '/ khách',
    tag: 'Biểu Tượng Check-in',
    drawerKey: 'dining',
    features: [
      { icon: 'photo_camera', label: 'Búp hoa Atiso & Nụ hoa dã quỳ khổng lồ' },
      { icon: 'wb_twilight', label: 'Ngắm hoàng hôn trên bờ hồ Xuân Hương' }
    ]
  },
  {
    slug: 'loc_dalat_flower_garden',
    name: 'Vườn hoa Thành phố Đà Lạt',
    landmark_name: 'Vườn hoa Thành phố Đà Lạt',
    location_category: 'nature',
    address: 'Số 2 Trần Nhân Tông, Phường 8, TP. Đà Lạt',
    formatted_address: 'Số 2 Trần Nhân Tông, Phường 8, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9465,
    longitude: 108.4494,
    entry_fee: 100000,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Khoảng trời muôn sắc hoa hội tụ hơn 300 loài hoa quý hiếm trong và ngoài nước nở rộ quanh năm.',
    image_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 2450,
    unit: '/ vé',
    tag: 'Thiên Đường Muôn Hoa',
    drawerKey: 'dining',
    features: [
      { icon: 'local_florist', label: 'Hơn 300 loài hoa khoe sắc' },
      { icon: 'park', label: 'Cảnh quan vườn tượng & nhà kính châu Âu' }
    ]
  },
  {
    slug: 'loc_dalat_datanla_waterfall',
    name: 'Thác Datanla & Xe trượt Alpine Coaster',
    landmark_name: 'Thác Datanla & Xe trượt Alpine Coaster',
    location_category: 'attraction',
    address: 'QL20 Đèo Prenn, Phường 3, TP. Đà Lạt',
    formatted_address: 'QL20 Đèo Prenn, Phường 3, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9022,
    longitude: 108.4508,
    entry_fee: 250000,
    requires_reservation: true,
    reservation_duration: 150,
    location_description: 'Đường trượt Alpine Coaster xuyên rừng thông nguyên sinh dài nhất Đông Nam Á dẫn xuống dòng thác Datanla hùng vĩ.',
    image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 4100,
    unit: '/ vé trọn gói',
    tag: 'Trò Chơi Cảm Giác Mạnh',
    drawerKey: 'yacht',
    features: [
      { icon: 'downhill_skiing', label: 'Đường trượt xuyên rừng thông 2.400m' },
      { icon: 'water', label: 'Thác nước 7 tầng kỳ vĩ' }
    ]
  },
  {
    slug: 'loc_dalat_railway_station',
    name: 'Ga Đà Lạt & Tàu Cổ Trại Mát',
    landmark_name: 'Ga Đà Lạt & Tàu Cổ Trại Mát',
    location_category: 'attraction',
    address: 'Số 1 Quang Trung, Phường 10, TP. Đà Lạt',
    formatted_address: 'Số 1 Quang Trung, Phường 10, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9412,
    longitude: 108.4526,
    entry_fee: 50000,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Nhà ga xe lửa cổ kính bậc nhất Đông Dương xây dựng năm 1932 theo phong cách Art Deco kết hợp mái nhà rông Tây Nguyên.',
    image_url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 2890,
    unit: '/ vé',
    tag: 'Di Tích Kiến Trúc Pháp',
    drawerKey: 'dining',
    features: [
      { icon: 'train', label: 'Đầu máy hơi nước cổ & toa tàu gỗ' },
      { icon: 'coffee', label: 'Quán cà phê toa tàu độc đáo' }
    ]
  },
  {
    slug: 'loc_dalat_tui_mo_to_cafe',
    name: 'Tiệm Cà Phê Túi Mơ To',
    landmark_name: 'Tiệm Cà Phê Túi Mơ To',
    location_category: 'cafe',
    address: 'Hẻm 31 Sào Nam, Phường 11, TP. Đà Lạt',
    formatted_address: 'Hẻm 31 Sào Nam, Phường 11, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9388,
    longitude: 108.4765,
    entry_fee: 85000,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Quán cafe nhà kính bên triền đồi với vườn cúc họa mi trắng muốt và góc ngắm thung lũng đèn lồng lung linh về đêm.',
    image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 3600,
    unit: '/ phần uống',
    tag: 'Săn Mây & Hoàng Hôn Phố Núi',
    drawerKey: 'dining',
    features: [
      { icon: 'local_cafe', label: 'Cà phê đặc sản & bánh ngọt thủ công' },
      { icon: 'wb_sunny', label: 'Vườn cúc họa mi ngắm biển mây' }
    ]
  },
  {
    slug: 'loc_dalat_love_valley',
    name: 'Thung Lũng Tình Yêu',
    landmark_name: 'Thung Lũng Tình Yêu',
    location_category: 'nature',
    address: '3 – 5 – 7 Mai Anh Đào, Phường 8, TP. Đà Lạt',
    formatted_address: '3 – 5 – 7 Mai Anh Đào, Phường 8, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9806,
    longitude: 108.4528,
    entry_fee: 250000,
    requires_reservation: false,
    reservation_duration: 180,
    location_description: 'Danh thắng thơ mộng nép mình bên sườn đồi thông xanh ngắt và hồ Đa Thiện trong vắt, tích hợp mê cung cây và cầu kính 7D.',
    image_url: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80',
    rating: 4.6,
    review_count: 1980,
    unit: '/ vé',
    tag: 'Danh Thắng Thơ Mộng',
    drawerKey: 'dining',
    features: [
      { icon: 'favorite', label: 'Cầu kính ngắm toàn cảnh thung lũng' },
      { icon: 'pedal_bike', label: 'Đạp vịt trên hồ Đa Thiện' }
    ]
  },
  {
    slug: 'loc_dalat_night_market',
    name: 'Chợ Đêm Đà Lạt (Chợ Âm Phủ)',
    landmark_name: 'Chợ Đêm Đà Lạt',
    location_category: 'shopping',
    address: 'Nguyễn Thị Minh Khai, Phường 1, TP. Đà Lạt',
    formatted_address: 'Nguyễn Thị Minh Khai, Phường 1, TP. Đà Lạt',
    city: 'Đà Lạt',
    latitude: 11.9425,
    longitude: 108.4372,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Trái tim sôi động về đêm của Đà Lạt: thưởng thức bánh tráng nướng nóng hổi, sữa đậu nành nóng hổi, dâu tây và mua sắm đồ len ấm áp.',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 5200,
    unit: '/ người',
    tag: 'Ẩm Thực Đêm Phố Núi',
    drawerKey: 'dining',
    features: [
      { icon: 'restaurant', label: 'Bánh tráng nướng, dâu lắc, kem bơ' },
      { icon: 'shopping_bag', label: 'Thời trang len & đặc sản mứt sấy' }
    ]
  },

  // === VŨNG TÀU ===
  {
    slug: 'loc_vungtau_christ_statue',
    name: 'Tượng Chúa Kito Vua',
    landmark_name: 'Tượng Chúa Kito Vua',
    location_category: 'attraction',
    address: 'Hạ Long, Phường 2, TP. Vũng Tàu',
    formatted_address: 'Hạ Long, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    latitude: 10.3262,
    longitude: 107.0845,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Bức tượng Chúa cao 32m ngự trên đỉnh Núi Nhỏ với hai tay dang rộng 18.3m, bên trong có 133 bậc thang dẫn ra hai cánh tay ngắm biển trời bao la.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 4200,
    unit: '/ khách',
    tag: 'Biểu Tượng Tôn Giáo Núi Nhỏ',
    drawerKey: 'dining',
    features: [
      { icon: 'hiking', label: '847 bậc thang đá rợp bóng cây xanh' },
      { icon: 'visibility', label: 'Tầm nhìn 360 độ ôm trọn biển Vũng Tàu' }
    ]
  },
  {
    slug: 'loc_vungtau_lighthouse',
    name: 'Ngọn Hải Đăng Vũng Tàu',
    landmark_name: 'Ngọn Hải Đăng Vũng Tàu',
    location_category: 'attraction',
    address: 'Đỉnh Núi Nhỏ, Phường 2, TP. Vũng Tàu',
    formatted_address: 'Đỉnh Núi Nhỏ, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    latitude: 10.3340,
    longitude: 107.0754,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Ngọn hải đăng cổ kính xây dựng năm 1862 sơn trắng nổi bật giữa nền trời xanh, là điểm ngắm hoàng hôn và thưởng thức sữa chua cô Tiên nổi tiếng.',
    image_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 3100,
    unit: '/ khách',
    tag: 'Hải Đăng Cổ Nhất Việt Nam',
    drawerKey: 'dining',
    features: [
      { icon: 'lightbulb', label: 'Tháp tròn sơn trắng cao 18m' },
      { icon: 'wb_sunny', label: 'Cung đường hoa phượng & hoa giấy lãng mạn' }
    ]
  },
  {
    slug: 'loc_vungtau_nghinh_phong',
    name: 'Mũi Nghinh Phong & Cổng Trời',
    landmark_name: 'Mũi Nghinh Phong & Cổng Trời',
    location_category: 'nature',
    address: 'Số 1 Hạ Long, Phường 2, TP. Vũng Tàu',
    formatted_address: 'Số 1 Hạ Long, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    latitude: 10.3230,
    longitude: 107.0865,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 60,
    location_description: 'Mũi đất vươn mình ra biển đón gió suốt bốn mùa, nổi bật với "Cổng Trời" hướng biển tạo nên góc chụp ảnh ấn tượng.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.6,
    review_count: 2750,
    unit: '/ khách',
    tag: 'Mũi Biển Đón Gió',
    drawerKey: 'dining',
    features: [
      { icon: 'air', label: 'Gió biển lồng lộng quanh năm' },
      { icon: 'photo_camera', label: 'Cổng Trời sống ảo triệu view' }
    ]
  },
  {
    slug: 'loc_vungtau_bai_sau',
    name: 'Bãi Sau Vũng Tàu (Bãi Thùy Vân)',
    landmark_name: 'Bãi Sau Vũng Tàu',
    location_category: 'nature',
    address: 'Đường Thùy Vân, Phường Thắng Tam, TP. Vũng Tàu',
    formatted_address: 'Đường Thùy Vân, Phường Thắng Tam, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    latitude: 10.3385,
    longitude: 107.0988,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 180,
    location_description: 'Bãi cát vàng thoai thoải dài hơn 8km với làn nước trong xanh, rặng phi lao xanh rì và sóng vỗ nhẹ nhàng thích hợp tắm biển cả ngày.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    rating: 4.5,
    review_count: 4800,
    unit: '/ khách',
    tag: 'Bãi Tắm Sôi Động Nhất',
    drawerKey: 'yacht',
    features: [
      { icon: 'surfing', label: 'Thể thao biển: moto nước, lướt ván' },
      { icon: 'beach_access', label: 'Bãi cát dài thoai thoải sạch đẹp' }
    ]
  },
  {
    slug: 'loc_vungtau_banh_khot_coba',
    name: 'Bánh Khọt Cô Ba Vũng Tàu',
    landmark_name: 'Bánh Khọt Cô Ba Vũng Tàu',
    location_category: 'restaurant',
    address: 'Số 1 Hoàng Hoa Thám, Phường 3, TP. Vũng Tàu',
    formatted_address: 'Số 1 Hoàng Hoa Thám, Phường 3, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    latitude: 10.3475,
    longitude: 107.0772,
    entry_fee: 80000,
    requires_reservation: false,
    reservation_duration: 60,
    location_description: 'Thương hiệu bánh khọt trứ danh với lớp vỏ giòn rụm màu vàng ruộm, nhân tôm tươi nhảy tanh tách ăn kèm rau sống và nước mắm chua ngọt đặc chế.',
    image_url: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 3890,
    unit: '/ phần',
    tag: 'Đặc Sản Ẩm Thực Biển',
    drawerKey: 'dining',
    features: [
      { icon: 'restaurant_menu', label: 'Bánh khọt tôm tươi, mực sữa giòn tan' },
      { icon: 'soup_kitchen', label: 'Rau thơm organic & đu đủ ngâm giòn' }
    ]
  },

  // === NHA TRANG ===
  {
    slug: 'loc_nhatrang_vinwonders',
    name: 'VinWonders Nha Trang (Đảo Hòn Tre)',
    landmark_name: 'VinWonders Nha Trang',
    location_category: 'attraction',
    address: 'Đảo Hòn Tre, Phường Vĩnh Nguyên, TP. Nha Trang',
    formatted_address: 'Đảo Hòn Tre, Phường Vĩnh Nguyên, TP. Nha Trang',
    city: 'Nha Trang',
    latitude: 12.2178,
    longitude: 109.2435,
    entry_fee: 800000,
    requires_reservation: true,
    reservation_duration: 360,
    location_description: 'Công viên giải trí của những kỷ lục tọa lạc trên đảo thiên đường Hòn Tre: Tata Show đẳng cấp, cáp treo vượt biển và công viên nước khổng lồ.',
    image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 6200,
    unit: '/ vé trọn gói',
    tag: 'Công Viên Giải Trí Đảo',
    drawerKey: 'yacht',
    features: [
      { icon: 'roller_coaster', label: 'Trò chơi cảm giác mạnh & Vịnh Phao Nổi' },
      { icon: 'theater_comedy', label: 'Show thực cảnh triệu đô Tata Show' }
    ]
  },
  {
    slug: 'loc_nhatrang_ponagar',
    name: 'Tháp Bà Ponagar Nha Trang',
    landmark_name: 'Tháp Bà Ponagar',
    location_category: 'attraction',
    address: 'Đường 2 Tháng 4, Vĩnh Phước, TP. Nha Trang',
    formatted_address: 'Đường 2 Tháng 4, Vĩnh Phước, TP. Nha Trang',
    city: 'Nha Trang',
    latitude: 12.2654,
    longitude: 109.1958,
    entry_fee: 30000,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Quần thể tháp Chăm cổ kính được xây dựng từ thế kỷ thứ 8 đến thế kỷ 13, uy nghiêm trên đồi Cù Lao soi bóng xuống dòng sông Cái thơ mộng.',
    image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 3400,
    unit: '/ vé',
    tag: 'Kiến Trúc Chăm Pa Cổ',
    drawerKey: 'dining',
    features: [
      { icon: 'temple_buddhist', label: 'Kiến trúc gạch nung Champa độc đáo' },
      { icon: 'music_note', label: 'Biểu diễn múa Chăm & kèn Saranai' }
    ]
  },

  // === HÀ NỘI ===
  {
    slug: 'loc_hanoi_hoan_kiem_lake',
    name: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn',
    landmark_name: 'Hồ Hoàn Kiếm',
    location_category: 'attraction',
    address: 'Phố Đinh Tiên Hoàng, Hàng Trống, Hoàn Kiếm, Hà Nội',
    formatted_address: 'Phố Đinh Tiên Hoàng, Hàng Trống, Hoàn Kiếm, Hà Nội',
    city: 'Hà Nội',
    latitude: 21.0307,
    longitude: 105.8524,
    entry_fee: 30000,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Trái tim của Thủ đô ngàn năm văn hiến với Tháp Rùa cổ kính giữa làn nước xanh lục thủy, cầu Thê Húc đỏ son dẫn vào Đền Ngọc Sơn linh thiêng.',
    image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 6800,
    unit: '/ khách',
    tag: 'Biểu Tượng Thủ Đô',
    drawerKey: 'dining',
    features: [
      { icon: 'bridge', label: 'Cầu Thê Húc cong cong tôm đỏ' },
      { icon: 'history_edu', label: 'Huyền tích trả gươm báu vua Lê Lợi' }
    ]
  },
  {
    slug: 'loc_hanoi_van_mieu',
    name: 'Văn Miếu – Quốc Tử Giám',
    landmark_name: 'Văn Miếu – Quốc Tử Giám',
    location_category: 'attraction',
    address: '58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội',
    formatted_address: '58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội',
    city: 'Hà Nội',
    latitude: 21.0285,
    longitude: 105.8355,
    entry_fee: 70000,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Trường đại học đầu tiên của Việt Nam với 82 Bia Tiến sĩ được UNESCO công nhận là Di sản Tư liệu Thế giới.',
    image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 4500,
    unit: '/ vé',
    tag: 'Tinh Hoa Đạo Học',
    drawerKey: 'dining',
    features: [
      { icon: 'school', label: '82 Bia Tiến sĩ trên lưng rùa đá' },
      { icon: 'light_mode', label: 'Tour đêm ánh sáng 3D Mapping' }
    ]
  },
  {
    slug: 'loc_hanoi_hoa_lo_prison',
    name: 'Di Tích Nhà Tù Hỏa Lò',
    landmark_name: 'Nhà Tù Hỏa Lò',
    location_category: 'attraction',
    address: 'Số 1 Phố Hỏa Lò, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    formatted_address: 'Số 1 Phố Hỏa Lò, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    city: 'Hà Nội',
    latitude: 21.0253,
    longitude: 105.8465,
    entry_fee: 50000,
    requires_reservation: true,
    reservation_duration: 90,
    location_description: 'Nơi lưu giữ những ký ức lịch sử kiên cường của các chiến sĩ cách mạng Việt Nam, nổi tiếng với tour đêm "Đêm Thiêng Liêng" chạm tới cảm xúc.',
    image_url: 'https://images.unsplash.com/photo-1541480601022-2308c0f02487?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 5100,
    unit: '/ vé',
    tag: 'Di Tích Lịch Sử Hào Hùng',
    drawerKey: 'dining',
    features: [
      { icon: 'museum', label: 'Tour Đêm Thiêng Liêng thuyết minh sống động' },
      { icon: 'hearing', label: 'Trải nghiệm Audio Guide đa ngôn ngữ' }
    ]
  },

  // === HỒ CHÍ MINH ===
  {
    slug: 'loc_hcm_dinh_doc_lap',
    name: 'Dinh Độc Lập (Hội Trường Thống Nhất)',
    landmark_name: 'Dinh Độc Lập',
    location_category: 'attraction',
    address: '135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1, TP. Hồ Chí Minh',
    formatted_address: '135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1, TP. Hồ Chí Minh',
    city: 'Hồ Chí Minh',
    latitude: 10.7770,
    longitude: 106.6953,
    entry_fee: 65000,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Công trình kiến trúc biểu tượng ghi dấu thời khắc lịch sử thống nhất đất nước ngày 30/4/1975, do kiến trúc sư Ngô Viết Thụ thiết kế.',
    image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 5800,
    unit: '/ vé',
    tag: 'Di Tích Lịch Sử Quốc Gia',
    drawerKey: 'dining',
    features: [
      { icon: 'account_balance', label: 'Hệ thống hầm ngầm kiên cố và trực thăng' },
      { icon: 'park', label: 'Khuôn viên rợp bóng cổ thụ giữa trung tâm' }
    ]
  },
  {
    slug: 'loc_hcm_landmark_81',
    name: 'Landmark 81 SkyView',
    landmark_name: 'Landmark 81 SkyView',
    location_category: 'attraction',
    address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    formatted_address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    city: 'Hồ Chí Minh',
    latitude: 10.7950,
    longitude: 106.7218,
    entry_fee: 450000,
    requires_reservation: true,
    reservation_duration: 120,
    location_description: 'Đài quan sát cao nhất Việt Nam tại tầng 79-81 ngắm toàn cảnh Sài Gòn rực rỡ từ độ cao gần 400m với trải nghiệm cầu kính SkyTouch mạo hiểm.',
    image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 4100,
    unit: '/ vé',
    tag: 'Đài Quan Sát Đỉnh Cao',
    drawerKey: 'dining',
    features: [
      { icon: 'apartment', label: 'Tầm nhìn 360 độ ngắm trọn khúc quanh sông Sài Gòn' },
      { icon: 'vrpano', label: 'Trải nghiệm thực tế ảo nhảy dù VR' }
    ]
  },
  {
    slug: 'loc_hcm_ben_thanh_market',
    name: 'Chợ Bến Thành',
    landmark_name: 'Chợ Bến Thành',
    location_category: 'shopping',
    address: 'Đường Lê Lợi, Bến Thành, Quận 1, TP. Hồ Chí Minh',
    formatted_address: 'Đường Lê Lợi, Bến Thành, Quận 1, TP. Hồ Chí Minh',
    city: 'Hồ Chí Minh',
    latitude: 10.7725,
    longitude: 106.6980,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Biểu tượng trăm năm sầm uất của TP. Hồ Chí Minh, nơi du khách thỏa thích khám phá ẩm thực đường phố và mua sắm quà lưu niệm.',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.6,
    review_count: 6700,
    unit: '/ khách',
    tag: 'Chợ Biểu Tượng Sài Gòn',
    drawerKey: 'dining',
    features: [
      { icon: 'watch_later', label: 'Tháp đồng hồ 4 mặt biểu tượng' },
      { icon: 'lunch_dining', label: 'Bún riêu, chè ba màu, cà phê vợt' }
    ]
  },

  // === ĐÀ NẴNG & HỘI AN ===
  {
    slug: 'loc_danang_dragon_bridge',
    name: 'Cầu Rồng Đà Nẵng',
    landmark_name: 'Cầu Rồng Đà Nẵng',
    location_category: 'attraction',
    address: 'Đường Nguyễn Văn Linh, Phước Ninh, Hải Châu, Đà Nẵng',
    formatted_address: 'Đường Nguyễn Văn Linh, Phước Ninh, Hải Châu, Đà Nẵng',
    city: 'Đà Nẵng',
    latitude: 16.0610,
    longitude: 108.2268,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 60,
    location_description: 'Cây cầu thép mô phỏng hình rồng thời Lý bắc qua sông Hàn, biểu diễn phun lửa và phun nước độc đáo vào 21:00 tối thứ Bảy và Chủ Nhật.',
    image_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 5600,
    unit: '/ khách',
    tag: 'Kỳ Quan Cầu Rồng Sông Hàn',
    drawerKey: 'dining',
    features: [
      { icon: 'local_fire_department', label: 'Màn phun lửa và phun nước cuối tuần' },
      { icon: 'sailing', label: 'Bến du thuyền sông Hàn lộng gió' }
    ]
  },
  {
    slug: 'loc_hoian_ancient_town',
    name: 'Phố Cổ Hội An & Chùa Cầu',
    landmark_name: 'Phố Cổ Hội An',
    location_category: 'attraction',
    address: 'Đường Nguyễn Thị Minh Khai, Phường Minh An, TP. Hội An',
    formatted_address: 'Đường Nguyễn Thị Minh Khai, Phường Minh An, TP. Hội An',
    city: 'Hội An',
    latitude: 15.8775,
    longitude: 108.3283,
    entry_fee: 120000,
    requires_reservation: false,
    reservation_duration: 240,
    location_description: 'Đô thị cổ thương cảng quốc tế được bảo tồn nguyên vẹn với những bức tường vàng rêu phong, giàn hoa giấy và hàng ngàn ngọn đèn lồng lung linh soi bóng sông Hoài.',
    image_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    rating: 4.95,
    review_count: 8200,
    unit: '/ vé tham quan',
    tag: 'Di Sản Văn Hóa Thế Giới',
    drawerKey: 'dining',
    features: [
      { icon: 'wb_twilight', label: 'Thả hoa đăng trên sông Hoài' },
      { icon: 'restaurant_menu', label: 'Cao lầu, bánh mì Phượng, cơm gà' }
    ]
  },
  {
    slug: 'loc_hoian_bay_mau_coconut',
    name: 'Rừng Dừa Bảy Mẫu Cẩm Thanh',
    landmark_name: 'Rừng Dừa Bảy Mẫu Cẩm Thanh',
    location_category: 'nature',
    address: 'Thôn Vạn Lăng, Xã Cẩm Thanh, TP. Hội An',
    formatted_address: 'Thôn Vạn Lăng, Xã Cẩm Thanh, TP. Hội An',
    city: 'Hội An',
    latitude: 15.8672,
    longitude: 108.3685,
    entry_fee: 150000,
    requires_reservation: true,
    reservation_duration: 120,
    location_description: 'Không gian miền Tây sông nước thu nhỏ giữa lòng phố Hội với trải nghiệm đi thuyền thúng len lỏi giữa rặng dừa nước và xem màn múa thúng xoay điệu nghệ.',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 3900,
    unit: '/ thuyền thúng',
    tag: 'Trải Nghiệm Thuyền Thúng',
    drawerKey: 'yacht',
    features: [
      { icon: 'surfing', label: 'Màn lắc thúng điêu luyện của ngư dân' },
      { icon: 'phishing', label: 'Quăng chài bắt cá và câu cua đá' }
    ]
  },

  // === NINH BÌNH ===
  {
    slug: 'loc_ninhbinh_trang_an',
    name: 'Quần Thể Danh Thắng Tràng An',
    landmark_name: 'Quần Thể Danh Thắng Tràng An',
    location_category: 'nature',
    address: 'Tràng An, Trường Yên, Hoa Lư, Ninh Bình',
    formatted_address: 'Tràng An, Trường Yên, Hoa Lư, Ninh Bình',
    city: 'Ninh Bình',
    latitude: 20.2535,
    longitude: 105.9082,
    entry_fee: 250000,
    requires_reservation: true,
    reservation_duration: 210,
    location_description: 'Di sản Văn hóa và Thiên nhiên Thế giới kép duy nhất tại Đông Nam Á với hệ thống hang động xuyên thủy, núi đá vôi sừng sững trên dòng sông Sào Khê ngọc bích.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.96,
    review_count: 6700,
    unit: '/ vé thuyền',
    tag: 'Di Sản Kép Thế Giới',
    drawerKey: 'yacht',
    features: [
      { icon: 'rowing', label: 'Thuyền chèo tay qua các hang động ngập nước' },
      { icon: 'terrain', label: 'Phim trường King Kong & Đền Trần' }
    ]
  },
  {
    slug: 'loc_ninhbinh_hang_mua',
    name: 'Hang Múa & Đỉnh Ngoạ Long',
    landmark_name: 'Hang Múa & Đỉnh Ngoạ Long',
    location_category: 'attraction',
    address: 'Khê Đầu Hạ, Ninh Xuân, Hoa Lư, Ninh Bình',
    formatted_address: 'Khê Đầu Hạ, Ninh Xuân, Hoa Lư, Ninh Bình',
    city: 'Ninh Bình',
    latitude: 20.2315,
    longitude: 105.9325,
    entry_fee: 100000,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Chinh phục gần 500 bậc đá tựa Vạn Lý Trường Thành thu nhỏ để chạm tới đỉnh Ngoạ Long ngắm trọn vẹn cảnh sắc Tam Cốc và đồng lúa chín vàng ươm.',
    image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    rating: 4.85,
    review_count: 4200,
    unit: '/ vé',
    tag: 'Góc Check-in Đỉnh Cao',
    drawerKey: 'dining',
    features: [
      { icon: 'hiking', label: '486 bậc thang đá trắng hùng vĩ' },
      { icon: 'landscape', label: 'Tượng rồng đá uốn lượn trên đỉnh núi' }
    ]
  },

  // === SA PA ===
  {
    slug: 'loc_sapa_fansipan',
    name: 'Đỉnh Fansipan – Sun World Fansipan Legend',
    landmark_name: 'Đỉnh Fansipan',
    location_category: 'attraction',
    address: 'Đường Nguyễn Chí Thanh, Thị xã Sa Pa, Lào Cai',
    formatted_address: 'Đường Nguyễn Chí Thanh, Thị xã Sa Pa, Lào Cai',
    city: 'Sa Pa',
    latitude: 22.3035,
    longitude: 103.7752,
    entry_fee: 850000,
    requires_reservation: true,
    reservation_duration: 300,
    location_description: 'Chinh phục Nóc nhà Đông Dương ở độ cao 3.143m bằng hệ thống cáp treo 3 dây hiện đại nhất thế giới và quần thể tâm linh kỳ vĩ trên đỉnh mây ngàn.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.95,
    review_count: 7300,
    unit: '/ vé cáp treo',
    tag: 'Nóc Nhà Đông Dương 3.143m',
    drawerKey: 'dining',
    features: [
      { icon: 'flight', label: 'Cáp treo 3 dây vượt thung lũng Mường Hoa' },
      { icon: 'temple_buddhist', label: 'Đại tượng Phật A Di Đà bằng đồng cao nhất VN' }
    ]
  },
  {
    slug: 'loc_sapa_cat_cat',
    name: 'Bản Cát Cát Sa Pa',
    landmark_name: 'Bản Cát Cát',
    location_category: 'attraction',
    address: 'Xã Hoàng Liên, Thị xã Sa Pa, Lào Cai',
    formatted_address: 'Xã Hoàng Liên, Thị xã Sa Pa, Lào Cai',
    city: 'Sa Pa',
    latitude: 22.3275,
    longitude: 103.8315,
    entry_fee: 150000,
    requires_reservation: false,
    reservation_duration: 150,
    location_description: 'Ngôi làng cổ người Mông đẹp như tranh vẽ nép mình dưới chân dãy Hoàng Liên Sơn với cọn nước khổng lồ, ruộng bậc thang và suối Tiên Sa róc rách.',
    image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    review_count: 4600,
    unit: '/ vé tham quan',
    tag: 'Bản Làng Cổ Người Mông',
    drawerKey: 'dining',
    features: [
      { icon: 'waterfall_chart', label: 'Thác Tiên Sa & Guồng nước khổng lồ' },
      { icon: 'dry_cleaning', label: 'Thuê trang phục thổ cẩm truyền thống' }
    ]
  },

  // === PHÚ QUỐC ===
  {
    slug: 'loc_phuquoc_grand_world',
    name: 'Grand World Phú Quốc (Thành Phố Không Ngủ)',
    landmark_name: 'Grand World Phú Quốc',
    location_category: 'attraction',
    address: 'Khu Bãi Dài, Gành Dầu, TP. Phú Quốc',
    formatted_address: 'Khu Bãi Dài, Gành Dầu, TP. Phú Quốc',
    city: 'Phú Quốc',
    latitude: 10.3282,
    longitude: 103.8585,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 240,
    location_description: 'Trung tâm vui chơi giải trí 24/7 với kênh đào Venice lãng mạn, thuyền Gondola quý tộc và show thực cảnh nhạc nước Sắc Màu Venice triệu đô.',
    image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 5100,
    unit: '/ khách',
    tag: 'Thành Phố Không Ngủ',
    drawerKey: 'dining',
    features: [
      { icon: 'directions_boat', label: 'Đi thuyền Gondola trên kênh đào Venice' },
      { icon: 'celebration', label: 'Show nhạc nước Sắc Màu Venice miễn phí hàng đêm' }
    ]
  },
  {
    slug: 'loc_phuquoc_bai_sao',
    name: 'Bãi Sao Phú Quốc',
    landmark_name: 'Bãi Sao Phú Quốc',
    location_category: 'nature',
    address: 'Ấp Bãi Sao, Phường An Thới, TP. Phú Quốc',
    formatted_address: 'Ấp Bãi Sao, Phường An Thới, TP. Phú Quốc',
    city: 'Phú Quốc',
    latitude: 10.0525,
    longitude: 104.0325,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 180,
    location_description: 'Bãi biển đẹp bậc nhất đảo Ngọc với bãi cát trắng mịn như kem dài hơn 7km uốn lượn bên làn nước xanh trong vắt thấy đáy và hàng dừa nghiêng bóng.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    rating: 4.75,
    review_count: 4800,
    unit: '/ khách',
    tag: 'Bãi Biển Cát Trắng Thiên Đường',
    drawerKey: 'yacht',
    features: [
      { icon: 'waves', label: 'Nước biển êm ả trong xanh nhìn tận đáy' },
      { icon: 'photo_camera', label: 'Xích đu cây dừa huyền thoại sống ảo' }
    ]
  },

  // === HẠ LONG (ĐẶC BIỆT ĐỒNG BỘ VỚI VISUAL SEARCH) ===
  {
    slug: 'loc_halong_dao_titop',
    name: 'Đảo Ti Tốp',
    landmark_name: 'Đảo Ti Tốp',
    location_category: 'attraction',
    address: 'Vịnh Hạ Long, TP. Hạ Long, Quảng Ninh, Việt Nam',
    formatted_address: 'Vịnh Hạ Long, TP. Hạ Long, Quảng Ninh, Việt Nam',
    city: 'Hạ Long',
    latitude: 20.8592,
    longitude: 107.0805,
    entry_fee: 250000,
    requires_reservation: true,
    reservation_duration: 120,
    location_description: 'Điểm ngắm toàn cảnh kỳ quan Vịnh Hạ Long 360 độ từ trên đỉnh núi đá vôi và bãi tắm hình vành trăng lưỡi liềm với làn nước trong xanh ngọc bích.',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 5300,
    unit: '/ vé tham quan',
    tag: 'Ngắm Toàn Cảnh Vịnh 360°',
    drawerKey: 'yacht',
    features: [
      { icon: 'visibility', label: 'Hơn 400 bậc thang ngắm toàn cảnh vịnh' },
      { icon: 'beach_access', label: 'Bãi tắm cát trắng mịn hình vành trăng' }
    ]
  },
  {
    slug: 'loc_halong_hang_sung_sot',
    name: 'Hang Sửng Sốt',
    landmark_name: 'Hang Sửng Sốt',
    location_category: 'attraction',
    address: 'Đảo Bồ Hòn, Vịnh Hạ Long, TP. Hạ Long, Quảng Ninh, Việt Nam',
    formatted_address: 'Đảo Bồ Hòn, Vịnh Hạ Long, TP. Hạ Long, Quảng Ninh, Việt Nam',
    city: 'Hạ Long',
    latitude: 20.8445,
    longitude: 107.0912,
    entry_fee: 290000,
    requires_reservation: true,
    reservation_duration: 150,
    location_description: 'Một trong những hang động karst lớn và tráng lệ nhất Vịnh Hạ Long với hệ thống nhũ đá lung linh ngàn năm tuổi khiến du khách ngỡ ngàng.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.95,
    review_count: 6100,
    unit: '/ vé hang',
    tag: 'Kỳ Quan Hang Động',
    drawerKey: 'yacht',
    features: [
      { icon: 'auto_awesome', label: 'Vòm hang cao hơn 30m với ánh sáng nghệ thuật' },
      { icon: 'nature', label: 'Rừng thạch nhũ muôn hình vạn trạng' }
    ]
  },
  {
    slug: 'loc_halong_cua_van_village',
    name: 'Làng chài Cửa Vạn',
    landmark_name: 'Làng chài Cửa Vạn',
    location_category: 'attraction',
    address: 'Vịnh Hạ Long, Xã Hùng Thắng, TP. Hạ Long, Quảng Ninh, Việt Nam',
    formatted_address: 'Vịnh Hạ Long, Xã Hùng Thắng, TP. Hạ Long, Quảng Ninh, Việt Nam',
    city: 'Hạ Long',
    latitude: 20.8755,
    longitude: 107.1245,
    entry_fee: 180000,
    requires_reservation: true,
    reservation_duration: 120,
    location_description: 'Làng chài cổ kính nằm lọt thỏm giữa những vách núi đá vôi sừng sững, được bình chọn vào top những ngôi làng đẹp nhất thế giới.',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 3800,
    unit: '/ khách',
    tag: 'Văn Hóa Làng Chài Cổ',
    drawerKey: 'yacht',
    features: [
      { icon: 'houseboat', label: 'Trải nghiệm nhà bè nổi truyền thống' },
      { icon: 'kayaking', label: 'Chèo thuyền Kayak len lỏi vách núi đá' }
    ]
  },
  {
    slug: 'loc_halong_sun_world',
    name: 'Sun World Hạ Long Complex',
    landmark_name: 'Sun World Hạ Long Complex',
    location_category: 'attraction',
    address: 'Số 9 Đường Hạ Long, Bãi Cháy, TP. Hạ Long, Quảng Ninh',
    formatted_address: 'Số 9 Đường Hạ Long, Bãi Cháy, TP. Hạ Long, Quảng Ninh',
    city: 'Hạ Long',
    latitude: 20.9542,
    longitude: 107.0545,
    entry_fee: 350000,
    requires_reservation: true,
    reservation_duration: 240,
    location_description: 'Tổ hợp vui chơi ven biển đẳng cấp quốc tế với Cáp treo Nữ Hoàng 2 tầng kỷ lục Guinness và Vòng quay Mặt Trời Sun Wheel ngắm trọn vịnh đêm.',
    image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
    rating: 4.85,
    review_count: 5200,
    unit: '/ vé trọn gói',
    tag: 'Tổ Hợp Vui Chơi Đẳng Cấp',
    drawerKey: 'yacht',
    features: [
      { icon: 'flight', label: 'Cáp treo Nữ Hoàng 2 tầng vượt biển' },
      { icon: 'attractions', label: 'Vòng quay Mặt Trời Sun Wheel 215m' }
    ]
  },

  // === CAO BẰNG (THÁC BẢN GIỐC) ===
  {
    slug: 'loc_caobang_ban_gioc_waterfall',
    name: 'Thác Bản Giốc',
    landmark_name: 'Thác Bản Giốc',
    location_category: 'nature',
    address: 'Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng, Việt Nam',
    formatted_address: 'Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng, Việt Nam',
    city: 'Cao Bằng',
    latitude: 22.8539,
    longitude: 106.7238,
    entry_fee: 45000,
    requires_reservation: false,
    reservation_duration: 180,
    location_description: 'Thác nước tự nhiên lớn thứ tư thế giới trên đường biên giới quốc gia, nước tuôn bọt trắng xóa như dải lụa tiên giữa thung lũng lúa xanh ngút ngàn.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.96,
    review_count: 4800,
    unit: '/ vé tham quan',
    tag: 'Thác Nước Biên Cương Kỳ Vĩ',
    drawerKey: 'yacht',
    features: [
      { icon: 'water', label: 'Đi bè mảng ngắm cận cảnh dòng thác cuồn cuộn' },
      { icon: 'landscape', label: 'Sông Quây Sơn xanh ngọc bích biên cương' }
    ]
  },
  {
    slug: 'loc_caobang_dong_nguom_ngao',
    name: 'Động Ngườm Ngao',
    landmark_name: 'Động Ngườm Ngao',
    location_category: 'attraction',
    address: 'Bản Gun, Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng, Việt Nam',
    formatted_address: 'Bản Gun, Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng, Việt Nam',
    city: 'Cao Bằng',
    latitude: 22.8415,
    longitude: 106.6965,
    entry_fee: 45000,
    requires_reservation: false,
    reservation_duration: 120,
    location_description: 'Kiệt tác hang động đá vôi dài hơn 2.144m hình thành hơn 300 triệu năm trước với thạch nhũ hình đài sen úp ngược và suối ngầm róc rách.',
    image_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80',
    rating: 4.88,
    review_count: 3100,
    unit: '/ vé',
    tag: 'Hang Động Kỳ Vĩ',
    drawerKey: 'dining',
    features: [
      { icon: 'auto_awesome', label: 'Nhũ đá hoa sen vàng úp ngược độc nhất vô nhị' },
      { icon: 'hiking', label: 'Cung đường đi bộ trong lòng hang mát lạnh' }
    ]
  },
  {
    slug: 'loc_caobang_chua_truc_lam_ban_gioc',
    name: 'Chùa Phật Tích Trúc Lâm Bản Giốc',
    landmark_name: 'Chùa Phật Tích Trúc Lâm Bản Giốc',
    location_category: 'attraction',
    address: 'Núi Phia Nhằn, Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng, Việt Nam',
    formatted_address: 'Núi Phia Nhằn, Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng, Việt Nam',
    city: 'Cao Bằng',
    latitude: 22.8505,
    longitude: 106.7195,
    entry_fee: 0,
    requires_reservation: false,
    reservation_duration: 90,
    location_description: 'Ngôi chùa đầu tiên tại vùng biên cương cực Bắc của Tổ quốc tọa lạc trên núi Phia Nhằn, nơi du khách chiêm bái và phóng tầm mắt ngắm trọn thác Bản Giốc.',
    image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    review_count: 2400,
    unit: '/ khách',
    tag: 'Tâm Linh Biên Cương',
    drawerKey: 'dining',
    features: [
      { icon: 'temple_buddhist', label: 'Kiến trúc thuần Việt chùa gỗ lim cổ truyền' },
      { icon: 'visibility', label: 'Điểm ngắm thác Bản Giốc từ trên cao tráng lệ' }
    ]
  },

  // === QUẢNG BÌNH (SƠN ĐOÒNG & PHONG NHA) ===
  {
    slug: 'loc_quangbinh_hang_son_doong',
    name: 'Hang Sơn Đoòng',
    landmark_name: 'Hang Sơn Đoòng',
    location_category: 'nature',
    address: 'Vườn Quốc gia Phong Nha - Kẻ Bàng, Tân Trạch, Bố Trạch, Quảng Bình, Việt Nam',
    formatted_address: 'Vườn Quốc gia Phong Nha - Kẻ Bàng, Tân Trạch, Bố Trạch, Quảng Bình, Việt Nam',
    city: 'Quảng Bình',
    latitude: 17.4585,
    longitude: 106.2872,
    entry_fee: 72000000,
    requires_reservation: true,
    reservation_duration: 1440,
    location_description: 'Hang động tự nhiên lớn nhất thế giới ẩn chứa cả khu rừng nguyên sinh Vườn Địa Đàng, sông ngầm uốn lượn và những khối thạch nhũ khổng lồ cao đến 70m.',
    image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    rating: 5.0,
    review_count: 2100,
    unit: '/ tour thám hiểm',
    tag: 'Kỳ Quan Hang Động Lớn Nhất Thế Giới',
    drawerKey: 'yacht',
    features: [
      { icon: 'terrain', label: 'Hố sụt khổng lồ đón ánh sáng mặt trời' },
      { icon: 'forest', label: 'Rừng nguyên sinh Vườn Địa Đàng trong lòng hang' }
    ]
  },
  {
    slug: 'loc_quangbinh_hang_en',
    name: 'Hang Én',
    landmark_name: 'Hang Én',
    location_category: 'nature',
    address: 'Vườn Quốc gia Phong Nha - Kẻ Bàng, Tân Trạch, Bố Trạch, Quảng Bình, Việt Nam',
    formatted_address: 'Vườn Quốc gia Phong Nha - Kẻ Bàng, Tân Trạch, Bố Trạch, Quảng Bình, Việt Nam',
    city: 'Quảng Bình',
    latitude: 17.4325,
    longitude: 106.3015,
    entry_fee: 7500000,
    requires_reservation: true,
    reservation_duration: 720,
    location_description: 'Hang động lớn thứ ba thế giới với bãi cắm trại bờ cát trắng mịn bên hồ nước ngầm xanh ngọc bích, nơi hàng triệu cánh én chao lượn mỗi mùa hè.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    rating: 4.95,
    review_count: 1850,
    unit: '/ tour 2N1Đ',
    tag: 'Hang Động Kỳ Vĩ Thứ 3 Thế Giới',
    drawerKey: 'yacht',
    features: [
      { icon: 'camping', label: 'Cắm trại trên bãi cát trong lòng hang khổng lồ' },
      { icon: 'water', label: 'Bơi lội thỏa thích giữa hồ nước ngầm xanh biếc' }
    ]
  },
  {
    slug: 'loc_quangbinh_song_chay_hang_toi',
    name: 'Sông Chày - Hang Tối',
    landmark_name: 'Sông Chày - Hang Tối',
    location_category: 'attraction',
    address: 'Xã Sơn Trạch, Huyện Bố Trạch, Quảng Bình, Việt Nam',
    formatted_address: 'Xã Sơn Trạch, Huyện Bố Trạch, Quảng Bình, Việt Nam',
    city: 'Quảng Bình',
    latitude: 17.5685,
    longitude: 106.2345,
    entry_fee: 450000,
    requires_reservation: true,
    reservation_duration: 180,
    location_description: 'Tuyến du lịch sinh thái mạo hiểm hấp dẫn với đường trượt Zipline 400m vào cửa hang, chèo thuyền Kayak trên dòng sông Chày xanh ngọc và tắm bùn khoáng tự nhiên.',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.86,
    review_count: 4200,
    unit: '/ vé trọn gói',
    tag: 'Zipline & Tắm Bùn Tự Nhiên',
    drawerKey: 'yacht',
    features: [
      { icon: 'downhill_skiing', label: 'Zipline dài nhất Việt Nam vượt sông' },
      { icon: 'bathtub', label: 'Tắm bùn khoáng nguyên sinh trong lòng hang Tối' }
    ]
  },

  // === QUỐC TẾ (THỤY SĨ & CANADA) ===
  {
    slug: 'loc_intl_st_beatus_caves',
    name: 'St. Beatus Caves & Interlaken',
    landmark_name: 'St. Beatus Caves',
    location_category: 'nature',
    address: '3652 Beatenberg, Switzerland',
    formatted_address: '3652 Beatenberg, Switzerland',
    city: 'Thụy Sĩ',
    latitude: 46.6845,
    longitude: 7.7812,
    entry_fee: 490000,
    requires_reservation: false,
    reservation_duration: 180,
    location_description: 'Hệ thống hang động đá vôi cổ xưa nép mình bên hồ Thun nước xanh biếc và thác nước ngầm hùng vĩ, bao quanh bởi đồng cỏ xanh mướt và rặng núi Alps tuyết phủ.',
    image_url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    review_count: 3900,
    unit: '/ vé',
    tag: 'Kỳ Quan Dãy Alps Thụy Sĩ',
    drawerKey: 'yacht',
    features: [
      { icon: 'landscape', label: 'Khung cảnh làng quê thanh bình nhìn ra hồ Thun' },
      { icon: 'waterfall_chart', label: 'Thác nước ngầm đổ cuồn cuộn giữa vách đá' }
    ]
  },
  {
    slug: 'loc_intl_icefields_parkway',
    name: 'Icefields Parkway & Hồ Bow (Banff, Canada)',
    landmark_name: 'Icefields Parkway',
    location_category: 'nature',
    address: 'Highway 93N, Banff National Park, AB, Canada',
    formatted_address: 'Highway 93N, Banff National Park, AB, Canada',
    city: 'Canada',
    latitude: 51.6667,
    longitude: -116.4500,
    entry_fee: 280000,
    requires_reservation: false,
    reservation_duration: 360,
    location_description: 'Một trong những cung đường ngoạn mục nhất thế giới dài 232km nối liền Banff và Jasper, nổi bật với hồ Bow xanh ngọc bích, sông băng Crowfoot Glacier và đỉnh núi tuyết Rocky.',
    image_url: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80',
    rating: 4.98,
    review_count: 6700,
    unit: '/ vé công viên',
    tag: 'Cung Đường Đẹp Nhất Hành Tinh',
    drawerKey: 'yacht',
    features: [
      { icon: 'directions_car', label: 'Cung đường cao tốc băng qua dãy núi Rocky' },
      { icon: 'ac_unit', label: 'Chiêm ngưỡng sông băng vĩnh cửu Crowfoot Glacier' }
    ]
  }
];

// Danh sách các Khách Sạn & Resort bổ sung cho các thành phố còn thiếu
const NEW_HOTELS = [
  // === CAO BẰNG ===
  {
    _id: 'hotel-saigon-bangioc',
    id: 'hotel-saigon-bangioc',
    hotel_slug: 'saigon-ban-gioc-resort',
    name: 'Sài Gòn - Bản Giốc Resort',
    hotel_name: 'Sài Gòn - Bản Giốc Resort',
    address: 'Xã Đàm Thủy, Huyện Trùng Khánh, Cao Bằng',
    city: 'Cao Bằng',
    area: 'Cạnh Thác Bản Giốc',
    stars: 4,
    star_rating: 4,
    rating: 9.1,
    reviewCount: 310,
    pricePerNight: 1250000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Bữa sáng', 'Nhà hàng đặc sản', 'Sân vườn', 'Bãi đỗ xe'],
    freeCancellation: true,
    description: 'Khu nghỉ dưỡng cao cấp 4 sao duy nhất tọa lạc ngay bên cạnh thắng cảnh Thác Bản Giốc, kiến trúc nhà sàn kết hợp tiện nghi hiện đại.',
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'caobang-bangioc-deluxe', name: 'Deluxe Hướng Thác Bản Giốc', size: 38, bed: '1 giường đôi lớn', guests: 2, pricePerNight: 1250000, breakfast: true }
    ],
    coordinates: [106.7215, 22.8525],
    geo: { type: 'Point', coordinates: [106.7215, 22.8525] }
  },

  // === QUẢNG BÌNH ===
  {
    _id: 'hotel-phongnha-lodge',
    id: 'hotel-phongnha-lodge',
    hotel_slug: 'phong-nha-lodge-lake-house',
    name: 'Phong Nha Lodge & Lake House Resort',
    hotel_name: 'Phong Nha Lodge & Lake House Resort',
    address: 'Khương Hà, Xã Sơn Trạch, Huyện Bố Trạch, Quảng Bình',
    city: 'Quảng Bình',
    area: 'Vườn Quốc gia Phong Nha',
    stars: 4,
    star_rating: 4,
    rating: 9.3,
    reviewCount: 420,
    pricePerNight: 950000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi bên hồ', 'Bữa sáng', 'Chèo Kayak', 'Nhà hàng'],
    freeCancellation: true,
    description: 'Chốn lưu trú lý tưởng ven hồ Đồng Suôn thơ mộng, trạm dừng chân thuận tiện bậc nhất cho các hành trình thám hiểm hang động Phong Nha - Kẻ Bàng.',
    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'quangbinh-phongnha-bungalow', name: 'Lake View Bungalow ven hồ', size: 45, bed: '1 giường King', guests: 2, pricePerNight: 950000, breakfast: true }
    ],
    coordinates: [106.2852, 17.5842],
    geo: { type: 'Point', coordinates: [106.2852, 17.5842] }
  },

  // === THỤY SĨ & CANADA ===
  {
    _id: 'hotel-victoria-jungfrau',
    id: 'hotel-victoria-jungfrau',
    hotel_slug: 'victoria-jungfrau-grand-hotel',
    name: 'Victoria Jungfrau Grand Hotel & Spa',
    hotel_name: 'Victoria Jungfrau Grand Hotel & Spa',
    address: 'Höheweg 41, 3800 Interlaken, Switzerland',
    city: 'Thụy Sĩ',
    area: 'Interlaken',
    stars: 5,
    star_rating: 5,
    rating: 9.8,
    reviewCount: 380,
    pricePerNight: 12500000,
    currency: 'VND',
    accommodationType: 'Khách sạn',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Spa 5500m2', 'Hồ bơi nước ấm', 'Bữa sáng', 'Tầm nhìn Jungfrau'],
    freeCancellation: true,
    description: 'Khách sạn huyền thoại 5 sao sang trọng bậc nhất tại Interlaken với tầm nhìn triệu đô hướng thẳng ra ngọn núi tuyết Jungfrau vĩnh cửu.',
    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'swiss-jungfrau-suite', name: 'Jungfrau View Superior Suite', size: 55, bed: '1 giường King', guests: 2, pricePerNight: 12500000, breakfast: true }
    ],
    coordinates: [7.8592, 46.6875],
    geo: { type: 'Point', coordinates: [7.8592, 46.6875] }
  },
  {
    _id: 'hotel-fairmont-lake-louise',
    id: 'hotel-fairmont-lake-louise',
    hotel_slug: 'fairmont-chateau-lake-louise',
    name: 'Fairmont Chateau Lake Louise',
    hotel_name: 'Fairmont Chateau Lake Louise',
    address: '111 Lake Louise Dr, Lake Louise, AB, Canada',
    city: 'Canada',
    area: 'Banff National Park',
    stars: 5,
    star_rating: 5,
    rating: 9.7,
    reviewCount: 650,
    pricePerNight: 14500000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ nước ngọc bích', 'Spa', 'Bữa sáng', 'Trượt tuyết'],
    freeCancellation: true,
    description: 'Lâu đài nghỉ dưỡng di sản biểu tượng nằm soi bóng xuống mặt hồ Louise xanh ngọc bích giữa vườn quốc gia Banff hùng vĩ.',
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'canada-fairmont-lakeview', name: 'Fairmont Lake View King Room', size: 42, bed: '1 giường King', guests: 2, pricePerNight: 14500000, breakfast: true }
    ],
    coordinates: [-116.1772, 51.4178],
    geo: { type: 'Point', coordinates: [-116.1772, 51.4178] }
  },
  // === HẠ LONG (ĐỒNG BỘ TRỰC TIẾP VISUAL SEARCH) ===
  {
    _id: 'hotel-vinpearl-halong',
    id: 'hotel-vinpearl-halong',
    hotel_slug: 'vinpearl-resort-spa-ha-long',
    name: 'Vinpearl Resort & Spa Hạ Long',
    hotel_name: 'Vinpearl Resort & Spa Hạ Long',
    address: 'Đảo Rều, Bãi Cháy, TP. Hạ Long, Quảng Ninh',
    city: 'Hạ Long',
    area: 'Đảo Rều Bãi Cháy',
    stars: 5,
    star_rating: 5,
    rating: 9.6,
    reviewCount: 520,
    pricePerNight: 2850000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi vô cực', 'Bãi biển riêng', 'Spa', 'Bữa sáng', 'Tàu cao tốc đưa đón'],
    freeCancellation: true,
    description: 'Khu nghỉ dưỡng biệt lập đầu tiên và duy nhất nằm hoàn toàn trên mặt biển Đảo Rều với tầm nhìn 360 độ ôm trọn kỳ quan Vịnh Hạ Long hùng vĩ.',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80'
    ],
    rooms: [
      { id: 'halong-vinpearl-deluxe', name: 'Deluxe Hướng Biển Vịnh Hạ Long', size: 48, bed: '1 giường King', guests: 2, pricePerNight: 2850000, breakfast: true },
      { id: 'halong-vinpearl-suite', name: 'Executive Ocean Panoramic Suite', size: 85, bed: '1 giường King siêu lớn', guests: 3, pricePerNight: 5200000, breakfast: true }
    ],
    coordinates: [107.0395, 20.9485],
    geo: { type: 'Point', coordinates: [107.0395, 20.9485] }
  },
  {
    _id: 'hotel-paradise-elegance',
    id: 'hotel-paradise-elegance',
    hotel_slug: 'du-thuyen-paradise-elegance-ha-long',
    name: 'Du Thuyền 5 Sao Paradise Elegance Cruise Hạ Long',
    hotel_name: 'Du Thuyền 5 Sao Paradise Elegance Cruise Hạ Long',
    address: 'Cảng Tàu Khách Quốc Tế Tuần Châu, TP. Hạ Long, Quảng Ninh',
    city: 'Hạ Long',
    area: 'Cảng Tuần Châu',
    stars: 5,
    star_rating: 5,
    rating: 9.8,
    reviewCount: 410,
    pricePerNight: 6200000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi Jacuzzi', 'Tiệc tối Fine Dining', 'Kayak', 'Bữa sáng'],
    freeCancellation: true,
    description: 'Du thuyền vỏ thép sang trọng bậc nhất vịnh di sản với ban công riêng cho từng phòng ngủ, spa thư giãn và hải trình qua Đảo Ti Tốp, Hang Sửng Sốt.',
    images: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80'
    ],
    rooms: [
      { id: 'halong-paradise-balcony', name: 'Deluxe Balcony Cabin trên Vịnh', size: 36, bed: '1 giường đôi', guests: 2, pricePerNight: 6200000, breakfast: true }
    ],
    coordinates: [106.9892, 20.9185],
    geo: { type: 'Point', coordinates: [106.9892, 20.9185] }
  },
  {
    _id: 'hotel-imperial-vungtau',
    id: 'hotel-imperial-vungtau',
    hotel_slug: 'the-imperial-hotel-vung-tau',
    name: 'The Imperial Hotel Vũng Tàu',
    hotel_name: 'The Imperial Hotel Vũng Tàu',
    address: '159 Thùy Vân, Phường Thắng Tam, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    area: 'Bãi Sau',
    stars: 5,
    star_rating: 5,
    rating: 9.3,
    reviewCount: 420,
    pricePerNight: 2450000,
    currency: 'VND',
    accommodationType: 'Khách sạn',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi riêng', 'Bãi biển riêng', 'Bữa sáng', 'Spa'],
    freeCancellation: true,
    description: 'Khách sạn 5 sao mang phong cách cổ điển hoàng gia châu Âu duy nhất tọa lạc tại Bãi Sau Vũng Tàu với câu lạc bộ biển riêng biệt và hồ bơi vô cực sát biển.',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80'
    ],
    rooms: [
      { id: 'vungtau-imperial-deluxe', name: 'Deluxe Hướng Biển Hoàng Gia', size: 45, bed: '1 giường King', guests: 2, pricePerNight: 2450000, breakfast: true },
      { id: 'vungtau-imperial-suite', name: 'Imperial Grand Suite', size: 75, bed: '1 giường King siêu lớn', guests: 3, pricePerNight: 4600000, breakfast: true }
    ],
    coordinates: [107.0965, 10.3395],
    geo: { type: 'Point', coordinates: [107.0965, 10.3395] }
  },
  {
    _id: 'hotel-pullman-vungtau',
    id: 'hotel-pullman-vungtau',
    hotel_slug: 'pullman-vung-tau',
    name: 'Pullman Vũng Tàu Convention Centre',
    hotel_name: 'Pullman Vũng Tàu Convention Centre',
    address: '15 Thi Sách, Phường Thắng Tam, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    area: 'Trung tâm Bãi Sau',
    stars: 5,
    star_rating: 5,
    rating: 9.1,
    reviewCount: 380,
    pricePerNight: 1950000,
    currency: 'VND',
    accommodationType: 'Khách sạn',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi', 'Phòng Gym', 'Bữa sáng', 'Bar'],
    freeCancellation: true,
    description: 'Khách sạn phong cách nghỉ dưỡng hiện đại đạt chuẩn quốc tế của tập đoàn Accor tại Vũng Tàu với trung tâm hội nghị quy mô và hồ bơi tầng cao sang trọng.',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80'
    ],
    rooms: [
      { id: 'vungtau-pullman-superior', name: 'Superior King Room', size: 40, bed: '1 giường King', guests: 2, pricePerNight: 1950000, breakfast: true },
      { id: 'vungtau-pullman-executive', name: 'Executive Suite Lounge Access', size: 65, bed: '1 giường King', guests: 2, pricePerNight: 3500000, breakfast: true }
    ],
    coordinates: [107.0925, 10.3425],
    geo: { type: 'Point', coordinates: [107.0925, 10.3425] }
  },
  {
    _id: 'hotel-dalat-palace',
    id: 'hotel-dalat-palace',
    hotel_slug: 'dalat-palace-heritage-hotel',
    name: 'Dalat Palace Heritage Hotel',
    hotel_name: 'Dalat Palace Heritage Hotel',
    address: '02 Trần Phú, Phường 3, TP. Đà Lạt',
    city: 'Đà Lạt',
    area: 'Hồ Xuân Hương',
    stars: 5,
    star_rating: 5,
    rating: 9.6,
    reviewCount: 450,
    pricePerNight: 3200000,
    currency: 'VND',
    accommodationType: 'Khách sạn',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Sân Golf', 'Bữa sáng', 'Spa', 'Sân vườn'],
    freeCancellation: true,
    description: 'Biểu tượng khách sạn di sản kiến trúc hoàng gia Pháp từ năm 1922 nhìn ra hồ Xuân Hương thơ mộng giữa công viên thông xanh mát.',
    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'dalat-palace-superior', name: 'Superior Heritage Room', size: 42, bed: '1 giường King', guests: 2, pricePerNight: 3200000, breakfast: true },
      { id: 'dalat-palace-suite', name: 'Royal Palace Suite', size: 70, bed: '1 giường King', guests: 2, pricePerNight: 5500000, breakfast: true }
    ],
    coordinates: [108.4385, 11.9382],
    geo: { type: 'Point', coordinates: [108.4385, 11.9382] }
  },
  {
    _id: 'hotel-anantara-hoian',
    id: 'hotel-anantara-hoian',
    hotel_slug: 'anantara-hoi-an-resort',
    name: 'Anantara Hoi An Resort',
    hotel_name: 'Anantara Hoi An Resort',
    address: '01 Phạm Hồng Thái, Cẩm Châu, TP. Hội An',
    city: 'Hội An',
    area: 'Bên bờ Sông Thu Bồn',
    stars: 5,
    star_rating: 5,
    rating: 9.7,
    reviewCount: 390,
    pricePerNight: 4800000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi', 'Du thuyền sông', 'Bữa sáng', 'Spa'],
    freeCancellation: true,
    description: 'Khu nghỉ dưỡng boutique sang trọng nép mình bên dòng sông Thu Bồn thơ mộng, chỉ cách phố cổ Hội An vài phút tản bộ yên bình.',
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'hoian-anantara-deluxe', name: 'Deluxe River View Suite', size: 50, bed: '1 giường King', guests: 2, pricePerNight: 4800000, breakfast: true }
    ],
    coordinates: [108.3375, 15.8778],
    geo: { type: 'Point', coordinates: [108.3375, 15.8778] }
  },
  {
    _id: 'hotel-emeralda-ninhbinh',
    id: 'hotel-emeralda-ninhbinh',
    hotel_slug: 'emeralda-resort-ninh-binh',
    name: 'Emeralda Resort Ninh Bình',
    hotel_name: 'Emeralda Resort Ninh Bình',
    address: 'Khu bảo tồn đất ngập nước Vân Long, Gia Vân, Gia Viễn, Ninh Bình',
    city: 'Ninh Bình',
    area: 'Đầm Vân Long',
    stars: 5,
    star_rating: 5,
    rating: 9.4,
    reviewCount: 510,
    pricePerNight: 2300000,
    currency: 'VND',
    accommodationType: 'Khu nghỉ dưỡng',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Wi-Fi', 'Hồ bơi vô cực', 'Spa', 'Bữa sáng', 'Xe đạp miễn phí'],
    freeCancellation: true,
    description: 'Không gian nghỉ dưỡng tái hiện ngôi làng Bắc Bộ xưa mộc mạc bên đầm ngập nước Vân Long với kiến trúc nhà ba gian truyền thống.',
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'],
    rooms: [
      { id: 'ninhbinh-emeralda-superior', name: 'Superior Village Room', size: 50, bed: '1 giường King hoặc 2 giường đơn', guests: 2, pricePerNight: 2300000, breakfast: true }
    ],
    coordinates: [105.8652, 20.3542],
    geo: { type: 'Point', coordinates: [105.8652, 20.3542] }
  }
];

// Tạo danh sách Activities từ danh sách Locations
function createActivitiesFromLocations(locations) {
  return locations.map((loc, idx) => {
    const isFood = loc.location_category === 'restaurant' || loc.location_category === 'cafe';
    const categories = isFood
      ? ['Food & Dining']
      : loc.location_category === 'nature'
      ? ['Công viên & vườn', 'Các điểm tham quan khác', 'Vé tham quan']
      : ['Vé tham quan', 'Điểm mốc'];

    if (loc.name.includes('Alpine') || loc.name.includes('VinWonders') || loc.name.includes('Grand World')) {
      categories.push('Trò chơi & giải trí');
    }

    return {
      _id: `act_${loc.slug || idx}`,
      id: `act_${loc.slug || idx}`,
      name: loc.name,
      city: loc.city,
      address: loc.address,
      categories,
      imageUrl: loc.image_url || '/images/trangan.jpg',
      description: loc.location_description || `Trải nghiệm khám phá tuyệt vời tại ${loc.city}.`,
      priceFrom: Number(loc.entry_fee) > 0 ? Number(loc.entry_fee) : 150000,
      currency: 'VND',
      originalPrice: Number(loc.entry_fee) > 0 ? Math.round(Number(loc.entry_fee) * 1.2) : 200000,
      rating: Number(loc.rating) || 9.0,
      reviewCount: Number(loc.review_count) || 250,
      coordinates: { latitude: loc.latitude, longitude: loc.longitude },
      geo: { type: 'Point', coordinates: [loc.longitude, loc.latitude] }
    };
  });
}

async function main(keepConnected = false) {
  console.log('🚀 Bắt đầu quá trình làm giàu dữ liệu...');

  // 1. Cập nhật file compass_data/activities.json
  const compassActPath = path.join(__dirname, '..', 'compass_data', 'activities.json');
  let currentActivities = [];
  if (fs.existsSync(compassActPath)) {
    try {
      currentActivities = JSON.parse(fs.readFileSync(compassActPath, 'utf8'));
    } catch (e) {
      currentActivities = [];
    }
  }

  const generatedActs = createActivitiesFromLocations(NEW_LOCATIONS);
  const actMap = new Map();
  [...currentActivities, ...generatedActs].forEach(act => {
    const key = act.name.toLowerCase().trim();
    if (!actMap.has(key)) {
      actMap.set(key, act);
    }
  });
  const enrichedActivities = Array.from(actMap.values());
  fs.writeFileSync(compassActPath, JSON.stringify(enrichedActivities, null, 2), 'utf8');
  console.log(`✅ Đã ghi nhận ${enrichedActivities.length} activities vào compass_data/activities.json`);

  // 2. Cập nhật file compass_data/hotels.json
  const compassHotelPath = path.join(__dirname, '..', 'compass_data', 'hotels.json');
  let currentHotels = [];
  if (fs.existsSync(compassHotelPath)) {
    try {
      currentHotels = JSON.parse(fs.readFileSync(compassHotelPath, 'utf8'));
    } catch (e) {
      currentHotels = [];
    }
  }
  const hotelMap = new Map();
  [...currentHotels, ...NEW_HOTELS].forEach(h => {
    const key = (h.name || h.hotel_name).toLowerCase().trim();
    if (!hotelMap.has(key)) {
      hotelMap.set(key, h);
    }
  });
  const enrichedHotels = Array.from(hotelMap.values());
  fs.writeFileSync(compassHotelPath, JSON.stringify(enrichedHotels, null, 2), 'utf8');
  console.log(`✅ Đã ghi nhận ${enrichedHotels.length} hotels vào compass_data/hotels.json`);

  // 3. Kết nối MongoDB và nạp bổ sung vào Database tripla_db
  if (!keepConnected || mongoose.connection.readyState !== 1) {
    console.log(`📡 Đang kết nối tới MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Đã kết nối MongoDB tripla_db thành công!');
  }

  const db = mongoose.connection.db;

  // Insert or update locations
  const locationsCol = db.collection('locations');
  let locInserted = 0;
  for (const loc of NEW_LOCATIONS) {
    const query = {
      $or: [
        { name: loc.name },
        { landmark_name: loc.landmark_name },
        { slug: loc.slug }
      ]
    };
    const doc = {
      ...loc,
      geo: { type: 'Point', coordinates: [loc.longitude, loc.latitude] },
      updatedAt: new Date(),
      createdAt: new Date()
    };
    const res = await locationsCol.updateOne(query, { $set: doc }, { upsert: true });
    if (res.upsertedCount > 0) locInserted++;
  }
  console.log(`✅ Đã đồng bộ ${NEW_LOCATIONS.length} địa điểm vào collection 'locations' (Mới thêm: ${locInserted}).`);

  // Insert or update activities
  const activitiesCol = db.collection('activities');
  let actInserted = 0;
  for (const act of enrichedActivities) {
    const query = { name: act.name };
    const res = await activitiesCol.updateOne(query, { $set: act }, { upsert: true });
    if (res.upsertedCount > 0) actInserted++;
  }
  console.log(`✅ Đã đồng bộ ${enrichedActivities.length} trải nghiệm vào collection 'activities'.`);

  // Insert or update hotels
  const hotelsCol = db.collection('hotels');
  const roomsCol = db.collection('rooms');
  const providersCol = db.collection('providers');
  const defaultProvider = await providersCol.findOne({});
  const providerId = defaultProvider?._id || new mongoose.Types.ObjectId();

  for (const h of NEW_HOTELS) {
    const hotelDoc = {
      id: h.id,
      hotel_slug: h.hotel_slug,
      provider_id: providerId,
      hotel_name: h.name,
      name: h.name,
      description: h.description,
      address: h.address,
      city: h.city,
      area: h.area,
      longitude: h.coordinates[0],
      latitude: h.coordinates[1],
      geo: h.geo,
      star_rating: h.stars,
      stars: h.stars,
      rating: h.rating,
      review_count: h.reviewCount,
      reviewCount: h.reviewCount,
      pricePerNight: h.pricePerNight,
      price_from: h.pricePerNight,
      currency: 'VND',
      accommodationType: h.accommodationType,
      imageUrl: h.imageUrl,
      images: h.images,
      amenities: h.amenities,
      freeCancellation: h.freeCancellation,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    await hotelsCol.updateOne({ name: h.name }, { $set: hotelDoc }, { upsert: true });

    // Ensure rooms for this hotel
    const insertedHotel = await hotelsCol.findOne({ name: h.name });
    if (insertedHotel && Array.isArray(h.rooms)) {
      for (const rm of h.rooms) {
        const roomDoc = {
          code: rm.id,
          hotel_id: insertedHotel._id,
          room_name: rm.name,
          room_type: rm.guests >= 3 ? 'family' : 'deluxe',
          capacity: rm.guests || 2,
          room_price: rm.pricePerNight,
          total_units: 5,
          stock: 5,
          room_status: 'available',
          size_m2: rm.size || 45,
          bed: rm.bed,
          breakfast: rm.breakfast !== false,
          updatedAt: new Date(),
          createdAt: new Date()
        };
        await roomsCol.updateOne({ code: rm.id }, { $set: roomDoc }, { upsert: true });
      }
    }
  }
  console.log(`✅ Đã đồng bộ các khách sạn bổ sung vào collection 'hotels' & 'rooms'.`);

  // Ensure 2dsphere indexes
  try {
    await locationsCol.createIndex({ geo: '2dsphere' });
    await hotelsCol.createIndex({ geo: '2dsphere' });
    console.log(`✅ Đã kích hoạt 2dsphere index thành công cho locations và hotels.`);
  } catch (err) {
    console.warn(`⚠️ Index 2dsphere:`, err.message);
  }

  if (!keepConnected) {
    await mongoose.disconnect();
  }
  console.log('🎉 Toàn bộ dữ liệu phong phú đã được nạp thành công!');
}

if (require.main === module) {
  main(false).catch(err => {
    console.error('❌ Lỗi nạp dữ liệu:', err);
    process.exit(1);
  });
}

module.exports = {
  NEW_LOCATIONS,
  NEW_HOTELS,
  createActivitiesFromLocations,
  enrichDatabase: () => main(true)
};
