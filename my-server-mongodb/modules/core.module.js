/**
 * MODULE 7: CORE TRANSACTIONAL & ERD ENTITIES
 * (`src/app/trip-planning`, `src/app/checkout`, `src/app/pages/auth-modal`, `src/app/pages/tripshort`)
 * Quản lý các Collections chuẩn ERD:
 *  - `bookings` (FK: `user_id`, `room_id`, `hotel_id`, `location_id`)
 *  - `payments` (FK: `booking_id` UNIQUE)
 *  - `trip_plans` (FK: `user_id`)
 *  - `wishlists` (FK: `plan_id`, `location_id` UNIQUE)
 *  - `plan_details` (FK: `plan_id`, `location_id`, `hotel_id`)
 *  - `trips` (FK: `plan_id`, `user_id`)
 *  - `reports` (FK: `content_id`, `reporter_id`, `handled_by`)
 *  - `notifications` (FK: `user_id`)
 *  - `users` & `saved_trips`
 */
const express = require('express');
const mongoose = require('mongoose');
const {
  SavedTrip,
  Booking,
  Payment,
  User,
  Room,
  Hotel,
  Location,
  TripPlan,
  Wishlist,
  PlanDetail,
  Trip,
  Report,
  Notification,
  Content,
  BusTrip,
  Comment,
  ReelInteraction
} = require('../models');
const { memoryStore, isMongoConnected, isValidObjectId, enrichContentDoc } = require('./shared');
const { resolveAuthUser } = require('../utils/auth-middleware');

const router = express.Router();

// Helper phân giải user_id ObjectId từ request hoặc fallback sang u1 (Nguyễn Hoàng Vy)
async function resolveUserObjectId(rawUserId) {
  if (rawUserId && isValidObjectId(rawUserId)) {
    return new mongoose.Types.ObjectId(rawUserId);
  }
  if (isMongoConnected()) {
    const found = await User.findOne(
      rawUserId ? { $or: [{ code: rawUserId }, { email: rawUserId }] } : { code: 'u1' }
    ).lean() || await User.findOne({ role: 'tourist' }).lean();
    if (found) return found._id;
  }
  return memoryStore.users[2]?._id || new mongoose.Types.ObjectId('673000000000000000000111');
}

