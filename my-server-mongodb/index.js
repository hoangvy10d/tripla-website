/**
 * ============================================================================
 * EXPRESS MODULAR RESTFUL SERVER (`my-server-mongodb/index.js`)
 * Kết nối: mongodb://localhost:27017/tripla_db
 * Port: 3000
 * Kiến trúc: Normalized ERD Relational Schema (15 ERD Collections + Populate JOIN)
 * ============================================================================
 */
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');

const { Content, Hotel, Room, Provider, Location } = require('./models');
const { seedDatabase } = require('./seed');
const { enrichDatabase } = require('./scripts/enrich_database');
const { isMongoConnected } = require('./modules/shared');

// Import 7 Modules tương ứng với từng phân hệ trên Frontend Angular (`tripla_website`)
const tripshortsModule = require('./modules/tripshorts.module');
const tripshopModule = require('./modules/tripshop.module');
const hotelsModule = require('./modules/hotels.module');
const flightsModule = require('./modules/flights.module');
const activitiesModule = require('./modules/activities.module');
const busesModule = require('./modules/buses.module');
const coreModule = require('./modules/core.module');
const authV2Module = require('./modules/auth-v2.module');
const bookingCartModule = require('./modules/booking-cart.module');
const adminV2Module = require('./modules/admin-v2.module');
const plannerV2Module = require('./modules/planner-v2.module');
const visualSearchRoutes = require('./routes/visualSearchRoutes');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/tripla_db';

// 1. Cấu hình Express Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 200 * 1024 * 1024 }
  })
);

// Tự động chuyển đổi http://localhost:3000 sang domain thực tế khi chạy trên Cloud (Railway / Render)
app.use((req, res, next) => {
  const host = req.get('host') || '';
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const origin = `${protocol}://${host}`;
    const origJson = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body === 'object') {
        try {
          const rewritten = JSON.parse(
            JSON.stringify(body).replace(/http:\/\/localhost:3000/g, origin)
          );
          return origJson(rewritten);
        } catch (_e) {
          return origJson(body);
        }
      }
      return origJson(body);
    };
  }
  next();
});
app.use('/public', express.static(path.join(__dirname, 'public')));
// Phục vụ trực tiếp kho media (ảnh khách sạn, avatar thành viên, banners) từ thư mục nội bộ `my-server-mongodb/data`
const localDataDir = path.join(__dirname, 'data');
const legacyTriplaDataDir = path.join(__dirname, '..', 'tripla', 'data');
app.use('/data', express.static(fs.existsSync(localDataDir) ? localDataDir : legacyTriplaDataDir));
app.use('/api/visual-search', visualSearchRoutes);

// 2. Healthcheck & Kiến trúc ERD + Module
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'my-server-mongodb (Normalized ERD + Modular Architecture)',
    mongoConnected: isMongoConnected(),
    mongoConfigured: Boolean(MONGO_URI),
    erdCollections: [
      'users',
      'providers (FK -> users)',
      'locations (2dsphere)',
      'hotels (FK -> providers, 2dsphere)',
      'rooms (FK -> hotels)',
      'bookings (FK -> users, rooms, hotels)',
      'payments (FK -> bookings UNIQUE)',
      'contents (FK -> users, hotels, rooms, locations)',
      'location_tags (FK -> contents, locations, hotels)',
      'trip_plans (FK -> users)',
      'wishlists (FK -> trip_plans, locations UNIQUE)',
      'plan_details (FK -> trip_plans, locations, hotels)',
      'trips (FK -> trip_plans, users)',
      'reports (FK -> contents, users)',
      'notifications (FK -> users)',
      'comments (FK -> contents, users)'
    ],
    timestamp: new Date().toISOString()
  });
});

// 3. Mount 7 Modules vào `/api/v1` và alias `/api` (Tương thích toàn diện với server.js cũ)
const modules = [
  authV2Module,
  bookingCartModule,
  plannerV2Module,
  adminV2Module,
  tripshortsModule,
  tripshopModule,
  hotelsModule,
  flightsModule,
  activitiesModule,
  busesModule,
  coreModule
];
modules.forEach((mod) => {
  app.use('/api/v1', mod);
  app.use('/api', mod);
});

// 4. Phục vụ giao diện Angular SPA (Production Build) nếu đã build trong tripla_website/dist
const angularDistUnderscore = path.join(__dirname, '..', 'tripla_website', 'dist', 'tripla_website', 'browser');
const angularDistHyphen = path.join(__dirname, '..', 'tripla_website', 'dist', 'tripla-website', 'browser');
const angularDistDir = fs.existsSync(angularDistUnderscore)
  ? angularDistUnderscore
  : fs.existsSync(angularDistHyphen)
  ? angularDistHyphen
  : null;

if (angularDistDir) {
  app.use(express.static(angularDistDir));
  app.get(/^\/(?!api|data|public).*/, (_req, res) => {
    res.sendFile(path.join(angularDistDir, 'index.html'));
  });
}

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ Connected to MongoDB: ${MONGO_URI}`);

    const [contentCount, hotelCount, roomCount, providerCount, locationCount] = await Promise.all([
      Content.countDocuments(),
      Hotel.countDocuments(),
      Room.countDocuments(),
      Provider.countDocuments(),
      Location.countDocuments()
    ]);

    if (contentCount === 0 || hotelCount === 0 || roomCount === 0 || providerCount === 0) {
      console.log('📦 Database tripla_db đang thiếu các bảng ERD mới, tự động chạy seedDatabase()...');
      await seedDatabase();
    }
    if (locationCount < 40) {
      console.log('🌍 Tự động làm giàu dữ liệu địa danh, khách sạn và hoạt động (enrichDatabase)...');
      await enrichDatabase();
    }
  } catch (err) {
    console.warn(
      `⚠️ Chưa kết nối được dịch vụ MongoDB tại ${MONGO_URI} (${err.message}).\n` +
        `👉 Server vẫn sẵn sàng phục vụ đầy đủ dữ liệu ERD từ bộ Seed!`
    );
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 my-server-mongodb (Normalized ERD) đang chạy tại: http://0.0.0.0:${PORT}`);
    console.log(`   • [ERD Contents / Reels] /api/v1/reels/feed, /api/v1/contents, /api/v1/contents/:id/like`);
    console.log(`   • [ERD Hotels & Rooms]   /api/v1/hotels, /api/v1/rooms, /api/v1/locations, /api/v1/providers`);
    console.log(`   • [ERD Bookings & Pay]   /api/v1/bookings, /api/v1/payments`);
    console.log(`   • [ERD Trip Planning]    /api/v1/trip-plans, /api/v1/plan-details, /api/v1/wishlists, /api/v1/trips`);
  });
}

startServer();
