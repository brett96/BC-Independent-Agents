import { recordUsageEvent, normalizeSiteInput, normalizeProductInput } from '../lib/tracking.js';
import { corsHeaders } from '../lib/api-utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};
    await recordUsageEvent(
      {
        site: normalizeSiteInput(body.site),
        product: normalizeProductInput(body.product),
        eventType: body.eventType ?? 'page_view',
        path: body.path,
        referrer: body.referrer,
        visitorId: body.visitorId,
        sessionId: body.sessionId,
        email: body.email,
        properties: body.properties,
      },
      req
    );
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('track', e);
    return res.status(400).json({ ok: false });
  }
}
