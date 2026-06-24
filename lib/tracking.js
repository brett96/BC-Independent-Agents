import { UAParser } from 'ua-parser-js';
import {
  getAdminDb,
  isFirebaseAdminConfigured,
  isFirestoreNotFoundError,
  FIRESTORE_SETUP_HINT,
} from './firebase-admin.js';
import { PRODUCTS } from './analytics-config.js';

const SITES = ['landing', 'member', 'agent'];

export function normalizeProductInput(raw) {
  if (!raw || typeof raw !== 'string') return PRODUCTS.INDEPENDENT_AGENTS;
  const v = raw.trim().toLowerCase();
  return Object.values(PRODUCTS).includes(v) ? v : PRODUCTS.INDEPENDENT_AGENTS;
}

export function normalizeSiteInput(raw) {
  return SITES.includes(raw) ? raw : 'landing';
}

function omitUndefined(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function parseRequestGeo(req) {
  const uaStr = req.headers['user-agent'] ?? '';
  const ua = new UAParser(uaStr).getResult();
  const decodeSafe = (v) => {
    if (!v) return undefined;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipRaw =
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : null) ??
    req.headers['x-real-ip'] ??
    null;
  return {
    ip: ipRaw ? String(ipRaw).slice(0, 64) : undefined,
    country: req.headers['x-vercel-ip-country'] ?? undefined,
    region: decodeSafe(req.headers['x-vercel-ip-country-region']),
    city: decodeSafe(req.headers['x-vercel-ip-city']),
    userAgent: uaStr || undefined,
    deviceType: ua.device.type ?? 'desktop',
    browser: ua.browser.name ?? '',
    os: ua.os.name ?? '',
  };
}

export async function recordUsageEvent(input, req) {
  if (!isFirebaseAdminConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[track]', input);
    }
    return;
  }
  const geo = req ? parseRequestGeo(req) : {};
  const db = getAdminDb();
  const doc = omitUndefined({
    ...input,
    ...geo,
    product: normalizeProductInput(input.product),
    site: normalizeSiteInput(input.site),
    path: input.path?.slice(0, 2048) ?? '',
    eventType: input.eventType.slice(0, 32),
    visitorId: (input.visitorId ?? 'anon').slice(0, 64),
    sessionId: (input.sessionId ?? input.visitorId ?? 'anon').slice(0, 64),
    properties: input.properties ?? {},
    occurredAt: new Date(),
  });
  try {
    await db.collection('usageEvents').add(doc);
  } catch (err) {
    if (isFirestoreNotFoundError(err)) {
      console.error(`[track] ${FIRESTORE_SETUP_HINT}`);
      return;
    }
    throw err;
  }
}
