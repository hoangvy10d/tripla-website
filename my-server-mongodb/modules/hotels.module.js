/**
 * MODULE 3: HOTELS, ROOMS & LOCATIONS (`src/app/hotel-search` & `src/app/pages/trip-shop`)
 * Quản lý các Collections chuẩn ERD: `hotels`, `rooms`, `locations`, `providers`
 */
const express = require('express');
const mongoose = require('mongoose');
const { Hotel, Room, Location, Provider, Activity, LocationTag } = require('../models');
const { toSlug } = require('../utils/helpers');
const {
  memoryStore,
  isMongoConnected,
  isValidObjectId,
  buildHotspotFromHotelAndRoom,
  buildHotspotFromLocation
} = require('./shared');

const router = express.Router();

function stripAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

const AMENITY_KEYWORDS = {
  wifi: ['wi-fi', 'wifi'],
  pool: ['ho boi', 'pool'],
  privatePool: ['ho boi rieng', 'ho boi vo cuc', 'pool villa', 'private pool', 'pavilion'],
  parking: ['bai do xe', 'dau xe', 'parking'],
  breakfast: ['bua sang', 'an sang', 'breakfast'],
  reception: ['le tan', '24/7', 'quan gia', 'reception'],
  earlyCheckIn: ['nhan phong som', 'early check'],
  airportShuttle: ['dua don san bay', 'airport'],
  lateCheckOut: ['tra phong muon', 'late check'],
  shopping: ['mua sam', 'shopping'],
  bar: ['bar', 'lounge', 'pub'],
  entertainment: ['giai tri', 'entertainment', 'spa'],
  indoorSport: ['the thao', 'gym', 'the duc'],
  golf: ['golf'],
  mountainView: ['nui', 'doi thong', 'mountain', 'san may', 'nui chua'],
  hairdryer: ['may say', 'hairdryer', 'phong tam'],
  familyRoom: ['gia dinh', 'family', 'villa'],
  fridge: ['tu lanh', 'minibar', 'fridge'],
  nonSmoking: ['khong hut thuoc', 'cam hut thuoc', 'non-smoking'],
  bathtub: ['bon tam', 'phong tam rieng', 'bathtub']
};

