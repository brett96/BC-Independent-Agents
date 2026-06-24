import { timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE = '__bc_admin';
const ADMIN_SESSION_MAX_AGE_SEC = 60 * 60 * 24;

function sessionSecret() {
  const s =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.DEMO_JWT_SECRET?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export function getAdminSeedCredentials() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyAdminCredentials(email, password) {
  const seed = getAdminSeedCredentials();
  if (!seed) return false;
  return (
    safeEqual(email.trim().toLowerCase(), seed.email) &&
    safeEqual(password, seed.password)
  );
}

export async function createAdminSessionToken(email) {
  const key = sessionSecret();
  if (!key) return null;
  return new SignJWT({ role: 'admin', email: email.toLowerCase() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE_SEC}s`)
    .sign(key);
}

export async function verifyAdminSessionToken(token) {
  if (!token) return null;
  const key = sessionSecret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'admin' || typeof payload.email !== 'string') return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function adminCookieOptions(maxAgeSec = ADMIN_SESSION_MAX_AGE_SEC) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: ADMIN_COOKIE,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}

export async function requireAdminSession(req, res) {
  const { parseCookies } = await import('./api-utils.js');
  const cookies = parseCookies(req.headers.cookie);
  const admin = await verifyAdminSessionToken(cookies[ADMIN_COOKIE]);
  if (!admin) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return admin;
}
