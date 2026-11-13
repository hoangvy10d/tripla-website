const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ============================================================================
 * TRIPLA NORMALIZED ERD MONGOOSE MODELS (`my-server-mongodb/models.js`)
 * Phản ánh chuẩn xác 100% sơ đồ ERD (`Untitled.sql`) & `Data Normalization.json`
 * sử dụng `Schema.Types.ObjectId` và `ref` cho toàn bộ khóa ngoại (Foreign Keys):
 *  1. Users (`users`)
 *  2. Providers (`providers`)           -> FK: `user_id` (ref: User, UNIQUE)
 *  3. Locations (`locations`)           -> GeoJSON 2dsphere
 *  4. Hotels (`hotels`)                 -> FK: `provider_id` (ref: Provider), GeoJSON 2dsphere
 *  5. Rooms (`rooms`)                   -> FK: `hotel_id` (ref: Hotel)
 *  6. Bookings (`bookings`)             -> FK: `user_id` (ref: User), `room_id` (ref: Room)
 *  7. Payments (`payments`)             -> FK: `booking_id` (ref: Booking, UNIQUE)
 *  8. Contents (`contents`)             -> FK: `user_id` (ref: User) + Hotspots (`hotel_id`, `location_id`, `room_id`)
 *  9. LocationTags (`location_tags`)    -> FK: `content_id` (ref: Content), `location_id` (ref: Location), `hotel_id` (ref: Hotel)
 * 10. TripPlans (`trip_plans`)          -> FK: `user_id` (ref: User)
 * 11. Wishlist (`wishlists`)            -> FK: `plan_id` (ref: TripPlan), `location_id` (ref: Location)
 * 12. PlanDetails (`plan_details`)      -> FK: `plan_id` (ref: TripPlan), `location_id` (ref: Location), `hotel_id` (ref: Hotel)
 * 13. Trips (`trips`)                   -> FK: `plan_id` (ref: TripPlan), `user_id` (ref: User)
 * 14. Reports (`reports`)               -> FK: `content_id` (ref: Content), `reporter_id` (ref: User), `handled_by` (ref: User)
 * 15. Notifications (`notifications`)   -> FK: `user_id` (ref: User)
 * (+ Các collection bổ trợ tương thích Frontend: `comments`, `venues`, `reels`, `flights`, `activities`, `bus_trips`, `live_streams`, `saved_trips`)
 * ============================================================================
 */

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true, default: [109.1932, 11.7145] } // [longitude, latitude]
  },
  { _id: false }
);

/**
 * 1. USERS COLLECTION (`users`)
 */
const UserSchema = new Schema(
  {
    code: { type: String, index: true },
    full_name: { type: String, required: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    phone_number: { type: String },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    role: {
      type: String,
      enum: ['tourist', 'provider', 'admin'],
      default: 'tourist',
      index: true
    },
    handle: { type: String },
    bio: { type: String },
    location: { type: String },
    coverImage: { type: String },
    level: { type: String, default: 'Thành viên Mới' },
    membershipTier: { type: String, default: 'MEMBER' },
    points: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    socials: Schema.Types.Mixed,
    interests: [String],
    badges: [{ icon: String, label: String }],
    created_at: { type: Date, default: Date.now }
  },
  { collection: 'users' }
);

/**
 * 2. PROVIDERS COLLECTION (`providers`)
 * FK: `user_id` -> `users._id` (1:1 UNIQUE)
 */
const ProviderSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    business_name: { type: String, required: true },
    business_license: { type: String, required: true },
    verification_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    verified_at: { type: Date, default: Date.now }
  },
  { collection: 'providers' }
);

/**
 * 3. LOCATIONS COLLECTION (`locations`)
 * Các địa điểm tham quan, nhà hàng Michelin, bến du thuyền Catamaran
 */