// ============================================================================
// 1. GET & POST /api/v1/bookings (Kèm tự động tính `total_price`, sinh `booking_code` & tạo `Payment`)
// ============================================================================
router.get('/bookings', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Booking.find({})
        .sort({ created_at: -1 })
        .populate('user_id', 'full_name email phone_number avatar role')
        .populate('room_id', 'room_name room_type room_price capacity size_m2')
        .populate('hotel_id', 'hotel_name hotel_slug address city star_rating image_url')
        .populate('location_id', 'name location_category address entry_fee')
        .lean();

      return res.json({
        success: true,
        count: items.length,
        items
      });
    }

    return res.json({
      success: true,
      count: memoryStore.bookings.length,
      items: memoryStore.bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const body = req.body || {};
    const userOid = await resolveUserObjectId(body.user_id || body.userId);
    const bType = String(body.bookingType || 'hotel').toLowerCase();
    const isHotelBooking = bType === 'hotel' || bType === 'resort';

    // Phân giải room_id, hotel_id, location_id
    let roomDoc = null;
    let hotelDoc = null;
    let locDoc = null;

    if (isMongoConnected()) {
      if (body.room_id) {
        roomDoc = isValidObjectId(body.room_id)
          ? await Room.findById(body.room_id).lean()
          : await Room.findOne({ code: body.room_id }).lean();
      }
      if (body.hotel_id) {
        hotelDoc = isValidObjectId(body.hotel_id)
          ? await Hotel.findById(body.hotel_id).lean()
          : await Hotel.findOne({ $or: [{ id: body.hotel_id }, { code: body.hotel_id }] }).lean();
      } else if (body.venueId && isValidObjectId(body.venueId)) {
        hotelDoc = await Hotel.findById(body.venueId).lean();
        if (!hotelDoc) {
          locDoc = await Location.findById(body.venueId).lean();
        }
      }
      if (!roomDoc && hotelDoc) {
        roomDoc = await Room.findOne({ hotel_id: hotelDoc._id }).lean();
      }
      if (!hotelDoc && roomDoc) {
        hotelDoc = await Hotel.findById(roomDoc.hotel_id).lean();
      }
      if (body.location_id) {
        const rawLocId = String(body.location_id);
        const legacyNum = rawLocId.replace(/^act_legacy_/i, '');
        locDoc = isValidObjectId(rawLocId)
          ? await Location.findById(rawLocId).lean()
          : await Location.findOne({
              $or: [{ slug: rawLocId }, { code: rawLocId }, { slug: new RegExp(`^loc_${legacyNum}_`, 'i') }]
            }).lean();
      }
      if (isHotelBooking && !roomDoc && !locDoc) {
        roomDoc = await Room.findOne({}).lean();
        if (roomDoc && !hotelDoc) {
          hotelDoc = await Hotel.findById(roomDoc.hotel_id).lean();
        }
      }
    } else {
      roomDoc =
        memoryStore.rooms.find((r) => String(r._id) === String(body.room_id)) ||
        (isHotelBooking ? memoryStore.rooms[0] : null);
      hotelDoc =
        memoryStore.hotels.find(
          (h) => String(h._id) === String(body.hotel_id || roomDoc?.hotel_id)
        ) || (isHotelBooking ? memoryStore.hotels[0] : null);
      if (body.location_id) {
        locDoc = memoryStore.locations.find((l) => String(l._id) === String(body.location_id));
      }
    }

    // Tính số đêm lưu trú & tổng tiền `total_price` tự động từ `room_price`
    const checkInDate = body.check_in || body.checkIn ? new Date(body.check_in || body.checkIn) : new Date();
    const checkOutDate =
      body.check_out || body.checkOut
        ? new Date(body.check_out || body.checkOut)
        : new Date(checkInDate.getTime() + 3 * 86400000);

    const nights = Math.max(
      1,
      Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86400000)
    );

    const unitPrice =
      Number(roomDoc?.room_price) ||
      Number(locDoc?.entry_fee) ||
      Number(hotelDoc?.price_per_night) ||
      Number(body.total_price || body.totalPriceVnd) ||
      15000000;

    const calculatedTotalPrice =
      Number(body.total_price || body.totalPriceVnd) > 0
        ? Number(body.total_price || body.totalPriceVnd)
        : roomDoc
          ? unitPrice * nights
          : unitPrice;

    const bookingCode =
      body.booking_code ||
      body.bookingCode ||
      `TRP-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingQty = Math.max(1, Number(body.details?.rooms || body.details?.quantity || 1));
    const bookingDiscount = Math.max(0, Number(body.discount || 0));
    const bookingItems =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : roomDoc
          ? [
              {
                room_id: roomDoc._id,
                room_name: roomDoc.room_name,
                hotel_id: hotelDoc ? hotelDoc._id : roomDoc.hotel_id,
                quantity: bookingQty,
                unit_price: unitPrice,
                nights,
                discount: bookingDiscount,
                subtotal: calculatedTotalPrice
              }
            ]
          : [];

    const bookingPayload = {
      user_id: userOid,
      room_id: roomDoc ? roomDoc._id : null,
      hotel_id: hotelDoc ? hotelDoc._id : null,
      location_id: locDoc ? locDoc._id : null,
      check_in: checkInDate,
      check_out: checkOutDate,
      discount: bookingDiscount,
      items: bookingItems,
      total_price: calculatedTotalPrice,
      booking_status: 'confirmed',
      booking_code: bookingCode,
      created_at: new Date(),
      // Trường tương thích giao diện
      bookingCode,
      bookingType: body.bookingType || 'hotel',
      title:
        body.title ||
        (hotelDoc && roomDoc
          ? `${hotelDoc.hotel_name} • ${roomDoc.room_name}`
          : locDoc
            ? locDoc.name
            : 'Đặt chỗ TRIPLA VIP'),
      location: body.location || hotelDoc?.address || locDoc?.address || 'Vịnh Vĩnh Hy, Ninh Thuận',
      customerName: body.customerName || 'Victoria Chen',
      customerPhone: body.customerPhone || '0909123456',
      customerEmail: body.customerEmail || 'victoria.chen@tripla.vn',
      guests: Number(body.guests) || 2,
      totalPriceVnd: calculatedTotalPrice,
      status: 'CONFIRMED',
      details: {
        ...(body.details || {}),
        nights,
        room_id: roomDoc ? String(roomDoc._id) : null,
        room_name: roomDoc?.room_name || null,
        hotel_id: hotelDoc ? String(hotelDoc._id) : null,
        hotel_name: hotelDoc?.hotel_name || null,
        location_id: locDoc ? String(locDoc._id) : null
      }
    };

    if (isMongoConnected()) {
      const createdBooking = await Booking.create(bookingPayload);
      if (roomDoc && bookingItems.length > 0) {
        const qtyUsed = Number(bookingItems[0]?.quantity || bookingQty || 1);
        await Room.updateOne(
          { _id: roomDoc._id },
          { $set: { stock: Math.max(0, Number(roomDoc.stock ?? roomDoc.total_units ?? 5) - qtyUsed) } }
        );
      }

      // Tạo bản ghi `Payment` 1:1 liên kết `booking_id`
      const createdPayment = await Payment.create({
        booking_id: createdBooking._id,
        payment_method:
          body.payment_method === 'credit_card' || body.payment_method === 'bank_transfer'
            ? body.payment_method
            : 'e_wallet',
        transaction_id: `TXN-${bookingCode}-${Date.now().toString().slice(-4)}`,
        amount: calculatedTotalPrice,
        payment_status: 'completed',
        paid_at: new Date()
      });

      // Tạo bản ghi `Notification` gửi tới `user_id`
      await Notification.create({
        user_id: userOid,
        title: `Xác nhận đặt chỗ thành công #${bookingCode}`,
        content: `Đơn đặt chỗ "${bookingPayload.title}" (${nights} đêm) với tổng giá trị ${calculatedTotalPrice.toLocaleString('vi-VN')}₫ đã được xác nhận.`,
        type: 'booking',
        is_read: false,
        created_at: new Date()
      });

      const populatedBooking = await Booking.findById(createdBooking._id)
        .populate('user_id', 'full_name email phone_number avatar')
        .populate('room_id', 'room_name room_type room_price capacity')
        .populate('hotel_id', 'hotel_name address star_rating')
        .populate('location_id', 'name location_category address entry_fee')
        .lean();

      return res.status(201).json({
        success: true,
        booking: populatedBooking,
        payment: createdPayment
      });
    }

    const memDoc = { _id: new mongoose.Types.ObjectId(), ...bookingPayload };
    memoryStore.bookings.unshift(memDoc);
    return res.status(201).json({ success: true, booking: memDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 2. GET /api/v1/payments (JOIN `booking_id`)
// ============================================================================
router.get('/payments', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Payment.find({})
        .sort({ paid_at: -1 })
        .populate({
          path: 'booking_id',
          populate: [
            { path: 'user_id', select: 'full_name email' },
            { path: 'room_id', select: 'room_name room_price' },
            { path: 'hotel_id', select: 'hotel_name address' }
          ]
        })
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.payments.length,
      items: memoryStore.payments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 3. TRIP_PLANS, PLAN_DETAILS, WISHLISTS, TRIPS, REPORTS, NOTIFICATIONS
// ============================================================================
router.get('/trip-plans', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await TripPlan.find({})
        .sort({ created_at: -1 })
        .populate('user_id', 'full_name email avatar role')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.tripPlans.length,
      items: memoryStore.tripPlans
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/trip-plans', async (req, res) => {
  try {
    const body = req.body || {};
    const userOid = await resolveUserObjectId(body.user_id || body.userId);
    const payload = {
      user_id: userOid,
      plan_name: body.plan_name || body.name || 'Kế hoạch hành trình TRIPLA',
      start_date: body.start_date ? new Date(body.start_date) : new Date(),
      end_date: body.end_date ? new Date(body.end_date) : new Date(Date.now() + 3 * 86400000),
      estimated_budget: Number(body.estimated_budget) || 35000000,
      note: body.note || '',
      places: body.places || [],
      itinerary: body.itinerary || null,
      created_at: new Date()
    };

    if (isMongoConnected()) {
      const created = await TripPlan.create(payload);
      return res.status(201).json({ success: true, tripPlan: created });
    }
    memoryStore.tripPlans.unshift(payload);
    return res.status(201).json({ success: true, tripPlan: payload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/plan-details', async (req, res) => {
  try {
    const { plan_id } = req.query;
    if (isMongoConnected()) {
      const filter =
        plan_id && isValidObjectId(plan_id)
          ? { plan_id: new mongoose.Types.ObjectId(plan_id) }
          : {};
      const items = await PlanDetail.find(filter)
        .sort({ visit_date: 1, sequence_order: 1 })
        .populate('plan_id', 'plan_name start_date end_date estimated_budget')
        .populate('location_id', 'name location_category address entry_fee')
        .populate('hotel_id', 'hotel_name address star_rating')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.planDetails.length,
      items: memoryStore.planDetails
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/wishlists', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Wishlist.find({})
        .populate('plan_id', 'plan_name start_date end_date')
        .populate('location_id', 'name location_category address entry_fee image_url')
        .populate('hotel_id', 'hotel_name address star_rating image_url')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.wishlists.length,
      items: memoryStore.wishlists
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/trips', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Trip.find({})
        .populate('plan_id', 'plan_name start_date end_date estimated_budget')
        .populate('user_id', 'full_name email avatar')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.trips.length,
      items: memoryStore.trips
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Report.find({})
        .populate('content_id', 'content_title video_url')
        .populate('reporter_id', 'full_name email')
        .populate('handled_by', 'full_name email role')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.reports.length,
      items: memoryStore.reports
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await Notification.find({})
        .sort({ created_at: -1 })
        .populate('user_id', 'full_name email avatar')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.notifications.length,
      items: memoryStore.notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 4. SAVED TRIPS (Đồng bộ cả `saved_trips` và `trip_plans` + `trips`)
// ============================================================================
router.get('/saved-trips', async (req, res) => {
  try {
    const items = isMongoConnected()
      ? await SavedTrip.find({}).sort({ createdAt: -1 }).lean()
      : [...(memoryStore.savedTrips || [])];

    return res.json({
      success: true,
      count: items.length,
      items: items.map((t) => ({ ...t, id: t.id || t._id }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/saved-trips', async (req, res) => {
  try {
    const body = req.body || {};
    const tripId = body.id || body._id || `trip-${Date.now()}`;
    const payload = {
      ...body,
      _id: tripId,
      id: tripId
    };

    if (isMongoConnected()) {
      const userOid = await resolveUserObjectId(body.userId);
      const plan = await TripPlan.create({
        code: tripId,
        user_id: userOid,
        plan_name: body.name || 'Hành trình mới TRIPLA',
        start_date: new Date(),
        end_date: new Date(Date.now() + 3 * 86400000),
        estimated_budget: 25000000,
        places: body.places || [],
        itinerary: body.itinerary || null
      });
      payload.plan_id = plan._id;

      const saved = await SavedTrip.findOneAndUpdate(
        { _id: tripId },
        { $set: payload },
        { upsert: true, new: true }
      ).lean();
      return res.status(201).json({ success: true, trip: saved, tripPlan: plan });
    }

    const idx = memoryStore.savedTrips.findIndex((t) => t._id === tripId || t.id === tripId);
    if (idx >= 0) {
      memoryStore.savedTrips[idx] = payload;
    } else {
      memoryStore.savedTrips.unshift(payload);
    }
    return res.status(201).json({ success: true, trip: payload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/saved-trips/:id', async (req, res) => {
  try {
    const tripId = req.params.id;
    const updates = req.body || {};

    if (isMongoConnected()) {
      const updated = await SavedTrip.findOneAndUpdate(
        { $or: [{ _id: tripId }, { id: tripId }] },
        { $set: { ...updates, _id: tripId, id: tripId } },
        { upsert: true, new: true }
      ).lean();

      let planId = updated?.plan_id;
      if (!planId) {
        const userOid = await resolveUserObjectId(updated?.userId || updates.userId);
        const createdPlan = await TripPlan.create({
          code: tripId,
          user_id: userOid,
          plan_name: updated?.name || 'Hành trình TRIPLA',
          start_date: new Date(),
          end_date: new Date(Date.now() + 3 * 86400000),
          estimated_budget: 25000000,
          places: updated?.places || [],
          itinerary: updated?.itinerary || null
        });
        planId = createdPlan._id;
        await SavedTrip.updateOne({ _id: tripId }, { $set: { plan_id: planId } });
      } else {
        await TripPlan.findByIdAndUpdate(planId, {
          $set: {
            plan_name: updated.name,
            note: updated.itinerary?.note || '',
            places: updated.places,
            itinerary: updated.itinerary
          }
        });
      }

      if (planId && Array.isArray(updates.itinerary?.entries)) {
        await PlanDetail.deleteMany({ plan_id: planId });
        const startBase = updates.itinerary.startDate
          ? new Date(`${updates.itinerary.startDate}T00:00:00Z`)
          : new Date();
        const detailDocs = [];
        for (let idx = 0; idx < updates.itinerary.entries.length; idx++) {
          const entry = updates.itinerary.entries[idx];
          const visitDate = new Date(startBase.getTime() + (Math.max(1, Number(entry.day) || 1) - 1) * 86400000);
          const mins = Number(entry.startMinute) || 540;
          const hh = String(Math.floor(mins / 60)).padStart(2, '0');
          const mm = String(mins % 60).padStart(2, '0');
          let hotelOid = null;
          let locOid = null;
          const pk = String(entry.placeKey || '');
          if (pk.startsWith('hotel:')) {
            const rawHid = pk.slice(6);
            const hDoc = isValidObjectId(rawHid)
              ? await Hotel.findById(rawHid).select('_id').lean()
              : await Hotel.findOne({ $or: [{ id: rawHid }, { code: rawHid }] }).select('_id').lean();
            hotelOid = hDoc?._id || null;
          } else if (pk.startsWith('activity:') || pk.startsWith('location:')) {
            const rawLid = pk.slice(9);
            const legacyNum = rawLid.replace(/^act_legacy_/i, '');
            const lDoc = isValidObjectId(rawLid)
              ? await Location.findById(rawLid).select('_id').lean()
              : await Location.findOne({
                  $or: [{ slug: rawLid }, { code: rawLid }, { slug: new RegExp(`^loc_${legacyNum}_`, 'i') }]
                }).select('_id').lean();
            locOid = lDoc?._id || null;
          }
          detailDocs.push({
            plan_id: planId,
            hotel_id: hotelOid,
            location_id: locOid,
            visit_date: visitDate,
            start_time: `${hh}:${mm}:00`,
            sequence_order: idx + 1,
            note: entry.note || entry.title || pk
          });
        }
        if (detailDocs.length > 0) {
          await PlanDetail.insertMany(detailDocs);
        }
      }
      return res.json({ success: true, trip: updated });
    }

    const idx = memoryStore.savedTrips.findIndex((t) => t._id === tripId || t.id === tripId);
    if (idx >= 0) {
      memoryStore.savedTrips[idx] = { ...memoryStore.savedTrips[idx], ...updates };
      return res.json({ success: true, trip: memoryStore.savedTrips[idx] });
    }
    return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/saved-trips/:id', async (req, res) => {
  try {
    const tripId = req.params.id;
    if (isMongoConnected()) {
      const deleted = await SavedTrip.findOneAndDelete({ $or: [{ _id: tripId }, { id: tripId }] }).lean();
      if (deleted?.plan_id) {
        await PlanDetail.deleteMany({ plan_id: deleted.plan_id });
        await TripPlan.findByIdAndDelete(deleted.plan_id);
      }
      return res.json({ success: true, deletedId: tripId });
    }
    const idx = memoryStore.savedTrips.findIndex((t) => t._id === tripId || t.id === tripId);
    if (idx >= 0) {
      memoryStore.savedTrips.splice(idx, 1);
    }
    return res.json({ success: true, deletedId: tripId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 5. AUTHENTICATION & USERS (`users` collection chuẩn ERD)
// ============================================================================
router.get('/users', async (req, res) => {
  try {
    const items = isMongoConnected()
      ? await User.find({}, '-password').lean()
      : memoryStore.users;
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });
    }

    let user = null;
    if (isMongoConnected()) {
      user = await User.findOne({ email }).lean();
      if (!user) {
        user = await User.create({
          full_name: email.split('@')[0],
          fullName: email.split('@')[0],
          email,
          password: password || 'tripla123',
          role: 'tourist',
          membershipTier: 'GOLD VIP',
          points: 2500
        });
      }
    } else {
      user = (memoryStore.users || []).find((u) => u.email.toLowerCase() === email);
      if (!user) {
        user = {
          _id: new mongoose.Types.ObjectId(),
          full_name: email.split('@')[0],
          fullName: email.split('@')[0],
          email,
          role: 'tourist',
          membershipTier: 'GOLD VIP',
          points: 2500
        };
        memoryStore.users.push(user);
      }
    }

    return res.json({
      success: true,
      user: {
        _id: String(user._id),
        id: String(user._id),
        full_name: user.full_name || user.fullName,
        fullName: user.fullName || user.full_name,
        email: user.email,
        role: user.role || 'tourist',
        avatar: user.avatar,
        membershipTier: user.membershipTier || 'PLATINUM VIP',
        points: user.points || 18500
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const fullName = (req.body.fullName || req.body.full_name || 'Thành viên TRIPLA').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || 'tripla123').trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });
    }

    const userDoc = {
      full_name: fullName,
      fullName,
      email,
      password,
      phone_number: req.body.phone_number || req.body.phone || '0909888777',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'tourist',
      membershipTier: 'GOLD VIP',
      points: 5000,
      created_at: new Date()
    };

    if (isMongoConnected()) {
      const existing = await User.findOne({ email }).lean();
      if (existing) {
        return res.json({
          success: true,
          user: {
            _id: String(existing._id),
            id: String(existing._id),
            full_name: existing.full_name || existing.fullName,
            fullName: existing.fullName || existing.full_name,
            email: existing.email,
            role: existing.role,
            avatar: existing.avatar,
            membershipTier: existing.membershipTier
          }
        });
      }
      const created = await User.create(userDoc);
      return res.status(201).json({
        success: true,
        user: {
          _id: String(created._id),
          id: String(created._id),
          full_name: created.full_name,
          fullName: created.fullName,
          email: created.email,
          role: created.role,
          avatar: created.avatar,
          membershipTier: created.membershipTier
        }
      });
    }

    const memUser = { _id: new mongoose.Types.ObjectId(), ...userDoc };
    memoryStore.users.push(memUser);
    return res.status(201).json({
      success: true,
      user: {
        _id: String(memUser._id),
        id: String(memUser._id),
        full_name: memUser.full_name,
        fullName: memUser.fullName,
        email: memUser.email,
        role: memUser.role,
        avatar: memUser.avatar,
        membershipTier: memUser.membershipTier
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 6. PROFILE API (`GET /api/v1/users/:id/profile`) - Cho trang /profile & /profile/:id
// ============================================================================
router.get('/users/:id/profile', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    let rawId = decodeURIComponent(String(req.params.id || '')).trim();
    if (!rawId || rawId === 'me') {
      if (!authUser) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để xem hồ sơ.' });
      }
      rawId = String(authUser.id || authUser._id || authUser.code || authUser.email || '').trim();
    }

    if (isMongoConnected()) {
      const escapedRaw = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rawRegex = new RegExp(`^${escapedRaw}$`, 'i');
      const handleNoAt = rawId.replace(/^@/, '');
      const handleCandidates = [rawId, handleNoAt, `@${handleNoAt}`];
      const userQuery = isValidObjectId(rawId)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(rawId) }, { code: rawId }, { email: rawRegex }, { handle: { $in: handleCandidates } }] }
        : { $or: [{ code: rawId }, { email: rawRegex }, { handle: { $in: handleCandidates } }] };

      const user = await User.findOne(userQuery, '-password').lean();
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      const tripPlans = await TripPlan.find({ user_id: user._id }).sort({ created_at: -1 }).lean();
      const planIds = tripPlans.map((p) => p._id);
      const userKeys = [String(user._id), ...(user.code ? [user.code] : [])];

      const [
        bookings,
        wishlists,
        rawContents,
        rawComments,
        trips,
        bookmarkedRows,
        linkedSavedTrips
      ] = await Promise.all([
        Booking.find({ user_id: user._id })
          .sort({ created_at: -1 })
          .populate('room_id', 'room_name room_type room_price capacity')
          .populate('hotel_id', 'hotel_name hotel_slug address city star_rating image_url')
          .populate('location_id', 'name location_category address entry_fee image_url')
          .lean(),
        Wishlist.find(planIds.length ? { plan_id: { $in: planIds } } : { _id: { $in: [] } })
          .populate('plan_id', 'plan_name start_date end_date user_id')
          .populate('location_id', 'name location_category address entry_fee image_url rating')
          .populate('hotel_id', 'hotel_name address star_rating price_per_night image_url rating')
          .lean(),
        Content.find({ user_id: user._id })
          .sort({ created_at: -1 })
          .populate('user_id', 'full_name avatar role handle')
          .populate('hotspots.resort.hotel_id', 'hotel_name address star_rating price_per_night image_url')
          .populate('hotspots.dining.location_id', 'name address entry_fee image_url')
          .lean(),
        Comment.find({
          $or: [
            { user_id: user._id },
            ...(user.full_name ? [{ author: user.full_name }, { user: user.full_name }] : [])
          ]
        })
          .populate('content_id', 'code content_title location_name image_url video_url')
          .sort({ createdAt: -1 })
          .lean(),
        Trip.find({ user_id: user._id })
          .populate('plan_id', 'plan_name start_date end_date estimated_budget')
          .sort({ confirmed_at: -1 })
          .lean(),
        ReelInteraction.find({ userId: { $in: userKeys }, isBookmarked: true }).lean(),
        SavedTrip.find({
          $or: [
            ...(planIds.length ? [{ plan_id: { $in: planIds } }] : []),
            { userId: { $in: userKeys } }
          ]
        }).lean()
      ]);

      const bookmarkedIds = bookmarkedRows.map((r) => String(r.reelId || '')).filter(Boolean);
      const bookmarkedOids = bookmarkedIds
        .filter((id) => isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      let bookmarkedReels = [];
      if (bookmarkedIds.length > 0) {
        const rawBookmarked = await Content.find({
          $or: [
            ...(bookmarkedOids.length ? [{ _id: { $in: bookmarkedOids } }] : []),
            { code: { $in: bookmarkedIds } }
          ]
        })
          .populate('user_id', 'full_name avatar role handle')
          .populate('hotspots.resort.hotel_id', 'hotel_name address star_rating price_per_night image_url')
          .populate('hotspots.dining.location_id', 'name address entry_fee image_url')
          .lean();
        bookmarkedReels = rawBookmarked.map((c) => ({ ...enrichContentDoc(c), isBookmarked: true }));
      }

      const savedTripByPlanId = new Map(
        linkedSavedTrips
          .filter((st) => st.plan_id)
          .map((st) => [String(st.plan_id), st.id || st._id])
      );
      const enrichedTripPlans = tripPlans.map((tp) => ({
        ...tp,
        saved_trip_id: savedTripByPlanId.get(String(tp._id)) || null
      }));

      const comments = rawComments.map((cmt) => ({
        _id: String(cmt._id),
        text: cmt.text || cmt.content || '',
        contentTitle: cmt.content_id?.content_title || '',
        contentCode: cmt.content_id?.code || cmt.reelShortId || cmt.reelId || '',
        contentId: cmt.content_id?._id ? String(cmt.content_id._id) : cmt.reelId || '',
        locationName: cmt.content_id?.location_name || '',
        imageUrl: cmt.content_id?.image_url || '',
        createdAt: cmt.createdAt
      }));

      return res.json({
        success: true,
        user,
        bookings,
        tripPlans: enrichedTripPlans,
        trips,
        wishlists,
        bookmarkedReels,
        savedTrips: linkedSavedTrips,
        comments,
        contents: rawContents.map((c) => enrichContentDoc(c))
      });
    }

    const memUser = memoryStore.users.find(
      (u) =>
        String(u._id) === rawId ||
        u.code === rawId ||
        String(u.email || '').toLowerCase() === rawId.toLowerCase()
    );
    if (!memUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    const uidStr = String(memUser._id);
    const memPlans = (memoryStore.tripPlans || []).filter((p) => String(p.user_id) === uidStr);
    const memPlanIds = new Set(memPlans.map((p) => String(p._id)));
    return res.json({
      success: true,
      user: memUser,
      bookings: (memoryStore.bookings || []).filter((b) => String(b.user_id) === uidStr),
      tripPlans: memPlans,
      trips: (memoryStore.trips || []).filter((t) => String(t.user_id) === uidStr),
      wishlists: (memoryStore.wishlists || []).filter((w) => memPlanIds.has(String(w.plan_id))),
      bookmarkedReels: [],
      savedTrips: [],
      comments: (memoryStore.comments || []).filter(
        (c) => String(c.user_id) === uidStr || c.author === memUser.full_name || c.user === memUser.full_name
      ),
      contents: (memoryStore.contents || [])
        .filter((c) => String(c.user_id?._id || c.user_id) === uidStr)
        .map((c) => enrichContentDoc(c))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 7. BOOKING STATUS & DELETE (`PATCH /api/v1/bookings/:id/status` & `DELETE /api/v1/bookings/:id`)
// ============================================================================
router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const rawStatus = (req.body.booking_status || req.body.status || 'confirmed').toLowerCase();
    const normalized = rawStatus === 'completed' ? 'checked_out' : rawStatus;
    const mappedStatus = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'].includes(normalized)
      ? normalized
      : 'confirmed';

    if (isMongoConnected()) {
      const query = isValidObjectId(id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { booking_code: id }, { bookingCode: id }] }
        : { $or: [{ booking_code: id }, { bookingCode: id }] };

      const updated = await Booking.findOneAndUpdate(
        query,
        {
          $set: {
            booking_status: mappedStatus,
            status: mappedStatus.toUpperCase()
          }
        },
        { new: true }
      )
        .populate('user_id', 'full_name email phone_number avatar')
        .populate('room_id', 'room_name room_type room_price')
        .populate('hotel_id', 'hotel_name address star_rating')
        .populate('location_id', 'name location_category address')
        .lean();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt chỗ' });
      }
      if (mappedStatus === 'cancelled') {
        await Payment.updateMany(
          { booking_id: updated._id },
          { $set: { payment_status: 'refunded' } }
        );
        const uid = updated.user_id?._id || updated.user_id;
        if (uid) {
          const codeLabel = updated.booking_code || updated.bookingCode || String(updated._id);
          await Notification.create({
            user_id: uid,
            title: `Đã hủy đơn đặt chỗ #${codeLabel}`,
            content: `Đơn "${updated.title || 'Đặt chỗ TRIPLA'}" đã chuyển sang trạng thái Đã hủy và hoàn tiền theo chính sách.`,
            type: 'booking',
            is_read: false,
            created_at: new Date()
          });
        }
      }
      return res.json({ success: true, booking: updated });
    }

    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/bookings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (isMongoConnected()) {
      const query = isValidObjectId(id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { booking_code: id }, { bookingCode: id }] }
        : { $or: [{ booking_code: id }, { bookingCode: id }] };
      await Booking.findOneAndDelete(query);
      return res.json({ success: true, deletedId: id });
    }
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 8. ADMIN DASHBOARD & CRUD (`GET /api/v1/admin/dashboard`, `PUT/DELETE /api/v1/admin/items/:category/:id`)
// ============================================================================
router.get('/admin/dashboard', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const [users, bookings, locations, hotels, busTrips, rawContents, reports] = await Promise.all([
        User.find({}, '-password').lean(),
        Booking.find({})
          .sort({ created_at: -1 })
          .populate('user_id', 'full_name email phone_number avatar')
          .populate('room_id', 'room_name room_type room_price')
          .populate('hotel_id', 'hotel_name address city star_rating')
          .populate('location_id', 'name location_category address entry_fee')
          .lean(),
        Location.find({}).sort({ _id: 1 }).lean(),
        Hotel.find({}).sort({ _id: 1 }).lean(),
        BusTrip.find({}).sort({ _id: 1 }).lean(),
        Content.find({})
          .sort({ created_at: -1 })
          .populate('user_id', 'full_name avatar role handle')
          .lean(),
        Report.find({})
          .populate('content_id', 'content_title video_url')
          .populate('reporter_id', 'full_name email')
          .populate('handled_by', 'full_name email')
          .lean()
      ]);

      const totalRevenue = bookings
        .filter((b) => b.booking_status !== 'cancelled')
        .reduce((sum, b) => sum + (Number(b.total_price || b.totalPriceVnd) || 0), 0);

      return res.json({
        success: true,
        stats: {
          usersCount: users.length,
          totalRevenue,
          contentsCount: rawContents.length,
          bookingsCount: bookings.length
        },
        users,
        bookings,
        locations,
        hotels,
        busTrips,
        contents: rawContents.map((c) => enrichContentDoc(c)),
        reports
      });
    }

    return res.json({
      success: true,
      stats: {
        usersCount: memoryStore.users.length,
        totalRevenue: 65700000,
        contentsCount: memoryStore.contents.length,
        bookingsCount: memoryStore.bookings.length
      },
      users: memoryStore.users,
      bookings: memoryStore.bookings,
      locations: memoryStore.locations,
      hotels: memoryStore.hotels,
      busTrips: memoryStore.busTrips,
      contents: memoryStore.contents.map((c) => enrichContentDoc(c)),
      reports: memoryStore.reports
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/items/:category/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const body = req.body || {};

    if (isMongoConnected()) {
      if (category === 'locations') {
        const query = isValidObjectId(id) ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { code: id }] } : { code: id };
        const updated = await Location.findOneAndUpdate(
          query,
          {
            $set: {
              ...(body.name ? { name: body.name, title: body.name } : {}),
              ...(body.price !== undefined ? { entry_fee: Number(body.price), price: Number(body.price) } : {}),
              ...(body.address ? { address: body.address, location: body.address } : {})
            }
          },
          { new: true }
        ).lean();
        return res.json({ success: true, item: updated });
      }
      if (category === 'hotels') {
        const query = isValidObjectId(id) ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { code: id }] } : { code: id };
        const updated = await Hotel.findOneAndUpdate(
          query,
          {
            $set: {
              ...(body.name ? { hotel_name: body.name, name: body.name, title: body.name } : {}),
              ...(body.price !== undefined ? { price_per_night: Number(body.price) } : {}),
              ...(body.address ? { address: body.address } : {})
            }
          },
          { new: true }
        ).lean();
        return res.json({ success: true, item: updated });
      }
      if (category === 'buses') {
        const updated = await BusTrip.findOneAndUpdate(
          { $or: [{ _id: id }, { id }] },
          {
            $set: {
              ...(body.name ? { operatorName: body.name } : {}),
              ...(body.price !== undefined ? { priceVnd: Number(body.price) } : {})
            }
          },
          { new: true }
        ).lean();
        return res.json({ success: true, item: updated });
      }
    }
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/items/:category/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    if (isMongoConnected()) {
      if (category === 'locations') {
        const query = isValidObjectId(id) ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { code: id }] } : { code: id };
        await Location.findOneAndDelete(query);
      } else if (category === 'hotels') {
        const query = isValidObjectId(id) ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { code: id }] } : { code: id };
        await Hotel.findOneAndDelete(query);
      } else if (category === 'buses') {
        await BusTrip.findOneAndDelete({ $or: [{ _id: id }, { id }] });
      }
    }
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
