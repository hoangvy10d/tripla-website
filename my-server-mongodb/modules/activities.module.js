/**
 * MODULE 5: ACTIVITY SEARCH (`src/app/activity-search`)
 * Quản lý Collection: `activities` & kết nối với `locations` (Địa điểm tham quan, vui chơi, di tích)
 */
const express = require('express');
const mongoose = require('mongoose');
const { Activity, Location } = require('../models');
const { toSlug } = require('../utils/helpers');
const { memoryStore, isMongoConnected, isValidObjectId } = require('./shared');

const router = express.Router();

function mapCategoriesForLocation(loc) {
  const cat = String(loc.location_category || '').toLowerCase();
  const title = String(loc.name || loc.title || '').toLowerCase();
  const result = new Set();

  if (cat === 'restaurant' || cat === 'cafe' || cat.includes('ẩm thực')) {
    result.add('Food & Dining');
  } else if (cat === 'nature') {
    result.add('Công viên & vườn');
    result.add('Các điểm tham quan khác');
    result.add('Vé tham quan');
  } else {
    result.add('Vé tham quan');
    result.add('Điểm mốc');
  }

  if (title.includes('vinwonders') || title.includes('ba na') || title.includes('bà nà')) {
    result.add('Công viên giải trí');
  }
  if (title.includes('safari') || title.includes('zoo')) {
    result.add('Sở thú & thủy cung');
  }
  if (title.includes('museum') || title.includes('bảo tàng') || title.includes('prison') || title.includes('hoa lo')) {
    result.add('Bảo tàng & Phòng trưng bày');
  }
  if (title.includes('show') || title.includes('puppet') || title.includes('theatre')) {
    result.add('Sự kiện & Buổi diễn');
  }
  if (title.includes('beach') || title.includes('lake') || title.includes('hồ') || title.includes('mountain')) {
    result.add('Các điểm tham quan khác');
  }
  return Array.from(result);
}

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function normalizeCityName(city) {
  const norm = normalizeText(city);
  const map = {
    'da nang': 'Đà Nẵng',
    'phu quoc': 'Phú Quốc',
    'ha noi': 'Hà Nội',
    'da lat': 'Đà Lạt',
    'lam dong': 'Đà Lạt',
    'nha trang': 'Nha Trang',
    'khanh hoa': 'Nha Trang',
    'vung tau': 'Vũng Tàu',
    'ba ria vung tau': 'Vũng Tàu',
    'ho chi minh': 'Hồ Chí Minh',
    'tp hcm': 'Hồ Chí Minh',
    'sai gon': 'Hồ Chí Minh',
    'hoi an': 'Hội An',
    'quang nam': 'Hội An',
    'ninh binh': 'Ninh Bình',
    'sa pa': 'Sa Pa',
    'sapa': 'Sa Pa',
    'lao cai': 'Sa Pa',
    'ha long': 'Hạ Long',
    'quang ninh': 'Hạ Long',
    'hue': 'Huế',
    'thua thien hue': 'Huế',
    'quy nhon': 'Quy Nhơn',
    'binh dinh': 'Quy Nhơn',
    'can tho': 'Cần Thơ',
    'phan thiet': 'Phan Thiết',
    'mui ne': 'Mũi Né',
    'cao bang': 'Cao Bằng',
    'thac ban gioc': 'Cao Bằng',
    'ban gioc': 'Cao Bằng',
    'quang binh': 'Quảng Bình',
    'phong nha': 'Quảng Bình',
    'son doong': 'Quảng Bình',
    'thuy si': 'Thụy Sĩ',
    'switzerland': 'Thụy Sĩ',
    'canada': 'Canada'
  };
  return map[norm] || city || 'Việt Nam';
}

function buildActivitySlug(doc) {
  return toSlug(doc?.name || doc?.title) || doc?.slug || String(doc?.id || doc?._id || '');
}

