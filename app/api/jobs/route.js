import { ALL_COUNTRIES, fetchDbJobs, fetchLiveJobs } from '../../../lib/jobsFeed.js';
import { HOME_SEARCH } from '../../../lib/departures/homeSearch.js';
import { findJob, isJobId, trimJob } from '../../../lib/departures/jobRows.js';

const LOOKUP_TIMEOUT_MS = 6000;

/**
 * One role by id, for a /jobs?job=<id> link whose role is on neither of the page's boards:
 * the homepage's board search (HOME_SEARCH, the same data-cache entries the pages use), trimmed
 * like the server's board. Any age: the homepage can list a role /jobs' own list has dropped as
 * stale, and its link must still open it. -> { jobs: [job] } or { jobs: [] }.
 */
async function lookup(id) {
  const jobs = await fetchLiveJobs({
    query: HOME_SEARCH.query,
    countries: [...HOME_SEARCH.countries],
    timeoutMs: LOOKUP_TIMEOUT_MS,
    revalidate: 600,
  });
  const job = trimJob(findJob(jobs, id));
  return Response.json({ jobs: job ? [job] : [] });
}

// GET /api/jobs?q=<query>&countries=<iso2,iso2,...> -> { jobs, total, source }.
// The ingested jobs table first; when it has nothing current, the live feeds (lib/jobsFeed.js).
// GET /api/jobs?id=<job id> -> { jobs: [job] | [] } (see lookup).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id !== null) {
    if (!isJobId(id)) return Response.json({ error: 'bad id' }, { status: 400 });
    try {
      return await lookup(id);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
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
    return Response.json({ error: err.message }, { status: 500 });
  }
}
