import { parseCookies } from '../../lib/api-utils.js';
import {
  ADMIN_COOKIE,
  getAdminSeedCredentials,
  verifyAdminSessionToken,
} from '../../lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configured = !!getAdminSeedCredentials();
  const cookies = parseCookies(req.headers.cookie);
  const admin = await verifyAdminSessionToken(cookies[ADMIN_COOKIE]);

  return res.status(200).json({
    authenticated: !!admin,
    email: admin?.email ?? null,
    configured,
  });
}
