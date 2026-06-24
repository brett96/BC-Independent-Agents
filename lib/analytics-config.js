/** Canonical product slugs stored on every usage event. */
export const PRODUCTS = {
  INDEPENDENT_AGENTS: 'independent-agents',
  BOOKCOVER_LANDING: 'bookcover-landing',
  MEMBER_DEMO: 'member-demo',
  AGENT_DEMO: 'agent-demo',
};

export const PRODUCT_LABELS = {
  [PRODUCTS.INDEPENDENT_AGENTS]: 'Independent Agents',
  [PRODUCTS.BOOKCOVER_LANDING]: 'BookCover Landing',
  [PRODUCTS.MEMBER_DEMO]: 'Member Demo (standalone)',
  [PRODUCTS.AGENT_DEMO]: 'Agent Demo (standalone)',
  legacy: 'Legacy (no product tag)',
  unknown: 'Unknown',
};

export const SITES = ['landing', 'member', 'agent'];

export const SITE_LABELS = {
  landing: 'Landing page',
  member: 'Member demo',
  agent: 'Agent demo',
  unknown: 'Unknown',
};

export function labelProduct(slug) {
  return PRODUCT_LABELS[slug] ?? slug;
}

export function labelSite(slug) {
  return SITE_LABELS[slug] ?? slug;
}

/** Normalize stored product; missing field → legacy (pre-migration events). */
export function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'string') return 'legacy';
  const v = raw.trim().toLowerCase();
  if (Object.values(PRODUCTS).includes(v)) return v;
  return v || 'unknown';
}

export function normalizeSite(raw) {
  if (!raw || typeof raw !== 'string') return 'unknown';
  const v = raw.trim().toLowerCase();
  return SITES.includes(v) ? v : 'unknown';
}

/**
 * Parse admin analytics query filters.
 * product/site = "all" or omitted → no filter on that dimension.
 */
export function parseAnalyticsFilters(query = {}) {
  const productRaw = query.product?.trim().toLowerCase();
  const siteRaw = query.site?.trim().toLowerCase();

  const product =
    productRaw && productRaw !== 'all' ? productRaw : null;
  const site = siteRaw && siteRaw !== 'all' ? siteRaw : null;

  return { product, site };
}

export function filterEventsByDimensions(events, filters) {
  const { product, site } = filters;
  return events.filter((e) => {
    const p = normalizeProduct(e.product);
    const s = normalizeSite(e.site);
    if (product && p !== product) return false;
    if (site && s !== site) return false;
    return true;
  });
}

export function knownProductsFromEvents(events) {
  const set = new Set();
  for (const e of events) {
    set.add(normalizeProduct(e.product));
  }
  return [...set].sort();
}
