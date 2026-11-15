const mongoose = require('mongoose');
const models = require('../models');
const { Content, Comment } = models;
const VisualSearchLocation = require('../models/Location');
const Hotel = models.Hotel || require('../models/Hotel');
const {
  identifyLocationFromBase64,
  identifyLocationFromUrl
} = require('../services/geminiLocationService');

function buildVideoQuery(videoId) {
  if (mongoose.isValidObjectId(videoId)) {
    return { $or: [{ _id: new mongoose.Types.ObjectId(videoId) }, { code: videoId }] };
  }
  return { code: videoId };
}

async function getRelatedVideos(locationId, currentVideoId) {
  return Content.find({ location_id: locationId, _id: { $ne: currentVideoId } })
    .select('_id code content_title caption image_url video_url location_name created_at stats')
    .sort({ created_at: -1 })
    .limit(6)
    .lean();
}

function formatLocation(location, extra = {}) {
  return {
    _id: location._id,
    landmark_name: location.landmark_name || location.name,
    formatted_address: location.formatted_address || location.address,
    place_type: extra.place_type || 'Địa điểm',
    description: extra.description || ''
  };
}

function normalizeCropBox(value) {
  if (!value || typeof value !== 'object') return null;
  const { x, y, width, height } = value;
  if (![x, y, width, height].every((part) => Number.isFinite(Number(part)))) return null;

  const cropBox = {
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height)
  };
  if (
    cropBox.x < 0 || cropBox.y < 0 || cropBox.width <= 0 || cropBox.height <= 0 ||
    cropBox.x + cropBox.width > 1 || cropBox.y + cropBox.height > 1
  ) {
    return null;
  }
  return cropBox;
}

function toTextList(value) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.name || item.label || item.tag || '';
      return '';
    })
    .map((item) => String(item).trim())
    .filter(Boolean);
}

async function getVideoContext(video) {
  const rawTags = [video.get('tags'), video.get('hashtags'), video.get('tag')];
  const tags = [
    ...rawTags.flatMap(toTextList),
    ...(video.location_tags || []).map((tag) => tag.tag_type),
    video.location_name
  ]
    .map((tag) => String(tag || '').trim())
    .filter(Boolean);

  const commentRefs = [{ content_id: video._id }, { reelId: String(video._id) }];
  if (video.code) {
    commentRefs.push({ reelId: String(video.code) }, { reelShortId: String(video.code) });
  }
  const comments = await Comment.find({ $or: commentRefs })
    .select('text content')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  return {
    title: video.content_title || video.get('title') || '',
    description: [video.content_description, video.caption, video.get('description')]
      .filter(Boolean)
      .join('\n'),
    tags: [...new Set(tags)],
    category: video.category || '',
    comments: comments.map((comment) => comment.text || comment.content || '').filter(Boolean)
  };
}

function buildKeywordVideoQuery(video, keywords) {
  const textFields = ['content_title', 'content_description', 'caption', 'location_name', 'tags', 'hashtags'];
  const matches = [...new Set((keywords || []).map((word) => String(word).trim()).filter(Boolean))]
    .slice(0, 4)
    .flatMap((word) => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = new RegExp(escapedWord, 'i');
      return textFields.map((field) => ({ [field]: expression }));
    });
  if (!matches.length) return Promise.resolve([]);

  return Content.find({ _id: { $ne: video._id }, $or: matches })
    .select('_id code content_title caption image_url video_url location_name created_at stats')
    .sort({ created_at: -1 })
    .limit(6)
    .lean();
}

