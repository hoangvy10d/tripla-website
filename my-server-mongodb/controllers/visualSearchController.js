const mongoose = require('mongoose');
const models = require('../models');
const { Content, Comment, Activity } = models;
const VisualSearchLocation = require('../models/Location');
const Hotel = models.Hotel || require('../models/Hotel');
const { toSlug } = require('../utils/helpers');
const {
  identifyLocationFromBase64,
  identifyLocationFromUrl
} = require('../services/geminiLocationService');

function foldAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

const CITY_CENTERS = {
  'Canada': { lat: 51.1784, lng: -115.5708, aliases: ['canada', 'banff', 'lake louise', 'moraine', 'icefields', 'bow lake', 'peyto', 'cascade', 'brewhouse', 'sulphur', 'british columbia', 'alberta', 'yoho', 'emerald lake', 'vancouver', 'jasper'] },
  'Thụy Sĩ': { lat: 46.5935, lng: 7.9091, aliases: ['switzerland', 'thuy si', 'lauterbrunnen', 'interlaken', 'beatenberg', 'beatus', 'jungfrau', 'grindelwald', 'lake thun', 'ho thun', 'brienz', 'murren', 'schilthorn', 'staubbach', 'trummelbach', 'harder kulm'] },
  'Cao Bằng': { lat: 22.8525, lng: 106.7215, aliases: ['cao bang', 'ban gioc', 'nguom ngao', 'trung khanh', 'pac bo', 'khuoi ky', 'mat than'] },
  'Quảng Bình': { lat: 17.5500, lng: 106.2800, aliases: ['quang binh', 'phong nha', 'ke bang', 'son doong', 'hang en', 'song chay', 'hang toi', 'thien duong', 'suoi nuoc mooc', 'dong hoi', 'chay lap'] },
  'Hạ Long': { lat: 20.9101, lng: 107.1839, aliases: ['ha long', 'quang ninh', 'ti top', 'titop', 'titov', 'sung sot', 'su sot', 'cua van', 'tuan chau', 'bai chay', 'bai tu long', 'lan ha', 'dao reu'] },
  'Ninh Thuận': { lat: 11.7215, lng: 109.2025, aliases: ['vinh hy', 'ninh thuan', 'nui chua', 'hang rai', 'amanoi', 'phan rang'] },
  'Phú Yên': { lat: 13.4585, lng: 109.2865, aliases: ['phu yen', 'song cau', 'bai san ho', 'zannier', 'tuy hoa', 'ganh da dia'] },
  'Huế': { lat: 16.4637, lng: 107.5909, aliases: ['lang co', 'hue', 'banyan tree', 'dai noi', 'song huong', 'thua thien'] },
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022, aliases: ['da nang', 'ba na', 'golden bridge', 'cau vang', 'son tra', 'my khe', 'ngu hanh son', 'marble mountains', 'dragon bridge', 'citron', 'la maison', 'thia go', 'reply 1988'] },
  'Hội An': { lat: 15.8801, lng: 108.3380, aliases: ['hoi an', 'quang nam', 'cam thanh', 'bay mau', 'thu bon', 'anantara'] },
  'Nha Trang': { lat: 12.2388, lng: 109.1967, aliases: ['nha trang', 'khanh hoa', 'ninh van', 'hon tre', 'ponagar', 'i-resort', 'six senses'] },
  'Đà Lạt': { lat: 11.9404, lng: 108.4583, aliases: ['da lat', 'lam dong', 'xuan huong', 'datanla', 'lam vien', 'tui mo to', 'nha ben rung'] },
  'Vũng Tàu': { lat: 10.3460, lng: 107.0843, aliases: ['vung tau', 'ba ria', 'thuy van', 'nghinh phong', 'kito', 'pullman', 'imperial'] },
  'Phú Quốc': { lat: 10.2899, lng: 103.9840, aliases: ['phu quoc', 'kien giang', 'bai truong', 'bai khem', 'an thoi', 'vinwonders phu quoc', 'regent', 'pink pearl', 'fu bar'] },
  'Sa Pa': { lat: 22.3364, lng: 103.8438, aliases: ['sa pa', 'sapa', 'lao cai', 'fansipan', 'cat cat', 'muong hoa', 'coupole'] },
  'Ninh Bình': { lat: 20.2506, lng: 105.9745, aliases: ['ninh binh', 'trang an', 'tam coc', 'hang mua', 'van long', 'bai dinh', 'hoa lu', 'emeralda'] },
  'Hà Nội': { lat: 21.0285, lng: 105.8542, aliases: ['ha noi', 'hoan kiem', 'ba dinh', 'tay ho', 'capella', 'van mieu'] },
  'Hồ Chí Minh': { lat: 10.7769, lng: 106.7009, aliases: ['ho chi minh', 'sai gon', 'tp hcm', 'ben thanh', 'thao cam vien', 'suoi tien'] }
};

