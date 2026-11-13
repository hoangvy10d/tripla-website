const express = require('express');
const mongoose = require('mongoose');
const { Hotel, Room, Booking, Payment, Notification, CartItem, User } = require('../models');
const { memoryStore, isMongoConnected, isValidObjectId } = require('./shared');
const { datesOverlap, calcNights, toSlug } = require('../utils/helpers');
const { resolveAuthUser, requireAuth } = require('../utils/auth-middleware');

const router = express.Router();

function generateUniqueBookingCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const suffix = Date.now().toString(36).slice(-2).toUpperCase();
  return `TRP-${rand}${suffix}`;
}

function resolveCartSessionKey(req, authUser) {
  if (authUser && authUser._id) {
    return `user:${String(authUser._id)}`;
  }
  const headerKey = String(req.headers?.['x-cart-session'] || '').trim();
  const queryKey = String(req.query?.sessionKey || req.query?.session_key || '').trim();
  const bodyKey = String(req.body?.sessionKey || req.body?.session_key || '').trim();
  return headerKey || queryKey || bodyKey || 'guest-cart';
}

async function findRoomAndHotel(roomId) {
  let room = null;
  let hotel = null;

  if (isMongoConnected()) {
    const query = isValidObjectId(roomId)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(roomId) }, { code: roomId }] }
      : { code: roomId };
    room = await Room.findOne(query).lean();
    if (room && room.hotel_id) {
      hotel = await Hotel.findById(room.hotel_id).lean();
    }
  } else {
    room = (memoryStore.rooms || []).find(
      (r) => String(r._id) === String(roomId) || r.code === roomId
    ) || null;
    if (room && room.hotel_id) {
      hotel = (memoryStore.hotels || []).find(
        (h) => String(h._id) === String(room.hotel_id)
      ) || null;
    }
  }

  return { room, hotel };
}

/**
 * Computes currently available units of a room for [checkIn, checkOut),
 * subtracting quantities held by overlapping non-cancelled bookings.
 */
async function computeRoomAvailability(roomId, checkIn, checkOut) {
  const { room, hotel } = await findRoomAndHotel(roomId);
  if (!room) {
    return { room: null, hotel: null, totalUnits: 0, reservedUnits: 0, availableStock: 0 };
  }

  const totalUnits = Math.max(1, Number(room.total_units ?? 5));
  let bookings = [];

  if (isMongoConnected()) {
    bookings = await Booking.find({
      booking_status: { $nin: ['cancelled', 'no_show'] }
    }).lean();
  } else {
    bookings = (memoryStore.bookings || []).filter(
      (b) => !['cancelled', 'no_show'].includes(String(b.booking_status || '').toLowerCase())
    );
  }

  let reservedUnits = 0;
  const targetRoomStr = String(room._id);
  const checkOverlap = Boolean(checkIn && checkOut);

  bookings.forEach((b) => {
    const overlaps = checkOverlap ? datesOverlap(b.check_in, b.check_out, checkIn, checkOut) : true;
    if (!overlaps) return;

    if (Array.isArray(b.items) && b.items.length > 0) {
      b.items.forEach((it) => {
        if (String(it.room_id) === targetRoomStr) {
          reservedUnits += Math.max(1, Number(it.quantity || 1));
        }
      });
    } else if (String(b.room_id) === targetRoomStr) {
      reservedUnits += Math.max(1, Number(b.details?.rooms || b.details?.quantity || 1));
    }
  });

  const dateAvailable = Math.max(0, totalUnits - reservedUnits);
  // Respect direct room.stock floor if no dates provided
  const availableStock = checkOverlap
    ? dateAvailable
    : Math.max(0, Math.min(dateAvailable, Number(room.stock ?? totalUnits)));

  return {
    room,
    hotel,
    totalUnits,
    reservedUnits,
    availableStock
  };
}

async function formatCartPayload(sessionKey) {
  let rawItems = [];
  if (isMongoConnected()) {
    rawItems = await CartItem.find({ session_key: sessionKey }).sort({ createdAt: 1 }).lean();
  } else {
    rawItems = (memoryStore.cartItems || []).filter((c) => c.session_key === sessionKey);
  }

  const enriched = [];
  for (const item of rawItems) {
    const avail = await computeRoomAvailability(item.room_id, item.check_in, item.check_out);
    const nights = calcNights(item.check_in, item.check_out);
    const unitPrice = Number(item.unit_price || avail.room?.room_price || 0);
    const qty = Number(item.quantity || 1);
    enriched.push({
      ...item,
      _id: String(item._id),
      id: String(item._id),
      room_id: String(item.room_id),
      hotel_id: String(item.hotel_id),
      hotel_name: item.hotel_name || avail.hotel?.hotel_name || avail.hotel?.name || 'Khách sạn TRIPLA',
      hotel_slug: item.hotel_slug || avail.hotel?.hotel_slug || toSlug(avail.hotel?.hotel_name || ''),
      room_name: item.room_name || avail.room?.room_name || 'Phòng nghỉ',
      unit_price: unitPrice,
      nights,
      line_total: unitPrice * qty * nights,
      availableStock: avail.availableStock,
      total_units: avail.totalUnits
    });
  }

  return {
    items: enriched,
    totalQuantity: enriched.reduce((sum, i) => sum + Number(i.quantity || 0), 0),
    grandTotal: enriched.reduce((sum, i) => sum + Number(i.line_total || 0), 0)
  };
}

