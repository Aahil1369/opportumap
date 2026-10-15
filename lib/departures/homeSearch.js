// The homepage board's search: "software" roles in Adzuna countries across the continents (plus
// the remote feeds). /jobs shows the same search as its default board, server-rendered, so the
// two pages share one data-cache entry (no extra feed calls) and every role the homepage links
// to (/jobs?job=<id>) is on /jobs' board too.

export const HOME_SEARCH = Object.freeze({
  query: 'software',
  countries: Object.freeze(['ca', 'gb', 'de', 'in', 'sg', 'au', 'nl', 'us']),
});
