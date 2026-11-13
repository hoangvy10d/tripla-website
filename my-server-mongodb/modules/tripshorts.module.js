/**
 * MODULE 1: TRIPSHORTS (`src/app/pages/tripshort`)
 * Quản lý các Collections chuẩn ERD: `contents`, `location_tags`, `comments`, `reel_interactions`, `live_streams`
 */
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const {
  Content,
  LocationTag,
  Reel,
  Comment,
  ReelInteraction,
  LiveStream,
  User,
  Hotel,
  Room,
  Location
} = require('../models');
const {
  memoryStore,
  isMongoConnected,
  isValidObjectId,
  formatCompactCount,
  enrichContentDoc
} = require('./shared');
const { resolveAuthUser } = require('../utils/auth-middleware');

if (!Array.isArray(memoryStore.reelInteractions)) {
  memoryStore.reelInteractions = [];
}

const router = express.Router();

function buildContentIdQuery(idOrCode) {
  if (isValidObjectId(idOrCode)) {
    return { $or: [{ _id: new mongoose.Types.ObjectId(idOrCode) }, { code: idOrCode }] };
  }
  return { code: idOrCode };
}

// 1. GET /api/v1/reels/feed & GET /api/v1/contents
async function handleGetContentsFeed(req, res) {
  try {
    const tab = req.query.tab || 'for-you';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const hasExplicitPage = req.query.page !== undefined && req.query.page !== '';
    const cursor = !hasExplicitPage && req.query.cursor ? String(req.query.cursor) : null;
    const q = (req.query.q || '').trim().toLowerCase();
    const authUser = await resolveAuthUser(req);
    const authUserId = authUser ? String(authUser.id || authUser._id) : null;

    if (isMongoConnected()) {
      const filter = {};
      if (tab === 'trending' || tab === 'latest') {
        filter.category = tab;
      } else if (tab === 'saved') {
        if (authUserId) {
          const savedRows = await ReelInteraction.find({
            userId: authUserId,
            isBookmarked: true
          }).lean();
          const savedIds = savedRows.map((r) => r.reelId).filter((id) => isValidObjectId(id));
          filter._id = { $in: savedIds.map((id) => new mongoose.Types.ObjectId(id)) };
        } else {
          filter._id = { $in: [] };
        }
      }

      if (q) {
        filter.$or = [
          { content_title: { $regex: q, $options: 'i' } },
          { caption: { $regex: q, $options: 'i' } },
          { location_name: { $regex: q, $options: 'i' } }
        ];
      }

      if (cursor) {
        if (isValidObjectId(cursor)) {
          filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
        } else {
          filter.code = { $gt: cursor };
        }
      }

      const sortSpec =
        tab === 'trending'
          ? { 'stats.likes': -1, _id: 1 }
          : tab === 'latest'
            ? { created_at: -1, _id: 1 }
            : { _id: 1 };

      const total = await Content.countDocuments(filter);
      const query = Content.find(filter).sort(sortSpec);
      if (cursor) {
        query.limit(limit + 1);
      } else {
        query.skip((page - 1) * limit).limit(limit);
      }

      const docs = await query
        .populate('user_id', 'full_name avatar role handle')
        .populate({
          path: 'hotspots.resort.hotel_id',
          select: 'hotel_name address star_rating price_per_night image_url rating reviewCount city'
        })
        .populate({
          path: 'hotspots.resort.room_id',
          select: 'room_name room_type room_price capacity room_images room_description'
        })
        .populate({
          path: 'hotspots.dining.location_id',
          select: 'name address entry_fee location_description image_url rating review_count unit tag features'
        })
        .populate({
          path: 'hotspots.yacht.location_id',
          select: 'name address entry_fee location_description image_url rating review_count unit tag features'
        })
        .populate({
          path: 'location_tags.hotel_id',
          select: 'hotel_name address star_rating price_per_night'
        })
        .populate({
          path: 'location_tags.location_id',
          select: 'name address location_category entry_fee'
        })
        .lean();

      const hasMore = cursor ? docs.length > limit : page * limit < total;
      const sliced = cursor && docs.length > limit ? docs.slice(0, limit) : docs;

      const contentObjectIds = sliced
        .map((d) => d._id)
        .filter((id) => isValidObjectId(String(id)));
      const contentIdStrings = sliced.map((d) => String(d._id));

      const [tagRows, interactionRows] = await Promise.all([
        contentObjectIds.length > 0
          ? LocationTag.find({ content_id: { $in: contentObjectIds } })
              .populate('hotel_id', 'hotel_name address star_rating price_per_night')
              .populate('location_id', 'name address location_category entry_fee')
              .lean()
          : Promise.resolve([]),
        authUserId && contentIdStrings.length > 0
          ? ReelInteraction.find({
              userId: authUserId,
              reelId: { $in: contentIdStrings }
            }).lean()
          : Promise.resolve([])
      ]);

      const tagsByContent = new Map();
      for (const tag of tagRows) {
        const key = String(tag.content_id);
        if (!tagsByContent.has(key)) tagsByContent.set(key, []);
        tagsByContent.get(key).push(tag);
      }

      const interactionByContent = new Map();
      for (const row of interactionRows) {
        interactionByContent.set(String(row.reelId), row);
      }

      const items = sliced.map((d) => {
        const enriched = enrichContentDoc(d);
        const inter = interactionByContent.get(String(d._id));
        const extraTags = tagsByContent.get(String(d._id));
        const likeCount = Number(enriched.stats?.likes ?? 0);
        const commentCount = Number(enriched.stats?.commentsCount ?? 0);
        return {
          ...enriched,
          location_tags:
            extraTags && extraTags.length > 0 ? extraTags : enriched.location_tags || [],
          likeCount,
          commentCount,
          commentsCount: commentCount,
          likes: formatCompactCount(likeCount),
          author:
            enriched.creator?.displayName ||
            enriched.user_id?.full_name ||
            enriched.author ||
            'Thành viên TRIPLA',
          authorHandle: enriched.author,
          isLiked: Boolean(inter?.isLiked),
          isBookmarked: Boolean(inter?.isBookmarked)
        };
      });

      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id : null;

      return res.json({
        success: true,
        source: 'mongodb-contents-populated',
        tab,
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        count: items.length,
        nextCursor,
        hasMore,
        items
      });
    }

    // Fallback in-memory
    let list = memoryStore.contents.map((c) => {
      const enriched = enrichContentDoc(c);
      const inter = authUserId
        ? memoryStore.reelInteractions.find(
            (r) => String(r.reelId) === String(c._id) && String(r.userId) === authUserId
          )
        : null;
      const likeCount = Number(enriched.stats?.likes ?? 0);
      const commentCount = Number(enriched.stats?.commentsCount ?? 0);
      return {
        ...enriched,
        likeCount,
        commentCount,
        commentsCount: commentCount,
        isLiked: Boolean(inter?.isLiked),
        isBookmarked: Boolean(inter?.isBookmarked)
      };
    });
    if (tab === 'trending' || tab === 'latest') {
      list = list.filter((r) => r.category === tab);
    } else if (tab === 'saved') {
      list = authUserId ? list.filter((r) => r.isBookmarked) : [];
    }
    if (q) {
      list = list.filter(
        (r) =>
          (r.content_title || r.title || '').toLowerCase().includes(q) ||
          (r.location || '').toLowerCase().includes(q) ||
          (r.author || '').toLowerCase().includes(q)
      );
    }

    let startIndex = (page - 1) * limit;
    if (cursor) {
      const foundIdx = list.findIndex((r) => String(r._id) === cursor || r.code === cursor || r.id === cursor);
      if (foundIdx !== -1) startIndex = foundIdx + 1;
    }

    const total = list.length;
    const sliced = list.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1]._id : null;

    return res.json({
      success: true,
      source: 'memory-seed',
      tab,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      count: sliced.length,
      nextCursor,
      hasMore,
      items: sliced
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.get('/reels/feed', handleGetContentsFeed);
router.get('/contents', handleGetContentsFeed);

// Hỗ trợ tương thích chuẩn với server.js cũ (GET /api/community -> { posts, reels })
router.get('/community', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const docs = await Content.find({})
        .populate('user_id', 'full_name avatar role handle code')
        .populate('hotspots.resort.hotel_id', 'hotel_name address star_rating price_per_night image_url')
        .populate('hotspots.dining.location_id', 'name address entry_fee image_url')
        .lean();
      const enriched = docs.map((d) => enrichContentDoc(d));
      return res.json({
        posts: enriched.slice(0, 5).map((c) => ({
          id: c.code || String(c._id),
          userId: c.user_id?.code || String(c.user_id?._id || 'u1'),
          userName: c.user_id?.full_name || 'Creator',
          userAvatar: c.user_id?.avatar || '',
          title: c.content_title || c.title,
          content: c.caption || c.description,
          image: c.image_url,
          locationIds: (c.location_tags || []).map((t) => String(t.location_id || t.hotel_id)),
          likes: c.stats?.likes || 0
        })),
        reels: enriched.map((c) => ({
          id: c.code || String(c._id),
          userId: c.user_id?.code || String(c.user_id?._id || 'u1'),
          creator: c.user_id?.full_name || 'Creator',
          avatar: c.user_id?.avatar || '',
          locationId: c.location_tags?.[0]?.location_id || c.location_tags?.[0]?.hotel_id,
          locationTitle: c.location_name || c.location || 'Việt Nam',
          videoUrl: c.video_url || c.videoSrc,
          caption: c.caption,
          hashtags: c.hashtags || [],
          likes: c.stats?.likes || 0,
          views: c.stats?.views || 0
        }))
      });
    }
    return res.json({ posts: [], reels: memoryStore.contents.map((c) => enrichContentDoc(c)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/v1/contents/:id/like & POST /api/v1/reels/:id/like
async function handleLikeContent(req, res) {
  try {
    const contentId = req.params.id;
    const authUser = await resolveAuthUser(req);
    const userId = authUser
      ? String(authUser.id || authUser._id)
      : req.body?.userId
        ? String(req.body.userId).trim()
        : '';
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để thả tim bài viết.'
      });
    }

    if (isMongoConnected()) {
      const content = await Content.findOne(buildContentIdQuery(contentId));
      if (!content) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết/video Content' });
      }

      const existingInteraction = await ReelInteraction.findOne({
        reelId: String(content._id),
        userId
      }).lean();
      const wasLiked = Boolean(existingInteraction?.isLiked);
      const nextLiked =
        typeof req.body?.isLiked === 'boolean' ? req.body.isLiked : !wasLiked;
      const delta = nextLiked === wasLiked ? 0 : nextLiked ? 1 : -1;
      const baseLikes = Number(content.stats?.likes ?? 0);
      const nextLikesCount = Math.max(0, baseLikes + delta);

      content.stats = content.stats || {};
      content.stats.likes = nextLikesCount;
      await content.save();

      await Reel.updateOne(
        { $or: [{ content_id: content._id }, { _id: content.code }] },
        {
          $set: {
            'stats.likes': nextLikesCount,
            likes: formatCompactCount(nextLikesCount)
          }
        }
      );

      await ReelInteraction.findOneAndUpdate(
        { reelId: String(content._id), userId },
        { $set: { isLiked: nextLiked, updatedAt: new Date() } },
        { upsert: true, new: true }
      );

      return res.json({
        success: true,
        contentId: String(content._id),
        reelId: String(content._id),
        userId,
        isLiked: nextLiked,
        likeCount: nextLikesCount,
        likesCount: nextLikesCount,
        likes: formatCompactCount(nextLikesCount)
      });
    }

    const item = memoryStore.contents.find(
      (c) => String(c._id) === contentId || c.code === contentId
    );
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Content' });
    }
    let inter = memoryStore.reelInteractions.find(
      (r) => String(r.reelId) === String(item._id) && String(r.userId) === userId
    );
    if (!inter) {
      inter = { reelId: String(item._id), userId, isLiked: false, isBookmarked: false };
      memoryStore.reelInteractions.push(inter);
    }
    const wasLiked = Boolean(inter.isLiked);
    const nextLiked =
      typeof req.body?.isLiked === 'boolean' ? req.body.isLiked : !wasLiked;
    const delta = nextLiked === wasLiked ? 0 : nextLiked ? 1 : -1;
    item.stats = item.stats || { likes: 0 };
    item.stats.likes = Math.max(0, Number(item.stats.likes ?? 0) + delta);
    inter.isLiked = nextLiked;

    return res.json({
      success: true,
      contentId: String(item._id),
      reelId: String(item._id),
      userId,
      isLiked: nextLiked,
      likeCount: item.stats.likes,
      likesCount: item.stats.likes,
      likes: formatCompactCount(item.stats.likes)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.post('/contents/:id/like', handleLikeContent);
router.post('/reels/:id/like', handleLikeContent);

// 3. POST /api/v1/contents/:id/bookmark & POST /api/v1/reels/:id/bookmark
async function handleBookmarkContent(req, res) {
  try {
    const contentId = req.params.id;
    const authUser = await resolveAuthUser(req);
    const userId = authUser
      ? String(authUser.id || authUser._id)
      : req.body?.userId
        ? String(req.body.userId).trim()
        : '';
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để lưu bài viết.'
      });
    }

    if (isMongoConnected()) {
      const content = await Content.findOne(buildContentIdQuery(contentId));
      if (!content) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy Content' });
      }

      const existingInteraction = await ReelInteraction.findOne({
        reelId: String(content._id),
        userId
      }).lean();
      const wasBookmarked = Boolean(existingInteraction?.isBookmarked);
      const nextBookmarked =
        typeof req.body?.isBookmarked === 'boolean' ? req.body.isBookmarked : !wasBookmarked;
      const delta = nextBookmarked === wasBookmarked ? 0 : nextBookmarked ? 1 : -1;
      const nextBookmarksCount = Math.max(0, Number(content.stats?.bookmarks ?? 0) + delta);

      content.stats = content.stats || {};
      content.stats.bookmarks = nextBookmarksCount;
      await content.save();

      await ReelInteraction.findOneAndUpdate(
        { reelId: String(content._id), userId },
        { $set: { isBookmarked: nextBookmarked, updatedAt: new Date() } },
        { upsert: true, new: true }
      );

      return res.json({
        success: true,
        contentId: String(content._id),
        reelId: String(content._id),
        userId,
        isBookmarked: nextBookmarked,
        bookmarksCount: nextBookmarksCount,
        bookmarks: formatCompactCount(nextBookmarksCount)
      });
    }

    const item = memoryStore.contents.find(
      (c) => String(c._id) === contentId || c.code === contentId
    );
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Content' });
    }
    let inter = memoryStore.reelInteractions.find(
      (r) => String(r.reelId) === String(item._id) && String(r.userId) === userId
    );
    if (!inter) {
      inter = { reelId: String(item._id), userId, isLiked: false, isBookmarked: false };
      memoryStore.reelInteractions.push(inter);
    }
    const wasBookmarked = Boolean(inter.isBookmarked);
    const nextBookmarked =
      typeof req.body?.isBookmarked === 'boolean' ? req.body.isBookmarked : !wasBookmarked;
    const delta = nextBookmarked === wasBookmarked ? 0 : nextBookmarked ? 1 : -1;
    item.stats = item.stats || { bookmarks: 0 };
    item.stats.bookmarks = Math.max(0, Number(item.stats.bookmarks ?? 0) + delta);
    inter.isBookmarked = nextBookmarked;

    return res.json({
      success: true,
      contentId: String(item._id),
      reelId: String(item._id),
      userId,
      isBookmarked: nextBookmarked,
      bookmarksCount: item.stats.bookmarks,
      bookmarks: formatCompactCount(item.stats.bookmarks)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.post('/contents/:id/bookmark', handleBookmarkContent);
router.post('/reels/:id/bookmark', handleBookmarkContent);

// 4. POST /api/v1/contents/:id/view & POST /api/v1/reels/:id/view
async function handleViewContent(req, res) {
  try {
    const contentId = req.params.id;
    const watchDurationSec = Number(req.body.watchDurationSec) || 8;
    const authUser = await resolveAuthUser(req);
    const userId = req.body.userId || (authUser ? String(authUser.id || authUser._id) : null);

    if (isMongoConnected()) {
      const content = await Content.findOneAndUpdate(
        buildContentIdQuery(contentId),
        { $inc: { 'stats.views': 1 } },
        { new: true }
      );
      if (content && userId) {
        await ReelInteraction.findOneAndUpdate(
          { reelId: String(content._id), userId },
          {
            $inc: { watchCount: 1 },
            $max: { maxWatchDurationSec: watchDurationSec },
            $set: { updatedAt: new Date() }
          },
          { upsert: true, new: true }
        );
      }
      return res.json({ success: true, contentId, watchDurationSec });
    }

    return res.json({ success: true, contentId, watchDurationSec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.post('/contents/:id/view', handleViewContent);
router.post('/reels/:id/view', handleViewContent);

// 5. GET & POST /api/v1/reels/:id/comments & /api/v1/contents/:id/comments
async function handleGetComments(req, res) {
  try {
    const contentId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    if (isMongoConnected()) {
      const content = await Content.findOne(buildContentIdQuery(contentId)).lean();
      const targetOid = content ? content._id : isValidObjectId(contentId) ? new mongoose.Types.ObjectId(contentId) : null;
      const targetCode = content ? content.code : contentId;

      const orConditions = [{ reelId: String(targetOid || contentId) }, { reelShortId: targetCode }];
      if (targetOid) {
        orConditions.unshift({ content_id: targetOid });
      }

      const items = await Comment.find({ $or: orConditions })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user_id', 'full_name avatar role')
        .lean();

      return res.json({
        success: true,
        reelId: String(targetOid || contentId),
        count: items.length,
        items
      });
    }

    const items = memoryStore.comments.slice(0, limit);
    return res.json({
      success: true,
      reelId: contentId,
      count: items.length,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function handlePostComment(req, res) {
  try {
    const contentId = req.params.id;
    const authUser = await resolveAuthUser(req);
    const text = (req.body.text || req.body.content || req.body.comment_text || '').trim();
    const user = (
      authUser?.full_name ||
      authUser?.fullName ||
      req.body.user ||
      req.body.author ||
      ''
    ).trim();
    const avatar =
      authUser?.avatar ||
      req.body.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

    if (!user) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để bình luận.' });
    }
    if (!text) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được trống' });
    }

    if (isMongoConnected()) {
      const content = await Content.findOne(buildContentIdQuery(contentId));
      const targetOid = content ? content._id : null;
      const targetCode = content ? content.code : contentId;
      const uid = authUser ? String(authUser.id || authUser._id) : null;

      const newComment = await Comment.create({
        content_id: targetOid,
        user_id: uid && isValidObjectId(uid) ? new mongoose.Types.ObjectId(uid) : undefined,
        reelId: String(targetOid || contentId),
        reelShortId: targetCode,
        user,
        author: user,
        time: 'Vừa xong',
        avatar,
        text,
        content: text,
        likes: 0,
        createdAt: new Date()
      });

      if (content) {
        content.stats = content.stats || {};
        content.stats.commentsCount = (content.stats.commentsCount || 0) + 1;
        await content.save();
        await Reel.updateOne(
          { $or: [{ content_id: content._id }, { _id: content.code }] },
          { $set: { 'stats.commentsCount': content.stats.commentsCount } }
        );
      }

      const nextCount = content ? content.stats.commentsCount : 1;
      return res.status(201).json({
        success: true,
        comment: newComment,
        commentCount: nextCount,
        commentsCount: nextCount
      });
    }

    const targetItem = memoryStore.contents.find(
      (c) => String(c._id) === contentId || c.code === contentId
    );
    if (targetItem) {
      targetItem.stats = targetItem.stats || { commentsCount: 0 };
      targetItem.stats.commentsCount = (targetItem.stats.commentsCount || 0) + 1;
    }

    const newComment = {
      _id: `cmt_${Date.now()}`,
      reelId: String(targetItem?._id || contentId),
      user,
      author: user,
      time: 'Vừa xong',
      avatar,
      text,
      content: text,
      likes: 0,
      createdAt: new Date().toISOString()
    };
    memoryStore.comments.unshift(newComment);
    const nextCount = targetItem ? targetItem.stats.commentsCount : memoryStore.comments.length;
    return res.status(201).json({
      success: true,
      comment: newComment,
      commentCount: nextCount,
      commentsCount: nextCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

router.get('/reels/:id/comments', handleGetComments);
router.get('/contents/:id/comments', handleGetComments);
router.get('/comments/:id', handleGetComments);
router.post('/reels/:id/comments', handlePostComment);
router.post('/contents/:id/comments', handlePostComment);
router.post('/comments', (req, res) => {
  req.params.id = req.body.targetId || req.body.reelId || req.body.content_id;
  return handlePostComment(req, res);
});

// 6. GET /api/v1/location-tags
router.get('/location-tags', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await LocationTag.find({})
        .populate('content_id', 'content_title video_url')
        .populate('hotel_id', 'hotel_name address star_rating price_per_night')
        .populate('location_id', 'name location_category address entry_fee')
        .lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.locationTags.length,
      items: memoryStore.locationTags
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. GET /api/v1/live-streams
router.get('/live-streams', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const items = await LiveStream.find({ status: 'LIVE' }).lean();
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({
      success: true,
      count: memoryStore.liveStreams.length,
      items: memoryStore.liveStreams
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. POST /api/v1/upload
router.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'Chưa chọn file tải lên' });
    }
    const uploadedFile = req.files.file;
    const safeName = `${Date.now()}_${uploadedFile.name.replace(/\s+/g, '_')}`;
    const savePath = path.join(__dirname, '..', 'public', 'images', safeName);
    await uploadedFile.mv(savePath);

    const port = process.env.PORT || 3000;
    return res.json({
      success: true,
      url: `http://localhost:${port}/public/images/${safeName}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. POST /api/v1/contents (Dành cho Creator Studio tạo bài đăng / Video Reel mới kèm Hotspot FK)
router.post('/contents', async (req, res) => {
  try {
    const body = req.body || {};
    const authUser = await resolveAuthUser(req);

    if (isMongoConnected()) {
      let creator = null;
      if (authUser) {
        const authId = String(authUser.id || authUser._id || '');
        if (authId && isValidObjectId(authId)) {
          creator = await User.findById(authId).lean();
        } else if (authUser.code) {
          creator = await User.findOne({ code: authUser.code }).lean();
        }
      }
      if (!creator && body.user_id && isValidObjectId(body.user_id)) {
        creator = await User.findById(body.user_id).lean();
      }
      if (!creator && body.userCode) {
        creator = await User.findOne({ code: body.userCode }).lean();
      }
      if (!creator) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để đăng thước phim lên cộng đồng TRIPLA.'
        });
      }

      let hotelDoc = null;
      let roomDoc = null;
      let locDoc = null;

      if (body.hotel_id && isValidObjectId(body.hotel_id)) {
        hotelDoc = await Hotel.findById(body.hotel_id).lean();
      }
      if (hotelDoc) {
        roomDoc = await Room.findOne({ hotel_id: hotelDoc._id }).lean();
      }
      if (body.location_id && isValidObjectId(body.location_id)) {
        locDoc = await Location.findById(body.location_id).lean();
      }

      const code = body.code || `r_${Date.now().toString().slice(-5)}`;
      const title = (body.content_title || body.title || 'Trải nghiệm mới trên TRIPLA').trim();
      const caption = (body.caption || body.content_description || title).trim();
      const videoUrl = body.video_url || body.videoSrc || 'http://localhost:3000/data/community/reels/r1/BANAHILL.mp4';
      const imageUrl = body.image_url || hotelDoc?.image_url || locDoc?.image_url || '';
      const locationName = (body.location_name || body.location || locDoc?.name || hotelDoc?.address || 'Việt Nam').trim();

      const toFeatures = (arr) =>
        (arr || [])
          .slice(0, 4)
          .map((f) => (typeof f === 'string' ? { icon: 'check_circle', label: f } : { icon: f.icon || 'check_circle', label: f.label || f.name || '' }));

      const newContent = await Content.create({
        code,
        user_id: creator._id,
        content_title: title,
        content_description: caption,
        caption,
        image_url: imageUrl,
        video_url: videoUrl,
        category: body.category || 'for-you',
        location_name: locationName,
        hashtags: body.hashtags || ['#Tripla', '#VietnamTravel'],
        music_name: body.music_name || `Âm thanh gốc — ${creator.full_name || 'Thành viên TRIPLA'}`,
        stats: {
          views: 0,
          likes: 0,
          commentsCount: 0,
          bookmarks: 0,
          shares: 0
        },
        location_tags: [
          ...(locDoc ? [{ location_id: locDoc._id, tag_type: 'dining' }] : []),
          ...(hotelDoc ? [{ hotel_id: hotelDoc._id, room_id: roomDoc?._id || null, tag_type: 'resort' }] : [])
        ],
        hotspots: {
          resort: hotelDoc
            ? {
                hotel_id: hotelDoc._id,
                room_id: roomDoc?._id || null,
                key: 'resort',
                title: hotelDoc.hotel_name,
                location: hotelDoc.address,
                tag: 'STAY • ĐẶT PHÒNG TRỰC TIẾP',
                features: toFeatures(hotelDoc.hotel_amenities)
              }
            : undefined,
          dining: locDoc
            ? {
                location_id: locDoc._id,
                key: 'dining',
                title: locDoc.name,
                location: locDoc.address,
                tag: 'SPOT • ĐIỂM ĐẾN TRONG VIDEO',
                features: toFeatures(locDoc.features || ['Điểm đến nổi bật', 'Xác thực bởi Creator'])
              }
            : undefined,
          yacht: locDoc
            ? {
                location_id: locDoc._id,
                key: 'yacht',
                title: locDoc.name,
                location: locDoc.address,
                tag: 'ACTIVITY • TRẢI NGHIỆM',
                features: toFeatures(['Hỗ trợ đặt vé nhanh', 'Hướng dẫn viên bản địa'])
              }
            : undefined
        },
        created_at: new Date()
      });

      if (locDoc || hotelDoc) {
        await LocationTag.create({
          content_id: newContent._id,
          location_id: locDoc ? locDoc._id : null,
          hotel_id: hotelDoc ? hotelDoc._id : null,
          room_id: roomDoc ? roomDoc._id : null,
          tag_type: 'resort'
        });
      }

      const populated = await Content.findById(newContent._id)
        .populate('user_id', 'full_name avatar role handle')
        .populate('hotspots.resort.hotel_id', 'hotel_name address star_rating price_per_night image_url')
        .populate('hotspots.dining.location_id', 'name address entry_fee image_url')
        .lean();

      const enriched = enrichContentDoc(populated);
      try {
        await Reel.findOneAndUpdate(
          { _id: enriched.code },
          {
            $set: {
              content_id: newContent._id,
              title: enriched.title || title,
              videoSrc: videoUrl,
              location: locationName,
              category: enriched.category || 'for-you'
            }
          },
          { upsert: true, strict: false }
        );
      } catch (reelErr) {
        console.warn('⚠️ Không đồng bộ được bảng reels:', reelErr.message);
      }

      return res.status(201).json({
        success: true,
        content: enriched
      });
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. DELETE /api/v1/contents/:id (Dành cho Admin & Creator Studio xóa bài viết/video)
router.delete('/contents/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (isMongoConnected()) {
      const content = await Content.findOneAndDelete(buildContentIdQuery(id));
      if (content) {
        await Reel.deleteOne({ $or: [{ content_id: content._id }, { _id: content.code }] });
        await LocationTag.deleteMany({ content_id: content._id });
      }
      return res.json({ success: true, deletedId: id });
    }
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
