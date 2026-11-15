const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash-lite'];
const MAX_VIDEO_TITLE_LENGTH = 160;
const MAX_VIDEO_DESCRIPTION_LENGTH = 500;
const MAX_VIDEO_TAG_COUNT = 12;
const MAX_VIDEO_COMMENT_COUNT = 6;
const MAX_VIDEO_COMMENT_LENGTH = 140;

const basePrompt = `You are an expert travel visual search and OCR engine.
CRITICAL PRIORITY — SPECIFIC VENUE FIRST:
1. Zoom in and read EVERY visible sign, illuminated lettering, logo, or storefront name in the image (especially inside the crop_box if provided).
   - For example, if you see signs like "CASCADE" / "CASCADE SHOPS" and "CANADIAN BREWHOUSE" on a building on Banff Ave, the exact landmark_name MUST be "Cascade Shops" (NOT generic "Banff Avenue" or "Banff")!
   - NEVER return a broad street, district, or city name as "landmark_name" when a specific mall, hotel, restaurant, cafe, or building name is visible or identifiable from architecture + signage.
2. Identify the exact street address of that specific building (e.g., "317 Banff Ave, Banff, AB T1L 1B5, Canada").
3. For "nearby_places", list 3 to 4 REAL tenants/restaurants inside that exact building OR immediate neighbors within 100 meters (e.g., "The Canadian Brewhouse (Banff)", specific shops/cafes inside Cascade Shops or right across the street), NOT far-away tourist landmarks.
- If the image is a full-frame YouTube thumbnail where multiple shops appear on a street (e.g., Roots, Cascade Shops, BeaverTails on Banff Ave), identify the MOST PROMINENT building/mall in the center of the frame, and list the other visible shops on that same block in "nearby_places".

Return ONLY one valid JSON object with this exact schema:
{
  "found": true,
  "landmark_name": "Exact name of the specific mall/hotel/restaurant/building",
  "place_type": "Trung tâm thương mại | Khách sạn | Nhà hàng | Quán cà phê | Địa điểm tham quan",
  "formatted_address": "Exact street number, street, city, province/state, country",
  "description": "1-2 short natural Vietnamese sentences describing this exact building and the signs/shops visible in the frame.",
  "confidence": "high",
  "suggested_keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "nearby_places": [
    {
      "name": "Exact real name of a restaurant/shop/hotel inside or right next to this building",
      "category": "Ẩm thực | Mua sắm | Lưu trú | Trải nghiệm",
      "highlight": "Short Vietnamese detail"
    }
  ]
}`;

let cachedClient = null;
let cachedApiKey = '';

function getGeminiClient() {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình.');
  }
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeCropBox(cropBox) {
  if (!cropBox || typeof cropBox !== 'object') return null;
  const { x, y, width, height } = cropBox;
  if (![x, y, width, height].every((part) => Number.isFinite(Number(part)))) return null;
  return {
    x: Math.max(0, Math.min(1, Number(x))),
    y: Math.max(0, Math.min(1, Number(y))),
    width: Math.max(0, Math.min(1, Number(width))),
    height: Math.max(0, Math.min(1, Number(height)))
  };
}

function formatCropBoxPrompt(cropBox) {
  const box = normalizeCropBox(cropBox);
  if (!box) return '';
  return `User focused crop_box (normalized 0..1): x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}. Prioritize reading signage and identifying the exact building inside or intersecting this box.`;
}