function formatLocationAsActivity(loc) {
  const images = loc.images?.length ? loc.images : (loc.image_url ? [loc.image_url] : ['/images/trangan.jpg']);
  const city = normalizeCityName(loc.city);
  const name = loc.name || loc.title;
  return {
    _id: loc._id,
    id: loc.code || String(loc._id),
    slug: toSlug(name) || loc.slug || loc.code || String(loc._id),
    location_slug: loc.slug,
    name,
    city,
    location: loc.address || city || 'Việt Nam',
    address: loc.address || '',
    category: loc.location_category || 'Điểm tham quan',
    categories: mapCategoriesForLocation(loc),
    imageUrl: loc.image_url || images[0] || '/images/trangan.jpg',
    images,
    description: loc.location_description || loc.description || 'Địa điểm du lịch trải nghiệm độc đáo trên TRIPLA.',
    price: Number(loc.entry_fee ?? loc.price ?? loc.ticketPrice) || 0,
    priceFrom: Number(loc.entry_fee ?? loc.price ?? loc.ticketPrice) || 0,
    currency: 'VND',
    rating: Number(loc.rating) || 9.2,
    reviewCount: Number(loc.review_count || loc.reviewsCount) || 120,
    coordinates: loc.geo?.coordinates ? { longitude: loc.geo.coordinates[0], latitude: loc.geo.coordinates[1] } : null,
    isLocation: true
  };
}

