const crypto = require('crypto');

/**
 * Computes a lowercase hexadecimal SHA-256 digest for any string input.
 */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

function isSha256Hex(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || '').trim());
}

/**
 * Hashes a plaintext password unless it is already a 64-char SHA-256 hex digest.
 */
function hashIfPlain(value) {
  const raw = String(value ?? '').trim();
  if (isSha256Hex(raw)) return raw.toLowerCase();
  return sha256(raw);
}

/**
 * Verifies a plaintext (or pre-hashed SHA-256) password against a stored SHA-256 hex digest.
 */
function verifySha256Password(rawInput, storedHash) {
  if (!storedHash || !rawInput) return false;
  const normalizedStored = String(storedHash).trim().toLowerCase();
  const raw = String(rawInput);
  if (sha256(raw) === normalizedStored) return true;
  if (isSha256Hex(raw) && raw.trim().toLowerCase() === normalizedStored) return true;
  return false;
}

/**
 * Converts any Vietnamese or Unicode hotel/location name into a clean lowercase URL slug.
 */
function toSlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes a date value to UTC start-of-day timestamp (ms) or returns null when invalid.
 */
function toUtcDayMs(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Checks whether two [check_in, check_out) ranges overlap on calendar dates.
 * Falls back to true when either interval has invalid dates only if explicitly requested.
 */
function datesOverlap(checkInA, checkOutA, checkInB, checkOutB) {
  const aStart = toUtcDayMs(checkInA);
  const aEnd = toUtcDayMs(checkOutA);
  const bStart = toUtcDayMs(checkInB);
  const bEnd = toUtcDayMs(checkOutB);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return false;
  }
  const effectiveAEnd = aEnd > aStart ? aEnd : aStart + 86400000;
  const effectiveBEnd = bEnd > bStart ? bEnd : bStart + 86400000;
  return aStart < effectiveBEnd && bStart < effectiveAEnd;
}

function calcNights(checkIn, checkOut) {
  const start = toUtcDayMs(checkIn);
  const end = toUtcDayMs(checkOut);
  if (start === null || end === null) return 1;
  return Math.max(1, Math.round((end - start) / 86400000));
}

module.exports = {
  sha256,
  isSha256Hex,
  hashIfPlain,
  verifySha256Password,
  toSlug,
  toUtcDayMs,
  datesOverlap,
  calcNights
};