function resolveCanonicalCity(landmarkName, formattedAddress, keywords = []) {
  const combined = foldAccents(`${landmarkName || ''} ${formattedAddress || ''} ${(keywords || []).join(' ')}`);
  for (const [city, info] of Object.entries(CITY_CENTERS)) {
    if (info.aliases.some((alias) => combined.includes(alias))) {
      return city;
    }
  }
  const tokens = String(formattedAddress || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && !/việt nam|vietnam/i.test(s));
  return tokens.length > 0 ? tokens[tokens.length - 1] : 'Hạ Long';
}

function deterministicOffset(seedStr, index = 0) {
  let hash = 0;
  const s = `${seedStr}_${index}`;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) % 10000;
  }
  const dLat = ((hash % 100) - 50) * 0.00045;
  const dLng = ((Math.floor(hash / 100) % 100) - 50) * 0.00045;
  return { dLat, dLng };
}

async function geocodePlaceCoordinates(placeName, formattedAddress, canonicalCity, index = 0) {
  const center = CITY_CENTERS[canonicalCity] || CITY_CENTERS['Hạ Long'];
  const query = `${placeName}, ${formattedAddress || canonicalCity}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'TriplaTravelPlatform/1.0 (contact@tripla.vn)' },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng, displayAddress: data[0].display_name || formattedAddress };
        }
      }
    }
  } catch (_err) {
    // Fallback to deterministic offset around city center when offline or rate-limited
  }
  const { dLat, dLng } = deterministicOffset(placeName, index);
  return {
    lat: Number((center.lat + dLat).toFixed(5)),
    lng: Number((center.lng + dLng).toFixed(5)),
    displayAddress: formattedAddress || canonicalCity
  };
}

function buildVideoQuery(videoId) {
  if (mongoose.isValidObjectId(videoId)) {
    return { $or: [{ _id: new mongoose.Types.ObjectId(videoId) }, { code: videoId }] };
  }
  return { code: videoId };
}

async function getRelatedVideos(locationId, currentVideoId) {
  return Content.find({ location_id: locationId, _id: { $ne: currentVideoId } })
    .select('_id code content_title caption image_url video_url location_name created_at stats')
    .sort({ created_at: -1 })
    .limit(6)
    .lean();
}

function formatLocation(location, extra = {}) {
  return {
    _id: location._id,
    landmark_name: location.landmark_name || location.name,
    formatted_address: location.formatted_address || location.address,
    place_type: extra.place_type || 'Địa điểm',
    description: extra.description || ''
  };
}

function normalizeCropBox(value) {
  if (!value || typeof value !== 'object') return null;
  const { x, y, width, height } = value;
  if (![x, y, width, height].every((part) => Number.isFinite(Number(part)))) return null;

  const cropBox = {
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height)
  };
  if (
    cropBox.x < 0 || cropBox.y < 0 || cropBox.width <= 0 || cropBox.height <= 0 ||
    cropBox.x + cropBox.width > 1 || cropBox.y + cropBox.height > 1
  ) {
    return null;
  }
  return cropBox;
}

function toTextList(value) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.name || item.label || item.tag || '';
      return '';
    })
    .map((item) => String(item).trim())
    .filter(Boolean);
}

async function getVideoContext(video) {
  const rawTags = [video.get('tags'), video.get('hashtags'), video.get('tag')];
  const tags = [
    ...rawTags.flatMap(toTextList),
    ...(video.location_tags || []).map((tag) => tag.tag_type),
    video.location_name
  ]
    .map((tag) => String(tag || '').trim())
    .filter(Boolean);

  const commentRefs = [{ content_id: video._id }, { reelId: String(video._id) }];
  if (video.code) {
    commentRefs.push({ reelId: String(video.code) }, { reelShortId: String(video.code) });
  }
  const comments = await Comment.find({ $or: commentRefs })
    .select('text content')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  return {
    title: video.content_title || video.get('title') || '',
    description: [...new Set([video.content_description, video.caption, video.get('description')].map((s) => String(s || '').trim()).filter(Boolean))].join('\n'),
    tags: [...new Set(tags)],
    category: video.category || '',
    comments: comments.map((comment) => comment.text || comment.content || '').filter(Boolean)
  };
}

function buildKeywordVideoQuery(video, keywords) {
  const textFields = ['content_title', 'content_description', 'caption', 'location_name', 'tags', 'hashtags'];
  const matches = [...new Set((keywords || []).map((word) => String(word).trim()).filter(Boolean))]
    .slice(0, 4)
    .flatMap((word) => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = new RegExp(escapedWord, 'i');
      return textFields.map((field) => ({ [field]: expression }));
    });
  if (!matches.length) return Promise.resolve([]);

  return Content.find({ _id: { $ne: video._id }, $or: matches })
    .select('_id code content_title caption image_url video_url location_name created_at stats')
    .sort({ created_at: -1 })
    .limit(6)
    .lean();
}

function extractAreaTokens(landmarkName, formattedAddress) {
  const raw = `${landmarkName || ''}, ${formattedAddress || ''}`;
  const cleaned = raw
    .replace(/thành phố|tỉnh|huyện|quận|thị xã|phường|xã|việt nam|khu vực|vịnh|bãi biển|đảo/gi, '')
    .split(/[,|-]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4 && !/^[A-Z]{2}(\s+[A-Z0-9]{3,})?$/i.test(s));
  return [...new Set(cleaned)].slice(0, 6);
}

async function saveDiscoveredPlacesToDb(landmarkName, formattedAddress, description, placeType, canonicalCity, nearbyPlaces = []) {
  try {
    const mainSlug = `loc_vs_${toSlug(landmarkName) || Date.now()}`;
    const existingMain = await VisualSearchLocation.findOne({
      $or: [{ landmark_name: landmarkName }, { name: landmarkName }, { slug: mainSlug }]
    }).lean();

    const mainGeo = (existingMain?.latitude && existingMain?.longitude)
      ? { lat: existingMain.latitude, lng: existingMain.longitude, displayAddress: existingMain.formatted_address || formattedAddress }
      : await geocodePlaceCoordinates(landmarkName, formattedAddress, canonicalCity, 0);

    const isFoodMain = /nhà hàng|ẩm thực|cà phê|cafe/i.test(placeType || '');
    const mainCategory = existingMain?.location_category || (isFoodMain ? 'restaurant' : (/trung tâm|mua sắm/i.test(placeType || '') ? 'shopping' : 'attraction'));

    const mainLoc = await VisualSearchLocation.findOneAndUpdate(
      { $or: [{ landmark_name: landmarkName }, { name: landmarkName }, { slug: mainSlug }] },
      {
        $set: {
          name: existingMain?.name || landmarkName,
          landmark_name: landmarkName,
          address: formattedAddress || mainGeo.displayAddress,
          formatted_address: formattedAddress || mainGeo.displayAddress,
          city: canonicalCity,
          location_category: mainCategory,
          location_description: description || existingMain?.location_description || `Điểm đến nổi bật tại ${canonicalCity}: ${landmarkName}.`,
          latitude: mainGeo.lat,
          longitude: mainGeo.lng,
          geo: { type: 'Point', coordinates: [mainGeo.lng, mainGeo.lat] }
        },
        $setOnInsert: {
          slug: mainSlug,
          entry_fee: 250000,
          rating: 4.9,
          review_count: 320,
          image_url: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1000&q=80'
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (Activity && !existingMain) {
      await Activity.findOneAndUpdate(
        { name: landmarkName },
        {
          $set: {
            id: `act_${mainSlug}`,
            slug: toSlug(landmarkName) || mainSlug,
            name: landmarkName,
            city: canonicalCity,
            address: formattedAddress || mainGeo.displayAddress,
            description: description || `Khám phá ${landmarkName} tại ${canonicalCity}.`,
            coordinates: { latitude: mainGeo.lat, longitude: mainGeo.lng },
            geo: { type: 'Point', coordinates: [mainGeo.lng, mainGeo.lat] }
          },
          $setOnInsert: {
            categories: isFoodMain ? ['Food & Dining'] : ['Vé tham quan', 'Điểm mốc'],
            imageUrl: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1000&q=80',
            priceFrom: 250000,
            currency: 'VND',
            rating: 9.2,
            reviewCount: 280
          }
        },
        { upsert: true }
      );
    }

    for (let i = 0; i < nearbyPlaces.length; i++) {
      const p = nearbyPlaces[i];
      if (!p || !p.name || p.name.length < 3) continue;
      const pName = String(p.name).trim();
      const pSlug = `loc_vs_${toSlug(pName) || `${Date.now()}_${i}`}`;
      const pCatText = String(p.category || '').toLowerCase();
      const isStay = /khách sạn|lưu trú|hotel|resort|lodge|villa|homestay/i.test(`${pCatText} ${pName}`);
      const isFood = /ẩm thực|nhà hàng|cafe|cà phê|bar|brewhouse/i.test(`${pCatText} ${pName}`);
      const existingLoc = await VisualSearchLocation.findOne({
        $or: [{ landmark_name: pName }, { name: pName }]
      }).lean();

      const coords = existingLoc?.latitude && existingLoc?.longitude
        ? { lat: existingLoc.latitude, lng: existingLoc.longitude }
        : await geocodePlaceCoordinates(pName, formattedAddress, canonicalCity, i + 1);

      if (!existingLoc) {
        await VisualSearchLocation.findOneAndUpdate(
          { $or: [{ landmark_name: pName }, { name: pName }, { slug: pSlug }] },
          {
            $set: {
              name: pName,
              landmark_name: pName,
              address: `${pName}, ${formattedAddress || canonicalCity}`,
              formatted_address: `${pName}, ${formattedAddress || canonicalCity}`,
              city: canonicalCity,
              location_category: isFood ? 'restaurant' : 'attraction',
              location_description: p.highlight || `Địa điểm khám phá nổi bật gần ${landmarkName} (${canonicalCity}).`,
              latitude: coords.lat,
              longitude: coords.lng,
              geo: { type: 'Point', coordinates: [coords.lng, coords.lat] }
            },
            $setOnInsert: {
              slug: pSlug,
              entry_fee: isFood ? 350000 : 250000,
              rating: 4.85,
              review_count: 210,
              image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80'
            }
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      if (isStay && Hotel) {
        const existingHotel = await Hotel.findOne({ $or: [{ name: pName }, { hotel_name: pName }] }).lean();
        if (!existingHotel) {
          await Hotel.findOneAndUpdate(
            { name: pName },
            {
              $set: {
                id: `hotel_vs_${toSlug(pName)}`,
                hotel_slug: toSlug(pName),
                name: pName,
                hotel_name: pName,
                address: `${pName}, ${formattedAddress || canonicalCity}`,
                city: canonicalCity,
                area: landmarkName,
                stars: 4,
                star_rating: 4,
                rating: 9.3,
                reviewCount: 190,
                pricePerNight: canonicalCity === 'Canada' || canonicalCity === 'Thụy Sĩ' ? 7500000 : 1850000,
                price_per_night: canonicalCity === 'Canada' || canonicalCity === 'Thụy Sĩ' ? 7500000 : 1850000,
                currency: 'VND',
                accommodationType: 'Khách sạn',
                description: p.highlight || `Khách sạn & lưu trú tiện nghi gần ${landmarkName} (${canonicalCity}).`,
                imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
                images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'],
                amenities: ['Wi-Fi', 'Bữa sáng', 'Bãi đỗ xe', 'Lễ tân 24/7'],
                freeCancellation: true,
                latitude: coords.lat,
                longitude: coords.lng,
                geo: { type: 'Point', coordinates: [coords.lng, coords.lat] }
              }
            },
            { upsert: true }
          );
        }
      } else if (Activity && !existingLoc) {
        await Activity.findOneAndUpdate(
          { name: pName },
          {
            $set: {
              id: `act_${pSlug}`,
              slug: toSlug(pName) || pSlug,
              name: pName,
              city: canonicalCity,
              address: `${pName}, ${formattedAddress || canonicalCity}`,
              description: p.highlight || `Trải nghiệm khám phá ${pName} gần ${landmarkName} (${canonicalCity}).`,
              coordinates: { latitude: coords.lat, longitude: coords.lng },
              geo: { type: 'Point', coordinates: [coords.lng, coords.lat] }
            },
            $setOnInsert: {
              categories: isFood ? ['Food & Dining'] : ['Vé tham quan', 'Điểm mốc'],
              imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
              priceFrom: isFood ? 350000 : 250000,
              currency: 'VND',
              rating: 9.1,
              reviewCount: 215
            }
          },
          { upsert: true }
        );
      }
    }

    return mainLoc;
  } catch (err) {
    console.warn('⚠️ Lỗi khi tự động lưu địa điểm mới:', err.message);
    return null;
  }
}

async function getRecommendedHotelsAndVenues(landmarkName, formattedAddress, keywords = [], canonicalCity = '') {
  const resolvedCity = canonicalCity || resolveCanonicalCity(landmarkName, formattedAddress, keywords);
  const cityInfo = CITY_CENTERS[resolvedCity];
  const cityAliases = cityInfo ? [resolvedCity.toLowerCase(), ...cityInfo.aliases] : [resolvedCity.toLowerCase()];

  const matchesResolvedCity = (doc) => {
    const docCity = String(doc.city || '').trim();
    if (docCity && CITY_CENTERS[docCity]) {
      return foldAccents(docCity) === foldAccents(resolvedCity);
    }
    const hay = foldAccents(`${doc.city || ''} ${doc.address || ''} ${doc.formatted_address || ''} ${doc.area || ''}`);
    return cityAliases.some((alias) => hay.includes(foldAccents(alias)));
  };

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let matchedHotel = null;
  let nearbyHotels = [];
  let nearbyVenues = [];

  if (Hotel) {
    if (landmarkName && landmarkName.length >= 4) {
      const exactRegex = new RegExp(escapeRegex(landmarkName), 'i');
      const candidate = await Hotel.findOne({
        $or: [{ name: exactRegex }, { hotel_name: exactRegex }]
      }).lean();
      if (candidate && matchesResolvedCity(candidate)) {
        matchedHotel = candidate;
      }
    }

    const allHotels = await Hotel.find(
      matchedHotel ? { _id: { $ne: matchedHotel._id } } : {}
    )
      .sort({ rating: -1, stars: -1 })
      .lean();

    nearbyHotels = allHotels.filter(matchesResolvedCity).slice(0, 4);
  }

  const allLocs = await VisualSearchLocation.find({
    landmark_name: { $ne: landmarkName },
    name: { $ne: landmarkName }
  }).lean();

  nearbyVenues = allLocs.filter(matchesResolvedCity).slice(0, 5);

  return { matchedHotel, nearbyHotels, nearbyVenues, resolvedCity };
}

async function inferLocationFromVideoContext(video, videoContext) {
  const rawCombined = `${videoContext.title || ''} ${videoContext.description || ''} ${(videoContext.tags || []).join(' ')} ${video.location_name || ''}`;
  const foldedCombined = foldAccents(rawCombined);
  const canonicalCity = resolveCanonicalCity(video.location_name || '', rawCombined, videoContext.tags || []);

  // Xóa bỏ bản ghi bị lỗi từ các lần chạy cũ (nếu tên ngoài Hạ Long nhưng địa chỉ lại dính Hạ Long)
  if (canonicalCity !== 'Hạ Long') {
    await VisualSearchLocation.deleteMany({
      $and: [
        { $or: [{ formatted_address: /Hạ Long/i }, { address: /Hạ Long/i }] },
        { city: { $ne: 'Hạ Long' } }
      ]
    }).catch(() => {});
  }

  const allLocs = await VisualSearchLocation.find({}).lean();
  const cityInfo = CITY_CENTERS[canonicalCity];
  const cityAliases = cityInfo ? [foldAccents(canonicalCity), ...cityInfo.aliases] : [foldAccents(canonicalCity)];

  const cityLocs = allLocs.filter((l) => {
    const addrText = foldAccents(`${l.address || ''} ${l.formatted_address || ''}`);
    if (canonicalCity !== 'Hạ Long' && addrText.includes('ha long')) return false;
    const docCity = String(l.city || '').trim();
    if (docCity && CITY_CENTERS[docCity]) {
      return foldAccents(docCity) === foldAccents(canonicalCity);
    }
    const hay = foldAccents(`${l.city || ''} ${l.address || ''} ${l.formatted_address || ''}`);
    return cityAliases.some((a) => hay.includes(a));
  });

  let matchedLoc = null;
  if (foldedCombined.includes('british columbia')) {
    matchedLoc = cityLocs.find((l) => foldAccents(l.landmark_name || l.name || '').includes('emerald lake'));
  } else if (foldedCombined.includes('lauterbrunnen')) {
    matchedLoc = cityLocs.find((l) => foldAccents(l.landmark_name || l.name || '').includes('lauterbrunnen'));
  } else if (foldedCombined.includes('banff')) {
    matchedLoc = cityLocs.find((l) => foldAccents(l.landmark_name || l.name || '').includes('icefields') || foldAccents(l.landmark_name || l.name || '').includes('cascade'));
  }

  if (!matchedLoc) {
    matchedLoc = cityLocs.find((l) => {
      const lname = foldAccents(l.landmark_name || l.name || '');
      return lname.length >= 3 && foldedCombined.includes(lname);
    }) || cityLocs[0] || null;
  }

  const landmark = matchedLoc?.landmark_name || matchedLoc?.name || video.location_name || canonicalCity;
  const rawAddr = matchedLoc?.formatted_address || matchedLoc?.address || video.location_name || canonicalCity;
  const address = (canonicalCity !== 'Hạ Long' && foldAccents(rawAddr).includes('ha long'))
    ? (video.location_name || canonicalCity)
    : rawAddr;

  const otherCityLocs = cityLocs.filter(
    (l) => (l.landmark_name || l.name) !== landmark
  ).slice(0, 4);

  const nearbyPlaces = otherCityLocs.map((r) => ({
    name: r.landmark_name || r.name,
    category: r.location_category === 'restaurant' || r.location_category === 'cafe' ? 'Ẩm thực' : (r.location_category === 'shopping' ? 'Mua sắm' : 'Trải nghiệm'),
    highlight: (r.location_description || r.description || `Điểm khám phá nổi bật tại ${canonicalCity}`).slice(0, 110)
  }));

  return {
    found: true,
    landmark_name: landmark,
    place_type: 'Địa điểm tham quan',
    formatted_address: address,
    description: matchedLoc?.location_description || matchedLoc?.description || videoContext.description || `Điểm đến nổi bật tại ${canonicalCity}: ${landmark}.`,
    confidence: 'high',
    suggested_keywords: [landmark, canonicalCity].filter(Boolean),
    nearby_places: nearbyPlaces
  };
}

async function visualSearch(req, res) {
  try {
    const videoId = String(req.body?.video_id || '').trim();
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'video_id là bắt buộc.' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database chưa sẵn sàng.' });
    }

    const video = await Content.findOne(buildVideoQuery(videoId));
    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video.' });
    }

    const imageBase64 = String(req.body?.image_base64 || '').trim();
    const imageUrl = String(req.body?.image_url || '').trim();
    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'image_base64 hoặc image_url là bắt buộc.'
      });
    }

    const cropBox = req.body?.crop_box === undefined ? null : normalizeCropBox(req.body.crop_box);
    if (req.body?.crop_box !== undefined && !cropBox) {
      return res.status(400).json({ success: false, message: 'crop_box không hợp lệ.' });
    }

    const videoContext = await getVideoContext(video);
    let identifiedLocation = null;
    try {
      identifiedLocation = imageBase64
        ? await identifyLocationFromBase64(imageBase64, videoContext, cropBox)
        : await identifyLocationFromUrl(imageUrl, videoContext, cropBox);
    } catch (geminiErr) {
      console.warn('⚠️ Gemini Vision fallback sang ngữ cảnh video:', geminiErr.message);
      identifiedLocation = await inferLocationFromVideoContext(video, videoContext);
    }

    if (!identifiedLocation || !identifiedLocation.found) {
      identifiedLocation = await inferLocationFromVideoContext(video, videoContext);
    }

    const confidence = ['high', 'medium', 'low'].includes(identifiedLocation.confidence)
      ? identifiedLocation.confidence
      : 'high';

    const suggestedKeywords = Array.isArray(identifiedLocation.suggested_keywords)
      ? identifiedLocation.suggested_keywords
      : [];

    const canonicalCity = resolveCanonicalCity(
      identifiedLocation.landmark_name,
      `${identifiedLocation.formatted_address || ''} ${video.location_name || ''}`,
      suggestedKeywords
    );

    const rawNearbyPlaces = Array.isArray(identifiedLocation.nearby_places)
      ? identifiedLocation.nearby_places
      : [];

    const locationPayload = {
      landmark_name: identifiedLocation.landmark_name,
      formatted_address: identifiedLocation.formatted_address,
      place_type: identifiedLocation.place_type || 'Địa điểm',
      description: identifiedLocation.description || ''
    };

    // Tự động geocode tọa độ thực và lưu cả địa điểm chính lẫn các địa điểm lân cận vào MongoDB (locations, activities, hotels)
    const savedMainLocation = await saveDiscoveredPlacesToDb(
      locationPayload.landmark_name,
      locationPayload.formatted_address,
      locationPayload.description,
      locationPayload.place_type,
      canonicalCity,
      rawNearbyPlaces
    );

    const recommendations = await getRecommendedHotelsAndVenues(
      locationPayload.landmark_name,
      locationPayload.formatted_address,
      suggestedKeywords,
      canonicalCity
    );

    // Kết hợp nearby_places từ AI + các địa điểm thực tế cùng khu vực trong DB để danh sách luôn đầy đặn
    const seenNearby = new Set(rawNearbyPlaces.map((p) => foldAccents(p.name)));
    seenNearby.add(foldAccents(locationPayload.landmark_name));
    const dbExtraPlaces = (recommendations.nearbyVenues || [])
      .filter((v) => !seenNearby.has(foldAccents(v.landmark_name || v.name)))
      .map((v) => ({
        name: v.landmark_name || v.name,
        category: v.location_category === 'restaurant' || v.location_category === 'cafe' ? 'Ẩm thực' : (v.location_category === 'shopping' ? 'Mua sắm' : 'Trải nghiệm'),
        highlight: (v.location_description || v.description || `Điểm đến nổi bật tại ${canonicalCity}`).slice(0, 110)
      }));
    const mergedNearbyPlaces = [...rawNearbyPlaces, ...dbExtraPlaces].slice(0, 5);

    const location = savedMainLocation || await VisualSearchLocation.findOneAndUpdate(
      { landmark_name: identifiedLocation.landmark_name },
      {
        $set: {
          name: identifiedLocation.landmark_name,
          address: identifiedLocation.formatted_address,
          formatted_address: identifiedLocation.formatted_address,
          city: canonicalCity
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    video.location_id = location._id;
    await video.save();

    const relatedByLoc = await getRelatedVideos(location._id, video._id);
    const relatedVideos = relatedByLoc.length > 0
      ? relatedByLoc
      : await buildKeywordVideoQuery(video, [canonicalCity, locationPayload.landmark_name, ...suggestedKeywords]);

    return res.json({
      success: true,
      found: true,
      cached: false,
      confidence,
      city: canonicalCity,
      suggested_keywords: suggestedKeywords,
      location: formatLocation(location, {
        place_type: locationPayload.place_type,
        description: locationPayload.description
      }),
      matched_hotel: recommendations.matchedHotel,
      nearby_hotels: recommendations.nearbyHotels,
      nearby_venues: recommendations.nearbyVenues,
      nearby_places: mergedNearbyPlaces,
      related_videos: relatedVideos
    });
  } catch (error) {
    console.error('❌ [VISUAL SEARCH ERROR]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { visualSearch };