// 1. GET /api/v1/hotels
router.get('/hotels', async (req, res) => {
  try {
    const rawLocation = (req.query.location || req.query.city || '').trim();
    const location = stripAccents(rawLocation);
    const accommodation = req.query.accommodation || 'all';
    const minPrice = Number(req.query.minPrice) || 0;
    const maxPrice = Number(req.query.maxPrice) || 100000000;
    const minRating = Number(req.query.rating) || 0;
    const starsParam = req.query.stars ? String(req.query.stars).split(',').map(Number).filter(Boolean) : [];
    const dealsOnly = req.query.dealsOnly === 'true';
    const freeCancellation = req.query.freeCancellation === 'true';
    const areaQuery = stripAccents(req.query.area || '');
    const keyword = stripAccents(req.query.keyword || req.query.q || '');
    const sortByPrice = String(req.query.sortByPrice || '').trim().toLowerCase();
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '6'), 10) || 6));
    const amenitiesParam = req.query.amenities ? String(req.query.amenities).split(',').map((s) => stripAccents(s)).filter(Boolean) : [];

    let list = [];
    let allRooms = [];

    if (isMongoConnected()) {
      [list, allRooms] = await Promise.all([
        Hotel.find({})
          .populate('provider_id', 'business_name business_license verification_status')
          .lean(),
        Room.find({ room_status: 'available' }).lean()
      ]);
    } else {
      list = [...(memoryStore.hotels || [])];
      allRooms = [...(memoryStore.rooms || [])];
    }

    const roomsByHotelId = new Map();
    allRooms.forEach((rm) => {
      const key = String(rm.hotel_id);
      if (!roomsByHotelId.has(key)) roomsByHotelId.set(key, []);
      roomsByHotelId.get(key).push({
        ...rm,
        id: String(rm._id),
        name: rm.room_name,
        size: rm.size_m2 || 110,
        bed: rm.bed || '1 giường King',
        guests: rm.capacity || 2,
        pricePerNight: rm.room_price,
        breakfast: rm.breakfast !== false
      });
    });

    let normLocCity = ['tp hcm', 'tphcm', 'sai gon', 'tp ho chi minh'].includes(location)
      ? 'ho chi minh'
      : location;

    if (normLocCity.includes('ha long') || normLocCity.includes('quang ninh') || normLocCity.includes('tuan chau') || normLocCity.includes('bai chay')) normLocCity = 'ha long';
    else if (normLocCity.includes('vung tau') || normLocCity.includes('ba ria')) normLocCity = 'vung tau';
    else if (normLocCity.includes('da lat') || normLocCity.includes('lam dong')) normLocCity = 'da lat';
    else if (normLocCity.includes('nha trang') || normLocCity.includes('khanh hoa') || normLocCity.includes('ninh van')) normLocCity = 'nha trang';
    else if (normLocCity.includes('phu quoc') || normLocCity.includes('kien giang') || normLocCity.includes('bai truong') || normLocCity.includes('bai khem')) normLocCity = 'phu quoc';
    else if (normLocCity.includes('hoi an') || normLocCity.includes('quang nam')) normLocCity = 'hoi an';
    else if (normLocCity.includes('sa pa') || normLocCity.includes('sapa') || normLocCity.includes('lao cai')) normLocCity = 'sa pa';
    else if (normLocCity.includes('ninh binh') || normLocCity.includes('trang an') || normLocCity.includes('van long')) normLocCity = 'ninh binh';
    else if (normLocCity.includes('cao bang') || normLocCity.includes('ban gioc') || normLocCity.includes('trung khanh') || normLocCity.includes('nguom ngao')) normLocCity = 'cao bang';
    else if (normLocCity.includes('quang binh') || normLocCity.includes('phong nha') || normLocCity.includes('son doong') || normLocCity.includes('hang en') || normLocCity.includes('song chay')) normLocCity = 'quang binh';
    else if (normLocCity.includes('vinh hy') || normLocCity.includes('ninh thuan') || normLocCity.includes('amanoi') || normLocCity.includes('nui chua')) normLocCity = 'ninh thuan';
    else if (normLocCity.includes('phu yen') || normLocCity.includes('song cau') || normLocCity.includes('bai san ho') || normLocCity.includes('zannier')) normLocCity = 'phu yen';
    else if (normLocCity.includes('lang co') || normLocCity.includes('hue') || normLocCity.includes('banyan tree')) normLocCity = 'hue';
    else if (normLocCity.includes('thuy si') || normLocCity.includes('switzerland') || normLocCity.includes('interlaken') || normLocCity.includes('lauterbrunnen') || normLocCity.includes('grindelwald') || normLocCity.includes('jungfrau') || normLocCity.includes('beatenberg') || normLocCity.includes('beatus')) normLocCity = 'thuy si';
    else if (normLocCity.includes('canada') || normLocCity.includes('banff') || normLocCity.includes('lake louise') || normLocCity.includes('icefields') || normLocCity.includes('moraine') || normLocCity.includes('british columbia') || normLocCity.includes('emerald lake') || normLocCity.includes('cascade')) normLocCity = 'canada';

    if (normLocCity && normLocCity !== 'viet nam' && normLocCity !== 'all' && normLocCity !== 'toan quoc') {
      const stopWords = new Set(['resort', 'hotel', 'khach', 'san', 'khu', 'nghi', 'duong', 'villa', 'mong', 'mo', 'di', 'san', 'tp', 'tinh', 'thanh', 'pho', 'dao', 'ngoc', 'vinh', 'bai', 'bien', 'nui']);
      const tokens = normLocCity.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));
      const fallbackTokens = tokens.length > 0 ? tokens : normLocCity.split(/\s+/).filter((w) => w.length >= 2);

      const getHaystack = (h) =>
        stripAccents(`${h.hotel_name || h.name || ''} ${h.city || ''} ${h.area || ''} ${h.address || ''}`);

      const compactQuery = normLocCity.replace(/\s+/g, '');
      const phraseOrAll = list.filter((h) => {
        const hs = getHaystack(h);
        if (hs.includes(normLocCity) || hs.replace(/\s+/g, '').includes(compactQuery)) return true;
        return fallbackTokens.length > 0 && fallbackTokens.every((tok) => hs.includes(tok));
      });

      if (phraseOrAll.length > 0) {
        list = phraseOrAll;
      } else if (fallbackTokens.length === 1) {
        const singleTok = fallbackTokens[0];
        list = list.filter((h) => getHaystack(h).includes(singleTok));
      } else {
        list = [];
      }
    }

    if (accommodation && accommodation !== 'all' && accommodation !== 'Tất cả') {
      const accNorm = stripAccents(accommodation);
      list = list.filter((h) => {
        const hText = stripAccents(
          `${h.accommodation || ''} ${h.accommodationType || ''} ${h.hotel_name || h.name || ''}`
        );
        if (accNorm === 'biet thu') {
          return hText.includes('biet thu') || hText.includes('villa') || hText.includes('residence') || hText.includes('khu nghi duong') || hText.includes('resort');
        }
        if (accNorm === 'khach san') {
          return hText.includes('khach san') || hText.includes('hotel');
        }
        if (accNorm === 'homestay') {
          return hText.includes('homestay') || hText.includes('nha nghi') || hText.includes('stay');
        }
        return hText.includes(accNorm);
      });
    }

    if (areaQuery) {
      list = list.filter((h) => stripAccents(`${h.area || ''} ${h.address || ''} ${h.city || ''}`).includes(areaQuery));
    }

    if (dealsOnly) {
      list = list.filter((h) => h.isFlashDeal || Number(h.discountPercent) > 0);
    }

    if (freeCancellation) {
      list = list.filter(
        (h) =>
          h.freeCancellation === true ||
          (h.policies || []).some((p) => stripAccents(p).includes('mien phi huy'))
      );
    }

    if (amenitiesParam.length > 0) {
      list = list.filter((h) => {
        const joinedRooms = roomsByHotelId.get(String(h._id)) || h.rooms || [];
        const roomAmenText = joinedRooms.map((r) => (r.room_amenities || r.amenities || []).join(' ')).join(' ');
        const hAmen = stripAccents(
          `${(h.hotel_amenities || h.amenities || []).join(' ')} ${(h.perks || []).join(' ')} ${(h.policies || []).join(' ')} ${h.hotel_name || h.name || ''} ${h.description || ''} ${roomAmenText}`
        );
        return amenitiesParam.every((a) => {
          const matchedKey = Object.keys(AMENITY_KEYWORDS).find((k) => k.toLowerCase() === a);
          const keywords = matchedKey ? AMENITY_KEYWORDS[matchedKey] : [a];
          return keywords.some((kw) => hAmen.includes(kw));
        });
      });
    }

    if (keyword) {
      list = list.filter((h) => stripAccents(`${h.hotel_name || h.name || ''}`).includes(keyword));
    }

    list = list.filter((h) => {
      const p = Number(h.price_per_night || h.pricePerNight) || 0;
      return p >= minPrice && p <= maxPrice && (Number(h.rating) || 0) >= minRating;
    });

    if (starsParam.length > 0) {
      list = list.filter((h) => starsParam.includes(Number(h.star_rating || h.stars)));
    }

    const mappedItems = list.map((h) => {
      const joinedRooms = roomsByHotelId.get(String(h._id)) || h.rooms || [];
      const roomPrices = joinedRooms
        .map((rm) => Number(rm.room_price || rm.pricePerNight))
        .filter((n) => Number.isFinite(n) && n > 0);
      const lowestPrice =
        roomPrices.length > 0
          ? Math.min(...roomPrices)
          : Number(h.price_per_night || h.pricePerNight) || 0;
      const totalStock =
        joinedRooms.length > 0
          ? joinedRooms.reduce((sum, rm) => sum + Number(rm.stock ?? rm.total_units ?? 5), 0)
          : Number(h.total_rooms || 10);
      const fallbackImg = h.imageUrl || h.image_url || h.images?.[0] || '/images/trangan.jpg';
      const hasFreeCancel =
        h.freeCancellation !== undefined
          ? Boolean(h.freeCancellation)
          : (h.policies || []).some((p) => stripAccents(p).includes('mien phi huy'));
      return {
        ...h,
        _id: String(h._id),
        id: h.id || String(h._id),
        hotel_slug: h.hotel_slug || toSlug(h.hotel_name || h.name) || h.id || String(h._id),
        hotel_name: h.hotel_name || h.name,
        name: h.name || h.hotel_name,
        star_rating: h.star_rating || h.stars || 5,
        stars: h.stars || h.star_rating || 5,
        currency: h.currency || 'VND',
        freeCancellation: hasFreeCancel,
        imageUrl: fallbackImg,
        image_url: fallbackImg,
        images: Array.isArray(h.images) && h.images.length ? h.images : [fallbackImg],
        amenities: Array.isArray(h.amenities) && h.amenities.length ? h.amenities : h.hotel_amenities || [],
        lowestPrice,
        stock: totalStock,
        price_per_night: lowestPrice || h.price_per_night || h.pricePerNight,
        pricePerNight: lowestPrice || h.pricePerNight || h.price_per_night,
        rooms: joinedRooms
      };
    });

    if (sortByPrice === 'asc') {
      mappedItems.sort((a, b) => (a.lowestPrice || 0) - (b.lowestPrice || 0));
    } else if (sortByPrice === 'desc') {
      mappedItems.sort((a, b) => (b.lowestPrice || 0) - (a.lowestPrice || 0));
    }

    const total = mappedItems.length;
    const totalPages = hasPagination ? Math.max(1, Math.ceil(total / limit)) : 1;
    const safePage = hasPagination ? Math.min(page, totalPages) : 1;
    const items = hasPagination
      ? mappedItems.slice((safePage - 1) * limit, safePage * limit)
      : mappedItems;

    return res.json({
      success: true,
      count: items.length,
      total,
      page: safePage,
      limit: hasPagination ? limit : total,
      totalPages,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/v1/hotels/:identifier (Slug first -> fallback ID)
router.get('/hotels/:identifier', async (req, res) => {
  try {
    const rawIdentifier = String(req.params.identifier || '').trim();
    const slugCandidate = toSlug(rawIdentifier) || rawIdentifier.toLowerCase();
    let hotel = null;
    let hotelRooms = [];

    if (isMongoConnected()) {
      // Step 1: Query by hotel_slug first
      hotel = await Hotel.findOne({ hotel_slug: { $in: [rawIdentifier.toLowerCase(), slugCandidate] } })
        .populate('provider_id', 'business_name business_license verification_status')
        .lean();

      if (!hotel) {
        // Check dynamically generated slug on hotels lacking stored hotel_slug
        const allHotels = await Hotel.find({})
          .populate('provider_id', 'business_name business_license verification_status')
          .lean();
        hotel = allHotels.find((h) => toSlug(h.hotel_name || h.name) === slugCandidate) || null;
      }

      // Step 2: Fallback query by hotel_id / _id / id / code
      if (!hotel) {
        const idCandidates = [{ id: rawIdentifier }, { code: rawIdentifier }];
        if (/^\d+$/.test(rawIdentifier)) {
          idCandidates.push({ id: `h${rawIdentifier}` }, { code: `h${rawIdentifier}` });
        }
        const query = isValidObjectId(rawIdentifier)
          ? { $or: [{ _id: new mongoose.Types.ObjectId(rawIdentifier) }, ...idCandidates] }
          : { $or: idCandidates };
        hotel = await Hotel.findOne(query)
          .populate('provider_id', 'business_name business_license verification_status')
          .lean();
      }

      if (hotel) {
        hotelRooms = await Room.find({ hotel_id: hotel._id }).lean();
      }
    } else {
      const memHotels = memoryStore.hotels || [];
      hotel =
        memHotels.find(
          (h) =>
            String(h.hotel_slug || '').toLowerCase() === rawIdentifier.toLowerCase() ||
            toSlug(h.hotel_name || h.name) === slugCandidate
        ) ||
        memHotels.find(
          (h) =>
            String(h._id) === rawIdentifier ||
            h.id === rawIdentifier ||
            (/^\d+$/.test(rawIdentifier) && h.id === `h${rawIdentifier}`)
        );
      if (hotel) {
        hotelRooms = (memoryStore.rooms || []).filter(
          (rm) => String(rm.hotel_id) === String(hotel._id)
        );
      }
    }

    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn' });
    }

    const formattedRooms =
      hotelRooms.length > 0
        ? hotelRooms.map((rm) => ({
            ...rm,
            _id: String(rm._id),
            id: String(rm._id),
            name: rm.room_name,
            size: rm.size_m2 || 110,
            bed: rm.bed || '1 giường King',
            guests: rm.capacity || 2,
            pricePerNight: rm.room_price,
            total_units: Number(rm.total_units ?? 5),
            stock: Number(rm.stock ?? rm.total_units ?? 5),
            room_images: Array.isArray(rm.room_images) ? rm.room_images : [],
            breakfast: rm.breakfast !== false
          }))
        : (hotel.rooms || []).map((rm) => ({
            ...rm,
            total_units: Number(rm.total_units ?? 5),
            stock: Number(rm.stock ?? rm.total_units ?? 5)
          }));

    const roomPrices = formattedRooms
      .map((rm) => Number(rm.pricePerNight || rm.room_price))
      .filter((n) => Number.isFinite(n) && n > 0);
    const lowestPrice =
      roomPrices.length > 0
        ? Math.min(...roomPrices)
        : Number(hotel.price_per_night || hotel.pricePerNight) || 0;
    const totalStock =
      formattedRooms.length > 0
        ? formattedRooms.reduce((sum, rm) => sum + Number(rm.stock ?? rm.total_units ?? 5), 0)
        : Number(hotel.total_rooms || 5);

    const roomImageList = formattedRooms.flatMap((rm) => rm.room_images || []).filter(Boolean);
    const hotelImageList = Array.isArray(hotel.images) ? hotel.images.filter(Boolean) : [];
    const fallbackDetailImg = hotel.imageUrl || hotel.image_url || hotelImageList[0] || '/images/trangan.jpg';
    const mergedImages = Array.from(new Set([...roomImageList, ...hotelImageList, fallbackDetailImg].filter(Boolean)));
    const slug = hotel.hotel_slug || toSlug(hotel.hotel_name || hotel.name) || hotel.id || String(hotel._id);

    return res.json({
      success: true,
      hotel: {
        ...hotel,
        _id: String(hotel._id),
        id: hotel.id || String(hotel._id),
        hotel_slug: slug,
        hotel_name: hotel.hotel_name || hotel.name,
        name: hotel.name || hotel.hotel_name,
        star_rating: hotel.star_rating || hotel.stars || 5,
        stars: hotel.stars || hotel.star_rating || 5,
        currency: hotel.currency || 'VND',
        imageUrl: mergedImages[0] || fallbackDetailImg,
        image_url: mergedImages[0] || fallbackDetailImg,
        images: mergedImages,
        amenities: Array.isArray(hotel.amenities) && hotel.amenities.length ? hotel.amenities : hotel.hotel_amenities || [],
        lowestPrice,
        stock: totalStock,
        price_per_night: lowestPrice || hotel.price_per_night || hotel.pricePerNight,
        pricePerNight: lowestPrice || hotel.pricePerNight || hotel.price_per_night,
        rooms: formattedRooms
      },
      rooms: formattedRooms,
      pointData: buildHotspotFromHotelAndRoom(hotel, formattedRooms[0])
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/v1/rooms & GET /api/v1/rooms/:id
router.get('/rooms', async (req, res) => {
  try {
    const { hotel_id, room_type, status } = req.query;
    let items = [];

    if (isMongoConnected()) {
      const filter = {};
      if (hotel_id && isValidObjectId(hotel_id)) {
        filter.hotel_id = new mongoose.Types.ObjectId(hotel_id);
      }
      if (room_type) filter.room_type = room_type;
      if (status) filter.room_status = status;

      items = await Room.find(filter)
        .populate('hotel_id', 'hotel_name address city star_rating image_url')
        .lean();
    } else {
      items = [...(memoryStore.rooms || [])];
      if (hotel_id) {
        items = items.filter((r) => String(r.hotel_id) === String(hotel_id));
      }
    }

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let room = null;

    if (isMongoConnected()) {
      const query = isValidObjectId(id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { code: id }] }
        : { code: id };
      room = await Room.findOne(query)
        .populate('hotel_id', 'hotel_name address city star_rating image_url policies')
        .lean();
    } else {
      room = (memoryStore.rooms || []).find((r) => String(r._id) === id || r.code === id);
    }

    if (!room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng nghỉ' });
    }

    return res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/v1/locations & GET /api/v1/locations/:id
router.get('/locations', async (req, res) => {
  try {
    const { category, city, q } = req.query;
    let items = [];

    if (isMongoConnected()) {
      const filter = {};
      if (category && category !== 'all' && category !== 'Tất cả') {
        filter.location_category = category;
      }
      items = await Location.find(filter).lean();
    } else {
      items = [...(memoryStore.locations || [])];
    }

    if (city && city !== 'all' && city !== 'viet nam' && city !== 'toan quoc') {
      const normCity = stripAccents(city);
      const aliasCity = ['tp hcm', 'tphcm', 'sai gon', 'saigon', 'tp ho chi minh'].includes(normCity)
        ? 'ho chi minh'
        : normCity;
      items = items.filter((loc) => {
        const text = stripAccents(`${loc.city || ''} ${loc.address || ''} ${loc.name || ''}`);
        return text.includes(aliasCity);
      });
    }

    if (q) {
      const normQ = stripAccents(q);
      items = items.filter((loc) => {
        const text = stripAccents(`${loc.name || ''} ${loc.address || ''} ${loc.city || ''} ${loc.location_description || ''} ${loc.tag || ''}`);
        return text.includes(normQ);
      });
    }

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/locations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let loc = null;

    if (isMongoConnected()) {
      const slugCandidate = toSlug(id) || id.toLowerCase();
      const query = isValidObjectId(id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { slug: id }, { slug: slugCandidate }, { code: id }] }
        : { $or: [{ slug: id }, { slug: slugCandidate }, { slug: new RegExp(`^loc_${id}_`, 'i') }, { code: id }] };
      loc = await Location.findOne(query).lean();
      if (!loc) {
        const allLocs = await Location.find({}).lean();
        loc = allLocs.find((l) => toSlug(l.name || l.title) === slugCandidate) || null;
      }
    } else {
      const slugCandidate = toSlug(id) || id.toLowerCase();
      loc = (memoryStore.locations || []).find(
        (l) => String(l._id) === id || l.slug === id || toSlug(l.name || l.title) === slugCandidate
      );
    }

    if (!loc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm Location' });
    }

    return res.json({
      success: true,
      location: loc,
      pointData: buildHotspotFromLocation(loc, loc.drawerKey || 'dining')
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. GET /api/v1/providers
router.get('/providers', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Provider.find({})
        .populate('user_id', 'full_name email phone_number role avatar')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.providers.length,
      items: memoryStore.providers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. GET /api/v1/map/places — Tổng hợp tọa độ GeoJSON từ Locations, Hotels, Activities + số lượng Reels gắn thẻ
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

router.get('/map/places', async (req, res) => {
  try {
    const kindFilter = String(req.query.kind || '').trim().toLowerCase();
    const categoryFilter = String(req.query.category || '').trim();
    const cityFilter = stripAccents(req.query.city || '');
    const qFilter = stripAccents(req.query.q || '');
    const latNum = Number(req.query.lat);
    const lngNum = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm);
    const hasGeoFilter = Number.isFinite(latNum) && Number.isFinite(lngNum) && Number.isFinite(radiusKm) && radiusKm > 0;

    let locs = [];
    let hotels = [];
    let acts = [];
    let tags = [];

    if (isMongoConnected()) {
      [locs, hotels, acts, tags] = await Promise.all([
        Location.find({}).lean(),
        Hotel.find({}).lean(),
        Activity.find({}).lean(),
        LocationTag.find({}).lean()
      ]);
    } else {
      locs = [...(memoryStore.locations || [])];
      hotels = [...(memoryStore.hotels || [])];
      acts = [...(memoryStore.activities || [])];
      tags = [...(memoryStore.locationTags || [])];
    }

    const reelCountById = new Map();
    tags.forEach((t) => {
      const hKey = t.hotel_id ? String(t.hotel_id) : null;
      const lKey = t.location_id ? String(t.location_id) : null;
      if (hKey) reelCountById.set(hKey, (reelCountById.get(hKey) || 0) + 1);
      if (lKey) reelCountById.set(lKey, (reelCountById.get(lKey) || 0) + 1);
    });

    const extractCoords = (doc) => {
      const c = doc.geo?.coordinates;
      const lng = Array.isArray(c) ? Number(c[0]) : Number(doc.coordinates?.longitude ?? doc.lng ?? doc.longitude);
      const lat = Array.isArray(c) ? Number(c[1]) : Number(doc.coordinates?.latitude ?? doc.lat ?? doc.latitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
      return { lat, lng };
    };

    const items = [];
    const locIds = new Set();
    const locNames = new Set();

    locs.forEach((l) => {
      const coords = extractCoords(l);
      if (!coords) return;
      const id = String(l._id || l.id);
      locIds.add(id);
      if (l.name) locNames.add(stripAccents(l.name));
      if (l.landmark_name) locNames.add(stripAccents(l.landmark_name));
      items.push({
        id,
        slug: toSlug(l.name || l.title) || l.slug || id,
        kind: 'location',
        name: l.name || l.title,
        category: l.location_category || l.category || 'Điểm tham quan',
        address: l.address || l.city || '',
        city: l.city || '',
        lat: coords.lat,
        lng: coords.lng,
        geo: { type: 'Point', coordinates: [coords.lng, coords.lat] },
        price: Number(l.entry_fee ?? l.price ?? 0) || 0,
        image: l.image_url || l.imageUrl || l.images?.[0],
        rating: Number(l.rating) || 4.8,
        reelCount: reelCountById.get(String(l._id)) || 0
      });
    });

    hotels.forEach((h) => {
      const coords = extractCoords(h);
      if (!coords) return;
      const id = String(h.id || h._id);
      const hotelSlug = h.hotel_slug || toSlug(h.hotel_name || h.name) || id;
      items.push({
        id,
        slug: hotelSlug,
        hotel_slug: hotelSlug,
        kind: 'hotel',
        name: h.hotel_name || h.name,
        category: 'Khách sạn',
        address: h.address || h.city || '',
        city: h.city || '',
        lat: coords.lat,
        lng: coords.lng,
        geo: { type: 'Point', coordinates: [coords.lng, coords.lat] },
        price: Number(h.price_per_night || h.pricePerNight || 0) || 0,
        image: h.image_url || h.imageUrl || h.images?.[0],
        rating: Number(h.rating) || 4.9,
        reelCount: reelCountById.get(String(h._id)) || 0
      });
    });

    acts.forEach((a) => {
      const id = String(a.id || a._id);
      if (locIds.has(id) || (a.name && locNames.has(stripAccents(a.name)))) return;
      const coords = extractCoords(a);
      if (!coords) return;
      items.push({
        id,
        slug: a.slug || toSlug(a.name || a.title) || id,
        kind: 'activity',
        name: a.name,
        category: 'Hoạt động',
        address: a.address || a.city || '',
        city: a.city || '',
        lat: coords.lat,
        lng: coords.lng,
        geo: { type: 'Point', coordinates: [coords.lng, coords.lat] },
        price: Number(a.priceFrom ?? 0) || 0,
        image: a.imageUrl || a.image_url,
        rating: Number(a.rating) || 4.8,
        reelCount: 0
      });
    });

    let filtered = items;
    if (kindFilter && kindFilter !== 'all') {
      filtered = filtered.filter((p) => p.kind === kindFilter);
    }
    if (categoryFilter && categoryFilter !== 'all' && categoryFilter !== 'Tất cả') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }
    if (cityFilter) {
      filtered = filtered.filter((p) => stripAccents(`${p.city} ${p.address}`).includes(cityFilter));
    }
    if (qFilter) {
      filtered = filtered.filter((p) => stripAccents(`${p.name} ${p.address} ${p.city} ${p.category}`).includes(qFilter));
    }
    if (hasGeoFilter) {
      filtered = filtered
        .map((p) => ({ ...p, distanceKm: Number(haversineKm(latNum, lngNum, p.lat, p.lng).toFixed(2)) }))
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return res.json({ success: true, count: filtered.length, items: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
