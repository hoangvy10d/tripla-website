/**
 * MODULE 6: BUS SEARCH (`src/app/bus-search`)
 * Quản lý Collection: `bus_trips`
 */
const express = require('express');
const { BusTrip } = require('../models');
const { toSlug } = require('../utils/helpers');
const { memoryStore, isMongoConnected } = require('./shared');

const router = express.Router();

function buildBusSlug(b) {
  if (b?.slug) return String(b.slug);
  const op = b?.operatorName || b?.operator || 'bus';
  const from = b?.from || b?.origin || '';
  const to = b?.to || b?.destination || '';
  const timePart = `${String(b?.hour ?? 7).padStart(2, '0')}h${String(b?.minute ?? 0).padStart(2, '0')}`;
  return toSlug(`${op} ${from} ${to} ${timePart}`) || String(b?.id || b?._id || '');
}

function buildSeatsForBus(tripId, totalSeats, price) {
  const booked = new Set([2, 5, 8, 12, 17]);
  return Array.from({ length: totalSeats || 24 }, (_, idx) => {
    const num = idx + 1;
    const row = Math.ceil(num / 3);
    const col = ((num - 1) % 3) + 1;
    return {
      id: `${tripId}-S${num}`,
      label: `A${String(num).padStart(2, '0')}`,
      row,
      col,
      status: booked.has(num) ? 'booked' : 'available',
      price: Number(price) || 350000
    };
  });
}

function normalizeCity(str) {
  const norm = String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
  if (['tphcm', 'sai gon', 'tp hcm', 'tp ho chi minh', 'hcm'].includes(norm)) {
    return 'ho chi minh';
  }
  return norm;
}

// 1. GET /api/v1/bus-trips & legacy alias GET /api/buses
async function handleGetBusTrips(req, res) {
  try {
    const from = (req.query.from || req.query.origin || '').trim();
    const to = (req.query.to || req.query.destination || '').trim();
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    let list = isMongoConnected()
      ? await BusTrip.find({}).lean()
      : [...(memoryStore.busTrips || [])];

    if (from || to) {
      const normFrom = normalizeCity(from);
      const normTo = normalizeCity(to);
      list = list.filter((b) => {
        const bFrom = normalizeCity(b.from || b.origin);
        const bTo = normalizeCity(b.to || b.destination);
        const matchFrom = !normFrom || bFrom.includes(normFrom) || normFrom.includes(bFrom);
        const matchTo = !normTo || bTo.includes(normTo) || normTo.includes(bTo);
        return matchFrom && matchTo;
      });
    }

    const items = list.map((b) => ({
      ...b,
      id: b.id || b._id,
      slug: buildBusSlug(b),
      origin: b.origin || b.from,
      destination: b.destination || b.to,
      operator: b.operator || b.operatorName,
      date: b.date || date
    }));

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.get('/bus-trips', handleGetBusTrips);
router.get('/buses', handleGetBusTrips);

// 2. GET /api/v1/bus-trips/:id & alias GET /api/buses/:id (Hỗ trợ cả slug lẫn id)
async function handleGetBusTripById(req, res) {
  try {
    const id = String(req.params.id || '').trim();
    const slugCandidate = toSlug(id) || id.toLowerCase();
    let bus = null;

    if (isMongoConnected()) {
      bus = await BusTrip.findOne({ $or: [{ _id: id }, { id }, { operatorId: id }, { slug: id }, { slug: slugCandidate }] }).lean();
      if (!bus) {
        const allBuses = await BusTrip.find({}).lean();
        bus = allBuses.find((b) => buildBusSlug(b) === slugCandidate) || null;
      }
    } else {
      bus = (memoryStore.busTrips || []).find(
        (b) => b._id === id || b.id === id || b.operatorId === id || b.slug === id || buildBusSlug(b) === slugCandidate
      );
    }

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe' });
    }

    const tripId = bus.id || bus._id;
    return res.json({
      success: true,
      bus: {
        ...bus,
        id: tripId,
        slug: buildBusSlug(bus),
        seats: buildSeatsForBus(tripId, bus.totalSeats || 24, bus.price)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.get('/bus-trips/:id', handleGetBusTripById);
router.get('/buses/:id', handleGetBusTripById);

module.exports = router;

