import { getAdminDb, isFirebaseAdminConfigured } from './firebase-admin.js';
import { getReportConfig, defaultReportConfig } from './report-config.js';
import { normalizeProduct, normalizeSite, filterEventsByDimensions } from './analytics-config.js';

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
}

export function isEventExcluded(event, config) {
  const ip = event.ip?.trim();
  if (ip && config.excludedIps.some((excluded) => excluded === ip)) {
    return true;
  }
  const city = event.city?.trim().toLowerCase();
  if (city && config.excludedCities.some((excluded) => excluded === city)) {
    return true;
  }
  return false;
}

export function filterEvents(events, config) {
  return events.filter((e) => !isEventExcluded(e, config));
}

export function aggregateEvents(events) {
  const byType = {};
  const bySite = {};
  const byProduct = {};
  const paths = {};
  const cities = {};
  const countries = {};
  const visitors = new Set();
  const emails = new Set();
  let registrations = 0;
  let logins = 0;
  let demoLaunches = 0;

  for (const e of events) {
    const t = e.eventType ?? 'unknown';
    byType[t] = (byType[t] ?? 0) + 1;
    const s = normalizeSite(e.site);
    bySite[s] = (bySite[s] ?? 0) + 1;
    const p = normalizeProduct(e.product);
    byProduct[p] = (byProduct[p] ?? 0) + 1;
    if (e.path) paths[e.path] = (paths[e.path] ?? 0) + 1;
    if (e.visitorId) visitors.add(e.visitorId);
    if (e.email) emails.add(e.email);
    if (t === 'registration') registrations++;
    if (t === 'login') logins++;
    if (t === 'demo_launch') demoLaunches++;
    const city = e.city?.trim();
    if (city) cities[city] = (cities[city] ?? 0) + 1;
    const country = e.country?.trim();
    if (country) countries[country] = (countries[country] ?? 0) + 1;
  }

  const topPaths = Object.entries(paths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  const byCity = Object.entries(cities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  const byCountry = Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  return {
    totalEvents: events.length,
    excludedEvents: 0,
    uniqueVisitors: visitors.size,
    uniqueEmails: emails.size,
    registrations,
    logins,
    demoLaunches,
    bySite,
    byProduct,
    byType,
    topPaths,
    byCity,
    byCountry,
  };
}

export async function fetchUsageEventsSince(since) {
  if (!isFirebaseAdminConfigured()) return [];
  const db = getAdminDb();
  const snap = await db
    .collection('usageEvents')
    .where('occurredAt', '>=', since)
    .get();
  return snap.docs.map((d) => d.data());
}

export async function fetchRecentEvents(since, limit = 100) {
  if (!isFirebaseAdminConfigured()) return [];
  const db = getAdminDb();
  const snap = await db
    .collection('usageEvents')
    .where('occurredAt', '>=', since)
    .limit(500)
    .get();

  const rows = snap.docs.map((d) => {
    const data = d.data();
    const dt = toDate(data.occurredAt);
    return {
      id: d.id,
      ...data,
      occurredAtIso: dt ? dt.toISOString() : null,
    };
  });

  return rows
    .sort((a, b) => {
      const ta = a.occurredAtIso ? Date.parse(a.occurredAtIso) : 0;
      const tb = b.occurredAtIso ? Date.parse(b.occurredAtIso) : 0;
      return tb - ta;
    })
    .slice(0, limit);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tableRows(entries) {
  return (
    Object.entries(entries)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `<tr><td>${escapeHtml(k)}</td><td>${n}</td></tr>`)
      .join('') || '<tr><td colspan="2">None</td></tr>'
  );
}

export function buildReportHtmlFromSummary(summary, options) {
  const { periodStart, periodEnd, config, excludedCount, filterLabel } = options;
  const topPaths = summary.topPaths
    .map(({ path, count }) => `<li>${escapeHtml(path)} — ${count}</li>`)
    .join('');

  const filterNote =
    config.excludedIps.length > 0 || config.excludedCities.length > 0
      ? `<p><em>Filters applied: ${config.excludedIps.length} excluded IP(s), ${config.excludedCities.length} excluded city/cities. ${excludedCount} event(s) removed from this report.</em></p>`
      : '';

  const adminUrl =
    process.env.ADMIN_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    'your BookCover site';

  const adminLink = adminUrl.startsWith('http')
    ? `${adminUrl.replace(/\/$/, '')}/admin`
    : `https://${adminUrl}/admin`;

  return `
    <h2>BookCover Demo — Daily Usage Report</h2>
    <h3>Configure report and view analytics at: ${escapeHtml(adminLink)}</h3>
    <p>Period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}</p>
    ${filterLabel ? `<p><em>Scope: ${escapeHtml(filterLabel)}</em></p>` : ''}
    ${filterNote}
    <ul>
      <li><strong>Total events:</strong> ${summary.totalEvents}</li>
      <li><strong>Unique visitors:</strong> ${summary.uniqueVisitors}</li>
      <li><strong>Unique emails:</strong> ${summary.uniqueEmails}</li>
      <li><strong>Registrations:</strong> ${summary.registrations}</li>
      <li><strong>Logins:</strong> ${summary.logins}</li>
      <li><strong>Demo launches:</strong> ${summary.demoLaunches}</li>
    </ul>
    <h3>By product</h3>
    <table border="1" cellpadding="6"><tr><th>Product</th><th>Count</th></tr>${tableRows(summary.byProduct ?? {})}</table>
    <h3>By site</h3>
    <table border="1" cellpadding="6"><tr><th>Site</th><th>Count</th></tr>${tableRows(summary.bySite)}</table>
    <h3>By event type</h3>
    <table border="1" cellpadding="6"><tr><th>Type</th><th>Count</th></tr>${tableRows(summary.byType)}</table>
    <h3>Top paths</h3>
    <ul>${topPaths || '<li>None</li>'}</ul>
    <h3>Top cities</h3>
    <ul>${summary.byCity.map(({ city, count }) => `<li>${escapeHtml(city)} — ${count}</li>`).join('') || '<li>None</li>'}</ul>
  `;
}

export async function buildDailyReport(options = {}) {
  const hours = options.hours ?? 24;
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - hours * 60 * 60 * 1000);
  const config = options.config ?? (await getReportConfig());
  const dimensionFilters = options.filters ?? { product: null, site: null };

  if (!isFirebaseAdminConfigured()) {
    const empty = aggregateEvents([]);
    return {
      html: '<p>Firebase not configured — no report data.</p>',
      summary: empty,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      config: config.emailRecipients.length ? config : defaultReportConfig(),
    };
  }

  const allEvents = await fetchUsageEventsSince(periodStart);
  const excludedCount = allEvents.filter((e) => isEventExcluded(e, config)).length;
  let events = filterEvents(allEvents, config);
  events = filterEventsByDimensions(events, dimensionFilters);
  const summary = aggregateEvents(events);
  summary.excludedEvents = excludedCount;

  return {
    html: buildReportHtmlFromSummary(summary, {
      periodStart,
      periodEnd,
      config,
      excludedCount,
      filterLabel: options.filterLabel ?? null,
    }),
    summary,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    config,
  };
}

export function parseAnalyticsPeriod(raw) {
  switch (raw) {
    case '7d':
      return { hours: 24 * 7, label: 'Last 7 days' };
    case '30d':
      return { hours: 24 * 30, label: 'Last 30 days' };
    default:
      return { hours: 24, label: 'Last 24 hours' };
  }
}