const LocationSchema = new Schema(
  {
    slug: { type: String, index: true },
    name: { type: String, required: true },
    location_category: {
      type: String,
      enum: ['attraction', 'restaurant', 'cafe', 'shopping', 'nature', 'other'],
      default: 'attraction',
      index: true
    },
    address: { type: String, required: true },
    city: { type: String, index: true },
    latitude: { type: Number, required: true, default: 11.7145 },
    longitude: { type: Number, required: true, default: 109.1932 },
    geo: { type: GeoPointSchema, required: true },
    entry_fee: { type: Number, default: 0 },
    requires_reservation: { type: Boolean, default: true },
    reservation_duration: { type: Number, default: 120 },
    location_description: { type: String },
    image_url: { type: String },
    rating: { type: Number, default: 4.95 },
    review_count: { type: Number, default: 310 },
    unit: { type: String, default: '/ người' },
    tag: { type: String, default: 'Trải Nghiệm Thượng Lưu' },
    drawerKey: { type: String, enum: ['resort', 'dining', 'yacht'], default: 'dining' },
    features: [{ icon: String, label: String }]
  },
  { collection: 'locations', timestamps: true }
);
LocationSchema.index({ geo: '2dsphere' });

/**
 * 4. HOTELS COLLECTION (`hotels`)
 * FK: `provider_id` -> `providers._id` (N:1)
 */
const HotelSchema = new Schema(
  {
    id: { type: String, index: true }, // Slug tương thích Frontend (vd: 'hotel-amanoi-vinh-hy', 'demo-pine')
    hotel_slug: { type: String, index: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    hotel_name: { type: String, required: true },
    name: { type: String }, // Alias cho Frontend
    description: { type: String },
    address: { type: String, required: true },
    city: { type: String, index: true },
    area: { type: String },
    latitude: { type: Number, required: true, default: 11.7145 },
    longitude: { type: Number, required: true, default: 109.1932 },
    geo: { type: GeoPointSchema, required: true },
    star_rating: { type: Number, min: 1, max: 5, default: 5 },
    stars: { type: Number, default: 5 }, // Alias cho Frontend
    total_rooms: { type: Number, default: 36 },
    hotel_amenities: [String],
    amenities: [String], // Alias cho Frontend
    policies: [String],
    check_in_time: { type: String, default: '14:00:00' },
    check_out_time: { type: String, default: '12:00:00' },
    price_per_night: { type: Number, default: 15000000 },
    pricePerNight: { type: Number, default: 15000000 },
    originalPrice: { type: Number, default: 21000000 },
    discountPercent: { type: Number, default: 28 },
    soldPercent: { type: Number, default: 84 },
    rating: { type: Number, default: 9.8 },
    reviewCount: { type: Number, default: 420 },
    accommodation: { type: String, default: 'Khu nghỉ dưỡng (Resort)' },
    accommodationType: { type: String, default: 'Khu nghỉ dưỡng (Resort)' },
    image_url: { type: String },
    imageUrl: { type: String },
    images: [String],
    isFlashDeal: { type: Boolean, default: true },
    isLuxuryStay: { type: Boolean, default: true },
    isBestSeller: { type: Boolean, default: true },
    perks: [String],
    specialOffer: { type: String },
    rooms: [Schema.Types.Mixed]
  },
  { collection: 'hotels', timestamps: true }
);
HotelSchema.index({ geo: '2dsphere' });
HotelSchema.index({ city: 1, price_per_night: 1 });

/**
 * 5. ROOMS COLLECTION (`rooms`)
 * FK: `hotel_id` -> `hotels._id` (N:1)
 */
const RoomSchema = new Schema(
  {
    code: { type: String, index: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    room_name: { type: String, required: true },
    room_type: {
      type: String,
      enum: ['single', 'double', 'twin', 'suite', 'family'],
      default: 'suite'
    },
    capacity: { type: Number, required: true, default: 2 },
    room_price: { type: Number, required: true },
    total_units: { type: Number, default: 5, min: 1 },
    stock: { type: Number, default: 5, min: 0 },
    room_status: {
      type: String,
      enum: ['available', 'maintenance', 'inactive'],
      default: 'available',
      index: true
    },
    room_description: { type: String },
    room_amenities: [String],
    room_images: [String],
    size_m2: { type: Number, default: 95 },
    bed: { type: String, default: '1 giường King hướng vịnh' },
    breakfast: { type: Boolean, default: true }
  },
  { collection: 'rooms', timestamps: true }
);

/**
 * 6. BOOKINGS COLLECTION (`bookings`)
 * FK: `user_id` -> `users._id`, `room_id` -> `rooms._id`
 */
const BookingSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    room_id: { type: Schema.Types.ObjectId, ref: 'Room', index: true, default: null },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', index: true, default: null },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    check_in: { type: Date, required: true },
    check_out: { type: Date, required: true },
    total_price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    items: [Schema.Types.Mixed],
    booking_status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
      default: 'confirmed',
      index: true
    },
    booking_code: { type: String, required: true, unique: true, index: true },
    created_at: { type: Date, default: Date.now },
    // Các trường mở rộng tương thích UI Checkout & TripShorts
    bookingCode: { type: String },
    bookingType: { type: String, default: 'hotel' },
    title: { type: String },
    location: { type: String },
    customerName: { type: String },
    customerPhone: { type: String },
    customerEmail: { type: String },
    guests: { type: Number, default: 2 },
    totalPriceVnd: { type: Number },
    status: { type: String, default: 'CONFIRMED' },
    details: Schema.Types.Mixed
  },
  { collection: 'bookings' }
);

