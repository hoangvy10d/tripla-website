/**
 * ============================================================================
 * STEP 2.1: NORMALIZED ERD + LEGACY `tripla/data` FULL DATABASE SEEDING
 * (`my-server-mongodb/seed.js`)
 * Kết nối tới MongoDB Compass: mongodb://localhost:27017/tripla_db
 * Nạp kết hợp:
 *  1. Bộ dữ liệu Luxury Edition (`compass_data/`)
 *  2. Toàn bộ dữ liệu gốc từ thư mục phiên bản cũ `d:\k24411e_web\Tripla\tripla\data`:
 *     - 5 Hồ sơ thành viên nhóm (`a1.json`: Trần Duy Thanh, `u1.json`: Nguyễn Hoàng Vy,
 *       `u2.json`: Ngô Minh Thùy, `u3.json`: Trần Thị Nhật Minh, `u4.json`: Võ Lê Quỳnh Nga)
 *     - 11 Khách sạn & Hạng phòng chi tiết (`booking/hotels/index.json` + `locations/99`)
 *     - 18 Địa điểm tham quan, Ẩm thực, Cafe (`booking/locations/index.json`)
 *     - 9 Tuyến xe khách & Limousine (`booking/buses/index.json`)
 *     - 42 Video Reels `.mp4` & Bài đăng Cộng đồng (`community/index.json`)
 *     - Bình luận Cộng đồng (`community/comments/index.json`)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Types } = mongoose;
const {
  User,
  Provider,
  Location,
  Hotel,
  Room,
  Booking,
  Payment,
  Content,
  LocationTag,
  TripPlan,
  Wishlist,
  PlanDetail,
  Trip,
  Report,
  Notification,
  Comment,
  Venue,
  Reel,
  ReelInteraction,
  LiveStream,
  Flight,
  Activity,
  BusTrip,
  SavedTrip,
  CartItem
} = require('./models');
const { sha256, toSlug } = require('./utils/helpers');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tripla_db';
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000';

// Helper tạo ObjectId cố định theo seed index để liên kết FK nhất quán
function oid(hexSuffix) {
  const clean = String(hexSuffix).replace(/[^0-9a-fA-F]/g, '').padStart(24, '6');
  return new Types.ObjectId(clean.slice(-24));
}

function resolveDataDir() {
  const localDir = path.join(__dirname, 'compass_data');
  if (fs.existsSync(localDir)) return localDir;
  return path.join(__dirname, '..', 'server', 'seed', 'compass_data');
}

function resolveLegacyTriplaDataDir() {
  const localData = path.join(__dirname, 'data');
  if (fs.existsSync(localData)) return localData;
  return path.join(__dirname, '..', 'tripla', 'data');
}

function loadJsonData(filename) {
  const filePath = path.join(resolveDataDir(), filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadLegacyJson(relativePath, fallback = []) {
  const filePath = path.join(resolveLegacyTriplaDataDir(), relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function toServerMediaUrl(rawPath, fallbackUrl = '') {
  if (!rawPath) return fallbackUrl;
  const str = String(rawPath).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  const normalized = str.replace(/^\/+/, '');
  return `${SERVER_BASE_URL}/${encodeURI(normalized)}`;
}

function buildHotspotFromVenue(venue, fallbackKey) {
  if (!venue) return null;
  const image = venue.img || venue.image || venue.imageUrl || venue.image_url;
  return {
    hotel_id: venue.hotel_id || null,
    room_id: venue.room_id || null,
    location_id: venue.location_id || null,
    venueId: String(venue._id || venue.id || ''),
    key: fallbackKey || venue.key || venue.drawerKey || venue.type || 'resort',
    tag: venue.tag || 'Xác Thực Luminous',
    title: venue.title || venue.hotel_name || venue.name,
    rating: String(venue.rating || venue.star_rating || '4.98'),
    reviews: String(venue.reviews || venue.reviewCount || venue.review_count || '320'),
    location: venue.location || venue.address || venue.city || 'Vịnh Vĩnh Hy, Ninh Thuận',
    price:
      venue.price ||
      `${Number(
        venue.price_per_night || venue.pricePerNight || venue.entry_fee || venue.discountPrice || 15000000
      ).toLocaleString('vi-VN')}₫`,
    unit: venue.unit || (fallbackKey === 'resort' ? '/ đêm' : '/ người'),
    desc: venue.desc || venue.description || venue.location_description || '',
    img: image,
    image,
    features: venue.features || [
      { icon: 'verified', label: 'Xác thực đối tác chính thức TRIPLA' },
      { icon: 'concierge', label: 'Quản gia & Đặt lịch tức thì 24/7' }
    ]
  };
}

function buildHotspotFromHotelAndRoom(hotel, room) {
  if (!hotel) return null;
  const priceVnd = room?.room_price || hotel.price_per_night || hotel.pricePerNight || 15000000;
  const img =
    room?.room_images?.[0] ||
    hotel.image_url ||
    hotel.imageUrl ||
    hotel.images?.[0] ||
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80';
  return {
    hotel_id: hotel._id,
    room_id: room ? room._id : null,
    location_id: null,
    venueId: String(hotel._id),
    key: 'resort',
    tag: `${hotel.star_rating || 5} Sao Tuyệt Đỉnh • ${room?.room_name || 'Ocean Pool Pavilion'}`,
    title: hotel.hotel_name || hotel.name,
    rating: String(hotel.rating || '4.98'),
    reviews: String(hotel.reviewCount || '420'),
    location: hotel.address || hotel.city || 'Vịnh Vĩnh Hy, Ninh Thuận',
    price: `${Number(priceVnd).toLocaleString('vi-VN')}₫`,
    unit: '/ đêm',
    desc: room?.room_description || hotel.description || '',
    img,
    image: img,
    features: [
      { icon: 'pool', label: room?.room_name || 'Biệt thự hồ bơi vô cực riêng' },
      { icon: 'spa', label: (hotel.hotel_amenities || hotel.amenities || [])[0] || 'Butler 24/7 & Thủy trị liệu' },
      { icon: 'flight_land', label: 'Đưa đón chuyên cơ / Limousine riêng' }
    ]
  };
}

function buildHotspotFromLocation(loc, key = 'dining') {
  if (!loc) return null;
  const img =
    loc.image_url ||
    'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1000&q=80';
  const fee = Number(loc.entry_fee) || 0;
  return {
    hotel_id: null,
    room_id: null,
    location_id: loc._id,
    venueId: String(loc._id),
    key,
    tag: loc.tag || (key === 'yacht' ? 'Hải Trình Hoàng Hôn' : 'Điểm Đến Nổi Bật'),
    title: loc.name,
    rating: String(loc.rating || '4.92'),
    reviews: String(loc.review_count || '310'),
    location: loc.address || loc.city || 'Việt Nam',
    price: fee > 0 ? `${fee.toLocaleString('vi-VN')}₫` : 'Miễn phí vé vào',
    unit: loc.unit || (key === 'yacht' ? '/ hải trình' : '/ khách'),
    desc: loc.location_description || '',
    img,
    image: img,
    features:
      loc.features && loc.features.length > 0
        ? loc.features
        : [
            { icon: 'verified', label: 'Điểm đến xác thực bởi Cộng đồng TRIPLA' },
            { icon: 'schedule', label: 'Hỗ trợ thêm trực tiếp vào Lịch trình Trip Planning' }
          ]
  };
}

/**
 * Chuẩn bị toàn bộ dữ liệu quan hệ ERD + dữ liệu gốc từ `tripla/data`
 */
