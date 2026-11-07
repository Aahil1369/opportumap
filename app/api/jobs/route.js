import { ALL_COUNTRIES, feedOf, fetchDbJobs, fetchLiveJobs } from '../../../lib/jobsFeed.js';
import { HOME_SEARCH } from '../../../lib/departures/homeSearch.js';
import { findJob, isJobId, trimJob } from '../../../lib/departures/jobRows.js';

const LOOKUP_TIMEOUT_MS = 6000;
// What a visitor reads when something failed; the reason goes to the server log, never the answer.
const SEARCH_FAILED = 'The job board couldn’t load roles just now. Try again in a minute.';
const LOOKUP_UNSURE = 'We couldn’t check that role just now. Try again in a minute.';

/**
 * One role by id, for a /jobs?job=<id> link whose role is on neither of the page's boards, and for
 * /saved's one-time lookup of a role saved before snapshots: the homepage's board search
 * (HOME_SEARCH, the same data-cache entries the pages use), trimmed like the server's board. Any
 * age: the homepage can list a role /jobs' own list has dropped as stale, and its link must still
 * open it. -> { jobs: [job] }; { jobs: [] } only when the feed the id comes from answered without
 * it; 503 { error } when that feed (for an id no feed writes: any feed) failed or ran out of time,
 * so "not found" is not known and /saved keeps the role pending for its next visit.
 */
async function lookup(id) {
  const failed = new Set();
  const jobs = await fetchLiveJobs({
    query: HOME_SEARCH.query,
    countries: [...HOME_SEARCH.countries],
    timeoutMs: LOOKUP_TIMEOUT_MS,
    revalidate: 600,
    onFailure: (feed) => failed.add(feed),
  });
  const job = trimJob(findJob(jobs, id));
  if (job) return Response.json({ jobs: [job] });
  const source = feedOf(id);
  if (source ? failed.has(source) : failed.size > 0) {
    console.warn(`[jobs] lookup: ${source ?? 'a feed'} did not answer in full, so not found is not known`);
    return Response.json({ error: LOOKUP_UNSURE }, { status: 503 });
  }
  return Response.json({ jobs: [] });
}

// GET /api/jobs?q=<query>&countries=<iso2,iso2,...> -> { jobs, total, source }.
// The ingested jobs table first; when it has nothing current, the live feeds (lib/jobsFeed.js).
// GET /api/jobs?id=<job id> -> { jobs: [job] | [] }, or 503 when not found is not known (see lookup).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id !== null) {
    if (!isJobId(id)) return Response.json({ error: 'bad id' }, { status: 400 });
    try {
      return await lookup(id);
    } catch (err) {
      console.error(`[jobs] lookup failed (${err?.name ?? typeof err})`);
      return Response.json({ error: LOOKUP_UNSURE }, { status: 503 });
    }
  }

  const query = searchParams.get('q') || 'software engineer';
  const countriesParam = searchParams.get('countries');
  const requestedCountries = countriesParam
    ? countriesParam.split(',').filter((c) => ALL_COUNTRIES.includes(c))
    : ALL_COUNTRIES;

  try {
    // Try Supabase first (fast)
    const dbJobs = await fetchDbJobs({ query, countries: requestedCountries });
    if (dbJobs && dbJobs.length > 0) {
      return Response.json({ jobs: dbJobs, total: dbJobs.length, source: 'db' });
    }

    // Fall back to live APIs
    const jobs = await fetchLiveJobs({ query, countries: requestedCountries });
    return Response.json({ jobs, total: jobs.length, source: 'live' });
  } catch (err) {
    console.error(`[jobs] search failed (${err?.name ?? typeof err})`);
    return Response.json({ error: SEARCH_FAILED }, { status: 500 });
  }
}
