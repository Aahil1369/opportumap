// Canonical UUID check. Run it on any id before it is put into a PostgREST
// filter string (e.g. .or(`sender_id.eq.${id}`)), where a crafted value could
// otherwise add its own filter clauses.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}