function getPreparedSeedData() {
  // ==========================================================================
  // BƯỚC 1: TẠO USERS (Kết hợp Users mới + 5 Profiles gốc `a1`, `u1`..`u4` từ `tripla/data/profiles`)
  // ==========================================================================
  const userProvider1Id = oid('673000000000000000000101');
  const userProvider2Id = oid('673000000000000000000102');
  const userCreator1Id = oid('673000000000000000000103');
  const userCreator2Id = oid('673000000000000000000104');
  const userTourist1Id = oid('673000000000000000000105');
  const userAdminId = oid('673000000000000000000106');

  // 5 tài khoản gốc từ `tripla/data/profiles`
  const userA1Id = oid('673000000000000000000110'); // a1: Trần Duy Thanh
  const userU1Id = oid('673000000000000000000111'); // u1: Nguyễn Hoàng Vy
  const userU2Id = oid('673000000000000000000112'); // u2: Ngô Minh Thùy
  const userU3Id = oid('673000000000000000000113'); // u3: Trần Thị Nhật Minh
  const userU4Id = oid('673000000000000000000114'); // u4: Võ Lê Quỳnh Nga

  const legacyProfileIds = [
    { file: 'profiles/a1.json', oid: userA1Id, fallbackCode: 'a1', defaultPass: 'admin123', defaultPhone: '0909000110' },
    { file: 'profiles/u1.json', oid: userU1Id, fallbackCode: 'u1', defaultPass: '123456', defaultPhone: '0909111001' },
    { file: 'profiles/u2.json', oid: userU2Id, fallbackCode: 'u2', defaultPass: '123456', defaultPhone: '0909111002' },
    { file: 'profiles/u3.json', oid: userU3Id, fallbackCode: 'u3', defaultPass: '123456', defaultPhone: '0909111003' },
    { file: 'profiles/u4.json', oid: userU4Id, fallbackCode: 'u4', defaultPass: '123456', defaultPhone: '0909111004' }
  ];

  const legacyUsers = legacyProfileIds.map((item) => {
    const p = loadLegacyJson(item.file, {});
    const avatarUrl = toServerMediaUrl(
      p.avatar,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    );
    const coverUrl = toServerMediaUrl(p.coverImage, avatarUrl);
    const role = p.role === 'admin' ? 'admin' : 'tourist';
    const handle =
      p.socials?.instagram ||
      p.socials?.tiktok ||
      `@${(p.id || item.fallbackCode).toLowerCase()}`;

    return {
      _id: item.oid,
      code: p.id || item.fallbackCode,
      full_name: p.name || 'Thành viên Tripla',
      fullName: p.name || 'Thành viên Tripla',
      email: p.email || `${item.fallbackCode}@tripla.vn`,
      password: sha256(item.defaultPass),
      phone_number: p.phone_number || p.phone || item.defaultPhone,
      avatar: avatarUrl,
      coverImage: coverUrl,
      bio: p.bio || 'Đam mê xê dịch và khám phá Việt Nam cùng Tripla.',
      location: p.location || 'Việt Nam',
      role,
      handle,
      level: p.level || 'Hạng Vàng',
      membershipTier: p.level || 'GOLD VIP',
      points: Number(p.points || 1500),
      followers: Number(p.followers || 250),
      following: Number(p.following || 80),
      socials: p.socials || {},
      interests: p.interests || ['Du lịch', 'Khám phá'],
      badges: p.badges || [],
      created_at: new Date('2026-01-20T08:00:00Z')
    };
  });

  const users = [
    ...legacyUsers,
    {
      _id: userProvider1Id,
      code: 'user_provider_aman',
      full_name: 'Amanoi & Six Senses Luxury Hospitality',
      fullName: 'Amanoi & Six Senses Luxury Hospitality',
      email: 'partner.amanoi@tripla.vn',
      password: sha256('provider123'),
      phone_number: '0901888999',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      bio: 'Đối tác cung cấp khu nghỉ dưỡng 5 sao & biệt thự biển hàng đầu Việt Nam.',
      location: 'Ninh Thuận, Việt Nam',
      role: 'provider',
      handle: '@amanoi_official',
      level: 'Đối Tác Kim Cương',
      membershipTier: 'PARTNER DIAMOND',
      points: 95000,
      followers: 15400,
      following: 12,
      interests: ['Luxury Resort', 'Wellness', 'Private Villa'],
      badges: [{ icon: '🏨', label: 'Đối tác Khách sạn 5 Sao' }],
      created_at: new Date('2026-01-10T08:00:00Z')
    },
    {
      _id: userProvider2Id,
      code: 'user_provider_sun_marriott',
      full_name: 'Sun & Regent Luxury Resorts Vietnam',
      fullName: 'Sun & Regent Luxury Resorts Vietnam',
      email: 'partner.regent@tripla.vn',
      password: sha256('provider123'),
      phone_number: '0902777888',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      bio: 'Hệ thống khách sạn, cáp treo và du thuyền cao cấp.',
      location: 'Phú Quốc & Đà Nẵng',
      role: 'provider',
      handle: '@regent_hospitality',
      level: 'Đối Tác Kim Cương',
      membershipTier: 'PARTNER DIAMOND',
      points: 88000,
      followers: 12800,
      following: 18,
      interests: ['Resort', 'Yacht', 'Fine Dining'],
      badges: [{ icon: '⛵', label: 'Đối tác Du thuyền & Resort' }],
      created_at: new Date('2026-01-12T08:30:00Z')
    },
    {
      _id: userCreator1Id,
      code: 'user_victoria_chen',
      full_name: 'Victoria Chen',
      fullName: 'Victoria Chen',
      email: 'victoria.chen@tripla.vn',
      password: sha256('123456'),
      phone_number: '0909123456',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      bio: 'Luxury Travel Curator & Visual Storyteller.',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      role: 'tourist',
      handle: '@victoria_chen_vip',
      level: 'Hạng Kim Cương',
      membershipTier: 'PLATINUM VIP',
      points: 42500,
      followers: 28400,
      following: 145,
      interests: ['Luxury Stay', 'Fine Dining', 'Yachting'],
      badges: [{ icon: '💎', label: 'VIP Curator' }],
      created_at: new Date('2026-02-01T09:00:00Z')
    },
    {
      _id: userCreator2Id,
      code: 'user_marcus_vu',
      full_name: 'Marcus Vũ • Bespoke Explorer',
      fullName: 'Marcus Vũ • Bespoke Explorer',
      email: 'marcus.vu@tripla.vn',
      password: sha256('123456'),
      phone_number: '0908654321',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      bio: 'Khám phá những cung đường biển đảo và ẩm thực bản địa Việt Nam.',
      location: 'Đà Nẵng, Việt Nam',
      role: 'tourist',
      handle: '@marcus_bespoke',
      level: 'Hạng Bạch Kim',
      membershipTier: 'PLATINUM VIP',
      points: 31800,
      followers: 19200,
      following: 210,
      interests: ['Nhiếp ảnh', 'Biển đảo', 'Trekking'],
      badges: [{ icon: '🎥', label: 'Top Video Creator' }],
      created_at: new Date('2026-02-05T10:15:00Z')
    },
    {
      _id: userTourist1Id,
      code: 'user_khanh_linh',
      full_name: 'Nguyễn Khánh Linh',
      fullName: 'Nguyễn Khánh Linh',
      email: 'khanhlinh.nguyen@tripla.vn',
      password: sha256('123456'),
      phone_number: '0912345678',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      role: 'tourist',
      handle: '@khanhlinh_wander',
      level: 'Hạng Vàng',
      membershipTier: 'GOLD VIP',
      points: 18500,
      created_at: new Date('2026-02-15T14:00:00Z')
    },
    {
      _id: userAdminId,
      code: 'user_admin_tripla',
      full_name: 'Ban Quản Trị Hệ Thống TRIPLA',
      fullName: 'Ban Quản Trị Hệ Thống TRIPLA',
      email: 'thanh.tran@tripla.vn',
      password: sha256('admin123'),
      phone_number: '0900000111',
      avatar: toServerMediaUrl(
        'data/profiles/admin_images/Trần Duy Thanh.png',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
      ),
      role: 'admin',
      handle: '@tripla_admin',
      level: 'Hạng Huyền Thoại',
      membershipTier: 'SYSTEM ADMIN',
      points: 99999,
      created_at: new Date('2026-01-01T00:00:00Z')
    }
  ];

  const userByLegacyCode = new Map(users.map((u) => [u.code, u]));

  // ==========================================================================
  // BƯỚC 2: LẤY `user_id` TẠO PROVIDERS (1:1 UNIQUE FK)
  // ==========================================================================
  const provider1Id = oid('673000000000000000000201');
  const provider2Id = oid('673000000000000000000202');

  const providers = [
    {
      _id: provider1Id,
      user_id: userProvider1Id,
      business_name: 'Công ty Cổ phần Khu Nghỉ Dưỡng Amanoi & Six Senses Việt Nam',
      business_license: 'GPKD-NT-0500891234',
      verification_status: 'approved',
      verified_at: new Date('2026-01-15T10:00:00Z')
    },
    {
      _id: provider2Id,
      user_id: userProvider2Id,
      business_name: 'Tập đoàn Khách Sạn, Xe Limousine & Du Thuyền Sun Regent Luxury',
      business_license: 'GPKD-PQ-0301987654',
      verification_status: 'approved',
      verified_at: new Date('2026-01-18T11:00:00Z')
    }
  ];

  // ==========================================================================
  // BƯỚC 3: TẠO LOCATIONS (Kết hợp 6 Locations Luxury + 18 Locations gốc từ `tripla/data/booking/locations/index.json`)
  // ==========================================================================
  const locDining1Id = oid('673000000000000000000301');
  const locYacht1Id = oid('673000000000000000000302');
  const locDining2Id = oid('673000000000000000000303');
  const locYacht2Id = oid('673000000000000000000304');
  const locAttraction1Id = oid('673000000000000000000305');
  const locAttraction2Id = oid('673000000000000000000306');

  const baseLocations = [
    {
      _id: locDining1Id,
      slug: 'venue_dining_cliff_01',
      name: 'The Cliff Dining Pavilion • Amanoi Vĩnh Hy',
      location_category: 'restaurant',
      address: 'Đỉnh Vách Đá Vịnh Vĩnh Hy, Vườn Quốc Gia Núi Chúa, Ninh Thuận',
      city: 'Ninh Thuận',
      latitude: 11.7158,
      longitude: 109.1945,
      geo: { type: 'Point', coordinates: [109.1945, 11.7158] },
      entry_fee: 4200000,
      requires_reservation: true,
      reservation_duration: 150,
      location_description:
        'Thực đơn 9 món Fine Dining Omakase & Hải sản địa phương kèm rượu vang Grand Cru trên vách đá nhìn thẳng ra vịnh Vĩnh Hy lúc hoàng hôn.',
      image_url:
        'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=85',
      rating: 4.97,
      review_count: 342,
      unit: '/ thực khách',
      tag: 'Ẩm Thực Michelin Cliff',
      drawerKey: 'dining',
      features: [
        { icon: 'restaurant_menu', label: 'Thực đơn degustation 9 món hải sản Vĩnh Hy' },
        { icon: 'wine_bar', label: 'Sommelier riêng & Rượu vang Grand Cru' },
        { icon: 'wb_twilight', label: 'Bàn vách đá riêng tư ngắm hoàng hôn' }
      ]
    },
    {
      _id: locYacht1Id,
      slug: 'venue_yacht_catamaran_01',
      name: 'Du Thuyền Siêu Sang Sovereign Catamaran 68ft',
      location_category: 'attraction',
      address: 'Bến Du Thuyền Vịnh Vĩnh Hy & Hòn Rùa, Ninh Thuận',
      city: 'Ninh Thuận',
      latitude: 11.712,
      longitude: 109.198,
      geo: { type: 'Point', coordinates: [109.198, 11.712] },
      entry_fee: 18500000,
      requires_reservation: true,
      reservation_duration: 240,
      location_description:
        'Hải trình 4 tiếng trên siêu du thuyền hai thân Catamaran 68ft riêng tư: Lặn ngắm san hô nguyên sinh, thưởng thức Champagne Dom Pérignon & Tôm hùm nướng.',
      image_url:
        'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=85',
      rating: 4.99,
      review_count: 215,
      unit: '/ hải trình',
      tag: 'Siêu Du Thuyền Riêng Tư',
      drawerKey: 'yacht',
      features: [
        { icon: 'sailing', label: 'Thuê trọn gói Catamaran 68ft kèm Thuyền trưởng' },
        { icon: 'liquor', label: 'Champagne Dom Pérignon & Canapé thượng hạng' },
        { icon: 'scuba_diving', label: 'Thiết bị lặn biển & Seabob chuyên nghiệp' }
      ]
    },
    {
      _id: locDining2Id,
      slug: 'venue_dining_oki_02',
      name: 'Oku Contemporary Japanese & Salon de Boeuf',
      location_category: 'restaurant',
      address: 'Bãi Trường, Regent Phú Quốc, Tỉnh Kiên Giang',
      city: 'Phú Quốc',
      latitude: 10.1235,
      longitude: 103.9812,
      geo: { type: 'Point', coordinates: [103.9812, 10.1235] },
      entry_fee: 3800000,
      requires_reservation: true,
      reservation_duration: 120,
      location_description:
        'Không gian ẩm thực Nhật - Pháp đương đại với bò Wagyu A5 Miyazaki nướng than Binchotan và quầy Omakase trực diện biển Phú Quốc.',
      image_url:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
      rating: 4.96,
      review_count: 290,
      unit: '/ thực khách',
      tag: 'Fine Dining Omakase',
      drawerKey: 'dining',
      features: [
        { icon: 'set_meal', label: 'Wagyu A5 Miyazaki & Omakase 12 món' },
        { icon: 'local_bar', label: 'Cocktail thủ công tại Bar Jade' }
      ]
    },
    {
      _id: locYacht2Id,
      slug: 'venue_yacht_serenity_02',
      name: 'Du Thuyền Serenity Emperor 5 Sao Vịnh Hạ Long & Lan Hạ',
      location_category: 'attraction',
      address: 'Cảng Tàu Khách Quốc Tế Tuần Châu, Hạ Long, Quảng Ninh',
      city: 'Hạ Long',
      latitude: 20.9185,
      longitude: 106.9892,
      geo: { type: 'Point', coordinates: [106.9892, 20.9185] },
      entry_fee: 14500000,
      requires_reservation: true,
      reservation_duration: 300,
      location_description:
        'Du ngoạn vịnh di sản trên siêu du thuyền Serenity với bể sục Jacuzzi trên boong thượng, chèo Kayak hang Sáng Tối và tiệc tối dưới ánh nến.',
      image_url:
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=85',
      rating: 4.95,
      review_count: 418,
      unit: '/ hải trình',
      tag: 'Du Thuyền Di Sản',
      drawerKey: 'yacht',
      features: [
        { icon: 'directions_boat', label: 'Hải trình riêng qua Vịnh Lan Hạ & Hang Sáng Tối' },
        { icon: 'hot_tub', label: 'Bể sục Jacuzzi vô cực ngắm hoàng hôn' }
      ]
    },
    {
      _id: locAttraction1Id,
      slug: 'venue_attraction_nuichua_01',
      name: 'Khu Dự Trữ Sinh Quyển Thế Giới Núi Chúa & Hang Rái',
      location_category: 'nature',
      address: 'Vĩnh Hải, Ninh Hải, Ninh Thuận',
      city: 'Ninh Thuận',
      latitude: 11.7312,
      longitude: 109.2105,
      geo: { type: 'Point', coordinates: [109.2105, 11.7312] },
      entry_fee: 850000,
      requires_reservation: true,
      reservation_duration: 180,
      location_description:
        'Trekking bình minh cùng hướng dẫn viên bản địa khám phá thềm san hô cổ hàng triệu năm tuổi tại Hang Rái và rừng khô hạn Núi Chúa.',
      image_url:
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85',
      rating: 4.92,
      review_count: 510,
      unit: '/ người',
      tag: 'Thiên Nhiên Nguyên Sinh',
      drawerKey: 'dining',
      features: [
        { icon: 'hiking', label: 'Private Trekking cùng chuyên gia sinh thái' },
        { icon: 'photo_camera', label: 'Điểm săn bình minh đẹp nhất Việt Nam' }
      ]
    },
    {
      _id: locAttraction2Id,
      slug: 'venue_attraction_banahills_02',
      name: 'Cầu Vàng & Làng Pháp Sun World Bà Nà Hills VIP Pass',
      location_category: 'attraction',
      address: 'Thôn An Sơn, Hòa Ninh, Hòa Vang, Đà Nẵng',
      city: 'Đà Nẵng',
      latitude: 15.9977,
      longitude: 107.9881,
      geo: { type: 'Point', coordinates: [107.9881, 15.9977] },
      entry_fee: 1650000,
      requires_reservation: true,
      reservation_duration: 240,
      location_description:
        'Lối đi ưu tiên WOW Pass không xếp hàng cáp treo, thưởng thức tiệc trưa hầm rượu cổ Debay và dạo bước trên Cầu Vàng.',
      image_url:
        'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=85',
      rating: 4.91,
      review_count: 680,
      unit: '/ khách',
      tag: 'Đặc Quyền WOW Pass',
      drawerKey: 'dining',
      features: [
        { icon: 'confirmation_number', label: 'Lối đi VIP Cáp treo không chờ đợi' },
        { icon: 'wine_bar', label: 'Tham quan & Thử rượu Hầm rượu cổ Debay' }
      ]
    }
  ];

  // Nạp thêm toàn bộ Locations từ `tripla/data/booking/locations/index.json`
  const rawLegacyLocations = loadLegacyJson('booking/locations/index.json', []);
  const legacyLocationMap = new Map();
  const validLocCats = new Set(['attraction', 'restaurant', 'cafe', 'shopping', 'nature', 'other']);

  const importedLegacyLocations = rawLegacyLocations
    .filter((l) => l.category !== 'hotel')
    .map((l, idx) => {
      const locOid = oid(`6730000000000000000003${String(20 + idx).padStart(2, '0')}`);
      const lat = Number(l.lat) || 16.0544;
      const lng = Number(l.lng) || 108.2022;
      const cat = validLocCats.has(l.category)
        ? l.category
        : l.category === 'destination'
          ? 'nature'
          : 'attraction';
      const doc = {
        _id: locOid,
        slug: `loc_${l.id}_${idx}`,
        name: l.title || l.name,
        location_category: cat,
        address: l.address || `${l.title}, ${l.city}`,
        city: l.city || 'Đà Nẵng',
        latitude: lat,
        longitude: lng,
        geo: { type: 'Point', coordinates: [lng, lat] },
        entry_fee: Number(l.ticketPrice || 0),
        requires_reservation: Number(l.ticketPrice || 0) > 0,
        reservation_duration: 120,
        location_description: l.description || '',
        image_url: toServerMediaUrl(
          l.images?.[0],
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60'
        ),
        rating: Number(l.rating || 4.7),
        review_count: Number(l.reviewsCount || 500),
        unit: '/ khách',
        tag: cat === 'restaurant' ? 'Ẩm Thực Địa Phương' : cat === 'cafe' ? 'Cafe Check-in' : 'Điểm Tham Quan',
        drawerKey: cat === 'restaurant' || cat === 'cafe' ? 'dining' : 'yacht',
        features: [
          { icon: 'schedule', label: `Giờ mở cửa: ${l.openingHours || '08:00 - 22:00'}` },
          { icon: 'place', label: `Thành phố: ${l.city}` }
        ]
      };
      if (!legacyLocationMap.has(String(l.id))) {
        legacyLocationMap.set(String(l.id), doc);
      }
      return doc;
    });

  const locations = [...baseLocations, ...importedLegacyLocations];

  // ==========================================================================
  // BƯỚC 4: LẤY `provider_id` TẠO HOTELS & LẤY `hotel_id` TẠO ROOMS
  // (Kết hợp 8 Hotels Luxury + 10 Hotels gốc từ `tripla/data/booking/hotels/index.json`)
  // ==========================================================================
  const rawHotels = loadJsonData('hotels.json');
  const rawLegacyHotels = loadLegacyJson('booking/hotels/index.json', []);

  const hotelSeedById = {
    'hotel-amanoi-vinh-hy': { oid: oid('673000000000000000000401'), coords: [109.1932, 11.7145] },
    'hotel-six-senses-nhatrang': { oid: oid('673000000000000000000402'), coords: [109.2615, 12.3578] },
    'hotel-capella-hanoi': { oid: oid('673000000000000000000405'), coords: [105.8558, 21.0272] },
    'hotel-coupole-sapa': { oid: oid('673000000000000000000406'), coords: [103.8438, 22.3364] },
    'demo-pine': { oid: oid('673000000000000000000411'), coords: [108.4383, 11.9404] },
    'demo-garden': { oid: oid('673000000000000000000412'), coords: [108.4452, 11.9461] },
    'demo-coast': { oid: oid('673000000000000000000413'), coords: [108.2489, 16.0544] },
    'demo-island': { oid: oid('673000000000000000000414'), coords: [103.9840, 10.2899] }
  };

  const hotels = [];
  const rooms = [];
  let roomSeq = 1;

  rawHotels.forEach((h, idx) => {
    const mappedSeed = hotelSeedById[h.id];
    const hotelOid =
      mappedSeed?.oid || oid(`6730000000000000000004${String(idx + 30).padStart(2, '0')}`);
    const providerOid = idx % 2 === 0 ? provider1Id : provider2Id;
    const coords = mappedSeed?.coords || [109.1932, 11.7145];
    const basePrice = Number(h.pricePerNight) || 15000000;

    const rawHotelRooms =
      Array.isArray(h.rooms) && h.rooms.length > 0
        ? h.rooms
        : [
            {
              id: `${h.id || 'hotel'}-suite-01`,
              name: 'Ocean Pool Pavilion & Butler 24/7',
              size: 125,
              bed: '1 giường Super King hướng vịnh biển',
              guests: 2,
              pricePerNight: basePrice,
              breakfast: true
            }
          ];

    const embeddedRoomsWithOid = [];
    rawHotelRooms.forEach((rm, rIdx) => {
      const roomOid = oid(`6730000000000000000005${String(roomSeq++).padStart(2, '0')}`);
      const roomPrice = Number(rm.pricePerNight || rm.room_price || basePrice);
      const roomDoc = {
        _id: roomOid,
        code: rm.id || `${h.id}-room-${rIdx + 1}`,
        hotel_id: hotelOid,
        room_name: rm.name || rm.room_name || 'Ocean Pool Suite',
        room_type: (rm.guests || 2) >= 4 ? 'family' : 'suite',
        capacity: Number(rm.guests || rm.capacity || 2),
        room_price: roomPrice,
        total_units: 5,
        stock: 5,
        room_status: 'available',
        room_description: `${rm.name || 'Hạng phòng sang trọng'} diện tích ${rm.size || 110}m², ${rm.bed || '1 giường King'}, bao gồm trà chiều & quản gia riêng.`,
        room_amenities: h.amenities || ['Hồ bơi vô cực riêng', 'Quản gia 24/7', 'Bữa sáng Champagne'],
        room_images: h.images || [h.imageUrl],
        size_m2: Number(rm.size || 110),
        bed: rm.bed || '1 giường King',
        breakfast: rm.breakfast !== false
      };
      rooms.push(roomDoc);

      embeddedRoomsWithOid.push({
        _id: roomOid,
        id: String(roomOid),
        code: roomDoc.code,
        hotel_id: hotelOid,
        name: roomDoc.room_name,
        room_name: roomDoc.room_name,
        room_type: roomDoc.room_type,
        size: roomDoc.size_m2,
        bed: roomDoc.bed,
        guests: roomDoc.capacity,
        capacity: roomDoc.capacity,
        pricePerNight: roomDoc.room_price,
        room_price: roomDoc.room_price,
        total_units: 5,
        stock: 5,
        breakfast: roomDoc.breakfast
      });
    });

    hotels.push({
      _id: hotelOid,
      id: h.id || h._id || `hotel-${idx + 1}`,
      hotel_slug: h.hotel_slug || toSlug(h.name) || h.id || `hotel-${idx + 1}`,
      provider_id: providerOid,
      hotel_name: h.name,
      name: h.name,
      description: h.description || `${h.name} — Khu nghỉ dưỡng 5 sao biểu tượng tại ${h.city}.`,
      address: h.address || `${h.area || ''}, ${h.city}`,
      city: h.city,
      area: h.area || h.city,
      longitude: coords[0],
      latitude: coords[1],
      geo: { type: 'Point', coordinates: coords },
      star_rating: Number(h.stars || 5),
      stars: Number(h.stars || 5),
      total_rooms: 36,
      hotel_amenities: h.amenities || ['Hồ bơi vô cực', 'Spa trị liệu', 'Bãi biển riêng'],
      amenities: h.amenities || ['Hồ bơi vô cực', 'Spa trị liệu', 'Bãi biển riêng'],
      policies: h.policies || [
        'Nhận phòng từ 14:00 – Trả phòng trước 12:00',
        'Miễn phí hủy phòng trước 7 ngày',
        'Bao gồm đưa đón sân bay VIP theo hạng biệt thự'
      ],
      check_in_time: '14:00:00',
      check_out_time: '12:00:00',
      price_per_night: basePrice,
      pricePerNight: basePrice,
      originalPrice: Math.round(basePrice * 1.32),
      discountPercent: 25,
      soldPercent: 82,
      rating: Number(h.rating || 9.6),
      reviewCount: Number(h.reviewCount || 340),
      accommodation: h.accommodation || h.accommodationType || 'Khu nghỉ dưỡng (Resort)',
      accommodationType: h.accommodation || h.accommodationType || 'Khu nghỉ dưỡng (Resort)',
      image_url: h.images?.[0] || h.imageUrl,
      imageUrl: h.images?.[0] || h.imageUrl,
      images: h.images || [h.imageUrl],
      isFlashDeal: idx < 4,
      isLuxuryStay: true,
      isBestSeller: idx < 3,
      perks: ['Bữa sáng Champagne miễn phí', 'Quản gia 24/7', 'Nâng hạng phòng tự động'],
      specialOffer: 'Đặc quyền TRIPLA VIP: Tặng 1 bữa tối Fine Dining & Spa 60 phút',
      rooms: embeddedRoomsWithOid
    });
  });

  // Nạp thêm các khách sạn gốc từ `tripla/data/booking/hotels/index.json` (`h1`..`h10`)
  const cityCoordsMap = {
    'Đà Nẵng': [108.2208, 16.0544],
    'Hà Nội': [105.8542, 21.0285],
    'Hồ Chí Minh': [106.7009, 10.7769],
    'TP. Hồ Chí Minh': [106.7009, 10.7769],
    'Đà Lạt': [108.4383, 11.9404],
    'Nha Trang': [109.1967, 12.2388],
    'Phú Quốc': [103.984, 10.2899],
    'Sa Pa': [103.8438, 22.3364],
    'Hạ Long': [107.0448, 20.9599]
  };

  rawLegacyHotels.forEach((lh, idx) => {
    const hotelOid = oid(`6730000000000000000004${String(20 + idx).padStart(2, '0')}`);
    const providerOid = idx % 2 === 0 ? provider2Id : provider1Id;
    const coords = cityCoordsMap[lh.city] || [108.2208, 16.0544];
    const mappedImages = (lh.images || []).map((img) => toServerMediaUrl(img));
    const firstRoomPrice = Number(lh.roomDetails?.[0]?.price) || Number(lh.pricePerNight || 120) * 25000;

    const embeddedRooms = [];
    (lh.roomDetails || []).forEach((rm, rIdx) => {
      const roomOid = oid(`6730000000000000000005${String(roomSeq++).padStart(2, '0')}`);
      const rPrice = Number(rm.price) || firstRoomPrice;
      const sizeNum = parseInt(String(rm.size || '40').replace(/\D+/g, ''), 10) || 40;
      const roomDoc = {
        _id: roomOid,
        code: `${lh.id}_${rm.id || rIdx}`,
        hotel_id: hotelOid,
        room_name: rm.name || 'Deluxe Room',
        room_type: (rm.capacity || 2) >= 3 ? 'family' : 'double',
        capacity: Number(rm.capacity || 2),
        room_price: rPrice,
        total_units: 5,
        stock: 5,
        room_status: 'available',
        room_description: `${rm.name} (${rm.size || '42m²'}) • ${rm.beds || '1 giường đôi lớn'} • ${rm.cancellation || 'Miễn phí hủy phòng'}.`,
        room_amenities: rm.amenities || lh.amenities || ['Ban công', 'Điều hòa', 'Minibar'],
        room_images: mappedImages.length > 0 ? mappedImages : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
        size_m2: sizeNum,
        bed: rm.beds || '1 giường đôi lớn',
        breakfast: rm.breakfast !== false
      };
      rooms.push(roomDoc);

      embeddedRooms.push({
        _id: roomOid,
        id: String(roomOid),
        code: roomDoc.code,
        hotel_id: hotelOid,
        name: roomDoc.room_name,
        room_name: roomDoc.room_name,
        room_type: roomDoc.room_type,
        size: roomDoc.size_m2,
        bed: roomDoc.bed,
        guests: roomDoc.capacity,
        capacity: roomDoc.capacity,
        pricePerNight: roomDoc.room_price,
        room_price: roomDoc.room_price,
        total_units: 5,
        stock: 5,
        breakfast: roomDoc.breakfast
      });
    });

    hotels.push({
      _id: hotelOid,
      id: lh.id || `legacy-hotel-${idx + 1}`,
      hotel_slug: lh.hotel_slug || toSlug(lh.name) || lh.id || `legacy-hotel-${idx + 1}`,
      provider_id: providerOid,
      hotel_name: lh.name,
      name: lh.name,
      description: lh.description || `${lh.name} tọa lạc tại vị trí trung tâm ${lh.city}.`,
      address: lh.address || `Trung tâm ${lh.city}`,
      city: lh.city || 'Đà Nẵng',
      area: lh.city || 'Đà Nẵng',
      longitude: coords[0],
      latitude: coords[1],
      geo: { type: 'Point', coordinates: coords },
      star_rating: Math.min(5, Math.max(4, Math.round(Number(lh.rating || 4.8)))),
      stars: Math.min(5, Math.max(4, Math.round(Number(lh.rating || 4.8)))),
      total_rooms: 45,
      hotel_amenities: lh.amenities || ['Hồ bơi', 'WiFi miễn phí', 'Spa'],
      amenities: lh.amenities || ['Hồ bơi', 'WiFi miễn phí', 'Spa'],
      policies: ['Nhận phòng từ 14:00 – Trả phòng trước 12:00', 'Miễn phí hủy trước 2 ngày'],
      check_in_time: '14:00:00',
      check_out_time: '12:00:00',
      price_per_night: firstRoomPrice,
      pricePerNight: firstRoomPrice,
      originalPrice: Math.round(firstRoomPrice * 1.25),
      discountPercent: 20,
      soldPercent: 76,
      rating: Number(lh.reviewScore || (Number(lh.rating || 4.7) * 2).toFixed(1)),
      reviewCount: Number(lh.reviewCount || 850),
      accommodation: 'Khách sạn (Hotel)',
      accommodationType: 'Khách sạn (Hotel)',
      image_url: mappedImages[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      imageUrl: mappedImages[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      images: mappedImages,
      isFlashDeal: false,
      isLuxuryStay: true,
      isBestSeller: idx < 2,
      perks: ['Bữa sáng tự chọn hàng ngày', 'Miễn phí hủy phòng linh hoạt'],
      specialOffer: 'Ưu đãi đặt sớm từ hệ thống Tripla',
      rooms: embeddedRooms
    });
  });

  // ==========================================================================
  // BƯỚC 5: TẠO CONTENTS (7 YouTube Highlights + 18 Reels Luxury + 12 Reels gốc)
  // ==========================================================================
  const featuredYouTubeReels = [
    {
      _id: 'reel_yt_01',
      id: 'v_yt_01',
      slug: 'vietnam-timeless-charm-ve-dep-bat-tan',
      title: 'Vietnam Timeless Charm — Vẻ đẹp bất tận Việt Nam 🇻🇳✨',
      caption: 'Hành trình chạm đến tinh hoa văn hóa, vịnh biển ngọc bích và nhịp sống thanh bình khắp dải đất hình chữ S.',
      hashtags: ['vietnam', 'timelesscharm', 'dulichvietnam', 'tripla'],
      videoUrl: 'https://youtu.be/AYLnGs2n9Xg',
      image: 'https://img.youtube.com/vi/AYLnGs2n9Xg/maxresdefault.jpg',
      location: 'Việt Nam',
      drawerKey: 'resort',
      category: 'trending',
      stats: { views: 128500, likes: 24600, commentsCount: 520, bookmarks: 8900 }
    },
    {
      _id: 'reel_yt_02',
      id: 'v_yt_02',
      slug: 'vietnam-my-home-masew-canh-sac-que-huong',
      title: 'VIETNAM | My Home — Bản hòa ca cảnh sắc & con người Việt Nam 🎶🏔️',
      caption: 'Thước phim âm nhạc và thị giác bùng nổ của Masew, MyoMouse & Nguyen Loi tôn vinh non sông gấm vóc quê hương.',
      hashtags: ['vietnammyhome', 'masew', 'travel', 'tripshort'],
      videoUrl: 'https://youtu.be/NSnkb1IAjbE',
      image: 'https://img.youtube.com/vi/NSnkb1IAjbE/maxresdefault.jpg',
      location: 'Việt Nam',
      drawerKey: 'resort',
      category: 'trending',
      stats: { views: 342000, likes: 58200, commentsCount: 1420, bookmarks: 16500 }
    },
    {
      _id: 'reel_yt_03',
      id: 'v_yt_03',
      slug: 'vinh-ha-long-4k-tuyet-tac-da-voi-bien-ngoc-unesco',
      title: 'Vịnh Hạ Long 4K — Tuyệt tác đá vôi & biển ngọc di sản UNESCO 🛳️🌊',
      caption: 'Chiêm ngưỡng toàn cảnh kỳ quan thiên nhiên thế giới Vịnh Hạ Long từ trên cao, len lỏi giữa hàng nghìn đảo đá vôi kỳ vĩ.',
      hashtags: ['halongbay', 'unesco', 'quangninh', 'luxurycruise'],
      videoUrl: 'https://youtu.be/vt9OL_sJ5gA',
      image: 'https://img.youtube.com/vi/vt9OL_sJ5gA/maxresdefault.jpg',
      location: 'Hạ Long, Quảng Ninh',
      drawerKey: 'yacht',
      category: 'for-you',
      stats: { views: 195000, likes: 31200, commentsCount: 680, bookmarks: 9400 }
    },
    {
      _id: 'reel_yt_04',
      id: 'v_yt_04',
      slug: 'ky-quan-son-doong-hang-dong-lon-nhat-hanh-tinh',
      title: 'Kỳ quan Sơn Đoòng — Khám phá hang động lớn nhất hành tinh ⛰️🔦',
      caption: 'Thám hiểm thế giới ngầm kỳ ảo trong lòng Vườn Quốc Gia Phong Nha - Kẻ Bàng, nơi có mây trôi và rừng rậm nguyên sinh.',
      hashtags: ['sondoong', 'phongnha', 'quangbinh', 'adventure'],
      videoUrl: 'https://youtu.be/og_1u8RFmuI',
      image: 'https://img.youtube.com/vi/og_1u8RFmuI/maxresdefault.jpg',
      location: 'Phong Nha, Quảng Bình',
      drawerKey: 'resort',
      category: 'for-you',
      stats: { views: 248000, likes: 45000, commentsCount: 890, bookmarks: 12200 }
    },
    {
      _id: 'reel_yt_05',
      id: 'v_yt_05',
      slug: 'thung-lung-lauterbrunnen-thuy-si-co-tich',
      title: 'Thung lũng thác nước Lauterbrunnen đẹp như cổ tích Thụy Sĩ 🇨🇭🏞️',
      caption: 'Lạc bước vào thiên đường giữa trần gian với 72 ngọn thác đổ từ vách đá dựng đứng giữa thung lũng tuyết trắng Thụy Sĩ.',
      hashtags: ['switzerland', 'lauterbrunnen', 'nature', 'wanderlust'],
      videoUrl: 'https://youtube.com/shorts/Ux2zKPR6RD0',
      image: 'https://img.youtube.com/vi/Ux2zKPR6RD0/hqdefault.jpg',
      location: 'Lauterbrunnen, Thụy Sĩ',
      drawerKey: 'resort',
      category: 'latest',
      stats: { views: 88000, likes: 16500, commentsCount: 310, bookmarks: 4200 }
    },
    {
      _id: 'reel_yt_06',
      id: 'v_yt_06',
      slug: 'chinh-phuc-dai-ngan-canada-hiking',
      title: 'Chinh phục đại ngàn & hồ băng xanh ngắt tại Canada 🇨🇦🌲',
      caption: 'Hải trình trekking xuyên qua những cánh rừng thông ngút ngàn và mặt hồ màu ngọc bích phẳng lặng như gương tại Canada.',
      hashtags: ['canada', 'hikingadventures', 'travelwithme', 'explore'],
      videoUrl: 'https://youtube.com/shorts/pWpNAEvTOb8',
      image: 'https://img.youtube.com/vi/pWpNAEvTOb8/hqdefault.jpg',
      location: 'British Columbia, Canada',
      drawerKey: 'dining',
      category: 'latest',
      stats: { views: 76000, likes: 14200, commentsCount: 280, bookmarks: 3900 }
    },
    {
      _id: 'reel_yt_07',
      id: 'v_yt_07',
      slug: 'mua-dong-tuyet-trang-banff-canada',
      title: 'Mùa đông tuyết trắng xứ thần tiên tại Vườn Quốc Gia Banff ❄️🏔️',
      caption: 'Khoảnh khắc yên bình đến nghẹt thở khi cả thị trấn Banff chìm trong lớp tuyết mịn màng giữa rặng núi Rocky hùng vĩ.',
      hashtags: ['banff', 'explorecanada', 'winterwonderland', 'tripshort'],
      videoUrl: 'https://youtube.com/shorts/OP5JtPSfP0g',
      image: 'https://img.youtube.com/vi/OP5JtPSfP0g/hqdefault.jpg',
      location: 'Banff National Park, Canada',
      drawerKey: 'resort',
      category: 'for-you',
      stats: { views: 92000, likes: 19800, commentsCount: 410, bookmarks: 5600 }
    }
  ];

  const rawReels = loadJsonData('reels.json');
  const allReelsToProcess = [...featuredYouTubeReels, ...rawReels];
  const legacyCommunity = loadLegacyJson('community/index.json', { reels: [], posts: [] });
  const contents = [];
  const locationTags = [];
  const reels = [];
  const drawerKeys = ['resort', 'yacht', 'dining'];
  let tagSeq = 1;

  allReelsToProcess.forEach((r, idx) => {
    const contentOid = oid(`6730000000000000000008${String(idx + 1).padStart(2, '0')}`);
    const creatorUser = legacyUsers[idx % legacyUsers.length] || users[2];
    const linkedHotel = hotels[idx % hotels.length];
    const linkedRoom =
      rooms.find((rm) => String(rm.hotel_id) === String(linkedHotel._id)) || rooms[0];
    const linkedDiningLoc = idx % 2 === 0 ? locations[0] : locations[2];
    const linkedYachtLoc = idx % 2 === 0 ? locations[1] : locations[3];

    const resortHotspot = buildHotspotFromHotelAndRoom(linkedHotel, linkedRoom);
    const diningHotspot = buildHotspotFromLocation(linkedDiningLoc, 'dining');
    const yachtHotspot = buildHotspotFromLocation(linkedYachtLoc, 'yacht');

    const embeddedTags = [
      { tag_type: 'resort', hotel_id: linkedHotel._id, room_id: linkedRoom._id, location_id: null },
      { tag_type: 'dining', hotel_id: null, room_id: null, location_id: linkedDiningLoc._id },
      { tag_type: 'yacht', hotel_id: null, room_id: null, location_id: linkedYachtLoc._id }
    ];

    embeddedTags.forEach((t) => {
      locationTags.push({
        _id: oid(`6730000000000000000009${String(tagSeq++).padStart(3, '0')}`),
        content_id: contentOid,
        location_id: t.location_id,
        hotel_id: t.hotel_id,
        room_id: t.room_id,
        tag_type: t.tag_type
      });
    });

    const videoUrl =
      r.videoUrl ||
      r.media?.videoUrl ||
      'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-resort-by-the-sea-41471-large.mp4';
    const imageUrl =
      r.image ||
      r.media?.posterUrl ||
      linkedHotel.image_url ||
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80';
    const createdAtDate = new Date(r.createdAt || Date.now() - idx * 3600000);

    const contentDoc = {
      _id: contentOid,
      code: r._id || r.id || `reel_${idx + 1}`,
      user_id: creatorUser._id,
      content_title: r.title,
      content_description: r.caption || r.desc || r.title,
      caption: r.caption || r.desc || r.title,
      image_url: imageUrl,
      video_url: videoUrl,
      location_name: r.location || linkedHotel.city || 'Vịnh Vĩnh Hy, Ninh Thuận',
      drawerKey: r.drawerKey || drawerKeys[idx % drawerKeys.length],
      category: r.category || 'for-you',
      location_tags: embeddedTags,
      hotspots: {
        resort: resortHotspot,
        dining: diningHotspot,
        yacht: yachtHotspot
      },
      stats: {
        views: Number(r.stats?.views || 85400 + idx * 3200),
        likes: Number(r.stats?.likes || 14200 + idx * 650),
        commentsCount: Number(r.stats?.commentsCount || r.commentsCount || 240),
        bookmarks: Number(r.stats?.bookmarks || 3800 + idx * 120)
      },
      isLiked: Boolean(r.isLiked),
      isBookmarked: Boolean(r.isBookmarked),
      created_at: createdAtDate,
      createdAt: createdAtDate
    };
    contents.push(contentDoc);

    reels.push({
      ...r,
      _id: r._id || `reel_${idx + 1}`,
      id: r.id || `v${idx + 1}`,
      content_id: contentOid,
      user_id: creatorUser._id,
      author: creatorUser.handle || `@${creatorUser.full_name}`,
      avatar: creatorUser.avatar,
      creatorAvatar: creatorUser.avatar,
      desc: contentDoc.caption,
      videoUrl,
      image: imageUrl,
      drawerKey: contentDoc.drawerKey,
      hotspots: contentDoc.hotspots,
      stats: contentDoc.stats,
      createdAt: createdAtDate
    });
  });

  // Danh sách CDN video du lịch trực tuyến (Mixkit/Pexels HD) gắn trực tiếp vào Database URL:
  const onlineTravelVideoUrls = [
    'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-resort-by-the-sea-41471-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-coral-reef-and-fish-underwater-41465-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-sailing-boat-on-the-sea-at-sunset-4149-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-seashore-with-rocks-1090-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-foggy-forest-in-mountains-41566-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-swimming-in-an-infinity-pool-4335-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-clouds-moving-over-the-mountains-41569-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-kayaking-in-a-calm-lake-at-sunset-41504-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-walking-on-the-edge-of-an-infinity-pool-4336-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-sun-setting-over-the-ocean-waves-4148-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-friends-toasting-with-cocktails-at-sunset-42620-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4'
  ];

  // Nạp thêm các Video Reels gốc từ `tripla/data/community/index.json`
  (legacyCommunity.reels || []).slice(0, 12).forEach((lr, idx) => {
    const seqNum = 30 + idx;
    const contentOid = oid(`6730000000000000000008${String(seqNum).padStart(2, '0')}`);
    const creatorUser =
      userByLegacyCode.get(lr.userId) || legacyUsers[(idx + 1) % legacyUsers.length] || users[1];
    const matchedLoc =
      legacyLocationMap.get(String(lr.locationId)) ||
      locations[(idx + 6) % locations.length] ||
      locations[0];
    const matchedHotel =
      hotels.find((h) => h.city === matchedLoc.city) || hotels[(idx + 8) % hotels.length] || hotels[0];
    const matchedRoom =
      rooms.find((rm) => String(rm.hotel_id) === String(matchedHotel._id)) || rooms[0];

    const resortHotspot = buildHotspotFromHotelAndRoom(matchedHotel, matchedRoom);
    const diningHotspot = buildHotspotFromLocation(matchedLoc, 'dining');
    const yachtHotspot = buildHotspotFromLocation(locations[1], 'yacht');

    // Gắn URL clip du lịch trực tuyến vào Database để khi push lên Git hay import ở máy khác đều xem mượt mà 100%
    const videoUrl = onlineTravelVideoUrls[idx % onlineTravelVideoUrls.length];
    const imageUrl = matchedLoc.image_url || matchedHotel.image_url;
    const createdAtDate = new Date(Date.now() - (20 + idx) * 3600000);

    const contentDoc = {
      _id: contentOid,
      code: `legacy_${lr.id}_${idx}`,
      user_id: creatorUser._id,
      content_title: `${matchedLoc.name} • ${matchedLoc.city}`,
      content_description: lr.caption,
      caption: lr.caption,
      image_url: imageUrl,
      video_url: videoUrl,
      location_name: `${matchedLoc.name}, ${matchedLoc.city}`,
      drawerKey: 'resort',
      category: idx % 2 === 0 ? 'trending' : 'latest',
      location_tags: [
        { tag_type: 'resort', hotel_id: matchedHotel._id, room_id: matchedRoom._id, location_id: null },
        { tag_type: 'dining', hotel_id: null, room_id: null, location_id: matchedLoc._id }
      ],
      hotspots: {
        resort: resortHotspot,
        dining: diningHotspot,
        yacht: yachtHotspot
      },
      stats: {
        views: Number(lr.views || 150000),
        likes: Number(lr.likes || 5600),
        commentsCount: 48 + idx * 5,
        bookmarks: Math.round(Number(lr.likes || 5600) * 0.25)
      },
      isLiked: false,
      isBookmarked: false,
      created_at: createdAtDate,
      createdAt: createdAtDate
    };
    contents.push(contentDoc);

    reels.push({
      _id: contentDoc.code,
      id: lr.id || contentDoc.code,
      content_id: contentOid,
      user_id: creatorUser._id,
      title: contentDoc.content_title,
      caption: lr.caption,
      desc: lr.caption,
      hashtags: lr.hashtags || ['tripla', 'vietnam'],
      author: creatorUser.handle || `@${creatorUser.full_name}`,
      creator: {
        userId: String(creatorUser._id),
        handle: creatorUser.handle,
        displayName: creatorUser.full_name,
        avatarUrl: creatorUser.avatar,
        isVerified: true
      },
      avatar: creatorUser.avatar,
      creatorAvatar: creatorUser.avatar,
      videoUrl,
      image: imageUrl,
      drawerKey: 'resort',
      location: contentDoc.location_name,
      hotspots: contentDoc.hotspots,
      stats: contentDoc.stats,
      category: contentDoc.category,
      createdAt: createdAtDate
    });
  });

  // Đồng bộ `venues` với khóa ngoại `hotel_id`, `room_id`, `location_id`
  const venues = loadJsonData('venues.json').map((v) => {
    const vName = (v.name || '').toLowerCase();
    const matchedHotel = v.key
      ? hotels.find((h) => {
          const hn = (h.hotel_name || '').toLowerCase();
          if (vName.includes('amanoi')) return hn.includes('amanoi');
          if (vName.includes('six senses')) return hn.includes('six senses');
          if (vName.includes('capella')) return hn.includes('capella');
          if (vName.includes('intercontinental')) return hn.includes('intercontinental');
          if (vName.includes('jw marriott')) return hn.includes('jw marriott');
          if (vName.includes('coupole')) return hn.includes('coupole');
          if (vName.includes('regent') || vName.includes('phu quoc')) return h.city === 'Phú Quốc';
          if (vName.includes('ana mandara')) return h.city === 'Đà Lạt';
          return false;
        }) || null
      : null;
    const matchedRoom = matchedHotel
      ? rooms.find((rm) => String(rm.hotel_id) === String(matchedHotel._id)) || null
      : null;
    const matchedLoc = v.key === 'yacht' ? locations[1] : v.key === 'dining' ? locations[0] : null;

    return {
      ...v,
      hotel_id: !matchedLoc && matchedHotel ? matchedHotel._id : null,
      room_id: !matchedLoc && matchedRoom ? matchedRoom._id : null,
      location_id: matchedLoc ? matchedLoc._id : null,
      img: v.img || v.image || v.imageUrl
    };
  });
  const venueMap = new Map(venues.map((v) => [v._id, v]));

  // ==========================================================================
  // BƯỚC 6: TẠO BOOKINGS, PAYMENTS, TRIP_PLANS, WISHLIST, PLAN_DETAILS, TRIPS, REPORTS, NOTIFICATIONS, COMMENTS
  // ==========================================================================
  const booking1Id = oid('673000000000000000000601');
  const booking2Id = oid('673000000000000000000602');
  const booking3Id = oid('673000000000000000000603');
  const booking4Id = oid('673000000000000000000604');

  const amanoiHotel = hotels.find((h) => h.id === 'hotel-amanoi-vinh-hy') || hotels[0];
  const sixSensesHotel = hotels.find((h) => h.id === 'hotel-six-senses-nhatrang') || hotels[1];
  const capellaHotel = hotels.find((h) => h.id === 'hotel-capella-hanoi') || hotels[2];
  const interconDanangHotel = hotels.find((h) => h.id === 'h1') || hotels[3];

  const roomFor = (hotel) =>
    rooms.find((r) => String(r.hotel_id) === String(hotel._id)) || rooms[0];
  const amanoiRoom = roomFor(amanoiHotel);
  const sixSensesRoom = roomFor(sixSensesHotel);
  const capellaRoom = roomFor(capellaHotel);
  const interconDanangRoom = roomFor(interconDanangHotel);

  const booking5Id = oid('673000000000000000000605');
  const booking6Id = oid('673000000000000000000606');
  const booking7Id = oid('673000000000000000000607');
  const booking8Id = oid('673000000000000000000608');
  const booking9Id = oid('673000000000000000000609');
  const booking10Id = oid('673000000000000000000610');
  const booking11Id = oid('673000000000000000000611');

  const buildBookingItem = (hotel, room, nights, quantity = 1, discount = 0) => {
    const unitPrice = Number(room.room_price || hotel.price_per_night || 5000000);
    const gross = unitPrice * nights * quantity;
    const subtotal = Math.max(0, gross - discount);
    return {
      room_id: room._id,
      room_name: room.room_name,
      hotel_id: hotel._id,
      quantity,
      unit_price: unitPrice,
      nights,
      discount,
      subtotal
    };
  };

  const bookings = [
    {
      _id: booking1Id,
      user_id: userU1Id, // Nguyễn Hoàng Vy
      room_id: amanoiRoom._id,
      hotel_id: amanoiHotel._id,
      location_id: null,
      check_in: new Date('2026-11-20T14:00:00Z'),
      check_out: new Date('2026-11-23T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(amanoiHotel, amanoiRoom, 3, 1, 0)],
      total_price: amanoiRoom.room_price * 3,
      booking_status: 'confirmed',
      booking_code: 'TRP-880101',
      created_at: new Date('2026-11-10T08:00:00Z'),
      bookingCode: 'TRP-880101',
      bookingType: 'hotel',
      title: `${amanoiHotel.hotel_name} • ${amanoiRoom.room_name}`,
      location: amanoiHotel.address,
      customerName: 'Nguyễn Hoàng Vy',
      customerPhone: '0909111001',
      customerEmail: 'vynhk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: amanoiRoom.room_price * 3,
      status: 'CONFIRMED',
      details: { nights: 3, roomName: amanoiRoom.room_name }
    },
    {
      _id: booking2Id,
      user_id: userU2Id, // Ngô Minh Thùy
      room_id: sixSensesRoom._id,
      hotel_id: sixSensesHotel._id,
      location_id: null,
      check_in: new Date('2026-12-01T14:00:00Z'),
      check_out: new Date('2026-12-04T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(sixSensesHotel, sixSensesRoom, 3, 1, 0)],
      total_price: sixSensesRoom.room_price * 3,
      booking_status: 'confirmed',
      booking_code: 'TRP-880102',
      created_at: new Date('2026-11-10T09:15:00Z'),
      bookingCode: 'TRP-880102',
      bookingType: 'hotel',
      title: `${sixSensesHotel.hotel_name} • ${sixSensesRoom.room_name}`,
      location: sixSensesHotel.address,
      customerName: 'Ngô Minh Thùy',
      customerPhone: '0909111002',
      customerEmail: 'thuynmk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: sixSensesRoom.room_price * 3,
      status: 'CONFIRMED',
      details: { nights: 3, roomName: sixSensesRoom.room_name }
    },
    {
      _id: booking3Id,
      user_id: userU3Id, // Trần Thị Nhật Minh
      room_id: capellaRoom._id,
      hotel_id: capellaHotel._id,
      location_id: locDining2Id,
      check_in: new Date('2026-12-10T14:00:00Z'),
      check_out: new Date('2026-12-12T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(capellaHotel, capellaRoom, 2, 1, 0)],
      total_price: capellaRoom.room_price * 2,
      booking_status: 'pending',
      booking_code: 'TRP-880103',
      created_at: new Date('2026-11-10T10:00:00Z'),
      bookingCode: 'TRP-880103',
      bookingType: 'resort',
      title: `${capellaHotel.hotel_name} • ${capellaRoom.room_name}`,
      location: capellaHotel.address,
      customerName: 'Trần Thị Nhật Minh',
      customerPhone: '0909111003',
      customerEmail: 'minhttnk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: capellaRoom.room_price * 2,
      status: 'PENDING',
      details: { nights: 2, roomName: capellaRoom.room_name }
    },
    {
      _id: booking4Id,
      user_id: userU4Id, // Võ Lê Quỳnh Nga
      room_id: interconDanangRoom._id,
      hotel_id: interconDanangHotel._id,
      location_id: locAttraction2Id,
      check_in: new Date('2026-12-18T14:00:00Z'),
      check_out: new Date('2026-12-20T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(interconDanangHotel, interconDanangRoom, 2, 1, 0)],
      total_price: interconDanangRoom.room_price * 2,
      booking_status: 'confirmed',
      booking_code: 'TRP-880104',
      created_at: new Date('2026-11-10T11:30:00Z'),
      bookingCode: 'TRP-880104',
      bookingType: 'hotel',
      title: `${interconDanangHotel.hotel_name} • ${interconDanangRoom.room_name}`,
      location: interconDanangHotel.address,
      customerName: 'Võ Lê Quỳnh Nga',
      customerPhone: '0909111004',
      customerEmail: 'ngavlqk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: interconDanangRoom.room_price * 2,
      status: 'CONFIRMED',
      details: { nights: 2, roomName: interconDanangRoom.room_name }
    },
    // Historical checked_out bookings for Q9 Top 5 Spending Customers report
    {
      _id: booking5Id,
      user_id: userCreator1Id,
      room_id: amanoiRoom._id,
      hotel_id: amanoiHotel._id,
      location_id: null,
      check_in: new Date('2026-09-10T14:00:00Z'),
      check_out: new Date('2026-09-14T12:00:00Z'),
      discount: 4000000,
      items: [buildBookingItem(amanoiHotel, amanoiRoom, 4, 1, 4000000)],
      total_price: amanoiRoom.room_price * 4 - 4000000,
      booking_status: 'checked_out',
      booking_code: 'TRP-880201',
      created_at: new Date('2026-09-01T08:00:00Z'),
      bookingCode: 'TRP-880201',
      bookingType: 'hotel',
      title: `${amanoiHotel.hotel_name} • ${amanoiRoom.room_name}`,
      location: amanoiHotel.address,
      customerName: 'Victoria Chen',
      customerPhone: '0909123456',
      customerEmail: 'victoria.chen@tripla.vn',
      guests: 2,
      totalPriceVnd: amanoiRoom.room_price * 4 - 4000000,
      status: 'CHECKED_OUT',
      details: { nights: 4, roomName: amanoiRoom.room_name }
    },
    {
      _id: booking6Id,
      user_id: userU1Id,
      room_id: sixSensesRoom._id,
      hotel_id: sixSensesHotel._id,
      location_id: null,
      check_in: new Date('2026-09-20T14:00:00Z'),
      check_out: new Date('2026-09-23T12:00:00Z'),
      discount: 2000000,
      items: [buildBookingItem(sixSensesHotel, sixSensesRoom, 3, 1, 2000000)],
      total_price: sixSensesRoom.room_price * 3 - 2000000,
      booking_status: 'checked_out',
      booking_code: 'TRP-880202',
      created_at: new Date('2026-09-12T08:00:00Z'),
      bookingCode: 'TRP-880202',
      bookingType: 'hotel',
      title: `${sixSensesHotel.hotel_name} • ${sixSensesRoom.room_name}`,
      location: sixSensesHotel.address,
      customerName: 'Nguyễn Hoàng Vy',
      customerPhone: '0909111001',
      customerEmail: 'vynhk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: sixSensesRoom.room_price * 3 - 2000000,
      status: 'CHECKED_OUT',
      details: { nights: 3, roomName: sixSensesRoom.room_name }
    },
    {
      _id: booking7Id,
      user_id: userCreator2Id,
      room_id: sixSensesRoom._id,
      hotel_id: sixSensesHotel._id,
      location_id: null,
      check_in: new Date('2026-10-01T14:00:00Z'),
      check_out: new Date('2026-10-03T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(sixSensesHotel, sixSensesRoom, 2, 1, 0)],
      total_price: sixSensesRoom.room_price * 2,
      booking_status: 'checked_out',
      booking_code: 'TRP-880203',
      created_at: new Date('2026-09-25T10:00:00Z'),
      bookingCode: 'TRP-880203',
      bookingType: 'hotel',
      title: `${sixSensesHotel.hotel_name} • ${sixSensesRoom.room_name}`,
      location: sixSensesHotel.address,
      customerName: 'Marcus Vũ • Bespoke Explorer',
      customerPhone: '0908654321',
      customerEmail: 'marcus.vu@tripla.vn',
      guests: 2,
      totalPriceVnd: sixSensesRoom.room_price * 2,
      status: 'CHECKED_OUT',
      details: { nights: 2, roomName: sixSensesRoom.room_name }
    },
    {
      _id: booking8Id,
      user_id: userU2Id,
      room_id: capellaRoom._id,
      hotel_id: capellaHotel._id,
      location_id: null,
      check_in: new Date('2026-10-10T14:00:00Z'),
      check_out: new Date('2026-10-13T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(capellaHotel, capellaRoom, 3, 1, 0)],
      total_price: capellaRoom.room_price * 3,
      booking_status: 'checked_out',
      booking_code: 'TRP-880204',
      created_at: new Date('2026-10-01T09:00:00Z'),
      bookingCode: 'TRP-880204',
      bookingType: 'hotel',
      title: `${capellaHotel.hotel_name} • ${capellaRoom.room_name}`,
      location: capellaHotel.address,
      customerName: 'Ngô Minh Thùy',
      customerPhone: '0909111002',
      customerEmail: 'thuynmk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: capellaRoom.room_price * 3,
      status: 'CHECKED_OUT',
      details: { nights: 3, roomName: capellaRoom.room_name }
    },
    {
      _id: booking9Id,
      user_id: userU4Id,
      room_id: capellaRoom._id,
      hotel_id: capellaHotel._id,
      location_id: null,
      check_in: new Date('2026-10-18T14:00:00Z'),
      check_out: new Date('2026-10-20T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(capellaHotel, capellaRoom, 2, 1, 0)],
      total_price: capellaRoom.room_price * 2,
      booking_status: 'checked_out',
      booking_code: 'TRP-880205',
      created_at: new Date('2026-10-10T14:00:00Z'),
      bookingCode: 'TRP-880205',
      bookingType: 'hotel',
      title: `${capellaHotel.hotel_name} • ${capellaRoom.room_name}`,
      location: capellaHotel.address,
      customerName: 'Võ Lê Quỳnh Nga',
      customerPhone: '0909111004',
      customerEmail: 'ngavlqk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: capellaRoom.room_price * 2,
      status: 'CHECKED_OUT',
      details: { nights: 2, roomName: capellaRoom.room_name }
    },
    {
      _id: booking10Id,
      user_id: userU3Id,
      room_id: interconDanangRoom._id,
      hotel_id: interconDanangHotel._id,
      location_id: null,
      check_in: new Date('2026-10-22T14:00:00Z'),
      check_out: new Date('2026-10-25T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(interconDanangHotel, interconDanangRoom, 3, 1, 0)],
      total_price: interconDanangRoom.room_price * 3,
      booking_status: 'checked_out',
      booking_code: 'TRP-880206',
      created_at: new Date('2026-10-15T11:00:00Z'),
      bookingCode: 'TRP-880206',
      bookingType: 'hotel',
      title: `${interconDanangHotel.hotel_name} • ${interconDanangRoom.room_name}`,
      location: interconDanangHotel.address,
      customerName: 'Trần Thị Nhật Minh',
      customerPhone: '0909111003',
      customerEmail: 'minhttnk24411e@st.uel.edu.vn',
      guests: 2,
      totalPriceVnd: interconDanangRoom.room_price * 3,
      status: 'CHECKED_OUT',
      details: { nights: 3, roomName: interconDanangRoom.room_name }
    },
    {
      _id: booking11Id,
      user_id: userTourist1Id,
      room_id: interconDanangRoom._id,
      hotel_id: interconDanangHotel._id,
      location_id: null,
      check_in: new Date('2026-10-27T14:00:00Z'),
      check_out: new Date('2026-10-29T12:00:00Z'),
      discount: 0,
      items: [buildBookingItem(interconDanangHotel, interconDanangRoom, 2, 1, 0)],
      total_price: interconDanangRoom.room_price * 2,
      booking_status: 'checked_out',
      booking_code: 'TRP-880207',
      created_at: new Date('2026-10-20T09:00:00Z'),
      bookingCode: 'TRP-880207',
      bookingType: 'hotel',
      title: `${interconDanangHotel.hotel_name} • ${interconDanangRoom.room_name}`,
      location: interconDanangHotel.address,
      customerName: 'Nguyễn Khánh Linh',
      customerPhone: '0912345678',
      customerEmail: 'khanhlinh.nguyen@tripla.vn',
      guests: 2,
      totalPriceVnd: interconDanangRoom.room_price * 2,
      status: 'CHECKED_OUT',
      details: { nights: 2, roomName: interconDanangRoom.room_name }
    }
  ];

  // Adjust initial room.stock to reflect active (pending/confirmed/checked_in) seeded bookings
  const heldByRoomId = new Map();
  bookings.forEach((b) => {
    if (!['pending', 'confirmed', 'checked_in'].includes(b.booking_status)) return;
    (b.items || []).forEach((it) => {
      const k = String(it.room_id || b.room_id);
      heldByRoomId.set(k, (heldByRoomId.get(k) || 0) + Number(it.quantity || 1));
    });
  });
  rooms.forEach((r) => {
    const held = heldByRoomId.get(String(r._id)) || 0;
    r.stock = Math.max(0, Number(r.total_units || 5) - held);
  });

  const payments = [
    {
      _id: oid('673000000000000000000701'),
      booking_id: booking1Id,
      payment_method: 'credit_card',
      transaction_id: 'TXN-AMANOI-20261110-001',
      amount: bookings[0].total_price,
      payment_status: 'completed',
      paid_at: new Date('2026-11-10T08:02:00Z')
    },
    {
      _id: oid('673000000000000000000702'),
      booking_id: booking2Id,
      payment_method: 'e_wallet',
      transaction_id: 'TXN-SIXSENSES-20261110-002',
      amount: bookings[1].total_price,
      payment_status: 'completed',
      paid_at: new Date('2026-11-10T09:18:00Z')
    },
    {
      _id: oid('673000000000000000000703'),
      booking_id: booking3Id,
      payment_method: 'bank_transfer',
      transaction_id: 'TXN-REGENT-20261110-003',
      amount: bookings[2].total_price,
      payment_status: 'completed',
      paid_at: new Date('2026-11-10T10:05:00Z')
    },
    {
      _id: oid('673000000000000000000704'),
      booking_id: booking4Id,
      payment_method: 'e_wallet',
      transaction_id: 'TXN-INTERCON-20261110-004',
      amount: bookings[3].total_price,
      payment_status: 'completed',
      paid_at: new Date('2026-11-10T11:32:00Z')
    },
    ...bookings.slice(4).map((b, i) => ({
      _id: oid(`6730000000000000000007${String(5 + i).padStart(2, '0')}`),
      booking_id: b._id,
      payment_method: i % 2 === 0 ? 'credit_card' : 'e_wallet',
      transaction_id: `TXN-HIST-2026-${String(201 + i)}`,
      amount: b.total_price,
      payment_status: 'completed',
      paid_at: b.created_at
    }))
  ];

  const plan1Id = oid('673000000000000000001001');
  const plan2Id = oid('673000000000000000001002');

  const tripPlans = [
    {
      _id: plan1Id,
      code: 'plan-vinh-hy-luxury-01',
      user_id: userU1Id,
      plan_name: 'Kỳ nghỉ Thượng Lưu Vịnh Vĩnh Hy & Amanoi 4N3Đ',
      start_date: new Date('2026-11-20T00:00:00Z'),
      end_date: new Date('2026-11-23T00:00:00Z'),
      estimated_budget: 125000000,
      note: 'Lịch trình nghỉ dưỡng kết hợp du thuyền Catamaran ngắm hoàng hôn và ăn tối vách đá.',
      places: ['resort', 'dining', 'yacht'],
      created_at: new Date('2026-11-01T10:00:00Z')
    },
    {
      _id: plan2Id,
      code: 'plan-phu-quoc-regent-02',
      user_id: userU2Id,
      plan_name: 'Hành trình Đà Nẵng - Bà Nà Hills & InterContinental 3N2Đ',
      start_date: new Date('2026-12-05T00:00:00Z'),
      end_date: new Date('2026-12-07T00:00:00Z'),
      estimated_budget: 68000000,
      note: 'Khám phá Cầu Vàng Bà Nà Hills, biển Mỹ Khê và nghỉ dưỡng tại InterContinental.',
      places: ['resort', 'dining'],
      created_at: new Date('2026-11-05T15:30:00Z')
    }
  ];

  const wishlists = [
    {
      _id: oid('673000000000000000001101'),
      plan_id: plan1Id,
      location_id: locDining1Id,
      hotel_id: amanoiHotel._id,
      added_at: new Date('2026-11-02T09:00:00Z')
    },
    {
      _id: oid('673000000000000000001102'),
      plan_id: plan1Id,
      location_id: locYacht1Id,
      hotel_id: amanoiHotel._id,
      added_at: new Date('2026-11-02T09:15:00Z')
    },
    {
      _id: oid('673000000000000000001103'),
      plan_id: plan2Id,
      location_id: locAttraction2Id,
      hotel_id: interconDanangHotel._id,
      added_at: new Date('2026-11-06T10:00:00Z')
    }
  ];

  const planDetails = [
    {
      _id: oid('673000000000000000001201'),
      plan_id: plan1Id,
      location_id: null,
      hotel_id: amanoiHotel._id,
      visit_date: new Date('2026-11-20T00:00:00Z'),
      start_time: '14:00:00',
      sequence_order: 1,
      note: 'Check-in Ocean Pool Pavilion tại Amanoi Resort Vĩnh Hy & thưởng thức trà chiều.'
    },
    {
      _id: oid('673000000000000000001202'),
      plan_id: plan1Id,
      location_id: locDining1Id,
      hotel_id: amanoiHotel._id,
      visit_date: new Date('2026-11-20T00:00:00Z'),
      start_time: '18:30:00',
      sequence_order: 2,
      note: 'Thưởng thức bữa tối Fine Dining 9 món tại The Cliff Dining Pavilion.'
    },
    {
      _id: oid('673000000000000000001203'),
      plan_id: plan1Id,
      location_id: locYacht1Id,
      hotel_id: null,
      visit_date: new Date('2026-11-21T00:00:00Z'),
      start_time: '15:30:00',
      sequence_order: 1,
      note: 'Lên siêu du thuyền Sovereign Catamaran 68ft ngắm hoàng hôn Vịnh Vĩnh Hy.'
    },
    {
      _id: oid('673000000000000000001204'),
      plan_id: plan2Id,
      location_id: locAttraction2Id,
      hotel_id: interconDanangHotel._id,
      visit_date: new Date('2026-12-05T00:00:00Z'),
      start_time: '09:00:00',
      sequence_order: 1,
      note: 'Tham quan Cầu Vàng Bà Nà Hills & nghỉ dưỡng tại InterContinental Đà Nẵng.'
    }
  ];

  const trips = [
    {
      _id: oid('673000000000000000001301'),
      plan_id: plan1Id,
      user_id: userU1Id,
      trip_status: 'upcoming',
      confirmed_at: new Date('2026-11-10T08:05:00Z'),
      note: 'Đã xác nhận toàn bộ vé máy bay, biệt thự Amanoi và du thuyền Catamaran.'
    },
    {
      _id: oid('673000000000000000001302'),
      plan_id: plan2Id,
      user_id: userU2Id,
      trip_status: 'upcoming',
      confirmed_at: new Date('2026-11-10T09:20:00Z'),
      note: 'Đã xác nhận đặt phòng InterContinental Đà Nẵng.'
    }
  ];

  const reports = [
    {
      _id: oid('673000000000000000001401'),
      content_id: contents[0]._id,
      reporter_id: userU3Id,
      reason: 'other',
      details: 'Yêu cầu xác minh thông tin giá ưu đãi mùa lễ hội tại Amanoi Vĩnh Hy.',
      status: 'resolved',
      handled_by: userA1Id,
      created_at: new Date('2026-11-09T11:00:00Z')
    }
  ];

  const notifications = [
    {
      _id: oid('673000000000000000001501'),
      user_id: userU1Id,
      title: 'Xác nhận đặt phòng thành công #TRP-880101',
      content: 'Biệt thự Ocean Pool Pavilion tại Amanoi Resort Vĩnh Hy của bạn đã được xác nhận.',
      type: 'booking',
      is_read: false,
      created_at: new Date('2026-11-10T08:03:00Z')
    },
    {
      _id: oid('673000000000000000001502'),
      user_id: userU2Id,
      title: 'Ưu đãi độc quyền TRIPLA VIP 38%',
      content: 'Tặng gói đưa đón thủy phi cơ và trà chiều khi đặt kỳ nghỉ trước 30/11.',
      type: 'promotion',
      is_read: false,
      created_at: new Date('2026-11-10T09:30:00Z')
    }
  ];

  // Kết hợp Comments từ `compass_data/comments.json` và `tripla/data/community/comments/index.json`
  const rawLegacyComments = loadLegacyJson('community/comments/index.json', []);
  const comments = [
    ...loadJsonData('comments.json').map((c, cIdx) => {
      const targetContent = contents[cIdx % contents.length] || contents[0];
      const commentAuthorUser = legacyUsers[cIdx % legacyUsers.length] || users[1];
      return {
        _id: oid(`6730000000000000000016${String(cIdx + 1).padStart(2, '0')}`),
        content_id: targetContent._id,
        user_id: commentAuthorUser._id,
        reelId: String(targetContent._id),
        reelShortId: targetContent.code,
        user: c.user || c.author || commentAuthorUser.full_name,
        author: c.user || c.author || commentAuthorUser.full_name,
        time: c.time || '2 giờ trước',
        avatar: commentAuthorUser.avatar,
        text: c.text || c.content,
        content: c.text || c.content,
        likes: Number(c.likes || 28),
        createdAt: new Date(c.createdAt || Date.now() - cIdx * 600000)
      };
    }),
    ...rawLegacyComments.map((lc, lIdx) => {
      const targetContent = contents[lIdx % contents.length] || contents[0];
      const authorUser = userByLegacyCode.get(lc.userId) || legacyUsers[1];
      return {
        _id: oid(`6730000000000000000016${String(50 + lIdx).padStart(2, '0')}`),
        content_id: targetContent._id,
        user_id: authorUser._id,
        reelId: String(targetContent._id),
        reelShortId: targetContent.code,
        user: authorUser.full_name,
        author: authorUser.full_name,
        time: '1 ngày trước',
        avatar: authorUser.avatar,
        text: lc.content,
        content: lc.content,
        likes: 19,
        createdAt: new Date(lc.timestamp || Date.now())
      };
    })
  ];

  // Kết hợp Activities từ `compass_data/activities.json` + Locations từ `tripla/data/booking/locations/index.json`
  const baseActivities = loadJsonData('activities.json');
  const legacyActivities = importedLegacyLocations.map((loc, idx) => ({
    _id: `act_legacy_${idx + 1}`,
    id: `act_legacy_${idx + 1}`,
    name: loc.name,
    city: loc.city === 'Da Nang' ? 'Đà Nẵng' : loc.city === 'Phu Quoc' ? 'Phú Quốc' : loc.city === 'Ha Noi' ? 'Hà Nội' : loc.city === 'Da Lat' ? 'Đà Lạt' : loc.city,
    address: loc.address,
    categories: [
      loc.location_category === 'restaurant' || loc.location_category === 'cafe'
        ? 'Ẩm thực'
        : 'Điểm tham quan'
    ],
    imageUrl: loc.image_url,
    description: loc.location_description,
    priceFrom: loc.entry_fee > 0 ? loc.entry_fee : 150000,
    originalPrice: loc.entry_fee > 0 ? Math.round(loc.entry_fee * 1.2) : 200000,
    currency: 'VND',
    rating: loc.rating,
    reviewCount: loc.review_count,
    coordinates: { latitude: loc.latitude, longitude: loc.longitude },
    geo: loc.geo
  }));
  const activities = [...baseActivities, ...legacyActivities];

  // Kết hợp Bus Trips từ `compass_data/bus_trips.json` + 9 tuyến xe gốc từ `tripla/data/booking/buses/index.json`
  const baseBuses = loadJsonData('bus_trips.json');
  const rawLegacyBuses = loadLegacyJson('booking/buses/index.json', []);
  const legacyBuses = rawLegacyBuses.map((b) => {
    const fromCity = b.origin === 'Sài Gòn' ? 'Hồ Chí Minh' : b.origin;
    const toCity = b.destination === 'Sài Gòn' ? 'Hồ Chí Minh' : b.destination;
    const [depHour, depMin] = String(b.departureTime || '08:00')
      .split(':')
      .map((x) => parseInt(x, 10) || 0);
    return {
      _id: `bus_legacy_${b.id}`,
      operatorId: b.id,
      operatorName: b.operator,
      routeKey: `${fromCity}-${toCity}`,
      from: fromCity,
      to: toCity,
      hour: depHour,
      minute: depMin,
      price: Number(b.price || 300000),
      currency: 'VND',
      vehicle: b.classType || 'Limousine VIP',
      durationMinutes: 360,
      amenities: ['Wi-Fi tốc độ cao', 'Ghế massage điện', 'Nước suối & Khăn lạnh', `Biển số: ${b.busNumber}`]
    };
  });
  const busTrips = [...baseBuses, ...legacyBuses];

  const interactions = loadJsonData('reel_interactions.json');
  const liveStreams = loadJsonData('live_streams.json');
  const flights = loadJsonData('flights.json');
  const savedTrips = loadJsonData('saved_trips.json').map((st, idx) => ({
    ...st,
    plan_id: idx === 0 ? plan1Id : plan2Id
  }));

  return {
    users,
    providers,
    locations,
    hotels,
    rooms,
    contents,
    locationTags,
    bookings,
    payments,
    tripPlans,
    wishlists,
    planDetails,
    trips,
    reports,
    notifications,
    comments,
    venues,
    reels,
    interactions,
    liveStreams,
    flights,
    activities,
    busTrips,
    savedTrips,
    cartItems: [],
    venueMap
  };
}

async function seedDatabase() {
  console.log(`🚀 Đang kết nối tới MongoDB Compass tại: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  });
  console.log('✅ Đã kết nối thành công tới MongoDB (tripla_db)!');

  const data = getPreparedSeedData();

  const modelsToClean = [
    User,
    Provider,
    Location,
    Hotel,
    Room,
    Content,
    LocationTag,
    Booking,
    Payment,
    TripPlan,
    Wishlist,
    PlanDetail,
    Trip,
    Report,
    Notification,
    Comment,
    Venue,
    Reel,
    ReelInteraction,
    LiveStream,
    Flight,
    Activity,
    BusTrip,
    SavedTrip,
    CartItem
  ];

  for (const Model of modelsToClean) {
    await Model.deleteMany({});
  }
  console.log('🧹 Đã làm sạch toàn bộ Collections trong tripla_db.');

  // Thực thi Insert tuần tự theo đúng thứ tự khóa ngoại (Foreign Keys) của ERD
  await User.insertMany(data.users);
  await Provider.insertMany(data.providers);
  await Location.insertMany(data.locations);
  await Hotel.insertMany(data.hotels);
  await Room.insertMany(data.rooms);
  await Content.insertMany(data.contents);
  await LocationTag.insertMany(data.locationTags);
  await Booking.insertMany(data.bookings);
  await Payment.insertMany(data.payments);
  await TripPlan.insertMany(data.tripPlans);
  await Wishlist.insertMany(data.wishlists);
  await PlanDetail.insertMany(data.planDetails);
  await Trip.insertMany(data.trips);
  await Report.insertMany(data.reports);
  await Notification.insertMany(data.notifications);
  await Comment.insertMany(data.comments);

  await Venue.insertMany(data.venues);
  await Reel.insertMany(data.reels);
  await ReelInteraction.insertMany(data.interactions);
  await LiveStream.insertMany(data.liveStreams);
  await Flight.insertMany(data.flights);
  await Activity.insertMany(data.activities);
  await BusTrip.insertMany(data.busTrips);
  await SavedTrip.insertMany(data.savedTrips);

  console.log(`📦 Đã nạp tuần tự thành công toàn bộ ERD + dữ liệu gốc từ tripla/data vào MongoDB (tripla_db):`);
  console.log(`   • [ERD 01] users:             ${data.users.length} bản ghi (Gồm Trần Duy Thanh, Nguyễn Hoàng Vy, Ngô Minh Thùy, Trần Thị Nhật Minh, Võ Lê Quỳnh Nga...)`);
  console.log(`   • [ERD 02] providers:         ${data.providers.length} bản ghi`);
  console.log(`   • [ERD 03] locations:         ${data.locations.length} bản ghi (GeoJSON 2dsphere)`);
  console.log(`   • [ERD 04] hotels:            ${data.hotels.length} bản ghi (FK -> providers, GeoJSON 2dsphere)`);
  console.log(`   • [ERD 05] rooms:             ${data.rooms.length} bản ghi (FK -> hotels)`);
  console.log(`   • [ERD 06] contents:          ${data.contents.length} bản ghi (Gồm cả Reels .mp4 từ tripla/data)`);
  console.log(`   • [ERD 07] location_tags:     ${data.locationTags.length} bản ghi`);
  console.log(`   • [ERD 08] bookings:          ${data.bookings.length} bản ghi`);
  console.log(`   • [ERD 09] payments:          ${data.payments.length} bản ghi`);
  console.log(`   • [ERD 10] trip_plans:        ${data.tripPlans.length} bản ghi`);
  console.log(`   • [ERD 11] wishlists:         ${data.wishlists.length} bản ghi`);
  console.log(`   • [ERD 12] plan_details:      ${data.planDetails.length} bản ghi`);
  console.log(`   • [ERD 13] trips:             ${data.trips.length} bản ghi`);
  console.log(`   • [ERD 14] reports:           ${data.reports.length} bản ghi`);
  console.log(`   • [ERD 15] notifications:     ${data.notifications.length} bản ghi`);
  console.log(`   • [ERD 16] comments:          ${data.comments.length} bản ghi`);
  console.log(`   • [Bổ trợ] activities:        ${data.activities.length} bản ghi`);
  console.log(`   • [Bổ trợ] bus_trips:         ${data.busTrips.length} bản ghi`);

  try {
    const db = mongoose.connection.db;
    await db.collection('locations').createIndex({ geo: '2dsphere' });
    await db.collection('hotels').createIndex({ geo: '2dsphere' });
    await db.collection('hotels').createIndex({ hotel_slug: 1 });
    await db.collection('contents').createIndex({ createdAt: -1, 'stats.likes': -1 });
    await db.collection('contents').createIndex({ created_at: -1, 'stats.likes': -1 });
    await db.collection('wishlists').createIndex({ plan_id: 1, location_id: 1 }, { unique: true });
    await db.collection('comments').createIndex({ content_id: 1, createdAt: -1 });
    console.log('⚡ Đã tạo thành công toàn bộ Indexes!');
  } catch (idxErr) {
    console.warn('⚠️ Bỏ qua bước tạo Index (dung lượng ổ đĩa giới hạn):', idxErr.message);
  }
  console.log('🎉 Hoàn tất Seed Database (Luxury + Legacy tripla/data)!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('❌ Lỗi khi chạy seed.js:', err.message);
      process.exit(1);
    });
}

module.exports = {
  seedDatabase,
  getPreparedSeedData,
  buildHotspotFromVenue,
  buildHotspotFromHotelAndRoom,
  buildHotspotFromLocation
};
