// Job ingestion pipeline — stores jobs to Supabase for 100K+ job support
// POST /api/ingest   (protected by INGEST_SECRET header or admin email)
// GET  /api/ingest   returns current DB count
// Netlify scheduled function calls this daily at 2am UTC

import { supabase, hasSupabase } from '../../../lib/supabase';

const INGEST_SECRET = process.env.INGEST_SECRET || '';

// 100+ diverse queries across every job category
const SEARCH_QUERIES = [
  // Software Engineering
  'software engineer', 'frontend developer', 'backend developer', 'full stack developer',
  'react developer', 'vue developer', 'angular developer', 'next.js developer',
  'node.js developer', 'python developer', 'java developer', 'c# developer',
  'php developer', 'ruby developer', 'scala developer', 'kotlin developer',
  'swift developer', 'typescript developer', 'golang developer', 'rust developer',
  'c++ developer', 'embedded engineer', 'firmware engineer', 'game developer',
  // Data / AI / ML
  'data scientist', 'machine learning engineer', 'AI engineer', 'data analyst',
  'data engineer', 'NLP engineer', 'computer vision engineer', 'LLM engineer',
  'business intelligence analyst', 'deep learning researcher', 'MLOps engineer',
  'analytics engineer', 'quantitative researcher',
  // DevOps / Cloud / Security
  'devops engineer', 'cloud architect', 'site reliability engineer', 'platform engineer',
  'kubernetes engineer', 'AWS engineer', 'Azure engineer', 'GCP engineer',
  'infrastructure engineer', 'security engineer', 'cybersecurity analyst',
  'network engineer', 'systems administrator', 'database administrator',
  // Product / Design / Research
  'product manager', 'UX designer', 'UI designer', 'product designer',
  'UX researcher', 'graphic designer', 'motion designer', 'brand designer',
  'creative director', 'technical writer', 'content strategist',
  // Finance / Legal
  'financial analyst', 'investment banker', 'quantitative analyst', 'fintech engineer',
  'blockchain developer', 'actuary', 'accountant', 'tax advisor',
  'compliance officer', 'risk analyst', 'corporate lawyer', 'paralegal',
  // Healthcare / Science
  'doctor', 'nurse', 'pharmacist', 'clinical researcher', 'biomedical engineer',
  'data scientist healthcare', 'health informatics', 'medical director',
  'pharmaceutical scientist', 'bioinformatics engineer',
  // Engineering (non-software)
  'mechanical engineer', 'civil engineer', 'electrical engineer', 'chemical engineer',
  'aerospace engineer', 'structural engineer', 'manufacturing engineer',
  'process engineer', 'quality engineer', 'environmental engineer',
  // Operations / Supply Chain
  'operations manager', 'supply chain manager', 'logistics manager',
  'project manager', 'program manager', 'scrum master', 'agile coach',
  // Marketing / Growth / Sales
  'growth engineer', 'digital marketing manager', 'SEO specialist',
  'performance marketer', 'marketing analyst', 'sales engineer',
  'account executive', 'business development manager',
  // Education / HR
  'instructional designer', 'e-learning developer', 'HR manager',
  'talent acquisition', 'people operations', 'organizational psychologist',
  // Executive / Leadership
  'CTO', 'VP engineering', 'engineering manager', 'tech lead',
  'chief data officer', 'director of product',
];

// All 20 Adzuna-supported countries
const ADZUNA_COUNTRIES = [
  'us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'nl', 'sg',
  'br', 'mx', 'nz', 'za', 'pl', 'at', 'be', 'es', 'se', 'ch',
];

const COUNTRY_COORDS = {
  us: { lng: -98, lat: 38 },   gb: { lng: -1.5, lat: 52 },  ca: { lng: -96, lat: 56 },
  au: { lng: 134, lat: -25 },  de: { lng: 10, lat: 51 },    fr: { lng: 2.3, lat: 46 },
  in: { lng: 78, lat: 20 },    it: { lng: 12, lat: 42 },    nl: { lng: 5.3, lat: 52.1 },
  sg: { lng: 103.8, lat: 1.35 }, br: { lng: -51, lat: -10 }, mx: { lng: -102, lat: 23 },
  nz: { lng: 174, lat: -41 },  za: { lng: 25, lat: -29 },   pl: { lng: 19, lat: 52 },
  at: { lng: 14, lat: 47 },    be: { lng: 4.5, lat: 50.5 }, es: { lng: -3.7, lat: 40 },
  se: { lng: 18, lat: 60 },    ch: { lng: 8.2, lat: 46.8 },
};

