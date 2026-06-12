/**
 * Persistence layer.
 *
 * Currently backed by the browser's localStorage so the app runs locally with
 * zero setup. The API is intentionally async (returns Promises) so you can
 * later swap this single file for `fetch()` calls to a real backend without
 * touching any component code.
 */
const PREFIX = "ats:";

export async function sGet(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function sSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // Most likely quota exceeded (large resumes). Surface to the console.
    console.error("Storage write failed for", key, e);
  }
}

export async function sDel(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (e) {
    /* noop */
  }
}
