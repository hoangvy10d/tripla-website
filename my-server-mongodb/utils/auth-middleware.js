const crypto = require('crypto');
const mongoose = require('mongoose');
const { User } = require('../models');
const { memoryStore, isMongoConnected, isValidObjectId } = require('../modules/shared');

const SESSION_SECRET = process.env.TRIPLA_SESSION_SECRET || 'tripla-session-hmac-secret-2026';

function toSafeUser(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete plain.password;
  return {
    ...plain,
    _id: String(plain._id),
    id: plain.id || String(plain._id),
    full_name: plain.full_name || plain.fullName || 'Thành viên Tripla',
    fullName: plain.fullName || plain.full_name || 'Thành viên Tripla'
  };
}

function base64UrlEncode(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signSessionToken(user) {
  const payload = {
    sub: String(user._id),
    code: user.code || null,
    role: user.role || 'tourist',
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractBearerToken(req) {
  const authHeader = String(req.headers?.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

async function resolveAuthUser(req) {
  const token = extractBearerToken(req);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) return null;

  if (isMongoConnected()) {
    const query = isValidObjectId(payload.sub)
      ? { _id: new mongoose.Types.ObjectId(payload.sub) }
      : { code: payload.sub };
    const found = await User.findOne(query).lean();
    return found ? toSafeUser(found) : null;
  }

  const memFound = memoryStore.users.find(
    (u) => String(u._id) === String(payload.sub) || (payload.code && u.code === payload.code)
  );
  return memFound ? toSafeUser(memFound) : null;
}

async function requireAuth(req, res, next) {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHENTICATED',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    req.authUser = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản Quản trị viên (admin).'
      });
    }
    if (String(user.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN_ADMIN_ONLY',
        message: 'Quyền truy cập bị từ chối: chỉ tài khoản vai trò admin được phép thực hiện thao tác này.'
      });
    }
    req.authUser = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  toSafeUser,
  signSessionToken,
  verifySessionToken,
  resolveAuthUser,
  requireAuth,
  requireAdmin
};
