import { Injectable } from '@angular/core';
import { EMPTY, Observable, concat, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { normalizeDestination } from '../../models/vietnam-destinations';
import { Activity, ActivityDetails } from '../models/activity.model';
import { ActivitySearchCriteria } from '../models/activity-search.model';
import { injectLiveHttp } from '../../services/live-http';

// UI fixtures only. Images and descriptions illustrate the interface, not live offers.
const activities: Activity[] = [
  {
    id: 'demo-dalat-garden',
    name: 'Vườn hoa Đà Lạt',
    city: 'Đà Lạt',
    categories: ['Công viên & vườn', 'Vé tham quan'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Một khoảng xanh để dạo bước và lưu lại những khung hình của chuyến đi.',
  },
  {
    id: 'demo-dalat-waterfall',
    name: 'Thác Datanla',
    city: 'Đà Lạt',
    categories: ['Vé tham quan', 'Trò chơi & giải trí'],
    imageUrl: '/images/trangan.jpg',
    description: 'Gợi ý hành trình khám phá thiên nhiên dành cho ngày nghỉ của bạn.',
  },
  {
    id: 'demo-dalat-station',
    name: 'Ga Đà Lạt',
    city: 'Đà Lạt',
    categories: ['Điểm mốc', 'Vé tham quan'],
    imageUrl: '/resort-night-bg.png',
    description: 'Thêm một điểm dừng vào hành trình khám phá thành phố.',
  },
  {
    id: 'demo-hanoi-temple',
    name: 'Văn Miếu – Quốc Tử Giám',
    city: 'Hà Nội',
    categories: ['Vé tham quan', 'Điểm mốc'],
    imageUrl: '/images/tranganedit.jpeg',
    description: 'Gợi ý một điểm dừng văn hóa cho chuyến khám phá Hà Nội.',
  },
  {
    id: 'demo-hanoi-museum',
    name: 'Bảo tàng Dân tộc học Việt Nam',
    city: 'Hà Nội',
    categories: ['Bảo tàng & Phòng trưng bày'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Một gợi ý trải nghiệm văn hóa dành cho bạn và gia đình.',
  },
  {
    id: 'demo-hanoi-lake',
    name: 'Hồ Hoàn Kiếm',
    city: 'Hà Nội',
    categories: ['Điểm mốc', 'Các điểm tham quan khác'],
    imageUrl: '/images/trangan.jpg',
    description: 'Chậm lại một chút và khám phá nhịp sống của thành phố.',
  },
  {
    id: 'demo-saigon-zoo',
    name: 'Thảo Cầm Viên',
    city: 'Hồ Chí Minh',
    categories: ['Sở thú & thủy cung', 'Công viên & vườn'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Gợi ý một ngày dạo chơi cùng gia đình giữa những khoảng xanh.',
  },
  {
    id: 'demo-saigon-park',
    name: 'Suối Tiên',
    city: 'Hồ Chí Minh',
    categories: ['Công viên giải trí', 'Trò chơi & giải trí'],
    imageUrl: '/images/ruongbacthangedit.jpeg',
    description: 'Thêm lựa chọn vui chơi cho hành trình của cả gia đình.',
  },
  {
    id: 'demo-saigon-museum',
    name: 'Bảo tàng Mỹ thuật',
    city: 'Hồ Chí Minh',
    categories: ['Bảo tàng & Phòng trưng bày'],
    imageUrl: '/resort-night-bg.png',
    description: 'Một điểm hẹn cho những ai yêu không gian nghệ thuật.',
  },
  {
    id: 'demo-danang-bana',
    name: 'Bà Nà Hills',
    city: 'Đà Nẵng',
    categories: ['Công viên giải trí', 'Vé tham quan'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Gợi ý trải nghiệm cho một ngày khám phá Đà Nẵng.',
  },
  {
    id: 'demo-danang-marble',
    name: 'Ngũ Hành Sơn',
    city: 'Đà Nẵng',
    categories: ['Vé tham quan', 'Điểm mốc'],
    imageUrl: '/images/trangan.jpg',
    description: 'Thêm một điểm dừng khám phá vào chuyến đi của bạn.',
  },
  {
    id: 'demo-phuquoc-park',
    name: 'VinWonders Phú Quốc',
    city: 'Phú Quốc',
    categories: ['Công viên giải trí', 'Công viên nước'],
    imageUrl: '/images/tranganedit.jpeg',
    description: 'Gợi ý một ngày vui chơi trong hành trình khám phá đảo.',
  },
  {
    id: 'demo-phuquoc-safari',
    name: 'Vinpearl Safari Phú Quốc',
    city: 'Phú Quốc',
    categories: ['Sở thú & thủy cung'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Thêm lựa chọn khám phá dành cho chuyến đi của gia đình.',
  },
  {
    id: 'demo-ninhbinh-trangan',
    name: 'Tràng An',
    city: 'Ninh Bình',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: '/images/trangan.jpg',
    description: 'Một gợi ý khám phá cảnh sắc cho chuyến đi Ninh Bình.',
  },
  {
    id: 'demo-vungtau-christ',
    name: 'Tượng Chúa Kito Vua & Mũi Nghinh Phong',
    city: 'Vũng Tàu',
    categories: ['Điểm mốc', 'Vé tham quan'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Chiêm ngưỡng toàn cảnh vịnh biển Vũng Tàu từ cánh tay bức tượng Chúa lớn nhất Đông Nam Á.',
  },
  {
    id: 'demo-vungtau-homay',
    name: 'Khu du lịch Hồ Mây Park Vũng Tàu',
    city: 'Vũng Tàu',
    categories: ['Công viên giải trí', 'Trò chơi & giải trí'],
    imageUrl: '/resort-night-bg.png',
    description: 'Tổ hợp vui chơi cáp treo ngắm biển trên đỉnh Núi Lớn.',
  },
  {
    id: 'demo-nhatrang-vinwonders',
    name: 'VinWonders Nha Trang (Đảo Hòn Tre)',
    city: 'Nha Trang',
    categories: ['Công viên giải trí', 'Công viên nước', 'Trò chơi & giải trí'],
    imageUrl: '/images/tranganedit.jpeg',
    description: 'Thiên đường giải trí đẳng cấp quốc tế trên đảo thiên đường Hòn Tre.',
  },
  {
    id: 'demo-nhatrang-ponagar',
    name: 'Tháp Bà Ponagar & Tắm bùn I-Resort',
    city: 'Nha Trang',
    categories: ['Điểm mốc', 'Vé tham quan'],
    imageUrl: '/images/trangan.jpg',
    description: 'Di tích Chăm Pa cổ kính và dịch vụ tắm bùn khoáng nóng thiên nhiên phục hồi năng lượng.',
  },
  {
    id: 'demo-hoian-ancient',
    name: 'Phố Cổ Hội An & Thả Hoa Đăng Sông Hoài',
    city: 'Hội An',
    categories: ['Điểm mốc', 'Vé tham quan'],
    imageUrl: '/resort-night-bg.png',
    description: 'Dạo bước giữa những dãy nhà cổ đèn lồng vàng son và đi thuyền ngắm hoàng hôn.',
  },
  {
    id: 'demo-hoian-bay-mau',
    name: 'Rừng Dừa Bảy Mẫu Cẩm Thanh',
    city: 'Hội An',
    categories: ['Các điểm tham quan khác', 'Vé tham quan'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Trải nghiệm đi thuyền thúng xoay độc đáo giữa rừng dừa nước bạt ngàn.',
  },
  {
    id: 'demo-sapa-fansipan',
    name: 'Đỉnh Fansipan – Sun World Fansipan Legend',
    city: 'Sa Pa',
    categories: ['Điểm mốc', 'Vé tham quan', 'Trò chơi & giải trí'],
    imageUrl: '/images/ruongbacthangedit.jpeg',
    description: 'Chinh phục nóc nhà Đông Dương 3.143m và chiêm bái quần thể tâm linh trên mây.',
  },
  {
    id: 'demo-sapa-catcat',
    name: 'Bản Cát Cát Sa Pa',
    city: 'Sa Pa',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: '/images/Grassland.jpeg',
    description: 'Làng cổ H’Mông thơ mộng bên dòng suối Tiên Sa và ruộng bậc thang hùng vĩ.',
  },
  {
    id: 'demo-halong-bay',
    name: 'Vịnh Hạ Long & Hang Sửng Sốt',
    city: 'Hạ Long',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: '/images/trangan.jpg',
    description: 'Hải trình khám phá kỳ quan thiên nhiên thế giới với hang động đá vôi tráng lệ.',
  },
  {
    id: 'demo-halong-titop',
    name: 'Đảo Ti Tốp (Titop) – Ngắm toàn cảnh Vịnh Hạ Long',
    city: 'Hạ Long',
    categories: ['Vé tham quan', 'Điểm mốc', 'Các điểm tham quan khác'],
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80',
    description: 'Hòn đảo nổi tiếng với bãi cát hình vầng trăng và đài quan sát toàn cảnh Vịnh Hạ Long từ trên cao.',
  },
  {
    id: 'demo-halong-sungsot',
    name: 'Hang Sửng Sốt – Kỳ quan hang động Vịnh Hạ Long',
    city: 'Hạ Long',
    categories: ['Vé tham quan', 'Điểm mốc'],
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=80',
    description: 'Một trong những hang động thạch nhũ lớn và đẹp nhất tại Vịnh Hạ Long.',
  },
  {
    id: 'demo-halong-cuavan',
    name: 'Làng chài Cửa Vạn & Chèo Kayak Vịnh Hạ Long',
    city: 'Hạ Long',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1000&q=80',
    description: 'Làng chài nổi yên bình giữa lòng di sản thiên nhiên thế giới, khám phá văn hóa ngư dân miền biển.',
  },
  {
    id: 'demo-hue-imperial',
    name: 'Đại Nội Huế & Ca Huế Sông Hương',
    city: 'Huế',
    categories: ['Điểm mốc', 'Vé tham quan'],
    imageUrl: '/resort-night-bg.png',
    description: 'Tham quan cung điện vàng son triều Nguyễn và nghe nhã nhạc cung đình Huế.',
  },
  {
    id: 'demo-caobang-bangioc',
    name: 'Thác Bản Giốc & Động Ngườm Ngao',
    city: 'Cao Bằng',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    description: 'Kỳ quan thác nước hùng vĩ nơi biên cương và hang động thạch nhũ tự nhiên kỳ ảo.',
  },
  {
    id: 'demo-caobang-truclam',
    name: 'Chùa Phật Tích Trúc Lâm Bản Giốc',
    city: 'Cao Bằng',
    categories: ['Điểm mốc', 'Vé tham quan'],
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    description: 'Ngôi chùa tâm linh uy nghiêm hướng nhìn trực diện toàn cảnh Thác Bản Giốc.',
  },
  {
    id: 'demo-quangbinh-sondoong',
    name: 'Hang Sơn Đoòng & Vườn quốc gia Phong Nha - Kẻ Bàng',
    city: 'Quảng Bình',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80',
    description: 'Chinh phục kỳ quan hang động tự nhiên lớn nhất hành tinh cùng hệ sinh thái độc nhất vô nhị.',
  },
  {
    id: 'demo-quangbinh-hangen',
    name: 'Thám hiểm Hang Én & Sông Chày - Hang Tối',
    city: 'Quảng Bình',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80',
    description: 'Khám phá hang động lớn thứ ba thế giới và trải nghiệm Zipline, chèo Kayak trên dòng Sông Chày xanh ngọc.',
  },
  {
    id: 'demo-thuy-si-beatus',
    name: 'Hang động St. Beatus Caves & Du thuyền Hồ Thun',
    city: 'Thụy Sĩ',
    categories: ['Vé tham quan', 'Điểm mốc'],
    imageUrl: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1000&q=80',
    description: 'Kỳ quan hang động cổ tích giữa hẻm núi đá vôi hướng nhìn ra hồ Thun và rặng núi Alps tuyết trắng.',
  },
  {
    id: 'demo-canada-icefields',
    name: 'Cung đường Icefields Parkway & Sông băng Columbia',
    city: 'Canada',
    categories: ['Vé tham quan', 'Các điểm tham quan khác'],
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
    description: 'Một trong những cung đường đẹp nhất thế giới băng qua dãy Rocky Mountains, hồ Bow Lake và sông băng ngàn năm.',
  },
];

const foodSamples: Activity[] = [
  'Đà Lạt',
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Nẵng',
  'Phú Quốc',
  'Ninh Bình',
  'Vũng Tàu',
  'Nha Trang',
  'Hội An',
  'Sa Pa',
  'Hạ Long',
  'Huế',
  'Cao Bằng',
  'Quảng Bình',
  'Thụy Sĩ',
  'Canada',
].map((city, index) => ({
  id: `demo-food-${index}`,
  name: `Trải nghiệm ẩm thực tại ${city}`,
  city,
  categories: ['Food & Dining'],
  imageUrl: '/resort-night-bg.png',
  description: 'Mẫu giao diện trải nghiệm ẩm thực, chưa phải sản phẩm đặt chỗ thực tế.',
}));
// All prices/reviews below are synthetic preview values, not quotes or actual reviews.
const sampleCatalog: Activity[] = [...activities, ...foodSamples].map((activity, index) => ({
  ...activity,
  priceFrom: 150000 + (index % 5) * 120000,
  currency: 'VND',
  originalPrice: index % 3 === 0 ? 200000 + (index % 5) * 120000 : undefined,
  rating: 8.5 + (index % 5) / 10,
  reviewCount: 120 + index * 17,
}));

export function filterActivities(
  items: readonly Activity[],
  criteria: ActivitySearchCriteria,
): Activity[] {
  const normalizeCity = (value: string) => {
    const text = normalizeDestination(value);
    if (['tp hcm', 'tphcm', 'sai gon', 'saigon', 'tp ho chi minh'].includes(text)) return 'ho chi minh';
    if (text.includes('ha long') || text.includes('quang ninh')) return 'ha long';
    if (text.includes('cao bang') || text.includes('ban gioc')) return 'cao bang';
    if (text.includes('quang binh') || text.includes('phong nha') || text.includes('son doong')) return 'quang binh';
    if (text.includes('da lat') || text.includes('lam dong')) return 'da lat';
    if (text.includes('nha trang') || text.includes('khanh hoa')) return 'nha trang';
    if (text.includes('vung tau') || text.includes('ba ria')) return 'vung tau';
    if (text.includes('hoi an') || text.includes('quang nam')) return 'hoi an';
    if (text.includes('sa pa') || text.includes('sapa') || text.includes('lao cai')) return 'sa pa';
    if (text.includes('phu quoc') || text.includes('kien giang')) return 'phu quoc';
    if (text.includes('thuy si') || text.includes('switzerland') || text.includes('interlaken')) return 'thuy si';
    if (text.includes('canada') || text.includes('banff') || text.includes('icefields')) return 'canada';
    return text;
  };
  const normalizeQueryText = (value: string) =>
    normalizeDestination(value)
      .replace(/\btitop\b|\btitov\b/g, 'ti top')
      .replace(/\bsu sot\b/g, 'sung sot');

  const location = normalizeCity(criteria.location);
  if (!location) return [];
  const words = normalizeQueryText(criteria.query).split(' ').filter(Boolean);

  const cityAndFilterPool = items.filter(
    (item) =>
      (location === 'viet nam' || normalizeCity(item.city) === location) &&
      (!criteria.categories.length ||
        item.categories.some((category) => criteria.categories.includes(category))) &&
      (criteria.minPrice === undefined ||
        (item.priceFrom !== undefined && item.priceFrom >= criteria.minPrice)) &&
      (criteria.maxPrice === undefined ||
        (item.priceFrom !== undefined && item.priceFrom <= criteria.maxPrice)),
  );

  const exactMatches = words.length
    ? cityAndFilterPool.filter((item) => {
        const hay = normalizeQueryText(
          item.name + ' ' + item.description + ' ' + item.categories.join(' '),
        );
        return words.every((word) => hay.includes(word));
      })
    : cityAndFilterPool;

  const results = exactMatches.length > 0 ? [...exactMatches] : [...cityAndFilterPool];

  if (criteria.sort === 'price-asc' || criteria.sort === 'price-desc') {
    results.sort((a, b) => {
      if (a.priceFrom === undefined) return b.priceFrom === undefined ? 0 : 1;
      if (b.priceFrom === undefined) return -1;
      return criteria.sort === 'price-asc' ? a.priceFrom - b.priceFrom : b.priceFrom - a.priceFrom;
    });
  }
  return results;
}

@Injectable({ providedIn: 'root' })
export class ActivitySearchService {
  private readonly http = injectLiveHttp();
  private readonly apiBase = 'http://localhost:3000/api/v1';

  private buildActivityDetails(activity: Activity): ActivityDetails {
    const id = activity.id;
    const food = activity.categories.includes('Food & Dining');
    const basePrice = activity.priceFrom || 250000;
    return {
      ...activity,
      images: [
        ...new Set([
          activity.imageUrl,
          '/images/trangan.jpg',
          '/images/Grassland.jpeg',
          '/resort-night-bg.png',
          '/images/ruongbacthangedit.jpeg',
          '/images/tranganedit.jpeg',
        ]),
      ],
      highlights: [
        activity.description,
        'Tự lên kế hoạch cho một ngày trải nghiệm theo nhịp riêng của bạn.',
        'Thông tin trải nghiệm, giờ mở cửa và điều kiện vé cần được xác nhận từ nhà cung cấp.',
      ],
      experiences: [
        { title: 'Chuẩn bị cho hành trình', imageUrl: activity.imageUrl },
        { title: 'Khám phá theo cách riêng', imageUrl: '/images/Grassland.jpeg' },
        { title: 'Lưu lại những kỷ niệm', imageUrl: '/images/trangan.jpg' },
      ],
      amenities: ['Vé điện tử QR xác nhận tức thì', 'Hỗ trợ khách hàng TRIPLA 24/7'],
      reviews: [
        {
          id: 'sample-1',
          author: 'Du khách mẫu',
          rating: 9,
          text: 'Không gian đẹp và có nhiều góc để khám phá. Đây là nội dung đánh giá minh họa cho giao diện.',
        },
        {
          id: 'sample-2',
          author: 'Người trải nghiệm mẫu',
          rating: 8.8,
          text: 'Một gợi ý cho chuyến đi cùng gia đình. Đánh giá này chỉ là dữ liệu mẫu, không phải nhận xét thực tế.',
        },
      ],
      tickets: [
        {
          id: `${id}-entry`,
          name: food ? 'Trải nghiệm ẩm thực' : 'Vé vào cửa',
          group: food ? 'Food & Dining' : 'Vé vào cửa',
          description:
            'Gói tiêu chuẩn dành cho một người. Giá và nội dung chỉ để xem trước giao diện.',
          price: basePrice,
          currency: 'VND',
          includes: [food ? 'Suất trải nghiệm mẫu' : 'Vé tham quan mẫu cho một người'],
          conditions: [
            'Chưa có lịch vé thực tế.',
            'Điều kiện sử dụng, đổi và hoàn vé chờ xác nhận.',
          ],
        },
        {
          id: `${id}-combo`,
          name: food ? 'Combo ẩm thực cho hai người' : 'Vé vào cửa + Bữa trưa',
          group: 'Combo trải nghiệm',
          description:
            'Kết hợp trải nghiệm và ẩm thực trong một hành trình. Nội dung minh họa, chưa phải gói vé bán thực tế.',
          price: basePrice + 180000,
          currency: 'VND',
          includes: ['Trải nghiệm theo gói minh họa', 'Bữa ăn minh họa'],
          conditions: [
            'Chưa xác nhận suất trống.',
            'Khung giờ, thực đơn và phụ thu cần kiểm tra từ nhà cung cấp.',
          ],
        },
        {
          id: `${id}-transfer`,
          name: 'Gói trải nghiệm + Đưa đón',
          group: 'Dịch vụ bổ sung',
          description:
            'Gợi ý một gói trải nghiệm có dịch vụ đưa đón. Chỉ dùng để minh họa giao diện.',
          price: basePrice + 250000,
          currency: 'VND',
          includes: ['Trải nghiệm minh họa', 'Dịch vụ đưa đón minh họa'],
          conditions: ['Điểm đón và lịch vận hành chưa được xác nhận.'],
        },
      ],
    };
  }

  getDetails(id: string): Observable<ActivityDetails | null> {
    const localActivity = sampleCatalog.find((item) => item.id === id || item.slug === id);
    const localDetails = localActivity ? this.buildActivityDetails(localActivity) : null;

    if (!this.http || id.startsWith('demo-')) {
      return of(localDetails);
    }

    const remote$ = this.http
      .get<{ success: boolean; activity?: Record<string, unknown> }>(
        `${this.apiBase}/activities/${encodeURIComponent(id)}`,
      )
      .pipe(
        map((res) => {
          const raw = res?.activity;
          if (!raw) return localDetails;
          const mapped: Activity = {
            id: String(raw['id'] || raw['_id'] || id),
            slug: raw['slug'] ? String(raw['slug']) : localActivity?.slug,
            name: String(raw['name'] || localActivity?.name || 'Trải nghiệm TRIPLA'),
            city: String(raw['city'] || localActivity?.city || 'Việt Nam'),
            categories: Array.isArray(raw['categories'])
              ? (raw['categories'] as Activity['categories'])
              : localActivity?.categories || ['Vé tham quan'],
            description: String(
              raw['description'] ||
                localActivity?.description ||
                'Trải nghiệm đặc sắc tại điểm đến.',
            ),
            imageUrl: String(raw['imageUrl'] || raw['image'] || localActivity?.imageUrl || '/images/trangan.jpg'),
            priceFrom: Number(raw['priceFrom'] || raw['price'] || localActivity?.priceFrom || 250000),
            currency: 'VND',
            originalPrice: raw['originalPrice'] ? Number(raw['originalPrice']) : undefined,
            rating: Number(raw['rating'] || localActivity?.rating || 9.0),
            reviewCount: Number(raw['reviewCount'] || localActivity?.reviewCount || 180),
          };
          return this.buildActivityDetails(mapped);
        }),
        catchError(() => EMPTY),
      );

    return localDetails ? concat(of(localDetails), remote$) : remote$.pipe(catchError(() => of(null)));
  }

  search(criteria: ActivitySearchCriteria): Observable<Activity[]> {
    const localResults = filterActivities(sampleCatalog, criteria);
    if (!this.http) {
      return of(localResults);
    }

    const remote$ = this.http
      .get<{ success: boolean; items?: Record<string, unknown>[] }>(`${this.apiBase}/activities`)
      .pipe(
        map((res) => {
          const items = res?.items || [];
          const mappedMongo: Activity[] = items.map((raw, idx) => ({
            id: String(raw['id'] || raw['_id'] || `act-${idx}`),
            slug: raw['slug'] ? String(raw['slug']) : undefined,
            name: String(raw['name'] || 'Trải nghiệm du lịch'),
            city: String(raw['city'] || 'Đà Lạt'),
            categories: Array.isArray(raw['categories'])
              ? (raw['categories'] as Activity['categories'])
              : ['Vé tham quan'],
            description: String(raw['description'] || 'Khám phá điểm đến hấp dẫn cùng TRIPLA.'),
            imageUrl: String(raw['imageUrl'] || raw['image'] || '/images/trangan.jpg'),
            priceFrom: Number(raw['priceFrom'] || raw['price'] || 250000),
            currency: 'VND',
            originalPrice: raw['originalPrice'] ? Number(raw['originalPrice']) : undefined,
            rating: Number(raw['rating'] || 9.0),
            reviewCount: Number(raw['reviewCount'] || 210),
          }));
          const mergedMap = new Map<string, Activity>();
          for (const item of [...mappedMongo, ...sampleCatalog]) {
            const key = normalizeDestination(item.name) || item.id;
            if (!mergedMap.has(key)) {
              mergedMap.set(key, item);
            }
          }
          return filterActivities(Array.from(mergedMap.values()), criteria);
        }),
        catchError(() => EMPTY),
      );

    return concat(of(localResults), remote$);
  }
}
