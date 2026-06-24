import {
  adminCookieOptions,
  createAdminSessionToken,
  getAdminSeedCredentials,
  verifyAdminCredentials,
} from '../../lib/admin-auth.js';
import { serializeCookie } from '../../lib/api-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const seed = getAdminSeedCredentials();
  if (!seed) {
    return res.status(503).json({
      error: 'Admin login is not configured (set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD)',
    });
  }

  const email = req.body?.email?.trim() ?? '';
  const password = req.body?.password ?? '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!verifyAdminCredentials(email, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = await createAdminSessionToken(email);
  if (!token) {
    return res.status(503).json({ error: 'Admin session secret is not configured' });
  }

  const opts = adminCookieOptions();
  res.setHeader('Set-Cookie', serializeCookie(opts.name, token, opts));
  return res.status(200).json({ ok: true, email: email.toLowerCase() });
}
