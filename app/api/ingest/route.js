// Job ingestion pipeline - stores jobs to Supabase for 100K+ job support
// Call this endpoint to populate the database: POST /api/ingest
// Set up a Netlify scheduled function or cron job to run this daily

import { supabase, hasSupabase } from '../../../lib/supabase';

const SEARCH_QUERIES = [
  // Engineering
  'software engineer', 'frontend developer', 'backend developer', 'full stack developer',
  'react developer', 'node.js developer', 'python developer', 'java developer',
  'mobile developer', 'ios developer', 'android developer', 'typescript developer',
  'golang developer', 'rust developer', 'c++ developer', 'embedded engineer',
  // Data / ML / AI
  'data scientist', 'machine learning engineer', 'AI engineer', 'data analyst',
  'data engineer', 'NLP engineer', 'computer vision engineer', 'LLM engineer',
  'business intelligence', 'deep learning researcher',
  // DevOps / Cloud
  'devops engineer', 'cloud architect', 'site reliability engineer', 'platform engineer',
  'kubernetes engineer', 'AWS engineer', 'Azure engineer', 'GCP engineer',
  'infrastructure engineer', 'security engineer',
  // Product / Design
  'product manager', 'UX designer', 'UI designer', 'product designer',
  'UX researcher', 'graphic designer',
  // Finance
  'quantitative analyst', 'fintech engineer', 'blockchain developer', 'trading engineer',
  // Other tech
  'QA engineer', 'test automation', 'technical writer', 'solutions architect',
  'systems engineer', 'database administrator', 'network engineer',
];

const ALL_COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'nl', 'sg', 'br', 'mx', 'nz', 'za', 'pl', 'at', 'be', 'es', 'se', 'ch'];

const COUNTRY_COORDS = {
  us: { lng: -98, lat: 38 }, gb: { lng: -1.5, lat: 52 }, ca: { lng: -96, lat: 56 },
  au: { lng: 134, lat: -25 }, de: { lng: 10, lat: 51 }, fr: { lng: 2.3, lat: 46 },
  in: { lng: 78, lat: 20 }, it: { lng: 12, lat: 42 }, nl: { lng: 5.3, lat: 52.1 },
  sg: { lng: 103.8, lat: 1.35 }, br: { lng: -51, lat: -10 }, mx: { lng: -102, lat: 23 },
  nz: { lng: 174, lat: -41 }, za: { lng: 25, lat: -29 }, pl: { lng: 19, lat: 52 },
  at: { lng: 14, lat: 47 }, be: { lng: 4.5, lat: 50.5 }, es: { lng: -3.7, lat: 40 },
  se: { lng: 18, lat: 60 }, ch: { lng: 8.2, lat: 46.8 },
};

async function ingestFromAdzuna(query, country) {
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((job) => ({
    id: `adzuna_${job.id}`,
    title: job.title,
    company: job.company?.display_name || 'Unknown',
    location: job.location?.display_name || country.toUpperCase(),
    country,
    salary: job.salary_min ? `$${Math.round(job.salary_min).toLocaleString()} – $${Math.round(job.salary_max || job.salary_min).toLocaleString()}` : 'Salary not listed',
    salary_min: job.salary_min || null,
    salary_max: job.salary_max || null,
    url: job.redirect_url,
    description: job.description || '',
    remote: false,
    source: 'adzuna',
    lng: job.longitude ?? COUNTRY_COORDS[country]?.lng + (Math.random() - 0.5) * 8,
    lat: job.latitude ?? COUNTRY_COORDS[country]?.lat + (Math.random() - 0.5) * 8,
    last_seen: new Date().toISOString(),
  }));
}

async function ingestFromRemoteOK() {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'OpportuMap/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data.slice(1) : [])
      .filter((j) => j.position && j.company)
      .map((job, i) => ({
        id: `remoteok_${job.id || i}`,
        title: job.position,
        company: job.company,
        location: job.location || 'Remote',
        country: 'us',
        salary: job.salary || 'Salary not listed',
        salary_min: null,
        salary_max: null,
        url: job.url || '',
        description: job.description || '',
        remote: true,
        source: 'remoteok',
        lng: -98 + (Math.random() - 0.5) * 60,
        lat: 38 + (Math.random() - 0.5) * 20,
        last_seen: new Date().toISOString(),
      }));
  } catch { return []; }
}

async function upsertJobs(jobs) {
  if (!supabase || jobs.length === 0) return 0;
  // Batch upsert in chunks of 500
  let count = 0;
  for (let i = 0; i < jobs.length; i += 500) {
    const chunk = jobs.slice(i, i + 500);
    const { error } = await supabase
      .from('jobs')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
    if (!error) count += chunk.length;
  }
  return count;
}

export async function POST(request) {
  if (!hasSupabase) {
    return Response.json({ error: 'Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.' }, { status: 503 });
  }

  const startTime = Date.now();
  let totalIngested = 0;

  // Ingest remote jobs (fast, one request each)
  const remoteOKJobs = await ingestFromRemoteOK();
  totalIngested += await upsertJobs(remoteOKJobs);

  // Ingest Adzuna with multiple queries (batched to avoid rate limits)
  // Run 5 queries at a time across all countries
  for (let qi = 0; qi < SEARCH_QUERIES.length; qi += 5) {
    const batch = SEARCH_QUERIES.slice(qi, qi + 5);
    const adzunaResults = await Promise.allSettled(
      batch.flatMap((q) => ALL_COUNTRIES.slice(0, 10).map((c) => ingestFromAdzuna(q, c)))
    );
    const jobs = adzunaResults.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
    totalIngested += await upsertJobs(jobs);
    // Small delay between batches to respect rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  return Response.json({
    success: true,
    totalIngested,
    durationMs: Date.now() - startTime,
  });
}

// GET: returns count of jobs in DB
export async function GET() {
  if (!hasSupabase) {
    return Response.json({ error: 'Supabase not configured', count: 0 });
  }
  const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
  return Response.json({ count });
}