/**
 * 7. PAYMENTS COLLECTION (`payments`)
 * FK: `booking_id` -> `bookings._id` (1:1 UNIQUE)
 */
const PaymentSchema = new Schema(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    payment_method: {
      type: String,
      enum: ['credit_card', 'e_wallet', 'bank_transfer'],
      default: 'e_wallet'
    },
    transaction_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    payment_status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    },
    paid_at: { type: Date, default: Date.now }
  },
  { collection: 'payments' }
);

/**
 * 8. CONTENTS COLLECTION (`contents` - Phục vụ phân hệ TripShorts / Video Reels)
 * FK: `user_id` -> `users._id` (Creator), kèm `hotspots` & `location_tags` liên kết `hotel_id`, `room_id`, `location_id`
 */
const ContentHotspotPinSchema = new Schema(
  {
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', default: null },
    room_id: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    venueId: { type: String },
    key: { type: String, enum: ['resort', 'dining', 'yacht'], default: 'resort' },
    tag: { type: String },
    title: { type: String },
    location: { type: String },
    price: { type: String },
    unit: { type: String },
    rating: { type: String },
    reviews: { type: String },
    desc: { type: String },
    img: { type: String },
    image: { type: String },
    features: [{ icon: String, label: String }]
  },
  { _id: false }
);

const ContentSchema = new Schema(
  {
    code: { type: String, index: true }, // Mã định danh ngắn (vd: 'reel_amanoi_vinh_hy_01')
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content_title: { type: String, required: true },
    content_description: { type: String },
    caption: { type: String },
    image_url: { type: String },
    video_url: { type: String, required: true },
    location_name: { type: String, default: 'Vịnh Vĩnh Hy, Ninh Thuận' },
    drawerKey: { type: String, enum: ['resort', 'dining', 'yacht'], default: 'resort' },
    category: { type: String, enum: ['for-you', 'trending', 'latest'], default: 'for-you', index: true },
    location_tags: [
      {
        tag_type: { type: String, enum: ['resort', 'dining', 'yacht'] },
        hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', default: null },
        room_id: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
        location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null }
      }
    ],
    hotspots: {
      resort: ContentHotspotPinSchema,
      dining: ContentHotspotPinSchema,
      yacht: ContentHotspotPinSchema
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      bookmarks: { type: Number, default: 0 }
    },
    isLiked: { type: Boolean, default: false },
    isBookmarked: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'contents' }
);
ContentSchema.index({ created_at: -1, 'stats.likes': -1 });
ContentSchema.index({ createdAt: -1, 'stats.likes': -1 });

/**
 * 9. LOCATION_TAGS COLLECTION (`location_tags`)
 * FK: `content_id` -> `contents._id`, `location_id` -> `locations._id`, `hotel_id` -> `hotels._id`
 */
