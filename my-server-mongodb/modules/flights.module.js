/**
 * MODULE 4: FLIGHT SEARCH (`src/app/flight-search`)
 * Quản lý Collection: `flights`
 */
const express = require('express');
const { Flight } = require('../models');
const { memoryStore, isMongoConnected } = require('./shared');

const router = express.Router();

function buildFlightOffersFromDocs(docs, fromInput, toInput, dateStr, prefix) {
  return docs.map((d, index) => {
    const baseEconomy = Number(d.price ?? d.basePriceVnd) || 1490000;
    const flexPrice = Math.round((baseEconomy * 1.24) / 10000) * 10000;
    const businessPrice = Math.round((baseEconomy * 2.15) / 10000) * 10000;
    const offerId = `${prefix}-${dateStr}-${index + 1}`;
    const airlineCode = d.airlineCode || d.code || 'VN';
    const flightNo = d.flightNumber || `${airlineCode}${200 + index * 17}`;
    const departTime = d.departure || d.departTime || '08:15';
    const arriveTime = d.arrival || d.arriveTime || '10:25';
    const checkedBaggageIncluded =
      d.checkedBaggageIncluded !== undefined
        ? Boolean(d.checkedBaggageIncluded)
        : airlineCode === 'VN' || airlineCode === 'QH';
    const baggageDesc =
      d.baggageDescription ||
      d.checkedBaggage ||
      (checkedBaggageIncluded ? '1 kiện × 23 kg ký gửi' : '7 kg xách tay');

    return {
      id: offerId,
      airlineCode,
      airlineName: d.airlineName || 'Vietnam Airlines',
      flightNumber: flightNo,
      from: fromInput,
      to: toInput,
      departureAt: `${dateStr}T${departTime}:00+07:00`,
      arrivalAt: `${dateStr}T${arriveTime}:00+07:00`,
      durationMinutes: Number(d.durationMinutes) || 130,
      stops: Number(d.stops) || 0,
      carryOnIncluded: d.carryOnIncluded !== undefined ? Boolean(d.carryOnIncluded) : true,
      checkedBaggageIncluded,
      baggageDescription: baggageDesc,
      price: baseEconomy,
      currency: d.currency || 'VND',
      originalPrice: Number(d.originalPrice) || Math.round(baseEconomy * 1.18),
      priceBasis: 'adult',
      taxesIncluded: true,
      departureTerminal: d.departureTerminal || d.terminalOut || 'T1',
      arrivalTerminal: d.arrivalTerminal || d.terminalIn || 'T1',
      aircraft: d.aircraft || 'Airbus A321',
      fares: [
        {
          id: `${offerId}-saver`,
          cabin: 'Phổ thông',
          name: 'Tiết kiệm',
          price: baseEconomy,
          currency: 'VND',
          carryOn: 'Xách tay 1 × 7 kg',
          checkedBaggage: checkedBaggageIncluded ? baggageDesc : 'Mua thêm hành lý ký gửi',
          changePolicy: 'Đổi lịch bay có phí',
          refundPolicy: 'Không hoàn vé',
          vatPolicy: 'Đã bao gồm thuế và phụ phí sân bay',
          notes: ['Giữ chỗ tiêu chuẩn', 'Làm thủ tục trực tuyến 24h trước giờ bay']
        },
        {
          id: `${offerId}-flex`,
          cabin: 'Phổ thông',
          name: 'Linh hoạt',
          price: flexPrice,
          currency: 'VND',
          carryOn: 'Xách tay 1 × 7 kg',
          checkedBaggage: 'Ký gửi 1 × 23 kg',
          changePolicy: 'Miễn phí đổi lịch 1 lần',
          refundPolicy: 'Hoàn vé có phí',
          vatPolicy: 'Đã bao gồm thuế và phụ phí sân bay',
          notes: ['Chọn ghế tiêu chuẩn miễn phí', 'Quầy làm thủ tục ưu tiên']
        },
        {
          id: `${offerId}-biz`,
          cabin: 'Thương gia',
          name: 'Thương gia',
          price: businessPrice,
          currency: 'VND',
          carryOn: 'Xách tay 2 × 7 kg',
          checkedBaggage: 'Ký gửi 2 × 32 kg',
          changePolicy: 'Đổi giờ bay miễn phí',
          refundPolicy: 'Hoàn vé linh hoạt',
          vatPolicy: 'Đã bao gồm thuế và phụ phí sân bay',
          notes: ['Phòng chờ Thương gia Lotus Lounge', 'Suất ăn nóng cao cấp', 'Lối đi ưu tiên SkyPriority']
        }
      ]
    };
  });
}

// GET /api/v1/flights
router.get('/flights', async (req, res) => {
  try {
    const from = (req.query.from || 'SGN').trim();
    const to = (req.query.to || 'HAN').trim();
    const departureDate = req.query.departureDate || new Date().toISOString().slice(0, 10);
    const returnDate = req.query.returnDate || departureDate;
    const tripType = req.query.tripType || 'round-trip';

    const docs = isMongoConnected()
      ? await Flight.find({}).lean()
      : [...(memoryStore.flights || [])];

    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    const exactOutbound = docs.filter(
      (d) =>
        String(d.from || '').toUpperCase() === fromUpper &&
        String(d.to || '').toUpperCase() === toUpper
    );
    const exactInbound = docs.filter(
      (d) =>
        String(d.from || '').toUpperCase() === toUpper &&
        String(d.to || '').toUpperCase() === fromUpper
    );

    const outboundDocs = exactOutbound.length > 0 ? exactOutbound : docs.slice(0, 3);
    const inboundDocs =
      exactInbound.length > 0 ? exactInbound : [...outboundDocs].reverse();

    const outbound = buildFlightOffersFromDocs(outboundDocs, from, to, departureDate, 'out');
    const inbound =
      tripType === 'round-trip' || tripType === 'roundTrip'
        ? buildFlightOffersFromDocs(inboundDocs, to, from, returnDate, 'in')
        : [];

    return res.json({
      success: true,
      outbound,
      inbound
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

