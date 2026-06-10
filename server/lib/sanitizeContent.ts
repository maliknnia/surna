import DOMPurify from "isomorphic-dompurify";

/** Plain-text UGC: remove HTML/scripts; cap length before persistence. */
export function sanitizePlainText(input: string, maxLen = 5000): string {
  const clean = DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return clean.slice(0, maxLen);
}

export function sanitizeOptionalText(value: unknown, maxLen = 5000): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = sanitizePlainText(value, maxLen);
  return out.length ? out : undefined;
}
