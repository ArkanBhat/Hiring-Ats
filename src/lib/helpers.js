export const uid = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
export const daysSince = (iso) => iso ? Math.floor((Date.now() - new Date(iso)) / 86400000) : 0;
export const now = () => new Date().toISOString();

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export const initials = (n) =>
  (n || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** Replace {{token}} placeholders in a template string. */
export function fill(tpl, vars) {
  return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{{${k}}}`, vars[k] ?? ""), tpl || "");
}

/** Convert a base64 data URL back into a Blob for download/attachment. */
export function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:(.*?);/) || [])[1] || "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Trigger a browser download for a Blob. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