async function fetchAdzunaPage(query, country, page = 1) {
  const coords = COUNTRY_COORDS[country];
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const now = new Date();
    return (data.results || []).map((job) => {
      const postedAt = job.created ? new Date(job.created) : now;
      const expiresAt = new Date(postedAt.getTime() + 60 * 24 * 60 * 60 * 1000); // +60 days
      return {
        id: `adzuna_${job.id}`,
        title: job.title,
        company: job.company?.display_name || 'Unknown',
        location: job.location?.display_name || country.toUpperCase(),
        country,
        salary: job.salary_min
          ? `$${Math.round(job.salary_min).toLocaleString()} – $${Math.round(job.salary_max || job.salary_min).toLocaleString()}`
          : 'Salary not listed',
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
        url: job.redirect_url,
        description: (job.description || '').slice(0, 1000),
        remote: false,
        source: 'adzuna',
        lng: job.longitude ?? coords.lng + (Math.random() - 0.5) * 8,
        lat: job.latitude ?? coords.lat + (Math.random() - 0.5) * 8,
        posted_at: postedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_seen: now.toISOString(),
      };
    });
  } catch { return []; }
}

async function ingestRemotive() {
  const categories = [
    'software-dev', 'data', 'devops-sysadmin', 'product', 'design',
    'finance-legal', 'marketing-sales', 'customer-support', 'hr',
  ];
  const results = await Promise.allSettled(
    categories.map((cat) =>
      fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=50`, { signal: AbortSignal.timeout(8000) })
        .then((r) => r.ok ? r.json() : { jobs: [] })
        .then((d) => d.jobs || [])
        .catch(() => [])
    )
  );
  const now = new Date();
  const allJobs = results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
  const remoteCoords = [
    { lng: -98, lat: 38, country: 'us' }, { lng: -1.5, lat: 52, country: 'gb' },
    { lng: 2.3, lat: 46, country: 'fr' }, { lng: 10, lat: 51, country: 'de' },
    { lng: 134, lat: -25, country: 'au' }, { lng: 103.8, lat: 1.35, country: 'sg' },
  ];
  return allJobs.filter((j) => j.title && j.company_name).map((job, i) => {
    const coords = remoteCoords[i % remoteCoords.length];
    const postedAt = job.publication_date ? new Date(job.publication_date) : now;
    const expiresAt = new Date(postedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
    return {
      id: `remotive_${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Worldwide',
      country: coords.country,
      salary: job.salary || 'Salary not listed',
      salary_min: null,
      salary_max: null,
      url: job.url,
      description: '',
      remote: true,
      source: 'remotive',
      lng: coords.lng + (Math.random() - 0.5) * 2,
      lat: coords.lat + (Math.random() - 0.5) * 2,
      posted_at: postedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_seen: now.toISOString(),
    };
  });
}

