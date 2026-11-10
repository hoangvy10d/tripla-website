import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { normalizeDestination } from '../../models/vietnam-destinations';
import { Activity, ActivityDetails } from '../models/activity.model';
import { ActivitySearchCriteria } from '../models/activity-search.model';

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
];

const foodSamples: Activity[] = [
  'Đà Lạt',
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Nẵng',
  'Phú Quốc',
  'Ninh Bình',
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
  const normalize = (value: string) => {
    const text = normalizeDestination(value);
    return ['tp hcm', 'tphcm', 'sai gon', 'saigon', 'tp ho chi minh'].includes(text)
      ? 'ho chi minh'
      : text;
  };
  const location = normalize(criteria.location);
  if (!location) return [];
  const words = normalizeDestination(criteria.query).split(' ').filter(Boolean);
  const results = items.filter(
    (item) =>
      (location === 'viet nam' || normalize(item.city) === location) &&
      (!criteria.categories.length ||
        item.categories.some((category) => criteria.categories.includes(category))) &&
      (criteria.minPrice === undefined ||
        (item.priceFrom !== undefined && item.priceFrom >= criteria.minPrice)) &&
      (criteria.maxPrice === undefined ||
        (item.priceFrom !== undefined && item.priceFrom <= criteria.maxPrice)) &&
      words.every((word) =>
        normalizeDestination(
          item.name + ' ' + item.description + ' ' + item.categories.join(' '),
        ).includes(word),
      ),
  );
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
  getDetails(id: string): Observable<ActivityDetails | null> {
    const activity = sampleCatalog.find((item) => item.id === id);
    if (!activity) return of(null);
    const food = activity.categories.includes('Food & Dining');
    return of({
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
      amenities: ['Thông tin dịch vụ đang cập nhật', 'Chính sách hỗ trợ chờ nhà cung cấp'],
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
          price: activity.priceFrom!,
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
          price: activity.priceFrom! + 180000,
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
          price: activity.priceFrom! + 250000,
          currency: 'VND',
          includes: ['Trải nghiệm minh họa', 'Dịch vụ đưa đón minh họa'],
          conditions: ['Điểm đón và lịch vận hành chưa được xác nhận.'],
        },
      ],
    });
  }
  search(criteria: ActivitySearchCriteria): Observable<Activity[]> {
    return of(filterActivities(sampleCatalog, criteria));
  }
}