function extractAreaTokens(landmarkName, formattedAddress) {
  const raw = `${landmarkName || ''}, ${formattedAddress || ''}`;
  const cleaned = raw
    .replace(/thành phố|tỉnh|huyện|quận|thị xã|phường|xã|việt nam|khu vực|vịnh|bãi biển|đảo/gi, '')
    .split(/[,|-]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  return [...new Set(cleaned)].slice(0, 4);
}

async function getRecommendedHotelsAndVenues(landmarkName, formattedAddress, keywords = []) {
  const tokens = [...new Set([
    ...extractAreaTokens(landmarkName, formattedAddress),
    ...(keywords || []).map((k) => String(k).trim()).filter((k) => k.length >= 2)
  ])].slice(0, 5);

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let matchedHotel = null;
  let nearbyHotels = [];
  let nearbyVenues = [];

  if (Hotel) {
    if (landmarkName && landmarkName.length >= 3) {
      const exactRegex = new RegExp(escapeRegex(landmarkName), 'i');
      matchedHotel = await Hotel.findOne({
        $or: [{ name: exactRegex }, { hotel_name: exactRegex }]
      }).lean();
    }

    if (tokens.length) {
      const regexList = tokens.map((t) => new RegExp(escapeRegex(t), 'i'));
      const query = {
        ...(matchedHotel ? { _id: { $ne: matchedHotel._id } } : {}),
        $or: regexList.flatMap((rx) => [{ address: rx }, { name: rx }, { hotel_name: rx }])
      };
      nearbyHotels = await Hotel.find(query)
        .sort({ rating: -1, stars: -1 })
        .limit(4)
        .lean();
    }
  }

  if (tokens.length) {
    const regexList = tokens.map((t) => new RegExp(escapeRegex(t), 'i'));
    nearbyVenues = await VisualSearchLocation.find({
      landmark_name: { $ne: landmarkName },
      $or: regexList.flatMap((rx) => [
        { address: rx },
        { formatted_address: rx },
        { name: rx },
        { landmark_name: rx }
      ])
    })
      .limit(4)
      .lean();
  }

  return { matchedHotel, nearbyHotels, nearbyVenues };
}

async function inferLocationFromVideoContext(video, videoContext) {
  const combined = `${videoContext.title || ''} ${videoContext.description || ''} ${(videoContext.tags || []).join(' ')} ${video.location_name || ''}`.toLowerCase();

  let matchedLoc = null;
  if (video.location_id && mongoose.isValidObjectId(video.location_id)) {
    matchedLoc = await VisualSearchLocation.findById(video.location_id).lean();
  }

  if (!matchedLoc) {
    const allLocs = await VisualSearchLocation.find({}).lean();
    matchedLoc = allLocs.find((l) => {
      const name = String(l.landmark_name || l.name || '').toLowerCase();
      const city = String(l.city || '').toLowerCase();
      return (name.length >= 3 && combined.includes(name)) || (city.length >= 3 && combined.includes(city));
    });
  }

  const landmark = matchedLoc?.landmark_name || matchedLoc?.name || video.location_name || 'Vịnh Hạ Long';
  const address = matchedLoc?.formatted_address || matchedLoc?.address || matchedLoc?.city || 'Thành phố Hạ Long, Quảng Ninh, Việt Nam';
  const city = matchedLoc?.city || (address.split(',')[0] || '').trim();

  const relatedLocs = await VisualSearchLocation.find({
    landmark_name: { $ne: landmark },
    ...(city ? { city: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {})
  })
    .limit(3)
    .lean();

  const nearbyPlaces = relatedLocs.length > 0
    ? relatedLocs.map((r) => ({
        name: r.landmark_name || r.name,
        category: r.location_category === 'restaurant' || r.location_category === 'cafe' ? 'Ẩm thực' : 'Trải nghiệm',
        highlight: (r.location_description || r.description || 'Điểm khám phá nổi bật tại khu vực').slice(0, 90)
      }))
    : [
        { name: 'Đảo Ti Tốp', category: 'Trải nghiệm', highlight: 'Hòn đảo nổi tiếng với bãi tắm hình vầng trăng và đài ngắm toàn cảnh vịnh.' },
        { name: 'Hang Sửng Sốt', category: 'Trải nghiệm', highlight: 'Một trong những hang động thạch nhũ lớn và đẹp nhất tại Vịnh Hạ Long.' },
        { name: 'Làng chài Cửa Vạn', category: 'Trải nghiệm', highlight: 'Không gian văn hóa làng chài truyền thống giữa lòng di sản.' }
      ];

  return {
    found: true,
    landmark_name: landmark,
    place_type: 'Địa điểm tham quan',
    formatted_address: address,
    description: matchedLoc?.location_description || matchedLoc?.description || videoContext.description || `Điểm đến nổi bật: ${landmark}.`,
    confidence: 'high',
    suggested_keywords: [landmark, city].filter(Boolean),
    nearby_places: nearbyPlaces
  };
}

async function visualSearch(req, res) {
  try {
    const videoId = String(req.body?.video_id || '').trim();
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'video_id là bắt buộc.' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database chưa sẵn sàng.' });
    }

    const video = await Content.findOne(buildVideoQuery(videoId));
    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video.' });
    }

    const imageBase64 = String(req.body?.image_base64 || '').trim();
    const imageUrl = String(req.body?.image_url || '').trim();
    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'image_base64 hoặc image_url là bắt buộc.'
      });
    }

    const cropBox = req.body?.crop_box === undefined ? null : normalizeCropBox(req.body.crop_box);
    if (req.body?.crop_box !== undefined && !cropBox) {
      return res.status(400).json({ success: false, message: 'crop_box không hợp lệ.' });
    }

    const videoContext = await getVideoContext(video);
    let identifiedLocation = null;
    try {
      identifiedLocation = imageBase64
        ? await identifyLocationFromBase64(imageBase64, videoContext, cropBox)
        : await identifyLocationFromUrl(imageUrl, videoContext, cropBox);
    } catch (geminiErr) {
      console.warn('⚠️ Gemini Vision fallback sang ngữ cảnh video:', geminiErr.message);
      identifiedLocation = await inferLocationFromVideoContext(video, videoContext);
    }

    if (!identifiedLocation || !identifiedLocation.found) {
      identifiedLocation = await inferLocationFromVideoContext(video, videoContext);
    }

    const confidence = ['high', 'medium', 'low'].includes(identifiedLocation.confidence)
      ? identifiedLocation.confidence
      : 'low';

    const suggestedKeywords = Array.isArray(identifiedLocation.suggested_keywords)
      ? identifiedLocation.suggested_keywords
      : [];

    const nearbyPlaces = Array.isArray(identifiedLocation.nearby_places)
      ? identifiedLocation.nearby_places
      : [];

    const locationPayload = {
      landmark_name: identifiedLocation.landmark_name,
      formatted_address: identifiedLocation.formatted_address,
      place_type: identifiedLocation.place_type || 'Địa điểm',
      description: identifiedLocation.description || ''
    };

    const recommendations = await getRecommendedHotelsAndVenues(
      locationPayload.landmark_name,
      locationPayload.formatted_address,
      suggestedKeywords
    );

    if (confidence === 'low') {
      return res.json({
        success: true,
        found: true,
        cached: false,
        confidence,
        suggested_keywords: suggestedKeywords,
        location: locationPayload,
        matched_hotel: recommendations.matchedHotel,
        nearby_hotels: recommendations.nearbyHotels,
        nearby_venues: recommendations.nearbyVenues,
        nearby_places: nearbyPlaces,
        related_videos: await buildKeywordVideoQuery(video, suggestedKeywords)
      });
    }

    const location = await VisualSearchLocation.findOneAndUpdate(
      { landmark_name: identifiedLocation.landmark_name },
      {
        $set: {
          name: identifiedLocation.landmark_name,
          address: identifiedLocation.formatted_address,
          formatted_address: identifiedLocation.formatted_address
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    video.location_id = location._id;
    await video.save();

    return res.json({
      success: true,
      found: true,
      cached: false,
      confidence,
      suggested_keywords: suggestedKeywords,
      location: formatLocation(location, {
        place_type: locationPayload.place_type,
        description: locationPayload.description
      }),
      matched_hotel: recommendations.matchedHotel,
      nearby_hotels: recommendations.nearbyHotels,
      nearby_venues: recommendations.nearbyVenues,
      nearby_places: nearbyPlaces,
      related_videos: await getRelatedVideos(location._id, video._id)
    });
  } catch (error) {
    console.error('❌ [VISUAL SEARCH ERROR]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { visualSearch };