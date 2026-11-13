const express = require('express');
const mongoose = require('mongoose');
const {
  User,
  Provider,
  Hotel,
  Room,
  Location,
  BusTrip,
  Booking,
  Payment,
  Notification,
  LocationTag,
  PlanDetail,
  Wishlist,
  Content,
  Reel,
  Report
} = require('../models');
const { memoryStore, isMongoConnected, isValidObjectId } = require('./shared');
const { toSlug } = require('../utils/helpers');
const { requireAuth, requireAdmin } = require('../utils/auth-middleware');

const router = express.Router();

const LOCATION_CATEGORIES = [
  { value: 'attraction', label: 'Tham quan & Di tích (attraction)' },
  { value: 'restaurant', label: 'Nhà hàng & Ẩm thực (restaurant)' },
  { value: 'cafe', label: 'Quán cà phê & Lounge (cafe)' },
  { value: 'shopping', label: 'Mua sắm & Đặc sản (shopping)' },
  { value: 'nature', label: 'Thiên nhiên & Sinh thái (nature)' },
  { value: 'other', label: 'Trải nghiệm khác (other)' }
];
const VALID_LOCATION_CATEGORY_VALUES = new Set(LOCATION_CATEGORIES.map((c) => c.value));

// Q20: Category options for Location dropdown
router.get('/location-categories', (_req, res) => {
  res.json({ success: true, categories: LOCATION_CATEGORIES });
});

