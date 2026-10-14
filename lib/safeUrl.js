// Returns a normalised absolute http(s) URL, or null for anything else
// (javascript:, data:, relative paths, junk). The URL parser percent-encodes
// quotes and spaces, so the result cannot break out of an attribute.
export function safeHttpUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
}
