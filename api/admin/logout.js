import { ADMIN_COOKIE } from '../../lib/admin-auth.js';
import { clearCookie } from '../../lib/api-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    clearCookie(ADMIN_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    })
  );
  return res.status(200).json({ ok: true });
}
