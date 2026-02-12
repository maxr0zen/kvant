/**
 * Конвертирует значение datetime-local (локальное время пользователя) в ISO UTC для API.
 * Браузер трактует строку без суффикса TZ как локальное время.
 */
export function datetimeLocalToISOUTC(localValue: string): string {
  if (!localValue?.trim()) return "";
  return new Date(localValue.trim()).toISOString();
}

export function parseDateTime(value?: string | null): Date | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const tryParse = (s: string): Date | null => {
    const t = Date.parse(s);
    if (Number.isFinite(t)) return new Date(t);
    return null;
  };

  // First attempt: raw string
  let d = tryParse(raw);
  if (d) return d;

  // Normalize space to "T" (e.g., "2026-02-11 12:00:00")
  let normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  d = tryParse(normalized);
  if (d) return d;

  // If missing seconds, add ":00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    d = tryParse(`${normalized}:00`);
    if (d) return d;
    normalized = `${normalized}:00`;
  }

  // If still not parseable and no timezone, try treating as UTC
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
    d = tryParse(`${normalized}Z`);
    if (d) return d;
  }

  return null;
}
