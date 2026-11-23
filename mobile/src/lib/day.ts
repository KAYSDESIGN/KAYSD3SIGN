/** Jour local « AAAA-MM-JJ » et temps restant avant minuit (renouvellement quotidien). */
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function untilTomorrow(d = new Date()) {
  const next = new Date(d); next.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.round((next.getTime() - d.getTime()) / 60000));
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export function hashStr(str: string) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