// Q18: User reports content
router.post('/reports', requireAuth, async (req, res) => {
  try {
    const contentIdRaw = String(req.body?.content_id || req.body?.contentId || '').trim();
    const reasonRaw = String(req.body?.reason || 'other').trim().toLowerCase();
    const validReasons = ['spam', 'inappropriate', 'false_info', 'copyright', 'other'];
    const reason = validReasons.includes(reasonRaw) ? reasonRaw : 'other';
    const details = String(req.body?.details || '').trim();

    if (!contentIdRaw) {
      return res.status(400).json({ success: false, message: 'Thiếu content_id để báo cáo.' });
    }

    const reporterId = req.authUser._id || req.authUser.id;

    if (isMongoConnected()) {
      const contentQuery = isValidObjectId(contentIdRaw)
        ? { $or: [{ _id: contentIdRaw }, { code: contentIdRaw }] }
        : { code: contentIdRaw };
      const contentDoc = await Content.findOne(contentQuery).lean();
      if (!contentDoc) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết cần báo cáo.' });
      }
      const created = await Report.create({
        content_id: contentDoc._id,
        reporter_id: isValidObjectId(String(reporterId)) ? reporterId : contentDoc.user_id,
        reason,
        details: details || `Báo cáo vi phạm: ${reason}`,
        status: 'pending',
        created_at: new Date()
      });
      return res.status(201).json({ success: true, report: created.toObject() });
    }

    const contentMem = (memoryStore.contents || []).find(
      (c) => String(c._id) === contentIdRaw || c.code === contentIdRaw
    );
    if (!contentMem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết cần báo cáo.' });
    }
    const memReport = {
      _id: new mongoose.Types.ObjectId(),
      content_id: contentMem._id,
      reporter_id: reporterId,
      reason,
      details: details || `Báo cáo vi phạm: ${reason}`,
      status: 'pending',
      created_at: new Date()
    };
    memoryStore.reports.unshift(memReport);
    return res.status(201).json({ success: true, report: memReport });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Protect all /admin/* endpoints with Admin authentication middleware (Q7, Q8, Q9)
router.use('/admin', requireAdmin);

async function uniqueHotelSlug(baseName, excludeHotelId = null) {
  const base = toSlug(baseName) || `hotel-${Date.now()}`;
  let existing = [];
  if (isMongoConnected()) {
    const query = excludeHotelId && isValidObjectId(excludeHotelId)
      ? { _id: { $ne: new mongoose.Types.ObjectId(excludeHotelId) } }
      : {};
    existing = await Hotel.find(query, 'hotel_slug').lean();
  } else {
    existing = (memoryStore.hotels || []).filter((h) => String(h._id) !== String(excludeHotelId));
  }
  const taken = new Set(existing.map((h) => String(h.hotel_slug || '').toLowerCase()).filter(Boolean));
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

async function resolveProviderDoc(providerId) {
  if (!providerId) return null;
  if (isMongoConnected()) {
    const query = isValidObjectId(providerId)
      ? { _id: new mongoose.Types.ObjectId(providerId) }
      : { business_license: providerId };
    return Provider.findOne(query).lean();
  }
  return (memoryStore.providers || []).find((p) => String(p._id) === String(providerId)) || null;
}

// Q7: List Providers (supports ?status=approved for Add/Edit Hotel dropdown)
router.get('/admin/providers', async (req, res) => {
  try {
    const statusFilter = String(req.query.status || '').trim().toLowerCase();
    let list = [];

    if (isMongoConnected()) {
      const filter = statusFilter ? { verification_status: statusFilter } : {};
      list = await Provider.find(filter).sort({ business_name: 1 }).lean();
    } else {
      list = (memoryStore.providers || []).filter((p) =>
        statusFilter ? String(p.verification_status || '').toLowerCase() === statusFilter : true
      );
    }

    const providers = list.map((p) => ({
      _id: String(p._id),
      provider_id: String(p._id),
      business_name: p.business_name,
      business_license: p.business_license,
      verification_status: p.verification_status
    }));

    return res.json({ success: true, providers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q7: Admin Dashboard Overview (with Admin guard)
router.get('/admin/dashboard', async (_req, res) => {
  try {
    if (isMongoConnected()) {
      const [users, providers, bookings, completedPayments, locations, hotels, rooms, busTrips, contents, reports] =
        await Promise.all([
          User.find({}, '-password').lean(),
          Provider.find({}).lean(),
          Booking.find({})
            .populate('user_id', 'full_name fullName email phone_number role')
            .populate('hotel_id', 'hotel_name address city hotel_slug')
            .populate('location_id', 'name city')
            .sort({ created_at: -1 })
            .lean(),
          Payment.find({ payment_status: 'completed' }).lean(),
          Location.find({}).lean(),
          Hotel.find({}).populate('provider_id', 'business_name verification_status').lean(),
          Room.find({}).lean(),
          BusTrip.find({}).lean(),
          Content.find({}).populate('user_id', 'full_name handle avatar').lean(),
          Report.find({})
            .populate('content_id', 'content_title title caption image_url video_url')
            .populate('reporter_id', 'full_name email')
            .populate('handled_by', 'full_name email')
            .sort({ created_at: -1 })
            .lean()
        ]);

      const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const pendingReportsCount = reports.filter((r) => String(r.status || 'pending').toLowerCase() === 'pending').length;

      return res.json({
        success: true,
        stats: {
          usersCount: users.length,
          totalRevenue,
          contentsCount: contents.length,
          bookingsCount: bookings.length,
          pendingReportsCount
        },
        users,
        providers,
        bookings,
        locations,
        hotels,
        rooms,
        busTrips,
        contents,
        reports
      });
    }

    const memBookings = memoryStore.bookings || [];
    const completedMemPays = (memoryStore.payments || []).filter((p) => p.payment_status === 'completed');
    const totalRevenue = completedMemPays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingReportsCount = (memoryStore.reports || []).filter(
      (r) => String(r.status || 'pending').toLowerCase() === 'pending'
    ).length;

    return res.json({
      success: true,
      stats: {
        usersCount: (memoryStore.users || []).length,
        totalRevenue,
        contentsCount: (memoryStore.contents || []).length,
        bookingsCount: memBookings.length,
        pendingReportsCount
      },
      users: memoryStore.users || [],
      providers: memoryStore.providers || [],
      bookings: memBookings,
      locations: memoryStore.locations || [],
      hotels: memoryStore.hotels || [],
      rooms: memoryStore.rooms || [],
      busTrips: memoryStore.busTrips || [],
      contents: memoryStore.contents || [],
      reports: memoryStore.reports || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q7: Add Hotel (validates approved provider + creates initial room)
router.post('/admin/hotels', async (req, res) => {
  try {
    const hotelName = String(req.body?.hotel_name || req.body?.name || '').trim();
    const address = String(req.body?.address || '').trim();
    const city = String(req.body?.city || 'Việt Nam').trim();
    const description = String(req.body?.description || `${hotelName} — Khách sạn đối tác chính thức TRIPLA.`).trim();
    const providerId = String(req.body?.provider_id || '').trim();
    const pricePerNight = Math.max(0, Number(req.body?.price_per_night || req.body?.pricePerNight || 3500000));
    const starRating = Math.min(5, Math.max(1, Number(req.body?.star_rating || req.body?.stars || 5)));
    const imageUrl = String(
      req.body?.image_url ||
        req.body?.imageUrl ||
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
    ).trim();
    const amenities = Array.isArray(req.body?.hotel_amenities)
      ? req.body.hotel_amenities
      : String(req.body?.amenitiesText || 'WiFi miễn phí, Hồ bơi, Spa')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (!hotelName || !address || !providerId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ Tên khách sạn, Địa chỉ và chọn Nhà cung cấp (Provider).'
      });
    }

    const provider = await resolveProviderDoc(providerId);
    if (!provider || String(provider.verification_status || '').toLowerCase() !== 'approved') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_PROVIDER',
        message: 'Nhà cung cấp không hợp lệ hoặc chưa được duyệt (approved).'
      });
    }

    const hotelSlug = await uniqueHotelSlug(hotelName);
    const lat = Number(req.body?.latitude || 16.0544);
    const lng = Number(req.body?.longitude || 108.2208);

    const hotelDoc = {
      id: hotelSlug,
      hotel_slug: hotelSlug,
      provider_id: provider._id,
      hotel_name: hotelName,
      name: hotelName,
      description,
      address,
      city,
      area: city,
      latitude: lat,
      longitude: lng,
      geo: { type: 'Point', coordinates: [lng, lat] },
      star_rating: starRating,
      stars: starRating,
      total_rooms: Number(req.body?.total_rooms || 10),
      hotel_amenities: amenities,
      amenities,
      price_per_night: pricePerNight,
      pricePerNight: pricePerNight,
      image_url: imageUrl,
      imageUrl,
      images: [imageUrl]
    };

    if (isMongoConnected()) {
      const createdHotel = await Hotel.create(hotelDoc);
      const createdRoom = await Room.create({
        code: `${hotelSlug}-deluxe-01`,
        hotel_id: createdHotel._id,
        room_name: req.body?.initial_room_name || 'Deluxe Signature Room',
        room_type: 'suite',
        capacity: 2,
        room_price: pricePerNight,
        total_units: Number(req.body?.initial_stock || 5),
        stock: Number(req.body?.initial_stock || 5),
        room_status: 'available',
        room_images: [imageUrl],
        size_m2: 52,
        bed: '1 giường King'
      });
      createdHotel.rooms = [createdRoom];
      await createdHotel.save();

      const populated = await Hotel.findById(createdHotel._id)
        .populate('provider_id', 'business_name verification_status')
        .lean();
      return res.status(201).json({ success: true, hotel: populated });
    }

    const hotelOid = new mongoose.Types.ObjectId();
    const roomOid = new mongoose.Types.ObjectId();
    const memRoom = {
      _id: roomOid,
      code: `${hotelSlug}-deluxe-01`,
      hotel_id: hotelOid,
      room_name: 'Deluxe Signature Room',
      room_type: 'suite',
      capacity: 2,
      room_price: pricePerNight,
      total_units: 5,
      stock: 5,
      room_status: 'available',
      room_images: [imageUrl]
    };
    const memHotel = {
      _id: hotelOid,
      ...hotelDoc,
      provider_id: {
        _id: provider._id,
        business_name: provider.business_name,
        verification_status: provider.verification_status
      },
      rooms: [memRoom]
    };
    memoryStore.hotels.unshift(memHotel);
    memoryStore.rooms.push(memRoom);
    return res.status(201).json({ success: true, hotel: memHotel });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q7: Edit Hotel
router.put('/admin/hotels/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    const updates = {};

    if (req.body?.hotel_name || req.body?.name) {
      const nextName = String(req.body.hotel_name || req.body.name).trim();
      updates.hotel_name = nextName;
      updates.name = nextName;
      updates.hotel_slug = await uniqueHotelSlug(nextName, rawId);
    }
    if (req.body?.address !== undefined) updates.address = String(req.body.address).trim();
    if (req.body?.city !== undefined) {
      updates.city = String(req.body.city).trim();
      updates.area = updates.city;
    }
    if (req.body?.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body?.price_per_night !== undefined || req.body?.pricePerNight !== undefined) {
      const p = Math.max(0, Number(req.body.price_per_night ?? req.body.pricePerNight));
      updates.price_per_night = p;
      updates.pricePerNight = p;
    }
    if (req.body?.star_rating !== undefined || req.body?.stars !== undefined) {
      const s = Math.min(5, Math.max(1, Number(req.body.star_rating ?? req.body.stars)));
      updates.star_rating = s;
      updates.stars = s;
    }
    if (req.body?.image_url || req.body?.imageUrl) {
      const img = String(req.body.image_url || req.body.imageUrl).trim();
      updates.image_url = img;
      updates.imageUrl = img;
    }
    if (req.body?.provider_id) {
      const provider = await resolveProviderDoc(req.body.provider_id);
      if (!provider || String(provider.verification_status || '').toLowerCase() !== 'approved') {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_PROVIDER',
          message: 'Nhà cung cấp được chọn không ở trạng thái approved.'
        });
      }
      updates.provider_id = provider._id;
    }

    if (isMongoConnected()) {
      const query = isValidObjectId(rawId)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(rawId) }, { id: rawId }, { hotel_slug: rawId }] }
        : { $or: [{ id: rawId }, { hotel_slug: rawId }] };
      const updated = await Hotel.findOneAndUpdate(query, { $set: updates }, { new: true })
        .populate('provider_id', 'business_name verification_status')
        .lean();
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
      }
      return res.json({ success: true, hotel: updated });
    }

    const idx = (memoryStore.hotels || []).findIndex(
      (h) => String(h._id) === rawId || h.id === rawId || h.hotel_slug === rawId
    );
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
    }
    memoryStore.hotels[idx] = { ...memoryStore.hotels[idx], ...updates };
    return res.json({ success: true, hotel: memoryStore.hotels[idx] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q7: Delete Hotel following DATA_CONTRACT §3 (RESTRICT active room bookings, CASCADE rooms, SET NULL tags/plan_details)
router.delete('/admin/hotels/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    const activeStatuses = ['pending', 'confirmed', 'checked_in'];

    if (isMongoConnected()) {
      const query = isValidObjectId(rawId)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(rawId) }, { id: rawId }, { hotel_slug: rawId }] }
        : { $or: [{ id: rawId }, { hotel_slug: rawId }] };
      const hotel = await Hotel.findOne(query).lean();
      if (!hotel) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
      }

      const hotelRooms = await Room.find({ hotel_id: hotel._id }).lean();
      const roomIds = hotelRooms.map((r) => r._id);

      const blockingBooking = await Booking.findOne({
        booking_status: { $in: activeStatuses },
        $or: [
          { hotel_id: hotel._id },
          ...(roomIds.length ? [{ room_id: { $in: roomIds } }, { 'items.room_id': { $in: roomIds } }] : [])
        ]
      }).lean();

      if (blockingBooking) {
        return res.status(409).json({
          success: false,
          errorCode: 'ACTIVE_BOOKING_RESTRICT',
          message: `Không thể xóa "${hotel.hotel_name || hotel.name}" vì đang có đơn đặt phòng hoạt động (#${blockingBooking.booking_code}).`
        });
      }

      // SET NULL on location_tags & plan_details
      await Promise.all([
        LocationTag.updateMany({ hotel_id: hotel._id }, { $set: { hotel_id: null, room_id: null } }),
        PlanDetail.updateMany({ hotel_id: hotel._id }, { $set: { hotel_id: null } })
      ]);

      // CASCADE delete rooms, then hotel
      await Room.deleteMany({ hotel_id: hotel._id });
      await Hotel.deleteOne({ _id: hotel._id });

      return res.json({ success: true, deletedId: String(hotel._id), cascadeRoomsDeleted: roomIds.length });
    }

    const hotel = (memoryStore.hotels || []).find(
      (h) => String(h._id) === rawId || h.id === rawId || h.hotel_slug === rawId
    );
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
    }
    const hotelRooms = (memoryStore.rooms || []).filter((r) => String(r.hotel_id) === String(hotel._id));
    const roomIdSet = new Set(hotelRooms.map((r) => String(r._id)));
    const blocking = (memoryStore.bookings || []).find(
      (b) =>
        activeStatuses.includes(String(b.booking_status || '').toLowerCase()) &&
        (String(b.hotel_id) === String(hotel._id) ||
          roomIdSet.has(String(b.room_id)) ||
          (b.items || []).some((it) => roomIdSet.has(String(it.room_id))))
    );
    if (blocking) {
      return res.status(409).json({
        success: false,
        errorCode: 'ACTIVE_BOOKING_RESTRICT',
        message: `Không thể xóa khách sạn vì có đơn đặt phòng hoạt động (#${blocking.booking_code}).`
      });
    }

    (memoryStore.locationTags || []).forEach((t) => {
      if (String(t.hotel_id) === String(hotel._id)) {
        t.hotel_id = null;
        t.room_id = null;
      }
    });
    (memoryStore.planDetails || []).forEach((d) => {
      if (String(d.hotel_id) === String(hotel._id)) d.hotel_id = null;
    });
    memoryStore.rooms = (memoryStore.rooms || []).filter((r) => String(r.hotel_id) !== String(hotel._id));
    memoryStore.hotels = (memoryStore.hotels || []).filter((h) => String(h._id) !== String(hotel._id));
    return res.json({ success: true, deletedId: String(hotel._id), cascadeRoomsDeleted: hotelRooms.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q8: Update Booking Status (Pending/Confirmed -> Cancelled auto-restores Room stock, refunds completed payment & notifies tourist)
async function handleAdminBookingStatusUpdate(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    const rawStatus = String(req.body?.booking_status || req.body?.status || '').trim().toLowerCase();
    const normalized = rawStatus === 'completed' ? 'checked_out' : rawStatus;
    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
    if (!validStatuses.includes(normalized)) {
      return res.status(400).json({ success: false, message: 'Trạng thái booking_status không hợp lệ.' });
    }

    const releasedRooms = [];
    let paymentRefunded = false;

    if (isMongoConnected()) {
      const query = isValidObjectId(id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { booking_code: id }, { bookingCode: id }] }
        : { $or: [{ booking_code: id }, { bookingCode: id }] };

      const existing = await Booking.findOne(query);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt phòng.' });
      }

      const prevStatus = String(existing.booking_status || '').toLowerCase();
      existing.booking_status = normalized;
      existing.status = normalized.toUpperCase();
      await existing.save();

      if ((prevStatus === 'pending' || prevStatus === 'confirmed') && normalized === 'cancelled') {
        const bookingItems =
          Array.isArray(existing.items) && existing.items.length > 0
            ? existing.items
            : existing.room_id
              ? [{ room_id: existing.room_id, quantity: Number(existing.details?.rooms || 1) }]
              : [];

        for (const item of bookingItems) {
          if (!item.room_id) continue;
          const qty = Math.max(1, Number(item.quantity || 1));
          const roomDoc = await Room.findById(item.room_id);
          if (roomDoc) {
            const beforeStock = Number(roomDoc.stock ?? 0);
            roomDoc.stock = beforeStock + qty;
            await roomDoc.save();
            releasedRooms.push({
              room_id: String(roomDoc._id),
              room_name: roomDoc.room_name,
              releasedQuantity: qty,
              newStock: roomDoc.stock
            });
          }
        }

        const payDoc = await Payment.findOne({ booking_id: existing._id });
        if (payDoc && String(payDoc.payment_status || '').toLowerCase() === 'completed') {
          payDoc.payment_status = 'refunded';
          await payDoc.save();
          paymentRefunded = true;
        }

        const uid = existing.user_id;
        if (uid) {
          const codeLabel = existing.booking_code || existing.bookingCode || String(existing._id);
          await Notification.create({
            user_id: uid,
            title: `Đã hủy đơn đặt phòng #${codeLabel}`,
            content: `Đơn "${existing.title || 'Đặt phòng TRIPLA'}" đã được hủy${paymentRefunded ? ' và hoàn tiền về phương thức thanh toán' : ''}.`,
            type: 'booking',
            is_read: false,
            created_at: new Date()
          });
        }
      }

      const populated = await Booking.findById(existing._id)
        .populate('user_id', 'full_name fullName email phone_number avatar')
        .populate('room_id', 'room_name room_type room_price stock')
        .populate('hotel_id', 'hotel_name address star_rating')
        .lean();

      return res.json({
        success: true,
        booking: populated,
        releasedRooms,
        paymentRefunded
      });
    }

    // memoryStore fallback
    const memBooking = (memoryStore.bookings || []).find(
      (b) => String(b._id) === id || b.booking_code === id || b.bookingCode === id
    );
    if (!memBooking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt phòng.' });
    }
    const prevStatus = String(memBooking.booking_status || '').toLowerCase();
    memBooking.booking_status = normalized;
    memBooking.status = normalized.toUpperCase();

    if ((prevStatus === 'pending' || prevStatus === 'confirmed') && normalized === 'cancelled') {
      const bookingItems =
        Array.isArray(memBooking.items) && memBooking.items.length > 0
          ? memBooking.items
          : memBooking.room_id
            ? [{ room_id: memBooking.room_id, quantity: Number(memBooking.details?.rooms || 1) }]
            : [];

      bookingItems.forEach((item) => {
        const rm = (memoryStore.rooms || []).find((r) => String(r._id) === String(item.room_id));
        if (rm) {
          const qty = Math.max(1, Number(item.quantity || 1));
          rm.stock = Number(rm.stock ?? 0) + qty;
          releasedRooms.push({
            room_id: String(rm._id),
            room_name: rm.room_name,
            releasedQuantity: qty,
            newStock: rm.stock
          });
        }
      });

      const memPay = (memoryStore.payments || []).find(
        (p) => String(p.booking_id) === String(memBooking._id)
      );
      if (memPay && String(memPay.payment_status || '').toLowerCase() === 'completed') {
        memPay.payment_status = 'refunded';
        paymentRefunded = true;
      }

      memoryStore.notifications.unshift({
        _id: new mongoose.Types.ObjectId(),
        user_id: memBooking.user_id,
        title: `Đã hủy đơn đặt phòng #${memBooking.booking_code || memBooking.bookingCode}`,
        content: `Đơn "${memBooking.title || 'Đặt phòng TRIPLA'}" đã được hủy.`,
        type: 'booking',
        is_read: false,
        created_at: new Date()
      });
    }

    return res.json({
      success: true,
      booking: memBooking,
      releasedRooms,
      paymentRefunded
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

router.put('/admin/bookings/:id/status', handleAdminBookingStatusUpdate);
router.patch('/admin/bookings/:id/status', handleAdminBookingStatusUpdate);

// Q9: Customer Recognition Report - Top 5 tourists by checked_out spending
router.get('/admin/top-customers', async (_req, res) => {
  try {
    let completedBookings = [];
    let usersList = [];

    if (isMongoConnected()) {
      [completedBookings, usersList] = await Promise.all([
        Booking.find({ booking_status: 'checked_out' }).lean(),
        User.find({ role: 'tourist' }, '-password').lean()
      ]);
    } else {
      completedBookings = (memoryStore.bookings || []).filter(
        (b) => String(b.booking_status || '').toLowerCase() === 'checked_out'
      );
      usersList = (memoryStore.users || []).filter(
        (u) => String(u.role || '').toLowerCase() === 'tourist'
      );
    }

    const userMap = new Map(usersList.map((u) => [String(u._id), u]));
    const totalsByUser = new Map();

    completedBookings.forEach((b) => {
      const uid = String(b.user_id?._id || b.user_id || '');
      const tourist = userMap.get(uid);
      if (!tourist) return;

      const spent = Number(b.total_price || b.totalPriceVnd || 0);
      const current = totalsByUser.get(uid) || {
        user_id: uid,
        full_name: tourist.full_name || tourist.fullName || 'Du khách TRIPLA',
        email: tourist.email,
        phone_number: tourist.phone_number || '',
        avatar: tourist.avatar || '',
        membershipTier: tourist.membershipTier || tourist.level || 'VIP',
        total_spending: 0,
        completed_bookings: 0
      };
      current.total_spending += spent;
      current.completed_bookings += 1;
      totalsByUser.set(uid, current);
    });

    const items = Array.from(totalsByUser.values())
      .sort((a, b) => b.total_spending - a.total_spending)
      .slice(0, 5)
      .map((entry, idx) => ({
        rank: idx + 1,
        ...entry
      }));

    return res.json({
      success: true,
      totalCheckedOutBookings: completedBookings.length,
      items
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// Q18: ADMIN REPORT MODERATION & CONTENT DELETION
// =============================================================================
router.get('/admin/reports', async (req, res) => {
  try {
    const statusFilter = String(req.query?.status || '').trim().toLowerCase();
    if (isMongoConnected()) {
      const filter = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
      const items = await Report.find(filter)
        .populate('content_id', 'code content_title caption image_url video_url location_name user_id')
        .populate('reporter_id', 'full_name fullName email avatar')
        .populate('handled_by', 'full_name fullName email')
        .sort({ created_at: -1 })
        .lean();
      return res.json({ success: true, count: items.length, items });
    }

    let list = (memoryStore.reports || []).slice();
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((r) => String(r.status || '').toLowerCase() === statusFilter);
    }
    const items = list.map((r) => ({
      ...r,
      content_id:
        (memoryStore.contents || []).find((c) => String(c._id) === String(r.content_id)) || r.content_id,
      reporter_id:
        (memoryStore.users || []).find((u) => String(u._id) === String(r.reporter_id)) || r.reporter_id,
      handled_by: r.handled_by
        ? (memoryStore.users || []).find((u) => String(u._id) === String(r.handled_by)) || r.handled_by
        : null
    }));
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/reports/:reportId', async (req, res) => {
  try {
    const reportId = String(req.params.reportId || '').trim();
    const nextStatus = String(req.body?.status || '').trim().toLowerCase();
    if (!['pending', 'resolved', 'dismissed'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái báo cáo phải là resolved, dismissed hoặc pending.'
      });
    }
    const handlerId = req.authUser._id || req.authUser.id;

    if (isMongoConnected()) {
      if (!isValidObjectId(reportId)) {
        return res.status(400).json({ success: false, message: 'reportId không hợp lệ.' });
      }
      const updated = await Report.findByIdAndUpdate(
        reportId,
        {
          $set: {
            status: nextStatus,
            handled_by: isValidObjectId(String(handlerId)) ? handlerId : null
          }
        },
        { new: true }
      )
        .populate('content_id', 'code content_title caption image_url video_url location_name')
        .populate('reporter_id', 'full_name fullName email')
        .populate('handled_by', 'full_name fullName email')
        .lean();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
      }
      return res.json({ success: true, report: updated });
    }

    const memRep = (memoryStore.reports || []).find((r) => String(r._id) === reportId);
    if (!memRep) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
    }
    memRep.status = nextStatus;
    memRep.handled_by = handlerId;
    return res.json({ success: true, report: memRep });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/contents/:contentId', async (req, res) => {
  try {
    const contentId = String(req.params.contentId || '').trim();
    const handlerId = req.authUser._id || req.authUser.id;

    if (isMongoConnected()) {
      const q = isValidObjectId(contentId)
        ? { $or: [{ _id: contentId }, { code: contentId }] }
        : { code: contentId };
      const contentDoc = await Content.findOneAndDelete(q).lean();
      if (!contentDoc) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
      }
      const tagRes = await LocationTag.deleteMany({ content_id: contentDoc._id });
      await Reel.deleteMany({ $or: [{ content_id: contentDoc._id }, { _id: contentDoc.code }] });
      await Report.updateMany(
        { content_id: contentDoc._id, status: 'pending' },
        {
          $set: {
            status: 'resolved',
            handled_by: isValidObjectId(String(handlerId)) ? handlerId : null
          }
        }
      );
      return res.json({
        success: true,
        deletedId: String(contentDoc._id),
        deletedLocationTags: tagRes.deletedCount || 0
      });
    }

    const idx = (memoryStore.contents || []).findIndex(
      (c) => String(c._id) === contentId || c.code === contentId
    );
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    }
    const targetOid = String(memoryStore.contents[idx]._id);
    memoryStore.contents.splice(idx, 1);
    const beforeTags = (memoryStore.locationTags || []).length;
    memoryStore.locationTags = (memoryStore.locationTags || []).filter(
      (t) => String(t.content_id) !== targetOid
    );
    (memoryStore.reports || []).forEach((r) => {
      if (String(r.content_id) === targetOid && r.status === 'pending') {
        r.status = 'resolved';
        r.handled_by = handlerId;
      }
    });
    return res.json({
      success: true,
      deletedId: targetOid,
      deletedLocationTags: beforeTags - memoryStore.locationTags.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// Q19: ADMIN BOOKINGS SEARCH/FILTER/PAGINATION & REAL KPI STATS
// =============================================================================
router.get('/admin/bookings', async (req, res) => {
  try {
    const keyword = String(req.query?.keyword || '').trim().toLowerCase();
    const statusFilter = String(req.query?.status || '').trim().toLowerCase();
    const page = Math.max(parseInt(req.query?.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 10, 1), 100);

    let allBookings = [];
    let allPayments = [];

    if (isMongoConnected()) {
      const dbFilter = {};
      if (statusFilter && statusFilter !== 'all') {
        dbFilter.booking_status = statusFilter;
      }
      [allBookings, allPayments] = await Promise.all([
        Booking.find(dbFilter)
          .populate('user_id', 'full_name fullName email phone_number')
          .populate('hotel_id', 'hotel_name name hotel_slug address city')
          .populate('room_id', 'room_name room_price')
          .sort({ created_at: -1 })
          .lean(),
        Payment.find({}).lean()
      ]);
    } else {
      allBookings = (memoryStore.bookings || [])
        .filter((b) =>
          statusFilter && statusFilter !== 'all'
            ? String(b.booking_status || '').toLowerCase() === statusFilter
            : true
        )
        .map((b) => ({
          ...b,
          user_id: (memoryStore.users || []).find((u) => String(u._id) === String(b.user_id)) || b.user_id,
          hotel_id: (memoryStore.hotels || []).find((h) => String(h._id) === String(b.hotel_id)) || b.hotel_id
        }));
      allPayments = memoryStore.payments || [];
    }

    const payByBooking = new Map(allPayments.map((p) => [String(p.booking_id), p]));

    let filtered = allBookings.map((b) => ({
      ...b,
      _id: String(b._id),
      booking_code: b.booking_code || b.bookingCode,
      booking_status: b.booking_status || String(b.status || 'confirmed').toLowerCase(),
      payment: payByBooking.get(String(b._id)) || null
    }));

    if (keyword) {
      filtered = filtered.filter((b) => {
        const hay = [
          b.booking_code,
          b.customerName,
          b.customerEmail,
          b.customerPhone,
          b.title,
          b.user_id?.full_name,
          b.user_id?.email,
          b.hotel_id?.hotel_name
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(keyword);
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const items = filtered.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      items
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/stats', async (_req, res) => {
  try {
    let payments = [];
    let bookings = [];
    let usersCount = 0;
    let touristsCount = 0;
    let hotelsCount = 0;
    let locationsCount = 0;
    let contentsCount = 0;
    let pendingReportsCount = 0;

    if (isMongoConnected()) {
      const [
        completedPays,
        allBookings,
        uTotal,
        tTotal,
        hTotal,
        lTotal,
        cTotal,
        pReports
      ] = await Promise.all([
        Payment.find({ payment_status: 'completed' }).lean(),
        Booking.find({}, 'booking_status total_price').lean(),
        User.countDocuments(),
        User.countDocuments({ role: 'tourist' }),
        Hotel.countDocuments(),
        Location.countDocuments(),
        Content.countDocuments(),
        Report.countDocuments({ status: 'pending' })
      ]);
      payments = completedPays;
      bookings = allBookings;
      usersCount = uTotal;
      touristsCount = tTotal;
      hotelsCount = hTotal;
      locationsCount = lTotal;
      contentsCount = cTotal;
      pendingReportsCount = pReports;
    } else {
      payments = (memoryStore.payments || []).filter((p) => p.payment_status === 'completed');
      bookings = memoryStore.bookings || [];
      usersCount = (memoryStore.users || []).length;
      touristsCount = (memoryStore.users || []).filter((u) => u.role === 'tourist').length;
      hotelsCount = (memoryStore.hotels || []).length;
      locationsCount = (memoryStore.locations || []).length;
      contentsCount = (memoryStore.contents || []).length;
      pendingReportsCount = (memoryStore.reports || []).filter((r) => r.status === 'pending').length;
    }

    const revenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      checked_in: 0,
      checked_out: 0,
      cancelled: 0,
      no_show: 0
    };
    bookings.forEach((b) => {
      const st = String(b.booking_status || 'confirmed').toLowerCase();
      if (statusCounts[st] !== undefined) statusCounts[st] += 1;
    });

    return res.json({
      success: true,
      stats: {
        revenue,
        completedPaymentsCount: payments.length,
        bookingsCount: bookings.length,
        statusCounts,
        usersCount,
        touristsCount,
        hotelsCount,
        locationsCount,
        contentsCount,
        pendingReportsCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// Q20: ADMIN LOCATION CRUD + CASCADE RULES
// =============================================================================
function validateAndNormalizeLocation(body, isUpdate = false) {
  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  const address = body?.address !== undefined ? String(body.address).trim() : undefined;
  const city = body?.city !== undefined ? String(body.city).trim() : undefined;
  const categoryRaw =
    body?.location_category !== undefined ? String(body.location_category).trim().toLowerCase() : undefined;
  const latProvided = body?.latitude !== undefined && body?.latitude !== '';
  const lngProvided = body?.longitude !== undefined && body?.longitude !== '';

  if (!isUpdate && (!name || !address)) {
    return { error: 'Vui lòng nhập đầy đủ Tên địa điểm và Địa chỉ.' };
  }
  if (categoryRaw !== undefined && !VALID_LOCATION_CATEGORY_VALUES.has(categoryRaw)) {
    return {
      error: `location_category không hợp lệ. Giá trị cho phép: ${Array.from(VALID_LOCATION_CATEGORY_VALUES).join(', ')}`
    };
  }

  let lat = latProvided ? Number(body.latitude) : isUpdate ? undefined : 16.0544;
  let lng = lngProvided ? Number(body.longitude) : isUpdate ? undefined : 108.2208;
  if (lat !== undefined && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    return { error: 'Vĩ độ (latitude) phải là số hợp lệ trong khoảng -90 đến 90.' };
  }
  if (lng !== undefined && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
    return { error: 'Kinh độ (longitude) phải là số hợp lệ trong khoảng -180 đến 180.' };
  }

  return {
    name,
    address,
    city,
    location_category: categoryRaw,
    latitude: lat,
    longitude: lng,
    entry_fee: body?.entry_fee !== undefined ? Math.max(0, Number(body.entry_fee || 0)) : undefined,
    location_description:
      body?.location_description !== undefined ? String(body.location_description).trim() : undefined,
    image_url: body?.image_url !== undefined ? String(body.image_url).trim() : undefined
  };
}

router.get('/admin/locations', async (req, res) => {
  try {
    const keyword = String(req.query?.keyword || '').trim().toLowerCase();
    const category = String(req.query?.category || '').trim().toLowerCase();

    let list = [];
    if (isMongoConnected()) {
      const filter = {};
      if (category && category !== 'all') filter.location_category = category;
      if (keyword) {
        filter.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { address: { $regex: keyword, $options: 'i' } },
          { city: { $regex: keyword, $options: 'i' } }
        ];
      }
      list = await Location.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
    } else {
      list = (memoryStore.locations || []).filter((l) => {
        if (category && category !== 'all' && String(l.location_category) !== category) return false;
        if (keyword) {
          const hay = `${l.name || ''} ${l.address || ''} ${l.city || ''}`.toLowerCase();
          if (!hay.includes(keyword)) return false;
        }
        return true;
      });
    }

    return res.json({ success: true, count: list.length, items: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/locations', async (req, res) => {
  try {
    const parsed = validateAndNormalizeLocation(req.body || {}, false);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const lat = parsed.latitude ?? 16.0544;
    const lng = parsed.longitude ?? 108.2208;
    const payload = {
      slug: `${toSlug(parsed.name)}-${Date.now().toString().slice(-4)}`,
      name: parsed.name,
      location_category: parsed.location_category || 'attraction',
      address: parsed.address,
      city: parsed.city || parsed.address.split(',').slice(-1)[0]?.trim() || 'Việt Nam',
      latitude: lat,
      longitude: lng,
      geo: { type: 'Point', coordinates: [lng, lat] },
      entry_fee: parsed.entry_fee ?? 0,
      location_description: parsed.location_description || '',
      image_url:
        parsed.image_url ||
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80'
    };

    if (isMongoConnected()) {
      const created = await Location.create(payload);
      return res.status(201).json({ success: true, location: created.toObject() });
    }

    const memLoc = { _id: new mongoose.Types.ObjectId(), ...payload };
    memoryStore.locations.unshift(memLoc);
    return res.status(201).json({ success: true, location: memLoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/locations/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const parsed = validateAndNormalizeLocation(req.body || {}, true);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    if (isMongoConnected()) {
      const query = isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
      const existing = await Location.findOne(query);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm.' });
      }
      if (parsed.name) existing.name = parsed.name;
      if (parsed.address) existing.address = parsed.address;
      if (parsed.city !== undefined) existing.city = parsed.city;
      if (parsed.location_category) existing.location_category = parsed.location_category;
      if (parsed.entry_fee !== undefined) existing.entry_fee = parsed.entry_fee;
      if (parsed.location_description !== undefined) {
        existing.location_description = parsed.location_description;
      }
      if (parsed.image_url) existing.image_url = parsed.image_url;

      const nextLat = parsed.latitude !== undefined ? parsed.latitude : existing.latitude;
      const nextLng = parsed.longitude !== undefined ? parsed.longitude : existing.longitude;
      existing.latitude = nextLat;
      existing.longitude = nextLng;
      existing.geo = { type: 'Point', coordinates: [nextLng, nextLat] };
      await existing.save();

      return res.json({ success: true, location: existing.toObject() });
    }

    const memLoc = (memoryStore.locations || []).find((l) => String(l._id) === id || l.slug === id);
    if (!memLoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm.' });
    }
    if (parsed.name) memLoc.name = parsed.name;
    if (parsed.address) memLoc.address = parsed.address;
    if (parsed.city !== undefined) memLoc.city = parsed.city;
    if (parsed.location_category) memLoc.location_category = parsed.location_category;
    if (parsed.entry_fee !== undefined) memLoc.entry_fee = parsed.entry_fee;
    if (parsed.location_description !== undefined) memLoc.location_description = parsed.location_description;
    if (parsed.image_url) memLoc.image_url = parsed.image_url;
    if (parsed.latitude !== undefined) memLoc.latitude = parsed.latitude;
    if (parsed.longitude !== undefined) memLoc.longitude = parsed.longitude;
    memLoc.geo = { type: 'Point', coordinates: [memLoc.longitude, memLoc.latitude] };

    return res.json({ success: true, location: memLoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/locations/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (isMongoConnected()) {
      const query = isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
      const loc = await Location.findOne(query).lean();
      if (!loc) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm.' });
      }
      const [wishRes, tagRes, detailRes] = await Promise.all([
        Wishlist.deleteMany({ location_id: loc._id }),
        LocationTag.updateMany({ location_id: loc._id }, { $set: { location_id: null } }),
        PlanDetail.updateMany({ location_id: loc._id }, { $set: { location_id: null } })
      ]);
      await Location.deleteOne({ _id: loc._id });
      return res.json({
        success: true,
        deletedId: String(loc._id),
        deletedWishlists: wishRes.deletedCount || 0,
        clearedLocationTags: tagRes.modifiedCount || 0,
        clearedPlanDetails: detailRes.modifiedCount || 0
      });
    }

    const idx = (memoryStore.locations || []).findIndex((l) => String(l._id) === id || l.slug === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm.' });
    }
    const targetId = String(memoryStore.locations[idx]._id);
    const beforeW = (memoryStore.wishlists || []).length;
    memoryStore.wishlists = (memoryStore.wishlists || []).filter(
      (w) => String(w.location_id) !== targetId
    );
    let clearedLocationTags = 0;
    (memoryStore.locationTags || []).forEach((t) => {
      if (String(t.location_id) === targetId) {
        t.location_id = null;
        clearedLocationTags += 1;
      }
    });
    let clearedPlanDetails = 0;
    (memoryStore.planDetails || []).forEach((d) => {
      if (String(d.location_id) === targetId) {
        d.location_id = null;
        clearedPlanDetails += 1;
      }
    });
    memoryStore.locations.splice(idx, 1);
    return res.json({
      success: true,
      deletedId: targetId,
      deletedWishlists: beforeW - memoryStore.wishlists.length,
      clearedLocationTags,
      clearedPlanDetails
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

