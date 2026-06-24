import { requireAdminSession } from '../../lib/admin-auth.js';
import {
  getReportConfig,
  normalizeReportConfig,
  saveReportConfig,
} from '../../lib/report-config.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = await requireAdminSession(req, res);
    if (!auth) return;
    const config = await getReportConfig();
    return res.status(200).json({ config });
  }

  if (req.method === 'PUT') {
    const auth = await requireAdminSession(req, res);
    if (!auth) return;

    const body = req.body ?? {};
    const config = normalizeReportConfig({
      emailRecipients: Array.isArray(body.emailRecipients) ? body.emailRecipients : [],
      excludedIps: Array.isArray(body.excludedIps) ? body.excludedIps : [],
      excludedCities: Array.isArray(body.excludedCities) ? body.excludedCities : [],
    });

    const saved = await saveReportConfig(config, auth.email);
    return res.status(200).json({ config: saved });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