// Q5: Check single room availability for selected dates
router.get('/rooms/:id/availability', async (req, res) => {
  try {
    const check_in = req.query.check_in || req.query.checkIn;
    const check_out = req.query.check_out || req.query.checkOut;
    const avail = await computeRoomAvailability(req.params.id, check_in, check_out);
    if (!avail.room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hạng phòng' });
    }
    return res.json({
      success: true,
      room_id: String(avail.room._id),
      total_units: avail.totalUnits,
      reserved_units: avail.reservedUnits,
      availableStock: avail.availableStock,
      stock: avail.availableStock
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q5: GET /api/cart
router.get('/cart', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    const sessionKey = resolveCartSessionKey(req, authUser);
    const cart = await formatCartPayload(sessionKey);
    return res.json({ success: true, sessionKey, ...cart });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q5: POST /api/cart (Add to cart with date-overlap stock check)
router.post('/cart', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    const sessionKey = resolveCartSessionKey(req, authUser);
    const roomId = String(req.body?.room_id || req.body?.roomId || '').trim();
    const qtyToAdd = Math.max(1, parseInt(String(req.body?.quantity || '1'), 10) || 1);
    const checkIn = req.body?.check_in || req.body?.checkIn || new Date().toISOString().slice(0, 10);
    const checkOut =
      req.body?.check_out ||
      req.body?.checkOut ||
      new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

    if (!roomId) {
      return res.status(400).json({ success: false, message: 'Thiếu room_id.' });
    }

    const avail = await computeRoomAvailability(roomId, checkIn, checkOut);
    if (!avail.room || !avail.hotel) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng hoặc khách sạn.' });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_DATES',
        message: 'Ngày nhận phòng / trả phòng không hợp lệ.'
      });
    }

    let existingItem = null;
    if (isMongoConnected()) {
      existingItem = await CartItem.findOne({
        session_key: sessionKey,
        room_id: avail.room._id,
        check_in: checkInDate,
        check_out: checkOutDate
      });
    } else {
      existingItem = (memoryStore.cartItems || []).find(
        (c) =>
          c.session_key === sessionKey &&
          String(c.room_id) === String(avail.room._id) &&
          new Date(c.check_in).getTime() === checkInDate.getTime() &&
          new Date(c.check_out).getTime() === checkOutDate.getTime()
      );
    }

    const currentQty = existingItem ? Number(existingItem.quantity || 0) : 0;
    const desiredTotal = currentQty + qtyToAdd;

    if (desiredTotal > avail.availableStock) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXCEEDS_AVAILABLE_STOCK',
        availableStock: avail.availableStock,
        requestedTotal: desiredTotal,
        message: `Chỉ còn ${avail.availableStock} phòng trống cho ngày đã chọn (yêu cầu ${desiredTotal} phòng).`
      });
    }

    if (isMongoConnected()) {
      if (existingItem) {
        existingItem.quantity = desiredTotal;
        await existingItem.save();
      } else {
        await CartItem.create({
          session_key: sessionKey,
          user_id: authUser?._id && isValidObjectId(authUser._id) ? new mongoose.Types.ObjectId(authUser._id) : null,
          hotel_id: avail.hotel._id,
          room_id: avail.room._id,
          hotel_name: avail.hotel.hotel_name || avail.hotel.name,
          hotel_slug: avail.hotel.hotel_slug || toSlug(avail.hotel.hotel_name || avail.hotel.name),
          room_name: avail.room.room_name || avail.room.name,
          unit_price: Number(avail.room.room_price || avail.hotel.price_per_night || 0),
          quantity: desiredTotal,
          check_in: checkInDate,
          check_out: checkOutDate,
          image_url: avail.room.room_images?.[0] || avail.hotel.image_url || ''
        });
      }
    } else if (existingItem) {
      existingItem.quantity = desiredTotal;
    } else {
      memoryStore.cartItems.push({
        _id: new mongoose.Types.ObjectId(),
        session_key: sessionKey,
        user_id: authUser?._id || null,
        hotel_id: avail.hotel._id,
        room_id: avail.room._id,
        hotel_name: avail.hotel.hotel_name || avail.hotel.name,
        hotel_slug: avail.hotel.hotel_slug || toSlug(avail.hotel.hotel_name || avail.hotel.name),
        room_name: avail.room.room_name || avail.room.name,
        unit_price: Number(avail.room.room_price || avail.hotel.price_per_night || 0),
        quantity: desiredTotal,
        check_in: checkInDate,
        check_out: checkOutDate,
        image_url: avail.room.room_images?.[0] || avail.hotel.image_url || ''
      });
    }

    const cart = await formatCartPayload(sessionKey);
    return res.status(201).json({ success: true, sessionKey, ...cart });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q5: PUT /api/cart/:itemId (Update quantity with stock check)
router.put('/cart/:itemId', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    const sessionKey = resolveCartSessionKey(req, authUser);
    const itemId = String(req.params.itemId || '').trim();
    const newQty = parseInt(String(req.body?.quantity ?? '1'), 10);

    let item = null;
    if (isMongoConnected()) {
      if (!isValidObjectId(itemId)) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy mục trong giỏ.' });
      }
      item = await CartItem.findOne({ _id: itemId, session_key: sessionKey });
    } else {
      item = (memoryStore.cartItems || []).find(
        (c) => String(c._id) === itemId && c.session_key === sessionKey
      );
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng trong giỏ đặt.' });
    }

    if (Number.isNaN(newQty) || newQty <= 0) {
      if (isMongoConnected()) {
        await CartItem.deleteOne({ _id: item._id });
      } else {
        memoryStore.cartItems = memoryStore.cartItems.filter((c) => String(c._id) !== String(item._id));
      }
      const cart = await formatCartPayload(sessionKey);
      return res.json({ success: true, sessionKey, ...cart });
    }

    const avail = await computeRoomAvailability(item.room_id, item.check_in, item.check_out);
    if (newQty > avail.availableStock) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXCEEDS_AVAILABLE_STOCK',
        availableStock: avail.availableStock,
        requestedTotal: newQty,
        message: `Vượt quá số phòng còn trống (${avail.availableStock} phòng) cho ngày đã chọn.`
      });
    }

    if (isMongoConnected()) {
      item.quantity = newQty;
      await item.save();
    } else {
      item.quantity = newQty;
    }

    const cart = await formatCartPayload(sessionKey);
    return res.json({ success: true, sessionKey, ...cart });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q5: DELETE /api/cart/:itemId