async function ingestArbeitnow() {
  const pages = [1, 2, 3, 4, 5, 6];
  const results = await Promise.allSettled(
    pages.map((p) =>
      fetch(`https://arbeitnow.com/api/job-board-api?page=${p}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.ok ? r.json() : { data: [] }).then((d) => d.data || []).catch(() => [])
    )
  );
  const now = new Date();
  const euCoords = [
    { lng: 13.4, lat: 52.5, country: 'de' }, { lng: 2.35, lat: 48.85, country: 'fr' },
    { lng: 4.9, lat: 52.37, country: 'nl' }, { lng: 18.07, lat: 59.33, country: 'se' },
    { lng: 16.37, lat: 48.2, country: 'at' }, { lng: 4.35, lat: 50.85, country: 'be' },
    { lng: 21.0, lat: 52.2, country: 'pl' },
  ];
  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : [])
    .filter((j) => j.title && j.company_name)
    .map((job, i) => {
      const coords = euCoords[i % euCoords.length];
      const postedAt = job.created_at ? new Date(job.created_at * 1000) : now;
      const expiresAt = new Date(postedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
      return {
        id: `arbeitnow_${job.slug || i}`,
        title: job.title,
        company: job.company_name,
        location: job.location || 'Europe',
        country: job.remote ? coords.country : coords.country,
        salary: 'Salary not listed',
        salary_min: null,
        salary_max: null,
        url: job.url,
        description: '',
        remote: job.remote || false,
        source: 'arbeitnow',
        lng: coords.lng + (Math.random() - 0.5) * 2,
        lat: coords.lat + (Math.random() - 0.5) * 2,
        posted_at: postedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_seen: now.toISOString(),
      };
    });
}

async function ingestRemoteOK() {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'OpportuMap/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const now = new Date();
    return (Array.isArray(data) ? data.slice(1) : [])
      .filter((j) => j.position && j.company)
      .map((job, i) => {
        const postedAt = job.date ? new Date(job.date * 1000) : now;
        const expiresAt = new Date(postedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
        return {
          id: `remoteok_${job.id || i}`,
          title: job.position,
          company: job.company,
          location: job.location || 'Remote',
          country: 'us',
          salary: job.salary || 'Salary not listed',
          salary_min: null, salary_max: null,
          url: job.url || '',
          description: '',
          remote: true,
          source: 'remoteok',
          lng: -98 + (Math.random() - 0.5) * 60,
          lat: 38 + (Math.random() - 0.5) * 20,
          posted_at: postedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          last_seen: now.toISOString(),
        };
      });
  } catch { return []; }
}

async function upsertBatch(jobs) {
  if (!jobs.length) return 0;
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function POST(request) {
  // Auth check
  const authHeader = request.headers.get('Authorization') || '';
  const isAdmin = authHeader === `Bearer ${INGEST_SECRET}` && INGEST_SECRET;

  if (!isAdmin) {
    // Also allow Supabase admin session (for manual trigger from admin panel)
    const { createClient } = await import('../../../lib/supabase-server.js');
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user || user.email !== 'aahilakbar567@gmail.com') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!hasSupabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const startTime = Date.now();
  let totalIngested = 0;

  // Step 1: Ingest non-Adzuna sources in parallel (fast)
  const [remoteOKJobs, remotiveJobs, arbeitnowJobs] = await Promise.allSettled([
    ingestRemoteOK(),
    ingestRemotive(),
    ingestArbeitnow(),
  ]);
  const nonAdzunaJobs = [
    ...(remoteOKJobs.status === 'fulfilled' ? remoteOKJobs.value : []),
    ...(remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : []),
    ...(arbeitnowJobs.status === 'fulfilled' ? arbeitnowJobs.value : []),
  ];
  totalIngested += await upsertBatch(nonAdzunaJobs);

  // Step 2: Adzuna — fetch 2 pages per query/country in batches of 8 requests
  // 100 queries × 20 countries × 2 pages = 4000 API calls (process in batches)
  const adzunaTasks = [];
  for (const query of SEARCH_QUERIES) {
    for (const country of ADZUNA_COUNTRIES) {
      adzunaTasks.push({ query, country, page: 1 });
      adzunaTasks.push({ query, country, page: 2 });
    }
  }

  const BATCH_SIZE = 10;
  const DELAY_MS = 300;

  for (let i = 0; i < adzunaTasks.length; i += BATCH_SIZE) {
    const batch = adzunaTasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ query, country, page }) => fetchAdzunaPage(query, country, page))
    );
    const jobs = results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
    if (jobs.length > 0) {
      totalIngested += await upsertBatch(jobs);
    }
    if (i + BATCH_SIZE < adzunaTasks.length) {
      await sleep(DELAY_MS);
    }
  }

  // Step 3: Cleanup — delete jobs that expired more than 30 days ago
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('jobs').delete().lt('expires_at', cutoff);

  return Response.json({
    success: true,
    totalIngested,
    durationMs: Date.now() - startTime,
    message: `Ingested ${totalIngested.toLocaleString()} jobs`,
  });
}

// GET: returns current DB job count
export async function GET() {
  if (!hasSupabase) {
    return Response.json({ error: 'Supabase not configured', count: 0 });
  }
  const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
  const { count: expired } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .lt('expires_at', new Date().toISOString());
  return Response.json({ count, expired });
}
