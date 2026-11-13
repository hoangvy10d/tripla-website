const express = require('express');
const mongoose = require('mongoose');
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
  Notification
} = require('../models');
const { memoryStore, isMongoConnected } = require('./shared');
const { sha256, verifySha256Password } = require('../utils/helpers');
const {
  toSafeUser,
  signSessionToken,
  requireAuth
} = require('../utils/auth-middleware');

const router = express.Router();

function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findUserByIdentifier(identifier) {
  const clean = String(identifier || '').trim();
  if (!clean) return null;
  const emailRegex = new RegExp(`^${escapeRegex(clean)}$`, 'i');

  if (isMongoConnected()) {
    return User.findOne({
      $or: [{ email: emailRegex }, { phone_number: clean }]
    }).lean();
  }

  const lower = clean.toLowerCase();
  return (
    memoryStore.users.find(
      (u) =>
        String(u.email || '').toLowerCase() === lower ||
        String(u.phone_number || '').trim() === clean
    ) || null
  );
}

async function handleRoleLogin(req, res, requiredRole) {
  try {
    const username = String(
      req.body?.username ?? req.body?.email ?? req.body?.identifier ?? req.body?.phone_number ?? ''
    ).trim();
    const password = String(req.body?.password ?? '');

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_CREDENTIALS',
        message: 'Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu.'
      });
    }

    const user = await findUserByIdentifier(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'ACCOUNT_NOT_FOUND',
        message: 'Không tìm thấy tài khoản với email hoặc số điện thoại này (account not found).'
      });
    }

    const passwordValid = verifySha256Password(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        errorCode: 'WRONG_PASSWORD',
        message: 'Mật khẩu không chính xác (wrong password).'
      });
    }

    if (requiredRole && String(user.role || '').toLowerCase() !== requiredRole) {
      const roleMsg =
        requiredRole === 'admin'
          ? 'Tài khoản này không có quyền Quản trị viên / Nhân viên (wrong role: admin required).'
          : 'Tài khoản này không phải tài khoản Du khách / Khách hàng (wrong role: tourist required).';
      return res.status(403).json({
        success: false,
        errorCode: 'WRONG_ROLE',
        message: roleMsg
      });
    }

    const safeUser = toSafeUser(user);
    const token = signSessionToken(safeUser);
    return res.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: err.message
    });
  }
}

/**
 * Q1 verification endpoint: summarizes loaded Tripla dataset collections.
 */
