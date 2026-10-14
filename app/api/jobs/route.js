import { ALL_COUNTRIES, fetchDbJobs, fetchLiveJobs } from '../../../lib/jobsFeed.js';

// GET /api/jobs?q=<query>&countries=<iso2,iso2,...> -> { jobs, total, source }.
// The ingested jobs table first; when it has nothing current, the live feeds (lib/jobsFeed.js).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
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
