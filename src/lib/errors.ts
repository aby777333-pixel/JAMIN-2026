/**
 * Human-readable message for any thrown value.
 *
 * Supabase / PostgREST surface errors as plain objects (e.g. `{ message, code,
 * details, hint }`) that are NOT `Error` instances, so the old
 * "instanceof Error ? e.message : String(e)" pattern fell through to
 * String(e) and rendered the useless "[object Object]". This helper returns
 * the real message for Error instances, Supabase-style error objects and plain
 * strings alike, and only falls back to stringifying when there is genuinely
 * nothing better.
 */
export function errMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e == null) return fallback;
  if (typeof e === 'string') return e || fallback;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const msg = o.message ?? o.error_description ?? o.error ?? o.details ?? o.hint;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  const s = String(e);
  return s && s !== '[object Object]' ? s : fallback;
}