const LocationTagSchema = new Schema(
  {
    content_id: { type: Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', default: null, index: true },
    room_id: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
    tag_type: { type: String, enum: ['resort', 'dining', 'yacht'], default: 'resort' }
  },
  { collection: 'location_tags' }
);

/**
 * 10. TRIP_PLANS COLLECTION (`trip_plans`)
 * FK: `user_id` -> `users._id`
 */
const TripPlanSchema = new Schema(
  {
    code: { type: String, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan_name: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    estimated_budget: { type: Number, default: 25000000 },
    note: { type: String },
    places: [String],
    itinerary: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now }
  },
  { collection: 'trip_plans' }
);

/**
 * 11. WISHLIST COLLECTION (`wishlists`)
 * FK: `plan_id` -> `trip_plans._id`, `location_id` -> `locations._id` (UNIQUE composite)
 */
const WishlistSchema = new Schema(
  {
    plan_id: { type: Schema.Types.ObjectId, ref: 'TripPlan', required: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', default: null },
    added_at: { type: Date, default: Date.now }
  },
  { collection: 'wishlists' }
);
WishlistSchema.index({ plan_id: 1, location_id: 1 }, { unique: true });

/**
 * 12. PLAN_DETAILS COLLECTION (`plan_details`)
 * FK: `plan_id` -> `trip_plans._id`, `location_id` -> `locations._id`, `hotel_id` -> `hotels._id`
 */
const PlanDetailSchema = new Schema(
  {
    plan_id: { type: Schema.Types.ObjectId, ref: 'TripPlan', required: true, index: true },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', default: null },
    visit_date: { type: Date, required: true },
    start_time: { type: String, default: '09:00:00' },
    sequence_order: { type: Number, required: true },
    note: { type: String }
  },
  { collection: 'plan_details' }
);

/**
 * 13. TRIPS COLLECTION (`trips`)
 * FK: `plan_id` -> `trip_plans._id`, `user_id` -> `users._id`
 */
const TripSchema = new Schema(
  {
    plan_id: { type: Schema.Types.ObjectId, ref: 'TripPlan', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trip_status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    confirmed_at: { type: Date, default: Date.now },
    note: { type: String }
  },
  { collection: 'trips' }
);

/**
 * 14. REPORTS COLLECTION (`reports`)
 * FK: `content_id` -> `contents._id`, `reporter_id` -> `users._id`, `handled_by` -> `users._id`
 */
const ReportSchema = new Schema(
  {
    content_id: { type: Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    reporter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'false_info', 'copyright', 'other'],
      default: 'other'
    },
    details: { type: String },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'resolved'
    },
    handled_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    created_at: { type: Date, default: Date.now }
  },
  { collection: 'reports' }
);

/**
 * 15. NOTIFICATIONS COLLECTION (`notifications`)
 * FK: `user_id` -> `users._id`
 */
const NotificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['booking', 'promotion', 'system', 'trip_reminder'],
      default: 'booking'
    },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
  },
  { collection: 'notifications' }
);

/**
 * ============================================================================
 * CÁC COLLECTION BỔ TRỢ TƯƠNG THÍCH CÁC PHÂN HỆ FRONTEND HIỆN CÓ
 * ============================================================================
 */
const CommentSchema = new Schema(
  {
    content_id: { type: Schema.Types.ObjectId, ref: 'Content', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    reelId: { type: String, index: true },
    reelShortId: { type: String, index: true },
    user: { type: String, required: true },
    author: { type: String },
    time: { type: String, default: 'Vừa xong' },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
    },
    text: { type: String, required: true },
    content: { type: String },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'comments' }
);
CommentSchema.index({ reelId: 1, createdAt: -1 });
CommentSchema.index({ content_id: 1, createdAt: -1 });