router.delete('/cart/:itemId', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    const sessionKey = resolveCartSessionKey(req, authUser);
    const itemId = String(req.params.itemId || '').trim();

    if (isMongoConnected()) {
      if (isValidObjectId(itemId)) {
        await CartItem.deleteOne({ _id: itemId, session_key: sessionKey });
      }
    } else {
      memoryStore.cartItems = (memoryStore.cartItems || []).filter(
        (c) => !(String(c._id) === itemId && c.session_key === sessionKey)
      );
    }

    const cart = await formatCartPayload(sessionKey);
    return res.json({ success: true, sessionKey, ...cart });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q5 -> Checkout Cart into a multi-item Booking (updates Room.stock & Payment)
router.post('/cart/checkout', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser;
    const sessionKey = resolveCartSessionKey(req, authUser);
    const cart = await formatCartPayload(sessionKey);
    const guestKey = String(req.headers?.['x-cart-session'] || '').trim();

    let itemsToBook = cart.items;
    if (itemsToBook.length === 0 && guestKey && guestKey !== sessionKey) {
      const guestCart = await formatCartPayload(guestKey);
      itemsToBook = guestCart.items;
    }

    if (itemsToBook.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ đặt phòng đang trống.' });
    }

    for (const item of itemsToBook) {
      if (item.quantity > item.availableStock) {
        return res.status(400).json({
          success: false,
          errorCode: 'EXCEEDS_AVAILABLE_STOCK',
          message: `Phòng "${item.room_name}" chỉ còn ${item.availableStock} phòng trống.`
        });
      }
    }

    const first = itemsToBook[0];
    const discount = Math.max(0, Number(req.body?.discount || 0));
    const bookingItems = itemsToBook.map((it) => ({
      room_id: isValidObjectId(it.room_id) ? new mongoose.Types.ObjectId(it.room_id) : it.room_id,
      room_name: it.room_name,
      hotel_id: isValidObjectId(it.hotel_id) ? new mongoose.Types.ObjectId(it.hotel_id) : it.hotel_id,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      nights: Number(it.nights),
      discount: 0,
      subtotal: Number(it.line_total)
    }));
    const rawSum = bookingItems.reduce((s, it) => s + it.subtotal, 0);
    if (discount > 0 && bookingItems.length > 0) {
      bookingItems[0].discount = discount;
      bookingItems[0].subtotal = Math.max(0, bookingItems[0].subtotal - discount);
    }
    const totalPrice = Math.max(0, rawSum - discount);
    const bookingCode = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;

    const userOid = isValidObjectId(authUser._id) ? new mongoose.Types.ObjectId(authUser._id) : authUser._id;
    const payload = {
      user_id: userOid,
      room_id: bookingItems[0].room_id,
      hotel_id: bookingItems[0].hotel_id,
      check_in: new Date(first.check_in),
      check_out: new Date(first.check_out),
      discount,
      items: bookingItems,
      total_price: totalPrice,
      totalPriceVnd: totalPrice,
      booking_status: 'confirmed',
      status: 'CONFIRMED',
      booking_code: bookingCode,
      bookingCode,
      bookingType: 'hotel',
      title: `${first.hotel_name} (${bookingItems.length} hạng phòng)`,
      customerName: authUser.full_name || authUser.fullName,
      customerPhone: authUser.phone_number || '',
      customerEmail: authUser.email,
      guests: Number(req.body?.guests || 2),
      created_at: new Date(),
      details: { nights: first.nights, roomName: first.room_name }
    };

    if (isMongoConnected()) {
      const created = await Booking.create(payload);
      await Payment.create({
        booking_id: created._id,
        payment_method: req.body?.payment_method || 'e_wallet',
        transaction_id: `TXN-${bookingCode}-${Date.now().toString().slice(-4)}`,
        amount: totalPrice,
        payment_status: 'completed',
        paid_at: new Date()
      });

      for (const it of bookingItems) {
        const roomDoc = await Room.findById(it.room_id);
        if (roomDoc) {
          roomDoc.stock = Math.max(0, Number(roomDoc.stock ?? roomDoc.total_units ?? 5) - it.quantity);
          await roomDoc.save();
        }
      }

      await Notification.create({
        user_id: userOid,
        title: `Xác nhận đặt phòng #${bookingCode}`,
        content: `Đặt ${bookingItems.length} hạng phòng tại ${first.hotel_name} thành công. Tổng thanh toán: ${totalPrice.toLocaleString('vi-VN')}₫.`,
        type: 'booking',
        is_read: false,
        created_at: new Date()
      });

      await CartItem.deleteMany({ session_key: { $in: [sessionKey, guestKey].filter(Boolean) } });
      return res.status(201).json({ success: true, booking: created, booking_code: bookingCode });
    }

    const memBooking = { _id: new mongoose.Types.ObjectId(), ...payload };
    memoryStore.bookings.unshift(memBooking);
    bookingItems.forEach((it) => {
      const rm = (memoryStore.rooms || []).find((r) => String(r._id) === String(it.room_id));
      if (rm) rm.stock = Math.max(0, Number(rm.stock ?? rm.total_units ?? 5) - it.quantity);
    });
    memoryStore.cartItems = (memoryStore.cartItems || []).filter(
      (c) => c.session_key !== sessionKey && c.session_key !== guestKey
    );
    return res.status(201).json({ success: true, booking: memBooking, booking_code: bookingCode });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q6: GET /api/bookings/detail/:bookingCode (Belonging to currently logged-in tourist)
router.get('/bookings/detail/:bookingCode', requireAuth, async (req, res) => {
  try {
    const rawCode = String(req.params.bookingCode || '').trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã đặt phòng.' });
    }

    let booking = null;
    let payment = null;
    const codeRegex = new RegExp(`^${rawCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    if (isMongoConnected()) {
      booking = await Booking.findOne({ $or: [{ booking_code: codeRegex }, { bookingCode: codeRegex }] })
        .populate('user_id', 'full_name fullName email phone_number role avatar')
        .populate('hotel_id', 'hotel_name name hotel_slug address city image_url')
        .populate('room_id', 'room_name room_price room_type capacity')
        .lean();
      if (booking) {
        payment = await Payment.findOne({ booking_id: booking._id }).lean();
      }
    } else {
      booking = (memoryStore.bookings || []).find(
        (b) =>
          String(b.booking_code || '').toLowerCase() === rawCode.toLowerCase() ||
          String(b.bookingCode || '').toLowerCase() === rawCode.toLowerCase()
      );
      if (booking) {
        const owner = (memoryStore.users || []).find((u) => String(u._id) === String(booking.user_id));
        const h = (memoryStore.hotels || []).find((ht) => String(ht._id) === String(booking.hotel_id));
        const r = (memoryStore.rooms || []).find((rm) => String(rm._id) === String(booking.room_id));
        booking = { ...booking, user_id: owner || booking.user_id, hotel_id: h || booking.hotel_id, room_id: r || booking.room_id };
        payment = (memoryStore.payments || []).find((p) => String(p.booking_id) === String(booking._id)) || null;
      }
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: `Không tìm thấy đơn đặt phòng #${rawCode}.` });
    }

    const ownerId = String(booking.user_id?._id || booking.user_id || '');
    const ownerEmail = String(booking.user_id?.email || booking.customerEmail || '').toLowerCase();
    const callerId = String(req.authUser._id || '');
    const callerEmail = String(req.authUser.email || '').toLowerCase();
    const isAdmin = String(req.authUser.role || '').toLowerCase() === 'admin';
    const isOwner = ownerId === callerId || (callerEmail && ownerEmail === callerEmail);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_BOOKING_ACCESS',
        message: 'Bạn không có quyền xem đơn đặt phòng của tài khoản khác.'
      });
    }

    const nights = calcNights(booking.check_in, booking.check_out);
    let items = Array.isArray(booking.items) && booking.items.length > 0 ? booking.items : null;
    if (!items) {
      const unitPrice = Number(booking.room_id?.room_price || booking.total_price || 0) / Math.max(1, nights);
      const qty = Math.max(1, Number(booking.details?.rooms || booking.details?.quantity || 1));
      const discount = Number(booking.discount || 0);
      items = [
        {
          room_id: String(booking.room_id?._id || booking.room_id || ''),
          room_name: booking.room_id?.room_name || booking.details?.roomName || booking.title || 'Phòng tiêu chuẩn',
          quantity: qty,
          unit_price: Math.round(unitPrice),
          nights,
          discount,
          subtotal: Math.max(0, Number(booking.total_price || booking.totalPriceVnd || 0))
        }
      ];
    }

    return res.json({
      success: true,
      booking: {
        ...booking,
        _id: String(booking._id),
        booking_code: booking.booking_code || booking.bookingCode,
        created_at: booking.created_at || booking.createdAt || new Date(),
        booking_status: booking.booking_status || 'confirmed',
        nights,
        hotel: {
          hotel_name: booking.hotel_id?.hotel_name || booking.hotel_id?.name || booking.title || 'Khách sạn TRIPLA',
          address: booking.hotel_id?.address || booking.location || 'Việt Nam',
          hotel_slug: booking.hotel_id?.hotel_slug || ''
        },
        items,
        payment
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// Q15: CREATE BOOKING (FROM CART OR DIRECT) & SIMULATED PAYMENT GATEWAY
// =============================================================================
router.post('/bookings', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    const body = req.body || {};
    const awaitPayment = body.awaitPayment === true || body.fromCart === true;

    const customerName = String(
      body.customerName || body.contactName || authUser?.full_name || authUser?.fullName || ''
    ).trim();
    const customerPhone = String(
      body.customerPhone || body.contactPhone || authUser?.phone_number || ''
    ).trim();
    const customerEmail = String(
      body.customerEmail || body.contactEmail || authUser?.email || ''
    ).trim();

    if (awaitPayment) {
      if (!authUser) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tạo đơn đặt phòng.' });
      }
      if (!customerName || !customerPhone || !customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ họ tên, số điện thoại và email liên hệ.'
        });
      }
    }

    const sessionKey = resolveCartSessionKey(req, authUser);
    const guestKey = String(req.headers?.['x-cart-session'] || body.sessionKey || '').trim();
    let cartItemsToBook = [];

    if (body.fromCart) {
      const primaryCart = await formatCartPayload(sessionKey);
      cartItemsToBook = primaryCart.items;
      if (cartItemsToBook.length === 0 && guestKey && guestKey !== sessionKey) {
        const fallbackCart = await formatCartPayload(guestKey);
        cartItemsToBook = fallbackCart.items;
      }
      if (cartItemsToBook.length === 0) {
        return res.status(400).json({ success: false, message: 'Giỏ đặt phòng đang trống.' });
      }
      for (const item of cartItemsToBook) {
        if (item.quantity > item.availableStock) {
          return res.status(400).json({
            success: false,
            errorCode: 'EXCEEDS_AVAILABLE_STOCK',
            message: `Phòng "${item.room_name}" chỉ còn ${item.availableStock} phòng trống.`
          });
        }
      }
    }

    const bookingCode = body.booking_code || body.bookingCode || generateUniqueBookingCode();
    const userIdVal = authUser?._id || authUser?.id || body.user_id || body.userId || null;
    const resolvedUserOid =
      userIdVal && isValidObjectId(String(userIdVal))
        ? new mongoose.Types.ObjectId(String(userIdVal))
        : null;

    let bookingItems = Array.isArray(body.items) ? body.items : null;
    let firstHotelId = body.hotel_id || null;
    let firstRoomId = body.room_id || null;
    let checkIn = body.check_in || body.checkIn;
    let checkOut = body.check_out || body.checkOut;
    let discount = Math.max(0, Number(body.discount || 0));
    let totalPrice = Number(body.total_price ?? body.totalPriceVnd ?? 0);
    let title = String(body.title || '').trim();

    if (cartItemsToBook.length > 0) {
      const first = cartItemsToBook[0];
      bookingItems = cartItemsToBook.map((it) => ({
        room_id: isValidObjectId(it.room_id) ? new mongoose.Types.ObjectId(it.room_id) : it.room_id,
        room_name: it.room_name,
        hotel_id: isValidObjectId(it.hotel_id) ? new mongoose.Types.ObjectId(it.hotel_id) : it.hotel_id,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        nights: Number(it.nights),
        discount: 0,
        subtotal: Number(it.line_total)
      }));
      const rawSum = bookingItems.reduce((sum, it) => sum + it.subtotal, 0);
      if (discount > 0 && bookingItems.length > 0) {
        bookingItems[0].discount = discount;
        bookingItems[0].subtotal = Math.max(0, bookingItems[0].subtotal - discount);
      }
      totalPrice = Math.max(0, rawSum - discount);
      firstHotelId = bookingItems[0].hotel_id;
      firstRoomId = bookingItems[0].room_id;
      checkIn = first.check_in;
      checkOut = first.check_out;
      title = title || `${first.hotel_name} (${bookingItems.length} hạng phòng)`;
    }

    const bookingStatus = awaitPayment
      ? 'pending'
      : String(body.booking_status || body.status || 'confirmed').toLowerCase();

    const docPayload = {
      user_id: resolvedUserOid || userIdVal,
      room_id: firstRoomId && isValidObjectId(String(firstRoomId)) ? new mongoose.Types.ObjectId(String(firstRoomId)) : firstRoomId,
      hotel_id: firstHotelId && isValidObjectId(String(firstHotelId)) ? new mongoose.Types.ObjectId(String(firstHotelId)) : firstHotelId,
      check_in: checkIn ? new Date(checkIn) : new Date(),
      check_out: checkOut ? new Date(checkOut) : new Date(Date.now() + 2 * 86400000),
      discount,
      items: bookingItems || [],
      total_price: Math.max(0, totalPrice),
      totalPriceVnd: Math.max(0, totalPrice),
      booking_status: bookingStatus,
      status: bookingStatus.toUpperCase(),
      booking_code: bookingCode,
      bookingCode,
      bookingType: body.bookingType || 'hotel',
      title: title || 'Đặt phòng khách sạn TRIPLA',
      location: body.location || '',
      customerName: customerName || 'Khách hàng TRIPLA',
      customerPhone,
      customerEmail,
      guests: Number(body.guests || 2),
      created_at: new Date(),
      details: body.details || {}
    };

    if (isMongoConnected()) {
      const created = await Booking.create(docPayload);
      return res.status(201).json({
        success: true,
        booking: created.toObject(),
        booking_code: bookingCode
      });
    }

    const memBooking = { _id: new mongoose.Types.ObjectId(), ...docPayload };
    memoryStore.bookings.unshift(memBooking);
    return res.status(201).json({
      success: true,
      booking: memBooking,
      booking_code: bookingCode
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payments', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser;
    const bookingId = String(req.body?.booking_id || req.body?.bookingId || '').trim();
    const method = String(req.body?.payment_method || req.body?.paymentMethod || '').trim();
    const simulateResult = String(req.body?.simulateResult || 'success').toLowerCase();
    const allowedMethods = ['bank_transfer', 'e_wallet', 'credit_card'];

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Cần cung cấp booking_id để thanh toán.' });
    }
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán phải là bank_transfer, e_wallet hoặc credit_card.'
      });
    }

    const sessionKey = resolveCartSessionKey(req, authUser);
    const guestKey = String(req.headers?.['x-cart-session'] || req.body?.sessionKey || '').trim();

    let booking = null;
    if (isMongoConnected()) {
      const q = isValidObjectId(bookingId)
        ? { $or: [{ _id: bookingId }, { booking_code: bookingId }] }
        : { booking_code: bookingId };
      booking = await Booking.findOne(q);
    } else {
      booking = (memoryStore.bookings || []).find(
        (b) => String(b._id) === bookingId || String(b.booking_code) === bookingId
      );
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt phòng.' });
    }

    const ownerId = String(booking.user_id || '');
    const callerId = String(authUser._id || authUser.id || '');
    const isAdmin = String(authUser.role || '').toLowerCase() === 'admin';
    if (ownerId && callerId && ownerId !== callerId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thanh toán đơn của người khác.' });
    }

    const amount = Math.max(0, Number(req.body?.amount ?? booking.total_price ?? 0));

    if (simulateResult === 'failed') {
      const failTxn = `TXN-FAIL-${Date.now().toString().slice(-6)}`;
      let paymentDoc = null;
      if (isMongoConnected()) {
        paymentDoc = await Payment.findOneAndUpdate(
          { booking_id: booking._id },
          {
            $set: {
              payment_method: method,
              transaction_id: failTxn,
              amount,
              payment_status: 'failed',
              paid_at: null
            }
          },
          { upsert: true, new: true }
        ).lean();
        booking.booking_status = 'pending';
        booking.status = 'PENDING';
        await booking.save();
      } else {
        paymentDoc = (memoryStore.payments || []).find((p) => String(p.booking_id) === String(booking._id));
        if (!paymentDoc) {
          paymentDoc = { _id: new mongoose.Types.ObjectId(), booking_id: booking._id };
          memoryStore.payments.push(paymentDoc);
        }
        paymentDoc.payment_method = method;
        paymentDoc.transaction_id = failTxn;
        paymentDoc.amount = amount;
        paymentDoc.payment_status = 'failed';
        paymentDoc.paid_at = null;
        booking.booking_status = 'pending';
        booking.status = 'PENDING';
      }

      return res.status(402).json({
        success: false,
        paymentStatus: 'failed',
        message: 'Thanh toán thất bại (cổng thanh toán mô phỏng từ chối). Đơn vẫn ở trạng thái chờ thanh toán và giỏ hàng được giữ nguyên.',
        payment: paymentDoc,
        booking: typeof booking.toObject === 'function' ? booking.toObject() : booking
      });
    }

    // Success simulation: check stock, confirm booking, write completed payment, decrement room stock, create notification, clear cart
    const bookingItems = Array.isArray(booking.items) ? booking.items : [];
    for (const it of bookingItems) {
      if (it.room_id) {
        const avail = await computeRoomAvailability(it.room_id, booking.check_in, booking.check_out);
        if (it.quantity > avail.availableStock) {
          return res.status(400).json({
            success: false,
            errorCode: 'EXCEEDS_AVAILABLE_STOCK',
            message: `Phòng "${it.room_name || avail.room?.room_name || ''}" không đủ số lượng trống (${avail.availableStock} phòng).`
          });
        }
      }
    }

    const finalCode = booking.booking_code || booking.bookingCode || generateUniqueBookingCode();
    const txnId = `TXN-${finalCode}-${Date.now().toString().slice(-5)}`;
    const paidAt = new Date();
    const wasPending = String(booking.booking_status || '').toLowerCase() === 'pending';

    booking.booking_code = finalCode;
    booking.bookingCode = finalCode;
    booking.booking_status = 'confirmed';
    booking.status = 'CONFIRMED';

    if (isMongoConnected()) {
      await booking.save();
      const paymentDoc = await Payment.findOneAndUpdate(
        { booking_id: booking._id },
        {
          $set: {
            payment_method: method,
            transaction_id: txnId,
            amount,
            payment_status: 'completed',
            paid_at: paidAt
          }
        },
        { upsert: true, new: true }
      ).lean();

      if (wasPending) {
        for (const it of bookingItems) {
          if (it.room_id && isValidObjectId(String(it.room_id))) {
            const roomDoc = await Room.findById(it.room_id);
            if (roomDoc) {
              roomDoc.stock = Math.max(0, Number(roomDoc.stock ?? roomDoc.total_units ?? 5) - Number(it.quantity || 1));
              await roomDoc.save();
            }
          }
        }
      }

      if (booking.user_id) {
        await Notification.create({
          user_id: booking.user_id,
          title: `Thanh toán & xác nhận #${finalCode}`,
          content: `Giao dịch ${txnId} (${amount.toLocaleString('vi-VN')}₫ qua ${method}) thành công. Mã đặt phòng của bạn: ${finalCode}.`,
          type: 'booking',
          is_read: false,
          created_at: new Date()
        });
      }

      await CartItem.deleteMany({
        session_key: { $in: [sessionKey, guestKey].filter(Boolean) }
      });

      return res.status(201).json({
        success: true,
        paymentStatus: 'completed',
        booking_code: finalCode,
        booking: booking.toObject(),
        payment: paymentDoc
      });
    }

    let paymentDoc = (memoryStore.payments || []).find((p) => String(p.booking_id) === String(booking._id));
    if (!paymentDoc) {
      paymentDoc = { _id: new mongoose.Types.ObjectId(), booking_id: booking._id };
      memoryStore.payments.push(paymentDoc);
    }
    Object.assign(paymentDoc, {
      payment_method: method,
      transaction_id: txnId,
      amount,
      payment_status: 'completed',
      paid_at: paidAt
    });
    if (wasPending) {
      bookingItems.forEach((it) => {
        const rm = (memoryStore.rooms || []).find((r) => String(r._id) === String(it.room_id));
        if (rm) rm.stock = Math.max(0, Number(rm.stock ?? rm.total_units ?? 5) - Number(it.quantity || 1));
      });
    }
    if (booking.user_id) {
      memoryStore.notifications.unshift({
        _id: new mongoose.Types.ObjectId(),
        user_id: booking.user_id,
        title: `Thanh toán & xác nhận #${finalCode}`,
        content: `Giao dịch ${txnId} (${amount.toLocaleString('vi-VN')}₫) thành công.`,
        type: 'booking',
        is_read: false,
        created_at: new Date()
      });
    }
    memoryStore.cartItems = (memoryStore.cartItems || []).filter(
      (c) => c.session_key !== sessionKey && c.session_key !== guestKey
    );

    return res.status(201).json({
      success: true,
      paymentStatus: 'completed',
      booking_code: finalCode,
      booking,
      payment: paymentDoc
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// Q17: TOURIST BOOKING HISTORY, SELF-CANCEL BEFORE CHECKED_IN, NOTIFICATIONS
// =============================================================================
router.get('/bookings/my', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser;
    const callerId = String(authUser._id || authUser.id || '');
    const callerEmail = String(authUser.email || '').trim().toLowerCase();
    const statusFilter = String(req.query?.status || '').trim().toLowerCase();

    if (isMongoConnected()) {
      const orClauses = [];
      if (isValidObjectId(callerId)) {
        orClauses.push({ user_id: new mongoose.Types.ObjectId(callerId) });
      }
      if (callerEmail) {
        orClauses.push({
          customerEmail: new RegExp(`^${callerEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        });
      }
      const query = orClauses.length > 0 ? { $or: orClauses } : { user_id: callerId };
      if (statusFilter && statusFilter !== 'all') {
        query.booking_status = statusFilter;
      }

      const docs = await Booking.find(query)
        .populate('hotel_id', 'hotel_name name hotel_slug address city image_url')
        .populate('room_id', 'room_name room_price')
        .sort({ created_at: -1 })
        .lean();

      const bookingIds = docs.map((d) => d._id);
      const payments =
        bookingIds.length > 0 ? await Payment.find({ booking_id: { $in: bookingIds } }).lean() : [];
      const payMap = new Map(payments.map((p) => [String(p.booking_id), p]));

      const items = docs.map((b) => ({
        ...b,
        _id: String(b._id),
        booking_code: b.booking_code || b.bookingCode,
        booking_status: b.booking_status || String(b.status || 'confirmed').toLowerCase(),
        payment: payMap.get(String(b._id)) || null
      }));

      return res.json({ success: true, count: items.length, items });
    }

    let list = (memoryStore.bookings || []).filter(
      (b) =>
        String(b.user_id) === callerId ||
        (callerEmail && String(b.customerEmail || '').toLowerCase() === callerEmail)
    );
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((b) => String(b.booking_status || '').toLowerCase() === statusFilter);
    }
    const items = list.map((b) => ({
      ...b,
      booking_code: b.booking_code || b.bookingCode,
      payment: (memoryStore.payments || []).find((p) => String(p.booking_id) === String(b._id)) || null
    }));
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/bookings/:bookingCode/cancel', requireAuth, async (req, res) => {
  try {
    const rawCode = String(req.params.bookingCode || '').trim();
    const authUser = req.authUser;
    const callerId = String(authUser._id || authUser.id || '');
    const callerEmail = String(authUser.email || '').toLowerCase();
    const isAdmin = String(authUser.role || '').toLowerCase() === 'admin';
    const codeRegex = new RegExp(`^${rawCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    let booking = null;
    if (isMongoConnected()) {
      const or = [{ booking_code: codeRegex }, { bookingCode: codeRegex }];
      if (isValidObjectId(rawCode)) or.push({ _id: rawCode });
      booking = await Booking.findOne({ $or: or });
    } else {
      booking = (memoryStore.bookings || []).find(
        (b) =>
          String(b._id) === rawCode ||
          String(b.booking_code || '').toLowerCase() === rawCode.toLowerCase() ||
          String(b.bookingCode || '').toLowerCase() === rawCode.toLowerCase()
      );
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: `Không tìm thấy đơn #${rawCode}.` });
    }

    const ownerId = String(booking.user_id || '');
    const ownerEmail = String(booking.customerEmail || '').toLowerCase();
    if (!isAdmin && ownerId !== callerId && !(callerEmail && ownerEmail === callerEmail)) {
      return res.status(403).json({ success: false, message: 'Bạn không thể hủy đơn đặt phòng của người khác.' });
    }

    const currentStatus = String(booking.booking_status || booking.status || 'confirmed').toLowerCase();
    if (!['pending', 'confirmed'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        errorCode: 'CANCEL_NOT_ALLOWED',
        currentStatus,
        message: 'Chỉ có thể hủy đặt phòng khi trạng thái là pending hoặc confirmed (trước khi checked_in).'
      });
    }

    booking.booking_status = 'cancelled';
    booking.status = 'CANCELLED';
    const bookingCode = booking.booking_code || booking.bookingCode || rawCode;

    // Release booked room stock
    const releaseItems =
      Array.isArray(booking.items) && booking.items.length > 0
        ? booking.items
        : booking.room_id
          ? [{ room_id: booking.room_id, quantity: Number(booking.details?.rooms || booking.details?.quantity || 1) }]
          : [];

    let paymentDoc = null;
    if (isMongoConnected()) {
      await booking.save();
      for (const it of releaseItems) {
        if (it.room_id && isValidObjectId(String(it.room_id))) {
          const roomDoc = await Room.findById(it.room_id);
          if (roomDoc) {
            const maxCap = Number(roomDoc.total_units ?? 20);
            roomDoc.stock = Math.min(maxCap, Number(roomDoc.stock ?? 0) + Number(it.quantity || 1));
            await roomDoc.save();
          }
        }
      }
      paymentDoc = await Payment.findOne({ booking_id: booking._id });
      if (paymentDoc && String(paymentDoc.payment_status) === 'completed') {
        paymentDoc.payment_status = 'refunded';
        await paymentDoc.save();
      }
      if (booking.user_id) {
        await Notification.create({
          user_id: booking.user_id,
          title: `Đã hủy đặt phòng #${bookingCode}`,
          content: `Đơn #${bookingCode} đã được hủy thành công${paymentDoc?.payment_status === 'refunded' ? ' và khoản thanh toán đã chuyển trạng thái hoàn tiền (refunded).' : '.'}`,
          type: 'booking',
          is_read: false,
          created_at: new Date()
        });
      }
      return res.json({
        success: true,
        booking: booking.toObject(),
        payment: paymentDoc ? paymentDoc.toObject() : null
      });
    }

    for (const it of releaseItems) {
      const rm = (memoryStore.rooms || []).find((r) => String(r._id) === String(it.room_id));
      if (rm) rm.stock = Number(rm.stock ?? 0) + Number(it.quantity || 1);
    }
    paymentDoc = (memoryStore.payments || []).find((p) => String(p.booking_id) === String(booking._id)) || null;
    if (paymentDoc && paymentDoc.payment_status === 'completed') {
      paymentDoc.payment_status = 'refunded';
    }
    if (booking.user_id) {
      memoryStore.notifications.unshift({
        _id: new mongoose.Types.ObjectId(),
        user_id: booking.user_id,
        title: `Đã hủy đặt phòng #${bookingCode}`,
        content: `Đơn #${bookingCode} đã được hủy.`,
        type: 'booking',
        is_read: false,
        created_at: new Date()
      });
    }
    return res.json({ success: true, booking, payment: paymentDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const uid = String(req.authUser._id || req.authUser.id || '');
    if (isMongoConnected() && isValidObjectId(uid)) {
      const items = await Notification.find({ user_id: uid }).sort({ created_at: -1 }).lean();
      const unreadCount = items.filter((n) => !n.is_read).length;
      return res.json({ success: true, count: items.length, unreadCount, items });
    }
    const items = (memoryStore.notifications || []).filter((n) => String(n.user_id) === uid);
    const unreadCount = items.filter((n) => !n.is_read).length;
    return res.json({ success: true, count: items.length, unreadCount, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const uid = String(req.authUser._id || req.authUser.id || '');
    if (isMongoConnected() && isValidObjectId(uid)) {
      await Notification.updateMany({ user_id: uid, is_read: false }, { $set: { is_read: true } });
    } else {
      (memoryStore.notifications || []).forEach((n) => {
        if (String(n.user_id) === uid) n.is_read = true;
      });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const uid = String(req.authUser._id || req.authUser.id || '');
    const id = req.params.id;
    if (isMongoConnected() && isValidObjectId(id)) {
      const updated = await Notification.findOneAndUpdate(
        { _id: id, ...(isValidObjectId(uid) ? { user_id: uid } : {}) },
        { $set: { is_read: true } },
        { new: true }
      ).lean();
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
      }
      return res.json({ success: true, notification: updated });
    }
    const memItem = (memoryStore.notifications || []).find(
      (n) => String(n._id) === String(id) && String(n.user_id) === uid
    );
    if (!memItem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }
    memItem.is_read = true;
    return res.json({ success: true, notification: memItem });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