// 1. GET /api/v1/activities
router.get('/activities', async (req, res) => {
  try {
    const rawLocation = normalizeText(req.query.location || req.query.city || '');
    const q = normalizeText(req.query.q || '');
    const category = req.query.category || 'all';
    const minPrice = Number(req.query.minPrice) || 0;
    const maxPrice = Number(req.query.maxPrice) || 100000000;
    const rating = Number(req.query.rating) || 0;

    let activitiesList = [];
    let locationsList = [];

    if (isMongoConnected()) {
      [activitiesList, locationsList] = await Promise.all([
        Activity.find({}).lean(),
        Location.find({}).lean()
      ]);
    } else {
      activitiesList = [...(memoryStore.activities || [])];
      locationsList = [...(memoryStore.locations || [])];
    }

    const mappedLocations = locationsList.map(formatLocationAsActivity);
    const seenNames = new Set(mappedLocations.map((l) => normalizeText(l.name)));
    const uniqueActivities = activitiesList
      .map((a) => ({
        ...a,
        id: a.id || a._id,
        slug: buildActivitySlug(a),
        city: normalizeCityName(a.city)
      }))
      .filter((a) => !seenNames.has(normalizeText(a.name)));

    let list = [...mappedLocations, ...uniqueActivities];

    if (rawLocation && rawLocation !== 'viet nam' && rawLocation !== 'all') {
      let aliasLocation = ['tp hcm', 'tphcm', 'sai gon', 'saigon', 'tp ho chi minh'].includes(rawLocation)
        ? 'ho chi minh'
        : rawLocation === 'sapa'
        ? 'sa pa'
        : rawLocation;
      if (aliasLocation.includes('canada') || aliasLocation.includes('banff') || aliasLocation.includes('lake louise') || aliasLocation.includes('icefields') || aliasLocation.includes('british columbia') || aliasLocation.includes('cascade')) aliasLocation = 'canada';
      else if (aliasLocation.includes('thuy si') || aliasLocation.includes('switzerland') || aliasLocation.includes('interlaken') || aliasLocation.includes('lauterbrunnen') || aliasLocation.includes('grindelwald') || aliasLocation.includes('beatenberg')) aliasLocation = 'thuy si';
      else if (aliasLocation.includes('cao bang') || aliasLocation.includes('ban gioc') || aliasLocation.includes('nguom ngao')) aliasLocation = 'cao bang';
      else if (aliasLocation.includes('quang binh') || aliasLocation.includes('phong nha') || aliasLocation.includes('son doong') || aliasLocation.includes('hang en')) aliasLocation = 'quang binh';
      else if (aliasLocation.includes('ha long') || aliasLocation.includes('quang ninh')) aliasLocation = 'ha long';
      else if (aliasLocation.includes('vinh hy') || aliasLocation.includes('ninh thuan') || aliasLocation.includes('nui chua')) aliasLocation = 'ninh thuan';
      else if (aliasLocation.includes('phu yen') || aliasLocation.includes('song cau') || aliasLocation.includes('bai san ho')) aliasLocation = 'phu yen';
      else if (aliasLocation.includes('lang co') || aliasLocation.includes('hue')) aliasLocation = 'hue';

      list = list.filter((a) => {
        const text = normalizeText(`${a.location || ''} ${a.city || ''} ${a.name || ''} ${a.address || ''}`);
        return text.includes(aliasLocation);
      });
    }

    if (q) {
      let normQ = q;
      if (normQ.includes('titov') || normQ.includes('titop')) normQ = normQ.replace(/titov|titop/g, 'ti top');
      if (normQ.includes('su sot')) normQ = normQ.replace(/su sot/g, 'sung sot');
      const tokens = normQ.split(/\s+/).filter((w) => w.length >= 2);

      list = list.filter((a) => {
        const text = normalizeText(`${a.name || ''} ${a.description || ''} ${a.city || ''} ${a.location || ''} ${a.address || ''}`);
        if (text.includes(normQ)) return true;
        return tokens.length > 0 && tokens.every((tok) => text.includes(tok));
      });
    }

    if (category && category !== 'all' && category !== 'Tất cả') {
      list = list.filter((a) => (a.categories || [a.category]).includes(category) || a.category === category);
    }

    list = list.filter((a) => {
      const p = Number(a.priceFrom ?? a.price ?? 0);
      return p >= minPrice && p <= maxPrice && (Number(a.rating) || 0) >= rating;
    });

    return res.json({
      success: true,
      count: list.length,
      items: list
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/v1/activities/:id (Hỗ trợ cả slug lẫn id / _id)
router.get('/activities/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const slugCandidate = toSlug(id) || id.toLowerCase();
    const legacyNum = id.replace(/^act_legacy_/i, '');
    let activity = null;

    if (isMongoConnected()) {
      const actQuery = isValidObjectId(id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { id }, { slug: id }, { slug: slugCandidate }] }
        : { $or: [{ id }, { slug: id }, { slug: slugCandidate }] };
      activity = await Activity.findOne(actQuery).lean();

      if (!activity) {
        const locQuery = isValidObjectId(id)
          ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { slug: id }, { slug: slugCandidate }, { code: id }] }
          : {
              $or: [
                { slug: id },
                { slug: slugCandidate },
                { slug: new RegExp(`^loc_${legacyNum}_`, 'i') },
                { code: id }
              ]
            };
        const loc = await Location.findOne(locQuery).lean();
        if (loc) {
          activity = formatLocationAsActivity(loc);
        }
      }

      if (!activity) {
        const [allLocations, allActivities] = await Promise.all([
          Location.find({}).lean(),
          Activity.find({}).lean()
        ]);
        const matchedLoc = allLocations.find((l) => toSlug(l.name || l.title) === slugCandidate);
        if (matchedLoc) {
          activity = formatLocationAsActivity(matchedLoc);
        } else {
          activity = allActivities.find((a) => toSlug(a.name || a.title) === slugCandidate) || null;
        }
      }
    } else {
      activity = (memoryStore.activities || []).find(
        (a) => String(a._id) === id || a.id === id || a.slug === id || buildActivitySlug(a) === slugCandidate
      );
      if (!activity) {
        const loc = (memoryStore.locations || []).find(
          (l) =>
            String(l._id) === id ||
            l.code === id ||
            l.id === id ||
            l.slug === id ||
            toSlug(l.name || l.title) === slugCandidate
        );
        if (loc) activity = formatLocationAsActivity(loc);
      }
    }

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hoạt động' });
    }

    return res.json({
      success: true,
      activity: {
        ...activity,
        id: activity.id || activity._id,
        slug: buildActivitySlug(activity)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
