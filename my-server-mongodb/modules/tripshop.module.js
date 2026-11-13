/**
 * MODULE 2: TRIPSHOP & HOME (`src/app/pages/trip-shop` & `src/app/pages/home`)
 * Quản lý các Collections: `venues`, `hotels`, `rooms`, `locations`
 */
const express = require('express');
const mongoose = require('mongoose');
const { Venue, Hotel, Room, Location } = require('../models');
const {
  memoryStore,
  isMongoConnected,
  isValidObjectId,
  buildHotspotFromVenue,
  buildHotspotFromHotelAndRoom,
  buildHotspotFromLocation
} = require('./shared');

const router = express.Router();

// 1. GET /api/v1/venues
router.get('/venues', async (req, res) => {
  try {
    const { type, section, category, q } = req.query;
    let venuesList = [];

    if (isMongoConnected()) {
      const filter = {};
      if (type) filter.type = type;
      if (category && category !== 'all') filter.category = category;
      if (section === 'flash-deals') filter.isFlashDeal = true;
      if (section === 'destinations') filter.isPopularDestination = true;
      if (section === 'luxury-stays') filter.isLuxuryStay = true;
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { location: { $regex: q, $options: 'i' } }
        ];
      }
      venuesList = await Venue.find(filter)
        .populate('hotel_id', 'hotel_name address star_rating price_per_night')
        .populate('room_id', 'room_name room_type room_price')
        .populate('location_id', 'name location_category address entry_fee')
        .lean();
    } else {
      venuesList = [...memoryStore.venues];
      if (type) venuesList = venuesList.filter((v) => v.type === type);
      if (category && category !== 'all') {
        venuesList = venuesList.filter((v) => v.category === category);
      }
      if (section === 'flash-deals') venuesList = venuesList.filter((v) => v.isFlashDeal);
      if (section === 'destinations') venuesList = venuesList.filter((v) => v.isPopularDestination);
      if (section === 'luxury-stays') venuesList = venuesList.filter((v) => v.isLuxuryStay);
    }

    const flashDeals = venuesList
      .filter((v) => v.isFlashDeal)
      .map((v, idx) => ({
        id: v._id || `deal-${idx + 1}`,
        hotel_id: v.hotel_id?._id || v.hotel_id || null,
        room_id: v.room_id?._id || v.room_id || null,
        name: v.name,
        location: v.location,
        rating: Number(v.rating) || 9.8,
        ratingText: v.ratingText || 'Xuất sắc',
        reviewCount: Number(v.reviewCount || v.reviews || 320),
        originalPrice: v.originalPrice || 18000000,
        discountPrice: v.discountPrice || 11000000,
        discountPercent: v.discountPercent || 38,
        remainingRooms: 3,
        soldPercent: v.soldPercent || 82,
        imageUrl: v.imageUrl || v.image,
        tag: v.tagBadge || v.tag
      }));

    const destinations = venuesList
      .filter((v) => v.isPopularDestination)
      .map((v, idx) => ({
        id: v._id || `dest-${idx + 1}`,
        name: v.name,
        subtitle: v.subtitle || 'Điểm đến nghỉ dưỡng 5 sao',
        startingPrice: v.startingPrice || 3200000,
        badge: v.badge || 'Trending',
        imageUrl: v.imageUrl || v.image,
        isLargeHero: idx === 0
      }));

    const luxuryStays = venuesList
      .filter((v) => v.isLuxuryStay)
      .map((v, idx) => ({
        id: v._id || `stay-${idx + 1}`,
        hotel_id: v.hotel_id?._id || v.hotel_id || null,
        room_id: v.room_id?._id || v.room_id || null,
        name: v.name,
        category: v.category === 'villa' ? 'villa' : 'resort',
        location: v.location,
        rating: Number(v.rating) || 9.8,
        ratingText: v.ratingText || 'Tuyệt đỉnh',
        reviewCount: Number(v.reviewCount || v.reviews || 380),
        description: v.description || v.desc,
        videoCount: v.videoCount || 20,
        perks: v.perks || ['Bữa sáng miễn phí', 'Quản gia 24/7'],
        specialOffer: v.specialOffer || 'Ưu đãi độc quyền TRIPLA VIP',
        roomType: v.roomType || 'Luxury Ocean Pool Villa',
        originalPrice: v.originalPrice || 22000000,
        discountPrice: v.discountPrice || 15000000,
        isBestSeller: Boolean(v.isBestSeller),
        imageUrl: v.imageUrl || v.image
      }));

    return res.json({
      success: true,
      count: venuesList.length,
      items: venuesList,
      tripShopCatalog: {
        flashDeals,
        destinations,
        luxuryStays
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/v1/venues/:id (Hỗ trợ cả `hotel_id`, `location_id` ObjectId lẫn `venue._id`)
router.get('/venues/:id', async (req, res) => {
  try {
    const idOrKey = req.params.id;

    if (isMongoConnected()) {
      if (isValidObjectId(idOrKey)) {
        const oidVal = new mongoose.Types.ObjectId(idOrKey);
        const hotel = await Hotel.findById(oidVal).lean();
        if (hotel) {
          const room = await Room.findOne({ hotel_id: hotel._id }).lean();
          return res.json({
            success: true,
            hotel,
            room,
            pointData: buildHotspotFromHotelAndRoom(hotel, room)
          });
        }
        const loc = await Location.findById(oidVal).lean();
        if (loc) {
          return res.json({
            success: true,
            location: loc,
            pointData: buildHotspotFromLocation(loc, loc.drawerKey || 'dining')
          });
        }
      }

      const venue = await Venue.findOne({
        $or: [{ _id: idOrKey }, { slug: idOrKey }, { key: idOrKey }]
      })
        .populate('hotel_id')
        .populate('room_id')
        .populate('location_id')
        .lean();

      if (venue) {
        return res.json({
          success: true,
          venue,
          pointData: buildHotspotFromVenue(venue, venue.key)
        });
      }

      const hotelBySlug = await Hotel.findOne({ $or: [{ hotel_slug: idOrKey }, { id: idOrKey }] }).lean();
      if (hotelBySlug) {
        const room = await Room.findOne({ hotel_id: hotelBySlug._id }).lean();
        return res.json({
          success: true,
          hotel: hotelBySlug,
          room,
          pointData: buildHotspotFromHotelAndRoom(hotelBySlug, room)
        });
      }

      const locBySlug = await Location.findOne({ $or: [{ slug: idOrKey }, { code: idOrKey }] }).lean();
      if (locBySlug) {
        return res.json({
          success: true,
          location: locBySlug,
          pointData: buildHotspotFromLocation(locBySlug, locBySlug.drawerKey || 'dining')
        });
      }
    }

    const memHotel = memoryStore.hotels.find(
      (h) => String(h._id) === idOrKey || h.id === idOrKey
    );
    if (memHotel) {
      const memRoom = memoryStore.rooms.find(
        (r) => String(r.hotel_id) === String(memHotel._id)
      );
      return res.json({
        success: true,
        hotel: memHotel,
        room: memRoom,
        pointData: buildHotspotFromHotelAndRoom(memHotel, memRoom)
      });
    }

    const memLoc = memoryStore.locations.find(
      (l) => String(l._id) === idOrKey || l.slug === idOrKey
    );
    if (memLoc) {
      return res.json({
        success: true,
        location: memLoc,
        pointData: buildHotspotFromLocation(memLoc, memLoc.drawerKey || 'dining')
      });
    }

    const venue = memoryStore.venues.find(
      (v) => v._id === idOrKey || v.slug === idOrKey || v.key === idOrKey
    );
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Venue / Hotel / Location' });
    }

    return res.json({
      success: true,
      venue,
      pointData: buildHotspotFromVenue(venue, venue.key)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/v1/home/highlights
router.get('/home/highlights', async (req, res) => {
  try {
    let hotels = [];
    if (isMongoConnected()) {
      hotels = await Hotel.find({}).limit(6).lean();
    } else {
      hotels = [...(memoryStore.hotels || [])].slice(0, 6);
    }

    const statPills = [
      { id: 'villa', icon: 'villa', value: '500+', label: 'Điểm Đến Thượng Lưu', isActive: true },
      { id: 'ai', icon: 'neurology', value: 'AI Concierge', label: 'Lộ Trình Cá Nhân Hoá' },
      { id: 'star', icon: 'star', value: '5.0 Sao', label: 'Tiêu Chuẩn Độc Quyền' }
    ];

    const trips = hotels.slice(0, 6).map((h, idx) => {
      const nightlyPrice = Number(h.price_per_night || h.pricePerNight || 1500000);
      const image = h.image_url || h.imageUrl || h.images?.[0] || '/images/trangan.jpg';
      const tagText = idx === 0 ? 'Bán chạy' : idx === 1 ? 'Độc quyền' : 'Ưu đãi mùa lễ';
      const reviewCount = Number(h.reviewCount || h.reviews || 120 + idx * 35);
      const city = h.city || (h.address?.includes(',') ? h.address.split(',').pop().trim() : 'Việt Nam');
      const accommodation = String(h.accommodation || h.accommodationType || 'Khách sạn').replace(/\s*\(.*?\)/, '').trim();

      return {
        id: h.id || String(h._id || idx + 1),
        hotelId: h.id || String(h._id),
        hotel_slug: h.hotel_slug || h.slug || '',
        title: `${city} • ${h.hotel_name || h.name}`,
        subtitle: `${accommodation} • ${city}`,
        location: city,
        price: nightlyPrice,
        rating: Number(h.rating || h.star_rating || 4.8),
        reviewCount: `(${reviewCount})`,
        image,
        imageUrl: image,
        tagText,
        badge: tagText
      };
    });

    return res.json({
      success: true,
      statPills,
      trips
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
