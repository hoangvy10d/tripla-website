const mongoose = require('mongoose');
const {
  getPreparedSeedData,
  buildHotspotFromVenue,
  buildHotspotFromHotelAndRoom,
  buildHotspotFromLocation
} = require('../seed');

const memoryStore = getPreparedSeedData();

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

function formatCompactCount(num) {
  const n = Number(num) || 0;
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(n);
}

/**
 * Chuẩn hóa document từ collection `Contents` (hoặc `Reels`) sau khi `.populate()`
 * để trả về đầy đủ cả schema ERD (`user_id`, `content_title`, `video_url`, `hotel_id`, `room_id`, `location_id`)
 * lẫn schema hiển thị của Angular `TripShorts` (`HubVideo`, `PointData`).
 */
function enrichContentDoc(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  // Thông tin Creator từ `.populate('user_id', 'full_name avatar role handle')`
  const populatedUser =
    plain.user_id && typeof plain.user_id === 'object' && plain.user_id.full_name
      ? plain.user_id
      : memoryStore.users.find((u) => String(u._id) === String(plain.user_id)) || memoryStore.users[2];

  // Thông tin Hotel & Room từ `.populate('hotspots.resort.hotel_id')` & `room_id`
  const resortPin = plain.hotspots?.resort || {};
  const populatedHotel =
    resortPin.hotel_id && typeof resortPin.hotel_id === 'object' && resortPin.hotel_id.hotel_name
      ? resortPin.hotel_id
      : memoryStore.hotels.find(
          (h) => String(h._id) === String(resortPin.hotel_id || resortPin.venueId)
        ) || memoryStore.hotels[0];

  const populatedRoom =
    resortPin.room_id && typeof resortPin.room_id === 'object' && resortPin.room_id.room_name
      ? resortPin.room_id
      : memoryStore.rooms.find(
          (rm) =>
            String(rm._id) === String(resortPin.room_id) ||
            String(rm.hotel_id) === String(populatedHotel?._id)
        ) || memoryStore.rooms[0];

  // Thông tin Location từ `.populate('hotspots.dining.location_id')` & `yacht.location_id`
  const diningPin = plain.hotspots?.dining || {};
  const populatedDiningLoc =
    diningPin.location_id && typeof diningPin.location_id === 'object' && diningPin.location_id.name
      ? diningPin.location_id
      : memoryStore.locations.find(
          (l) => String(l._id) === String(diningPin.location_id || diningPin.venueId)
        ) || memoryStore.locations[0];

  const yachtPin = plain.hotspots?.yacht || {};
  const populatedYachtLoc =
    yachtPin.location_id && typeof yachtPin.location_id === 'object' && yachtPin.location_id.name
      ? yachtPin.location_id
      : memoryStore.locations.find(
          (l) => String(l._id) === String(yachtPin.location_id || yachtPin.venueId)
        ) || memoryStore.locations[1];

  const hotspots = {
    resort: {
      ...buildHotspotFromHotelAndRoom(populatedHotel, populatedRoom),
      ...resortPin,
      hotel_id: populatedHotel?._id || resortPin.hotel_id,
      room_id: populatedRoom?._id || resortPin.room_id,
      venueId: String(populatedHotel?._id || resortPin.venueId || ''),
      title: populatedHotel?.hotel_name || resortPin.title || 'Amanoi Resort Vĩnh Hy',
      location: populatedHotel?.address || resortPin.location || 'Vịnh Vĩnh Hy, Ninh Thuận',
      price: `${Number(
        populatedRoom?.room_price || populatedHotel?.price_per_night || 15000000
      ).toLocaleString('vi-VN')}₫`,
      roomName: populatedRoom?.room_name || 'Ocean Pool Pavilion',
      roomPrice: Number(populatedRoom?.room_price || populatedHotel?.price_per_night || 15000000)
    },
    dining: {
      ...buildHotspotFromLocation(populatedDiningLoc, 'dining'),
      ...diningPin,
      location_id: populatedDiningLoc?._id || diningPin.location_id,
      venueId: String(populatedDiningLoc?._id || diningPin.venueId || ''),
      title: populatedDiningLoc?.name || diningPin.title,
      location: populatedDiningLoc?.address || diningPin.location,
      price: `${Number(populatedDiningLoc?.entry_fee || 4200000).toLocaleString('vi-VN')}₫`
    },
    yacht: {
      ...buildHotspotFromLocation(populatedYachtLoc, 'yacht'),
      ...yachtPin,
      location_id: populatedYachtLoc?._id || yachtPin.location_id,
      venueId: String(populatedYachtLoc?._id || yachtPin.venueId || ''),
      title: populatedYachtLoc?.name || yachtPin.title,
      location: populatedYachtLoc?.address || yachtPin.location,
      price: `${Number(populatedYachtLoc?.entry_fee || 18500000).toLocaleString('vi-VN')}₫`
    }
  };

  const stats = plain.stats || {
    views: 0,
    likes: 0,
    commentsCount: 0,
    bookmarks: 0
  };

  return {
    ...plain,
    _id: String(plain._id),
    id: plain.code || plain.id || String(plain._id),
    user_id: populatedUser,
    content_title: plain.content_title || plain.title,
    content_description: plain.content_description || plain.caption || plain.desc,
    video_url: plain.video_url || plain.videoUrl,
    image_url: plain.image_url || plain.image,
    title: plain.content_title || plain.title,
    desc: plain.caption || plain.content_description || plain.desc || plain.content_title,
    location: plain.location_name || plain.location || populatedHotel?.city || 'Việt Nam',
    author: populatedUser?.handle || (populatedUser?.full_name ? `@${populatedUser.full_name.replace(/\s+/g, '_').toLowerCase()}` : '@tripla_creator'),
    creator: {
      userId: String(populatedUser?._id || ''),
      handle: populatedUser?.handle || (populatedUser?.full_name ? `@${populatedUser.full_name.replace(/\s+/g, '_').toLowerCase()}` : '@tripla_creator'),
      displayName: populatedUser?.full_name || 'Thành viên TRIPLA',
      avatarUrl: populatedUser?.avatar || '',
      role: populatedUser?.role || 'tourist'
    },
    avatar: populatedUser?.avatar,
    creatorAvatar: populatedUser?.avatar,
    videoUrl: plain.video_url || plain.videoUrl,
    image: plain.image_url || plain.image,
    likes: formatCompactCount(stats.likes),
    views: formatCompactCount(stats.views),
    bookmarks: formatCompactCount(stats.bookmarks),
    commentsCount: Number(stats.commentsCount || 0),
    stats,
    hotspots
  };
}

module.exports = {
  memoryStore,
  isMongoConnected,
  isValidObjectId,
  formatCompactCount,
  enrichContentDoc,
   enrichReelDoc: enrichContentDoc,
  buildHotspotFromVenue,
  buildHotspotFromHotelAndRoom,
  buildHotspotFromLocation
};