router.get('/bootstrap/dataset', async (_req, res) => {
  try {
    if (isMongoConnected()) {
      const [
        users,
        providers,
        locations,
        hotels,
        rooms,
        bookings,
        payments,
        contents,
        locationTags,
        tripPlans,
        wishlists,
        planDetails,
        trips,
        notifications,
        reports
      ] = await Promise.all([
        User.countDocuments(),
        Provider.countDocuments(),
        Location.countDocuments(),
        Hotel.countDocuments(),
        Room.countDocuments(),
        Booking.countDocuments(),
        Payment.countDocuments(),
        Content.countDocuments(),
        LocationTag.countDocuments(),
        TripPlan.countDocuments(),
        Wishlist.countDocuments(),
        PlanDetail.countDocuments(),
        Trip.countDocuments(),
        Notification.countDocuments(),
        Report.countDocuments()
      ]);
      return res.json({
        success: true,
        source: 'mongodb',
        counts: {
          users,
          providers,
          locations,
          hotels,
          rooms,
          bookings,
          payments,
          contents,
          location_tags: locationTags,
          trip_plans: tripPlans,
          wishlist: wishlists,
          plan_details: planDetails,
          trips,
          notifications,
          reports
        }
      });
    }

    return res.json({
      success: true,
      source: 'memoryStore',
      counts: {
        users: memoryStore.users.length,
        providers: memoryStore.providers.length,
        locations: memoryStore.locations.length,
        hotels: memoryStore.hotels.length,
        rooms: memoryStore.rooms.length,
        bookings: memoryStore.bookings.length,
        payments: memoryStore.payments.length,
        contents: memoryStore.contents.length,
        location_tags: memoryStore.locationTags.length,
        trip_plans: memoryStore.tripPlans.length,
        wishlist: memoryStore.wishlists.length,
        plan_details: memoryStore.planDetails.length,
        trips: memoryStore.trips.length,
        notifications: memoryStore.notifications.length,
        reports: memoryStore.reports.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q2: Employee/Admin Login
router.post('/auth/login-emp', (req, res) => handleRoleLogin(req, res, 'admin'));

// Q2: Customer (Tourist) Login
router.post('/auth/login-cust', (req, res) => handleRoleLogin(req, res, 'tourist'));

// Generic login supporting SHA-256 verification across roles
router.post('/auth/login', (req, res) => handleRoleLogin(req, res, null));

// Secure Register (SHA-256 + duplicate email/phone rejection)
router.post('/auth/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone_number || req.body?.phoneNumber || '').trim();
    const fullName = String(
      req.body?.full_name || req.body?.fullName || (email ? email.split('@')[0] : 'Khách hàng TRIPLA')
    ).trim();
    const rawPassword = String(req.body?.password || '').trim();

    if (!email || !rawPassword) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Vui lòng cung cấp email và mật khẩu để đăng ký.'
      });
    }

    const dupConditions = [{ email: new RegExp(`^${escapeRegex(email)}$`, 'i') }];
    if (phone) {
      dupConditions.push({ phone_number: phone });
    }

    if (isMongoConnected()) {
      const existing = await User.findOne({ $or: dupConditions }).lean();
      if (existing) {
        const isEmailDup = String(existing.email || '').toLowerCase() === email;
        return res.status(409).json({
          success: false,
          errorCode: 'DUPLICATE_ACCOUNT',
          message: isEmailDup
            ? 'Email này đã được đăng ký trong hệ thống.'
            : 'Số điện thoại này đã được đăng ký trong hệ thống.'
        });
      }

      const created = await User.create({
        code: `u_${Date.now()}`,
        full_name: fullName,
        fullName,
        email,
        phone_number: phone || '',
        password: sha256(rawPassword),
        role: 'tourist',
        avatar: '',
        membershipTier: 'MEMBER',
        level: 'Thành viên Mới',
        points: 0,
        followers: 0,
        following: 0
      });
      const safeUser = toSafeUser(created);
      return res.status(201).json({
        success: true,
        token: signSessionToken(safeUser),
        user: safeUser
      });
    }

    const memDup = memoryStore.users.find(
      (u) =>
        String(u.email || '').toLowerCase() === email ||
        (phone && String(u.phone_number || '').trim() === phone)
    );
    if (memDup) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_ACCOUNT',
        message: 'Email hoặc số điện thoại đã tồn tại trong hệ thống.'
      });
    }

    const memUser = {
      _id: new mongoose.Types.ObjectId(),
      code: `u_${Date.now()}`,
      full_name: fullName,
      fullName,
      email,
      phone_number: phone || '',
      password: sha256(rawPassword),
      role: 'tourist',
      avatar: '',
      membershipTier: 'MEMBER',
      level: 'Thành viên Mới',
      points: 0,
      followers: 0,
      following: 0,
      created_at: new Date()
    };
    memoryStore.users.push(memUser);
    const safeUser = toSafeUser(memUser);
    return res.status(201).json({
      success: true,
      token: signSessionToken(safeUser),
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const uid = req.authUser?.id || req.authUser?._id;
    let user = null;
    if (isMongoConnected() && uid && mongoose.Types.ObjectId.isValid(uid)) {
      user = await User.findById(uid).lean();
    } else {
      user =
        memoryStore.users.find(
          (u) => String(u._id) === String(uid) || String(u.code) === String(req.authUser?.code)
        ) || null;
    }
    return res.json({ success: true, user: user ? toSafeUser(user) : req.authUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/auth/profile', requireAuth, async (req, res) => {
  try {
    const uid = req.authUser?.id || req.authUser?._id;
    const fullName =
      req.body?.full_name !== undefined
        ? String(req.body.full_name).trim()
        : req.body?.fullName !== undefined
          ? String(req.body.fullName).trim()
          : undefined;
    const phone =
      req.body?.phone_number !== undefined ? String(req.body.phone_number).trim() : undefined;
    const avatar = req.body?.avatar !== undefined ? String(req.body.avatar).trim() : undefined;
    const bio = req.body?.bio !== undefined ? String(req.body.bio).trim() : undefined;
    const location = req.body?.location !== undefined ? String(req.body.location).trim() : undefined;

    if (isMongoConnected() && uid && mongoose.Types.ObjectId.isValid(uid)) {
      if (phone) {
        const dup = await User.findOne({ _id: { $ne: uid }, phone_number: phone }).lean();
        if (dup) {
          return res.status(409).json({
            success: false,
            message: 'Số điện thoại này đã được tài khoản khác sử dụng.'
          });
        }
      }
      const updates = {};
      if (fullName) {
        updates.full_name = fullName;
        updates.fullName = fullName;
      }
      if (phone !== undefined) updates.phone_number = phone;
      if (avatar !== undefined && avatar) updates.avatar = avatar;
      if (bio !== undefined) updates.bio = bio;
      if (location !== undefined) updates.location = location;

      const updated = await User.findByIdAndUpdate(uid, { $set: updates }, { new: true }).lean();
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
      }
      return res.json({ success: true, user: toSafeUser(updated) });
    }

    const memUser = memoryStore.users.find(
      (u) => String(u._id) === String(uid) || String(u.code) === String(req.authUser?.code)
    );
    if (!memUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    if (phone) {
      const dup = memoryStore.users.find(
        (u) => String(u._id) !== String(memUser._id) && String(u.phone_number) === phone
      );
      if (dup) {
        return res.status(409).json({
          success: false,
          message: 'Số điện thoại này đã được tài khoản khác sử dụng.'
        });
      }
      memUser.phone_number = phone;
    }
    if (fullName) {
      memUser.full_name = fullName;
      memUser.fullName = fullName;
    }
    if (phone !== undefined && !phone) memUser.phone_number = '';
    if (avatar) memUser.avatar = avatar;
    if (bio !== undefined) memUser.bio = bio;
    if (location !== undefined) memUser.location = location;
    return res.json({ success: true, user: toSafeUser(memUser) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Đã đăng xuất khỏi phiên TRIPLA.' });
});

module.exports = router;

