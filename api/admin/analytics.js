import { requireAdminSession } from '../../lib/admin-auth.js';
import {
  aggregateEvents,
  fetchRecentEvents,
  fetchUsageEventsSince,
  filterEvents,
  isEventExcluded,
  parseAnalyticsPeriod,
} from '../../lib/reports.js';
import { getReportConfig } from '../../lib/report-config.js';
import {
  parseAnalyticsFilters,
  filterEventsByDimensions,
  knownProductsFromEvents,
  labelProduct,
  labelSite,
  normalizeProduct,
  normalizeSite,
  PRODUCTS,
  PRODUCT_LABELS,
  SITE_LABELS,
} from '../../lib/analytics-config.js';

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

  const period = req.query?.period ?? '24h';
  const { hours, label } = parseAnalyticsPeriod(period);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const filters = parseAnalyticsFilters(req.query);

  const config = await getReportConfig();
  const allEvents = await fetchUsageEventsSince(since);
  const excludedCount = allEvents.filter((e) => isEventExcluded(e, config)).length;
  let events = filterEvents(allEvents, config);
  events = filterEventsByDimensions(events, filters);
  const summary = aggregateEvents(events);
  summary.excludedEvents = excludedCount;

  const recent = await fetchRecentEvents(since, 200);
  const recentFiltered = recent
    .filter((e) => filterEventsByDimensions(filterEvents([e], config), filters).length > 0)
    .slice(0, 80)
    .map((e) => ({
      id: e.id,
      product: normalizeProduct(e.product),
      site: normalizeSite(e.site),
      eventType: e.eventType ?? 'unknown',
      path: e.path ?? '',
      email: e.email ?? '',
      ip: e.ip ?? '',
      city: e.city ?? '',
      country: e.country ?? '',
      occurredAt: e.occurredAtIso,
    }));

  const productsSeen = knownProductsFromEvents(filterEvents(allEvents, config));

  return res.status(200).json({
    period: { hours, label, since: since.toISOString() },
    filters: {
      product: filters.product,
      site: filters.site,
      label: buildFilterLabel(filters),
    },
    products: {
      known: Object.values(PRODUCTS),
      labels: PRODUCT_LABELS,
      seen: productsSeen,
    },
    sites: {
      known: ['landing', 'member', 'agent'],
      labels: SITE_LABELS,
    },
    summary,
    recent: recentFiltered,
    reportFilters: {
      excludedIps: config.excludedIps,
      excludedCities: config.excludedCities,
    },
  });
}
