const express = require('express');
const mongoose = require('mongoose');
const {
  TripPlan,
  Wishlist,
  PlanDetail,
  Trip,
  Location,
  Hotel,
  Room
} = require('../models');
const { memoryStore, isMongoConnected, isValidObjectId } = require('./shared');
const { requireAuth } = require('../utils/auth-middleware');

const router = express.Router();

function toYmd(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function getPlanNights(startDate, endDate) {
  const s = new Date(toYmd(startDate) + 'T00:00:00Z');
  const e = new Date(toYmd(endDate) + 'T00:00:00Z');
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, Math.round((e - s) / 86400000));
}

async function resolveLowestHotelPrice(hotelId) {
  if (!hotelId) return 0;
  if (isMongoConnected() && isValidObjectId(String(hotelId))) {
    const rooms = await Room.find({ hotel_id: hotelId }).lean();
    if (rooms.length > 0) {
      const prices = rooms.map((r) => Number(r.room_price || 0)).filter((p) => p > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    const hotel = await Hotel.findById(hotelId).lean();
    return Number(hotel?.price_per_night || 0);
  }

  const rooms = memoryStore.rooms.filter((r) => String(r.hotel_id) === String(hotelId));
  if (rooms.length > 0) {
    const prices = rooms.map((r) => Number(r.room_price || 0)).filter((p) => p > 0);
    if (prices.length > 0) return Math.min(...prices);
  }
  const hotel = memoryStore.hotels.find((h) => String(h._id) === String(hotelId));
  return Number(hotel?.price_per_night || 0);
}

/**
 * Q14: Recalculate trip_plans.estimated_budget (entry_fee sum + hotel nights * lowest room price).
 */
async function recalculatePlanCost(planId) {
  const nightsMultiplier = async (plan) => getPlanNights(plan.start_date, plan.end_date);

  if (isMongoConnected() && isValidObjectId(String(planId))) {
    const plan = await TripPlan.findById(planId);
    if (!plan) return 0;

    const details = await PlanDetail.find({ plan_id: plan._id })
      .populate('location_id', 'name entry_fee')
      .populate('hotel_id', 'hotel_name price_per_night')
      .lean();

    const nights = await nightsMultiplier(plan);
    let entryTotal = 0;
    const hotelIds = new Set();

    for (const d of details) {
      if (d.location_id && typeof d.location_id === 'object') {
        entryTotal += Number(d.location_id.entry_fee || 0);
      } else if (d.location_id) {
        const loc = await Location.findById(d.location_id).lean();
        entryTotal += Number(loc?.entry_fee || 0);
      }
      if (d.hotel_id) {
        const hid = typeof d.hotel_id === 'object' ? String(d.hotel_id._id) : String(d.hotel_id);
        hotelIds.add(hid);
      }
    }

    let hotelTotal = 0;
    for (const hid of hotelIds) {
      const nightly = await resolveLowestHotelPrice(hid);
      hotelTotal += nightly * nights;
    }

    const totalCost = Math.max(0, Math.round(entryTotal + hotelTotal));
    plan.estimated_budget = totalCost;
    await plan.save();
    return totalCost;
  }

  const memPlan = memoryStore.tripPlans.find((p) => String(p._id) === String(planId));
  if (!memPlan) return 0;

  const details = memoryStore.planDetails.filter((d) => String(d.plan_id) === String(planId));
  const nights = getPlanNights(memPlan.start_date, memPlan.end_date);
  let entryTotal = 0;
  const hotelIds = new Set();

  for (const d of details) {
    if (d.location_id) {
      const loc = memoryStore.locations.find((l) => String(l._id) === String(d.location_id));
      entryTotal += Number(loc?.entry_fee || 0);
    }
    if (d.hotel_id) {
      hotelIds.add(String(d.hotel_id));
    }
  }

  let hotelTotal = 0;
  for (const hid of hotelIds) {
    hotelTotal += (await resolveLowestHotelPrice(hid)) * nights;
  }

  const totalCost = Math.max(0, Math.round(entryTotal + hotelTotal));
  memPlan.estimated_budget = totalCost;
  return totalCost;
}

/**
 * Q13: Renumber sequence_order starting from 1 per visit_date day.
 */
async function renumberPlanDays(planId, targetDays = null) {
  const dayFilter = targetDays ? new Set(targetDays.filter(Boolean)) : null;

  if (isMongoConnected() && isValidObjectId(String(planId))) {
    const all = await PlanDetail.find({ plan_id: planId })
      .sort({ visit_date: 1, sequence_order: 1, _id: 1 })
      .lean();
    const groups = new Map();
    for (const item of all) {
      const ymd = toYmd(item.visit_date);
      if (dayFilter && !dayFilter.has(ymd)) continue;
      if (!groups.has(ymd)) groups.set(ymd, []);
      groups.get(ymd).push(item);
    }
    const ops = [];
    for (const list of groups.values()) {
      list.forEach((doc, idx) => {
        const expected = idx + 1;
        if (doc.sequence_order !== expected) {
          ops.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { sequence_order: expected } }
            }
          });
        }
      });
    }
    if (ops.length > 0) {
      await PlanDetail.bulkWrite(ops);
    }
    return;
  }

  const memList = memoryStore.planDetails
    .filter((d) => String(d.plan_id) === String(planId))
    .sort((a, b) => {
      const cmp = toYmd(a.visit_date).localeCompare(toYmd(b.visit_date));
      return cmp !== 0 ? cmp : Number(a.sequence_order || 0) - Number(b.sequence_order || 0);
    });
  const groups = new Map();
  for (const item of memList) {
    const ymd = toYmd(item.visit_date);
    if (dayFilter && !dayFilter.has(ymd)) continue;
    if (!groups.has(ymd)) groups.set(ymd, []);
    groups.get(ymd).push(item);
  }
  for (const list of groups.values()) {
    list.forEach((doc, idx) => {
      doc.sequence_order = idx + 1;
    });
  }
}