function formatVideoContext(videoContext) {
  if (!videoContext || typeof videoContext !== 'object') return '';
  const title = sanitizeText(videoContext.title, MAX_VIDEO_TITLE_LENGTH);
  const description = sanitizeText(videoContext.description, MAX_VIDEO_DESCRIPTION_LENGTH);
  const tags = (Array.isArray(videoContext.tags) ? videoContext.tags : [])
    .map((tag) => sanitizeText(tag, 40))
    .filter(Boolean)
    .slice(0, MAX_VIDEO_TAG_COUNT);
  const comments = (Array.isArray(videoContext.comments) ? videoContext.comments : [])
    .map((comment) => sanitizeText(comment, MAX_VIDEO_COMMENT_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_VIDEO_COMMENT_COUNT);

  const lines = [
    title ? `- Video title: ${title}` : '',
    description ? `- Video caption: ${description}` : '',
    tags.length ? `- Tags: ${tags.join(', ')}` : '',
    comments.length ? `- Comments: ${comments.join(' | ')}` : ''
  ].filter(Boolean);

  if (!lines.length) return '';
  return `Optional video context (use ONLY as supporting clue, NEVER override visible signage in the image):\n${lines.join('\n')}`;
}

function buildPrompt(videoContext, cropBox) {
  return [basePrompt, formatCropBoxPrompt(cropBox), formatVideoContext(videoContext)]
    .filter(Boolean)
    .join('\n\n');
}

function parseBase64Image(imageBase64) {
  const value = String(imageBase64 || '').trim();
  const dataUrlMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { mimeType: dataUrlMatch[1], data: dataUrlMatch[2] };
  }
  return { mimeType: 'image/jpeg', data: value };
}

function parseLocationResponse(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const result = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

  if (!result || result.found === false) {
    return { found: false };
  }

  const landmarkName = String(result.landmark_name || '').trim();
  const formattedAddress = String(result.formatted_address || '').trim();
  if (!landmarkName || !formattedAddress) {
    return { found: false };
  }

  const confidence = ['high', 'medium', 'low'].includes(result.confidence)
    ? result.confidence
    : 'high';

  const suggestedKeywords = Array.isArray(result.suggested_keywords)
    ? result.suggested_keywords.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
    : [];

  const nearbyPlaces = Array.isArray(result.nearby_places)
    ? result.nearby_places
        .filter((p) => p && p.name)
        .map((p) => ({
          name: String(p.name).trim(),
          category: String(p.category || 'Gợi ý').trim(),
          highlight: String(p.highlight || '').trim()
        }))
        .slice(0, 4)
    : [];

  return {
    found: true,
    landmark_name: landmarkName,
    place_type: String(result.place_type || 'Địa điểm').trim(),
    formatted_address: formattedAddress,
    description: String(result.description || '').trim(),
    confidence,
    suggested_keywords: suggestedKeywords,
    nearby_places: nearbyPlaces
  };
}

function isRetryableModelError(error) {
  const status = error?.status || error?.statusCode;
  const msg = String(error?.message || '').toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 504 ||
    status === 404 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('not found') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('deadline')
  );
}

async function generateWithFallback(client, contents) {
  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`⏳ [GEMINI START] Đang gọi ${model}...`);
      const response = await client.models.generateContent({ model, contents });
      console.log(`🤖 [GEMINI RAW RESPONSE]:`, response.text);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`❌ [GEMINI ERROR model=${model}]:`, error.message);
      if (!isRetryableModelError(error)) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function identifyLocationFromBase64(imageBase64, videoContext = null, cropBox = null) {
  const client = getGeminiClient();
  const image = parseBase64Image(imageBase64);
  const response = await generateWithFallback(client, [
    { text: buildPrompt(videoContext, cropBox) },
    { inlineData: { mimeType: image.mimeType, data: image.data } }
  ]);
  return parseLocationResponse(response.text);
}

async function identifyLocationFromUrl(imageUrl, videoContext = null, cropBox = null) {
  const fetched = await fetch(imageUrl);
  if (!fetched.ok) {
    throw new Error(`Không thể tải ảnh từ URL (${fetched.status}).`);
  }
  const mimeType = fetched.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await fetched.arrayBuffer());
  const client = getGeminiClient();
  const response = await generateWithFallback(client, [
    { text: buildPrompt(videoContext, cropBox) },
    { inlineData: { mimeType, data: buffer.toString('base64') } }
  ]);
  return parseLocationResponse(response.text);
}

module.exports = {
  identifyLocationFromBase64,
  identifyLocationFromUrl
};