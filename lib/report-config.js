import { getAdminDb, isFirebaseAdminConfigured } from './firebase-admin.js';

const DOC_PATH = { collection: 'settings', id: 'report' };

function parseList(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function defaultReportConfig() {
  return {
    emailRecipients: parseList(process.env.REPORT_EMAIL_TO).map((e) => e.toLowerCase()),
    excludedIps: [],
    excludedCities: [],
  };
}

export function normalizeReportConfig(input) {
  return {
    emailRecipients: (input.emailRecipients ?? [])
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    excludedIps: (input.excludedIps ?? []).map((ip) => ip.trim()).filter(Boolean),
    excludedCities: (input.excludedCities ?? [])
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  };
}

export async function getReportConfig() {
  const defaults = defaultReportConfig();
  if (!isFirebaseAdminConfigured()) return defaults;

  try {
    const snap = await getAdminDb()
      .collection(DOC_PATH.collection)
      .doc(DOC_PATH.id)
      .get();
    if (!snap.exists) return defaults;
    const data = snap.data();
    const merged = normalizeReportConfig({
      emailRecipients:
        data.emailRecipients?.length > 0 ? data.emailRecipients : defaults.emailRecipients,
      excludedIps: data.excludedIps ?? defaults.excludedIps,
      excludedCities: data.excludedCities ?? defaults.excludedCities,
    });
    return {
      ...merged,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    };
  } catch {
    return defaults;
  }
}

export async function saveReportConfig(config, updatedBy) {
  const normalized = normalizeReportConfig(config);
  const updatedAt = new Date().toISOString();

  if (isFirebaseAdminConfigured()) {
    await getAdminDb()
      .collection(DOC_PATH.collection)
      .doc(DOC_PATH.id)
      .set({ ...normalized, updatedAt, updatedBy }, { merge: true });
  }

  return { ...normalized, updatedAt, updatedBy };
}