async function hydratePlanBundle(planId) {
  if (isMongoConnected() && isValidObjectId(String(planId))) {
    const plan = await TripPlan.findById(planId).lean();
    if (!plan) return null;

    const [wishlist, details, trips] = await Promise.all([
      Wishlist.find({ plan_id: plan._id })
        .populate('location_id')
        .populate('hotel_id', 'hotel_name hotel_slug address city price_per_night image_url')
        .sort({ added_at: -1 })
        .lean(),
      PlanDetail.find({ plan_id: plan._id })
        .populate('location_id')
        .populate('hotel_id', 'hotel_name hotel_slug address city price_per_night image_url')
        .sort({ visit_date: 1, sequence_order: 1 })
        .lean(),
      Trip.find({ plan_id: plan._id }).sort({ confirmed_at: -1 }).lean()
    ]);

    return { plan, wishlist, plan_details: details, trips };
  }

  const plan = memoryStore.tripPlans.find((p) => String(p._id) === String(planId));
  if (!plan) return null;

  const wishlist = memoryStore.wishlists
    .filter((w) => String(w.plan_id) === String(plan._id))
    .map((w) => ({
      ...w,
      location_id: memoryStore.locations.find((l) => String(l._id) === String(w.location_id)) || w.location_id,
      hotel_id: w.hotel_id
        ? memoryStore.hotels.find((h) => String(h._id) === String(w.hotel_id)) || w.hotel_id
        : null
    }));

  const details = memoryStore.planDetails
    .filter((d) => String(d.plan_id) === String(plan._id))
    .sort((a, b) => {
      const cmp = toYmd(a.visit_date).localeCompare(toYmd(b.visit_date));
      return cmp !== 0 ? cmp : Number(a.sequence_order || 0) - Number(b.sequence_order || 0);
    })
    .map((d) => ({
      ...d,
      location_id: d.location_id
        ? memoryStore.locations.find((l) => String(l._id) === String(d.location_id)) || d.location_id
        : null,
      hotel_id: d.hotel_id
        ? memoryStore.hotels.find((h) => String(h._id) === String(d.hotel_id)) || d.hotel_id
        : null
    }));

  const trips = memoryStore.trips.filter((t) => String(t.plan_id) === String(plan._id));
  return { plan, wishlist, plan_details: details, trips };
}