const VenueSchema = new Schema(
  {
    _id: { type: String, required: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', default: null },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    room_id: { type: Schema.Types.ObjectId, ref: 'Room', default: null },
    slug: { type: String, index: true },
    type: { type: String, enum: ['resort', 'dining', 'yacht', 'destination'], default: 'resort' },
    key: { type: String, enum: ['resort', 'dining', 'yacht'], default: 'resort' },
    tag: String,
    name: { type: String, required: true },
    title: String,
    subtitle: String,
    badge: String,
    category: { type: String, default: 'resort' },
    rating: String,
    ratingNumber: Number,
    ratingText: String,
    reviews: String,
    reviewCount: Number,
    location: String,
    price: String,
    unit: String,
    startingPrice: Number,
    originalPrice: Number,
    discountPrice: Number,
    discountPercent: Number,
    soldPercent: Number,
    tagBadge: String,
    isBestSeller: Boolean,
    isFlashDeal: Boolean,
    isPopularDestination: Boolean,
    isLuxuryStay: Boolean,
    videoCount: { type: Number, default: 18 },
    roomType: String,
    specialOffer: String,
    desc: String,
    description: String,
    image: String,
    imageUrl: String,
    img: String,
    features: [{ icon: String, label: String }],
    perks: [String],
    geoLocation: {
      city: String,
      province: String,
      address: String,
      geo: GeoPointSchema
    }
  },
  { collection: 'venues', timestamps: true }
);
VenueSchema.index({ 'geoLocation.geo': '2dsphere' });

const ReelSchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, required: true, index: true },
    content_id: { type: Schema.Types.ObjectId, ref: 'Content', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    slug: String,
    title: { type: String, required: true },
    caption: String,
    desc: String,
    hashtags: [String],
    author: String,
    creator: {
      userId: String,
      handle: String,
      displayName: String,
      avatarUrl: String,
      isVerified: Boolean
    },
    avatar: String,
    creatorAvatar: String,
    media: {
      videoUrl: String,
      posterUrl: String,
      durationSec: Number,
      aspectRatio: { type: String, default: '9:16' },
      resolution: { type: String, default: '1080x1920' }
    },
    image: String,
    videoUrl: String,
    duration: String,
    drawerKey: { type: String, enum: ['resort', 'dining', 'yacht'], default: 'resort' },
    location: String,
    locationGeo: {
      name: String,
      city: String,
      country: { type: String, default: 'Vietnam' },
      geo: GeoPointSchema
    },
    music: { trackName: String, artist: String },
    hotspotVenueIds: {
      resort: { type: String, ref: 'Venue' },
      dining: { type: String, ref: 'Venue' },
      yacht: { type: String, ref: 'Venue' }
    },
    hotspots: {
      resort: ContentHotspotPinSchema,
      dining: ContentHotspotPinSchema,
      yacht: ContentHotspotPinSchema
    },
    likes: String,
    views: String,
    commentsCount: { type: Number, default: 0 },
    shares: String,
    bookmarks: String,
    isLiked: { type: Boolean, default: false },
    isBookmarked: { type: Boolean, default: false },
    category: { type: String, enum: ['for-you', 'trending', 'latest'], default: 'for-you' },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      bookmarks: { type: Number, default: 0 }
    },
    ranking: {
      trendingScore: { type: Number, default: 95 },
      engagementRate: { type: Number, default: 0.24 },
      status: { type: String, enum: ['ACTIVE', 'HIDDEN'], default: 'ACTIVE' }
    },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'reels' }
);
ReelSchema.index({ 'ranking.status': 1, 'ranking.trendingScore': -1, _id: -1 });
ReelSchema.index({ 'locationGeo.geo': '2dsphere' });

const ReelInteractionSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `inter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    },
    reelId: { type: String, required: true },
    userId: { type: String, required: true, default: 'guest_demo_user' },
    isLiked: { type: Boolean, default: false },
    isBookmarked: { type: Boolean, default: false },
    watchCount: { type: Number, default: 0 },
    maxWatchDurationSec: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    clickedHotspotKeys: [String],
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: 'reel_interactions' }
);
ReelInteractionSchema.index({ reelId: 1, userId: 1 }, { unique: true });

const LiveStreamSchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, required: true },
    title: { type: String, required: true },
    host: String,
    avatar: String,
    viewers: String,
    viewerCount: { type: Number, default: 0 },
    location: String,
    image: String,
    pinnedVenueId: String,
    voucherCode: String,
    status: { type: String, enum: ['LIVE', 'ENDED'], default: 'LIVE' }
  },
  { collection: 'live_streams' }
);

const FlightSchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, required: true },
    airlineCode: String,
    airlineName: String,
    flightNumber: String,
    from: { type: String, index: true },
    to: { type: String, index: true },
    departure: String,
    arrival: String,
    durationMinutes: Number,
    stops: { type: Number, default: 0 },
    price: Number,
    originalPrice: Number,
    currency: { type: String, default: 'VND' },
    baggageDescription: String,
    checkedBaggageIncluded: Boolean,
    carryOnIncluded: Boolean,
    aircraft: String,
    departureTerminal: String,
    arrivalTerminal: String
  },
  { collection: 'flights', timestamps: true }
);

const ActivitySchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    city: { type: String, index: true },
    address: String,
    categories: [String],
    imageUrl: String,
    description: String,
    priceFrom: Number,
    originalPrice: Number,
    currency: { type: String, default: 'VND' },
    rating: Number,
    reviewCount: Number,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    geo: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: undefined }
    }
  },
  { collection: 'activities', timestamps: true }
);

const BusTripSchema = new Schema(
  {
    _id: { type: String, required: true },
    operatorId: String,
    operatorName: String,
    routeKey: { type: String, index: true },
    from: String,
    to: String,
    hour: Number,
    minute: Number,
    price: Number,
    currency: { type: String, default: 'VND' },
    vehicle: String,
    durationMinutes: Number,
    amenities: [String]
  },
  { collection: 'bus_trips', timestamps: true }
);

const SavedTripSchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, required: true, index: true },
    plan_id: { type: Schema.Types.ObjectId, ref: 'TripPlan' },
    userId: { type: String, default: '', index: true },
    name: { type: String, required: true },
    createdAt: { type: String, required: true },
    places: [String],
    itinerary: Schema.Types.Mixed
  },
  { collection: 'saved_trips', timestamps: true }
);

const CartItemSchema = new Schema(
  {
    session_key: { type: String, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    hotel_id: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    room_id: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    hotel_name: { type: String },
    hotel_slug: { type: String },
    room_name: { type: String },
    unit_price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    check_in: { type: Date, required: true },
    check_out: { type: Date, required: true },
    image_url: { type: String }
  },
  { collection: 'cart_items', timestamps: true }
);
CartItemSchema.index({ session_key: 1, room_id: 1, check_in: 1, check_out: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Provider = mongoose.models.Provider || mongoose.model('Provider', ProviderSchema);
const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);
const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', HotelSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const Content = mongoose.models.Content || mongoose.model('Content', ContentSchema);
const LocationTag = mongoose.models.LocationTag || mongoose.model('LocationTag', LocationTagSchema);
const TripPlan = mongoose.models.TripPlan || mongoose.model('TripPlan', TripPlanSchema);
const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', WishlistSchema);
const PlanDetail = mongoose.models.PlanDetail || mongoose.model('PlanDetail', PlanDetailSchema);
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
const Notification =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
const Venue = mongoose.models.Venue || mongoose.model('Venue', VenueSchema);
const Reel = mongoose.models.Reel || mongoose.model('Reel', ReelSchema);
const ReelInteraction =
  mongoose.models.ReelInteraction || mongoose.model('ReelInteraction', ReelInteractionSchema);
const LiveStream = mongoose.models.LiveStream || mongoose.model('LiveStream', LiveStreamSchema);
const Flight = mongoose.models.Flight || mongoose.model('Flight', FlightSchema);
const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
const BusTrip = mongoose.models.BusTrip || mongoose.model('BusTrip', BusTripSchema);
const SavedTrip = mongoose.models.SavedTrip || mongoose.model('SavedTrip', SavedTripSchema);
const CartItem = mongoose.models.CartItem || mongoose.model('CartItem', CartItemSchema);

module.exports = {
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
  Notification,
  Comment,
  Venue,
  Reel,
  ReelInteraction,
  LiveStream,
  Flight,
  Activity,
  BusTrip,
  SavedTrip,
  CartItem
};
