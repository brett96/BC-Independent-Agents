import { requireAdminSession } from '../../lib/admin-auth.js';
import { buildDailyReport } from '../../lib/reports.js';
import { getReportConfig, normalizeReportConfig } from '../../lib/report-config.js';
import { parseAnalyticsFilters, labelProduct, labelSite } from '../../lib/analytics-config.js';

function buildFilterLabel(filters) {
  const parts = [];
  if (filters.product) parts.push(`Product: ${labelProduct(filters.product)}`);
  if (filters.site) parts.push(`Site: ${labelSite(filters.site)}`);
  return parts.length ? parts.join(' · ') : 'All products and sites';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdminSession(req, res);
  if (!auth) return;

  const useDraft = req.query?.draft === '1';
  const filters = parseAnalyticsFilters(req.query);

  let config = await getReportConfig();
  if (useDraft) {
    const recipients = req.query?.recipients;
    const ips = req.query?.excludedIps;
    const cities = req.query?.excludedCities;
    config = normalizeReportConfig({
      emailRecipients: recipients
        ? String(recipients).split(',').map((s) => s.trim())
        : config.emailRecipients,
      excludedIps: ips ? String(ips).split(',').map((s) => s.trim()) : config.excludedIps,
      excludedCities: cities
        ? String(cities).split(',').map((s) => s.trim())
        : config.excludedCities,
    });
  }

  const report = await buildDailyReport({
    hours: 24,
    config,
    filters,
    filterLabel: buildFilterLabel(filters),
  });
  return res.status(200).json({
    html: report.html,
    summary: report.summary,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    config: report.config,
  });
}