// Q12: List my trip plans
router.get('/trip-plans', requireAuth, async (req, res) => {
  try {
    const uid = String(req.authUser.id || req.authUser._id);
    if (isMongoConnected() && isValidObjectId(uid)) {
      const plans = await TripPlan.find({ user_id: uid }).sort({ created_at: -1 }).lean();
      return res.json({ success: true, count: plans.length, items: plans });
    }
    const items = memoryStore.tripPlans.filter((p) => String(p.user_id) === uid);
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q12: POST /api/v1/trip-plans
router.post('/trip-plans', requireAuth, async (req, res) => {
  try {
    const planName = String(req.body?.plan_name || req.body?.name || '').trim();
    const startRaw = req.body?.start_date || req.body?.startDate;
    const endRaw = req.body?.end_date || req.body?.endDate || startRaw;

    if (!planName) {
      return res.status(400).json({ success: false, message: 'Tên kế hoạch chuyến đi (plan_name) là bắt buộc.' });
    }
    const startDate = startRaw ? new Date(startRaw) : new Date();
    const endDate = endRaw ? new Date(endRaw) : new Date(startDate.getTime() + 2 * 86400000);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || toYmd(endDate) < toYmd(startDate)) {
      return res.status(400).json({ success: false, message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' });
    }

    const uid = String(req.authUser.id || req.authUser._id);
    const initialBudget = Number(req.body?.estimated_budget ?? 0);

    if (isMongoConnected()) {
      const created = await TripPlan.create({
        user_id: isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid,
        plan_name: planName,
        start_date: startDate,
        end_date: endDate,
        estimated_budget: initialBudget,
        note: req.body?.note ? String(req.body.note).trim() : undefined
      });
      return res.status(201).json({ success: true, plan: created.toObject() });
    }

    const memPlan = {
      _id: new mongoose.Types.ObjectId(),
      user_id: uid,
      plan_name: planName,
      start_date: startDate,
      end_date: endDate,
      estimated_budget: initialBudget,
      note: req.body?.note ? String(req.body.note).trim() : '',
      created_at: new Date()
    };
    memoryStore.tripPlans.unshift(memPlan);
    return res.status(201).json({ success: true, plan: memPlan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q12: POST /api/v1/wishlist (enforces UNIQUE(plan_id, location_id))
router.post('/wishlist', requireAuth, async (req, res) => {
  try {
    const planId = String(req.body?.plan_id || '').trim();
    const locationId = String(req.body?.location_id || '').trim();
    const hotelId = req.body?.hotel_id ? String(req.body.hotel_id).trim() : null;

    if (!planId || !locationId) {
      return res.status(400).json({ success: false, message: 'Cần cung cấp plan_id và location_id.' });
    }

    if (isMongoConnected()) {
      if (!isValidObjectId(planId) || !isValidObjectId(locationId)) {
        return res.status(400).json({ success: false, message: 'plan_id hoặc location_id không hợp lệ.' });
      }
      const existing = await Wishlist.findOne({ plan_id: planId, location_id: locationId }).lean();
      if (existing) {
        return res.status(409).json({
          success: false,
          errorCode: 'DUPLICATE_WISHLIST',
          message: 'Địa điểm này đã được lưu trong kế hoạch chuyến đi này.'
        });
      }

      const created = await Wishlist.create({
        plan_id: planId,
        location_id: locationId,
        hotel_id: hotelId && isValidObjectId(hotelId) ? hotelId : null,
        added_at: new Date()
      });
      const populated = await Wishlist.findById(created._id)
        .populate('location_id')
        .populate('hotel_id', 'hotel_name address price_per_night image_url')
        .lean();
      return res.status(201).json({ success: true, item: populated });
    }

    const dup = memoryStore.wishlists.find(
      (w) => String(w.plan_id) === planId && String(w.location_id) === locationId
    );
    if (dup) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_WISHLIST',
        message: 'Địa điểm này đã được lưu trong kế hoạch chuyến đi này.'
      });
    }
    const created = {
      _id: new mongoose.Types.ObjectId(),
      plan_id: planId,
      location_id: locationId,
      hotel_id: hotelId,
      added_at: new Date()
    };
    memoryStore.wishlists.push(created);
    return res.status(201).json({ success: true, item: created });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_WISHLIST',
        message: 'Địa điểm này đã tồn tại trong wishlist của chuyến đi (UNIQUE plan_id + location_id).'
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q12: GET /api/v1/trip-plans/:planId/wishlist
router.get('/trip-plans/:planId/wishlist', async (req, res) => {
  try {
    const planId = req.params.planId;
    if (isMongoConnected()) {
      if (!isValidObjectId(planId)) {
        return res.status(400).json({ success: false, message: 'planId không hợp lệ.' });
      }
      const items = await Wishlist.find({ plan_id: planId })
        .populate('location_id')
        .populate('hotel_id', 'hotel_name address city price_per_night image_url')
        .sort({ added_at: -1 })
        .lean();
      return res.json({ success: true, plan_id: planId, count: items.length, items });
    }

    const items = memoryStore.wishlists
      .filter((w) => String(w.plan_id) === String(planId))
      .map((w) => ({
        ...w,
        location_id: memoryStore.locations.find((l) => String(l._id) === String(w.location_id)) || w.location_id
      }));
    return res.json({ success: true, plan_id: planId, count: items.length, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/wishlist/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (isMongoConnected() && isValidObjectId(id)) {
      await Wishlist.findByIdAndDelete(id);
      return res.json({ success: true, deletedId: id });
    }
    const idx = memoryStore.wishlists.findIndex((w) => String(w._id) === String(id));
    if (idx !== -1) memoryStore.wishlists.splice(idx, 1);
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q13: GET /api/v1/trip-plans/:planId (plan + wishlist + plan_details)
router.get('/trip-plans/:planId', async (req, res) => {
  try {
    const bundle = await hydratePlanBundle(req.params.planId);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch chuyến đi.' });
    }
    return res.json({ success: true, ...bundle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q13: PUT /api/v1/trip-plans/:planId (update plan dates/name; trim out-of-range details + recalc budget)
router.put('/trip-plans/:planId', requireAuth, async (req, res) => {
  try {
    const planId = req.params.planId;
    const bundle = await hydratePlanBundle(planId);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch chuyến đi.' });
    }

    const nextName = req.body?.plan_name ? String(req.body.plan_name).trim() : bundle.plan.plan_name;
    const nextStart = req.body?.start_date ? new Date(req.body.start_date) : new Date(bundle.plan.start_date);
    const nextEnd = req.body?.end_date ? new Date(req.body.end_date) : new Date(bundle.plan.end_date);
    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || toYmd(nextEnd) < toYmd(nextStart)) {
      return res.status(400).json({ success: false, message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' });
    }

    const startYmd = toYmd(nextStart);
    const endYmd = toYmd(nextEnd);

    if (isMongoConnected() && isValidObjectId(planId)) {
      await TripPlan.findByIdAndUpdate(planId, {
        $set: {
          plan_name: nextName,
          start_date: nextStart,
          end_date: nextEnd,
          ...(req.body?.note !== undefined ? { note: req.body.note } : {})
        }
      });

      const details = await PlanDetail.find({ plan_id: planId }).lean();
      const outOfRangeIds = details
        .filter((d) => toYmd(d.visit_date) < startYmd || toYmd(d.visit_date) > endYmd)
        .map((d) => d._id);
      if (outOfRangeIds.length > 0) {
        await PlanDetail.deleteMany({ _id: { $in: outOfRangeIds } });
      }
      await renumberPlanDays(planId);
      await recalculatePlanCost(planId);
      const updated = await hydratePlanBundle(planId);
      return res.json({ success: true, ...updated });
    }

    const memPlan = memoryStore.tripPlans.find((p) => String(p._id) === String(planId));
    memPlan.plan_name = nextName;
    memPlan.start_date = nextStart;
    memPlan.end_date = nextEnd;
    memoryStore.planDetails = memoryStore.planDetails.filter(
      (d) =>
        String(d.plan_id) !== String(planId) ||
        (toYmd(d.visit_date) >= startYmd && toYmd(d.visit_date) <= endYmd)
    );
    await renumberPlanDays(planId);
    await recalculatePlanCost(planId);
    const updated = await hydratePlanBundle(planId);
    return res.json({ success: true, ...updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q13 + Q14: POST /api/v1/plan-details
router.post('/plan-details', requireAuth, async (req, res) => {
  try {
    const planId = String(req.body?.plan_id || '').trim();
    const visitRaw = req.body?.visit_date;
    if (!planId || !visitRaw) {
      return res.status(400).json({ success: false, message: 'Cần cung cấp plan_id và visit_date.' });
    }

    const bundle = await hydratePlanBundle(planId);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch chuyến đi.' });
    }

    const visitYmd = toYmd(visitRaw);
    const startYmd = toYmd(bundle.plan.start_date);
    const endYmd = toYmd(bundle.plan.end_date);
    if (visitYmd < startYmd || visitYmd > endYmd) {
      return res.status(400).json({
        success: false,
        message: `visit_date (${visitYmd}) phải nằm trong khoảng ${startYmd} đến ${endYmd}.`
      });
    }

    const sameDayCount = bundle.plan_details.filter((d) => toYmd(d.visit_date) === visitYmd).length;
    const desiredOrder = Number(req.body?.sequence_order) || sameDayCount + 1;
    const locationId = req.body?.location_id || null;
    const hotelId = req.body?.hotel_id || null;

    if (isMongoConnected() && isValidObjectId(planId)) {
      const created = await PlanDetail.create({
        plan_id: planId,
        location_id: locationId && isValidObjectId(String(locationId)) ? locationId : null,
        hotel_id: hotelId && isValidObjectId(String(hotelId)) ? hotelId : null,
        visit_date: new Date(`${visitYmd}T09:00:00Z`),
        start_time: req.body?.start_time || '09:00:00',
        sequence_order: desiredOrder,
        note: req.body?.note ? String(req.body.note).trim() : undefined
      });
      await renumberPlanDays(planId, [visitYmd]);
      const estimated_budget = await recalculatePlanCost(planId);
      const nextBundle = await hydratePlanBundle(planId);
      const saved = nextBundle.plan_details.find((d) => String(d._id) === String(created._id)) || created;
      return res.status(201).json({
        success: true,
        detail: saved,
        estimated_budget,
        ...nextBundle
      });
    }

    const created = {
      _id: new mongoose.Types.ObjectId(),
      plan_id: planId,
      location_id: locationId,
      hotel_id: hotelId,
      visit_date: new Date(`${visitYmd}T09:00:00Z`),
      start_time: req.body?.start_time || '09:00:00',
      sequence_order: desiredOrder,
      note: req.body?.note || ''
    };
    memoryStore.planDetails.push(created);
    await renumberPlanDays(planId, [visitYmd]);
    const estimated_budget = await recalculatePlanCost(planId);
    const nextBundle = await hydratePlanBundle(planId);
    return res.status(201).json({
      success: true,
      detail: created,
      estimated_budget,
      ...nextBundle
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q13 + Q14: PUT /api/v1/plan-details/:id (move day, change sequence_order, renumber both days from 1)
router.put('/plan-details/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    let existing = null;
    if (isMongoConnected() && isValidObjectId(id)) {
      existing = await PlanDetail.findById(id).lean();
    } else {
      existing = memoryStore.planDetails.find((d) => String(d._id) === String(id)) || null;
    }
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chặng lịch trình.' });
    }

    const planId = String(existing.plan_id);
    const bundle = await hydratePlanBundle(planId);
    const oldYmd = toYmd(existing.visit_date);
    const newYmd = req.body?.visit_date ? toYmd(req.body.visit_date) : oldYmd;

    if (bundle) {
      const startYmd = toYmd(bundle.plan.start_date);
      const endYmd = toYmd(bundle.plan.end_date);
      if (newYmd < startYmd || newYmd > endYmd) {
        return res.status(400).json({
          success: false,
          message: `visit_date (${newYmd}) phải nằm trong khoảng ${startYmd} đến ${endYmd}.`
        });
      }
    }

    const newSeq =
      req.body?.sequence_order !== undefined
        ? Math.max(1, Number(req.body.sequence_order))
        : existing.sequence_order;

    if (isMongoConnected() && isValidObjectId(id)) {
      // Shift target day sequence orders smoothly when moving/reordering
      const targetDayItems = await PlanDetail.find({
        plan_id: planId,
        _id: { $ne: existing._id }
      })
        .sort({ sequence_order: 1, _id: 1 })
        .lean();

      const sameDayPeers = targetDayItems.filter((d) => toYmd(d.visit_date) === newYmd);
      const insertIdx = Math.min(Math.max(newSeq - 1, 0), sameDayPeers.length);
      sameDayPeers.splice(insertIdx, 0, { ...existing, visit_date: new Date(`${newYmd}T09:00:00Z`) });

      const ops = sameDayPeers.map((item, idx) => ({
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              visit_date: new Date(`${newYmd}T09:00:00Z`),
              sequence_order: idx + 1,
              ...(String(item._id) === String(existing._id) && req.body?.start_time !== undefined
                ? { start_time: req.body.start_time }
                : {}),
              ...(String(item._id) === String(existing._id) && req.body?.note !== undefined
                ? { note: req.body.note }
                : {})
            }
          }
        }
      }));
      if (ops.length > 0) await PlanDetail.bulkWrite(ops);
      await renumberPlanDays(planId, [oldYmd, newYmd]);
    } else {
      const memItem = memoryStore.planDetails.find((d) => String(d._id) === String(id));
      memItem.visit_date = new Date(`${newYmd}T09:00:00Z`);
      if (req.body?.start_time !== undefined) memItem.start_time = req.body.start_time;
      if (req.body?.note !== undefined) memItem.note = req.body.note;

      const sameDayPeers = memoryStore.planDetails
        .filter((d) => String(d.plan_id) === planId && String(d._id) !== String(id) && toYmd(d.visit_date) === newYmd)
        .sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0));
      const insertIdx = Math.min(Math.max(newSeq - 1, 0), sameDayPeers.length);
      sameDayPeers.splice(insertIdx, 0, memItem);
      sameDayPeers.forEach((d, idx) => {
        d.sequence_order = idx + 1;
      });
      await renumberPlanDays(planId, [oldYmd, newYmd]);
    }

    const estimated_budget = await recalculatePlanCost(planId);
    const nextBundle = await hydratePlanBundle(planId);
    const detail = nextBundle.plan_details.find((d) => String(d._id) === String(id));
    return res.json({ success: true, detail, estimated_budget, ...nextBundle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q13: Bulk reorder within/across days for drag-and-drop convenience
router.put('/trip-plans/:planId/reorder', requireAuth, async (req, res) => {
  try {
    const planId = req.params.planId;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const affectedDays = new Set();

    if (isMongoConnected() && isValidObjectId(planId)) {
      const ops = [];
      items.forEach((entry, idx) => {
        if (!entry?.id || !isValidObjectId(String(entry.id))) return;
        const ymd = toYmd(entry.visit_date);
        affectedDays.add(ymd);
        ops.push({
          updateOne: {
            filter: { _id: entry.id, plan_id: planId },
            update: {
              $set: {
                visit_date: new Date(`${ymd}T09:00:00Z`),
                sequence_order: Number(entry.sequence_order || idx + 1)
              }
            }
          }
        });
      });
      if (ops.length > 0) await PlanDetail.bulkWrite(ops);
    } else {
      items.forEach((entry, idx) => {
        const memItem = memoryStore.planDetails.find(
          (d) => String(d._id) === String(entry.id) && String(d.plan_id) === String(planId)
        );
        if (memItem) {
          const ymd = toYmd(entry.visit_date);
          affectedDays.add(ymd);
          memItem.visit_date = new Date(`${ymd}T09:00:00Z`);
          memItem.sequence_order = Number(entry.sequence_order || idx + 1);
        }
      });
    }

    await renumberPlanDays(planId, Array.from(affectedDays));
    const estimated_budget = await recalculatePlanCost(planId);
    const bundle = await hydratePlanBundle(planId);
    return res.json({ success: true, estimated_budget, ...bundle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q13 + Q14: DELETE /api/v1/plan-details/:id
router.delete('/plan-details/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    let planId = null;
    let dayYmd = null;

    if (isMongoConnected() && isValidObjectId(id)) {
      const deleted = await PlanDetail.findByIdAndDelete(id).lean();
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chặng lịch trình.' });
      }
      planId = String(deleted.plan_id);
      dayYmd = toYmd(deleted.visit_date);
    } else {
      const idx = memoryStore.planDetails.findIndex((d) => String(d._id) === String(id));
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chặng lịch trình.' });
      }
      planId = String(memoryStore.planDetails[idx].plan_id);
      dayYmd = toYmd(memoryStore.planDetails[idx].visit_date);
      memoryStore.planDetails.splice(idx, 1);
    }

    await renumberPlanDays(planId, [dayYmd]);
    const estimated_budget = await recalculatePlanCost(planId);
    const bundle = await hydratePlanBundle(planId);
    return res.json({ success: true, deletedId: id, estimated_budget, ...bundle });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q14: Explicit recalculate endpoint
router.post('/trip-plans/:planId/recalculate', async (req, res) => {
  try {
    const estimated_budget = await recalculatePlanCost(req.params.planId);
    return res.json({ success: true, plan_id: req.params.planId, estimated_budget });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Q16: POST /api/v1/trips (confirm itinerary trip -> upcoming)
router.post('/trips', requireAuth, async (req, res) => {
  try {
    const planId = String(req.body?.plan_id || '').trim();
    const uid = String(req.authUser.id || req.authUser._id);
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Cần cung cấp plan_id để xác nhận chuyến đi.' });
    }

    const status = ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(req.body?.trip_status)
      ? req.body.trip_status
      : 'upcoming';

    if (isMongoConnected()) {
      if (!isValidObjectId(planId)) {
        return res.status(400).json({ success: false, message: 'plan_id không hợp lệ.' });
      }
      const plan = await TripPlan.findById(planId).lean();
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch chuyến đi.' });
      }
      const existing = await Trip.findOne({ plan_id: planId, user_id: uid });
      if (existing) {
        existing.trip_status = status;
        existing.confirmed_at = new Date();
        if (req.body?.note !== undefined) existing.note = req.body.note;
        await existing.save();
        return res.json({ success: true, trip: existing.toObject() });
      }

      const created = await Trip.create({
        plan_id: planId,
        user_id: isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : uid,
        trip_status: status,
        confirmed_at: new Date(),
        note: req.body?.note ? String(req.body.note).trim() : undefined
      });
      return res.status(201).json({ success: true, trip: created.toObject() });
    }

    const created = {
      _id: new mongoose.Types.ObjectId(),
      plan_id: planId,
      user_id: uid,
      trip_status: status,
      confirmed_at: new Date(),
      note: req.body?.note || ''
    };
    memoryStore.trips.unshift(created);
    return res.status(201).json({ success: true, trip: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/trips/my', requireAuth, async (req, res) => {
  try {
    const uid = String(req.authUser.id || req.authUser._id);
    if (isMongoConnected() && isValidObjectId(uid)) {
      const items = await Trip.find({ user_id: uid })
        .populate('plan_id')
        .sort({ confirmed_at: -1 })
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    const items = memoryStore.trips
      .filter((t) => String(t.user_id) === uid)
      .map((t) => ({
        ...t,
        plan_id: memoryStore.tripPlans.find((p) => String(p._id) === String(t.plan_id)) || t.plan_id
      }));
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.recalculatePlanCost = recalculatePlanCost;

