export interface VietnamDestination {
  name: string;
  region: string;
  aliases?: string;
}

export const popularVietnamDestinations: readonly VietnamDestination[] = [
  { name: 'Đà Lạt', region: 'Lâm Đồng, Việt Nam' },
  { name: 'Vũng Tàu', region: 'Hồ Chí Minh, Việt Nam' },
  { name: 'Nha Trang', region: 'Khánh Hòa, Việt Nam' },
  { name: 'Đà Nẵng', region: 'Đà Nẵng, Việt Nam' },
  { name: 'Phú Quốc', region: 'An Giang, Việt Nam' },
];

// Provincial list: Decision 19/2025/QD-TTg, effective 1 July 2025.
// https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/19ttg.signed.pdf
const provinceNames = [
  'Hà Nội', 'Cao Bằng', 'Tuyên Quang', 'Điện Biên', 'Lai Châu',
  'Sơn La', 'Lào Cai', 'Thái Nguyên', 'Lạng Sơn', 'Quảng Ninh',
  'Bắc Ninh', 'Phú Thọ', 'Hải Phòng', 'Hưng Yên', 'Ninh Bình',
  'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Trị', 'Huế',
  'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa', 'Lâm Đồng',
  'Đắk Lắk', 'Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ',
  'Vĩnh Long', 'Đồng Tháp', 'An Giang', 'Cà Mau'
] as const;

export const vietnamDestinations: readonly VietnamDestination[] = [
  ...provinceNames.map(name => ({ name, region: 'Việt Nam',
    aliases: name === 'Hồ Chí Minh' ? 'TP HCM TPHCM Sài Gòn Saigon' : '' })),
  ...[
    ['Đà Lạt', 'Lâm Đồng'], ['Phú Quốc', 'An Giang'],
    ['Nha Trang', 'Khánh Hòa'], ['Vũng Tàu', 'Hồ Chí Minh'],
    ['Sa Pa', 'Lào Cai'], ['Hạ Long', 'Quảng Ninh'],
    ['Hội An', 'Đà Nẵng'], ['Phong Nha', 'Quảng Bình'],
    ['Cao Bằng', 'Cao Bằng'], ['Bản Giốc', 'Cao Bằng'],
    ['Sơn Đoòng', 'Quảng Bình'], ['Ninh Bình', 'Ninh Bình'],
    ['Quy Nhơn', 'Gia Lai'], ['Phan Thiết', 'Lâm Đồng'],
    ['Mũi Né', 'Lâm Đồng'], ['Côn Đảo', 'Hồ Chí Minh'],
    ['Tam Đảo', 'Phú Thọ'], ['Mai Châu', 'Phú Thọ'],
    ['Mộc Châu', 'Sơn La'], ['Cát Bà', 'Hải Phòng'],
    ['Đồng Hới', 'Quảng Bình'], ['Tuy Hòa', 'Đắk Lắk'],
    ['Buôn Ma Thuột', 'Đắk Lắk'], ['Rạch Giá', 'An Giang'],
    ['Hà Tiên', 'An Giang'], ['Châu Đốc', 'An Giang'],
    ['Hà Giang', 'Tuyên Quang'], ['Yên Bái', 'Lào Cai'],
    ['Bắc Kạn', 'Thái Nguyên'], ['Bắc Giang', 'Bắc Ninh'],
    ['Vĩnh Phúc', 'Phú Thọ'], ['Hòa Bình', 'Phú Thọ'],
    ['Hải Dương', 'Hải Phòng'], ['Thái Bình', 'Hưng Yên'],
    ['Hà Nam', 'Ninh Bình'], ['Nam Định', 'Ninh Bình'],
    ['Quảng Bình', 'Quảng Bình'], ['Quảng Nam', 'Đà Nẵng'],
    ['Kon Tum', 'Quảng Ngãi'], ['Bình Định', 'Gia Lai'],
    ['Ninh Thuận', 'Khánh Hòa'], ['Đắk Nông', 'Lâm Đồng'],
    ['Bình Thuận', 'Lâm Đồng'], ['Phú Yên', 'Đắk Lắk'],
    ['Bà Rịa - Vũng Tàu', 'Hồ Chí Minh'], ['Bình Dương', 'Hồ Chí Minh'],
    ['Bình Phước', 'Đồng Nai'], ['Long An', 'Tây Ninh'],
    ['Hậu Giang', 'Cần Thơ'], ['Sóc Trăng', 'Cần Thơ'],
    ['Bến Tre', 'Vĩnh Long'], ['Trà Vinh', 'Vĩnh Long'],
    ['Tiền Giang', 'Đồng Tháp'], ['Kiên Giang', 'An Giang'],
    ['Bạc Liêu', 'Cà Mau'],
    ['Thụy Sĩ', 'Châu Âu (Quốc tế)'],
    ['Canada', 'Bắc Mỹ (Quốc tế)']
  ].map(([name, province]) => ({ name, region: `${province}, ${province.includes('Quốc tế') ? '' : 'Việt Nam'}`.replace(/,\s*$/, ''),
    aliases: name === 'Sa Pa' ? 'Sapa' : (name === 'Thụy Sĩ' ? 'Switzerland Interlaken Alps' : (name === 'Canada' ? 'Banff Icefields Rocky Mountains' : (name === 'Hạ Long' ? 'Ha Long Bay Vịnh Hạ Long' : ''))) }))
];

export function normalizeDestination(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchesDestination(place: VietnamDestination, query: string): boolean {
  const text = normalizeDestination(`${place.name} ${place.region} ${place.aliases || ''}`);
  return normalizeDestination(query).split(' ').every(word => text.includes(word));
}
