// Job ingestion script — run locally to seed Supabase with 100K+ jobs
// Usage: node scripts/ingest.mjs
// This can run for 10-30 minutes — that's fine, it's on your machine not a server

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const env = readFileSync('.env.local', 'utf8');
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));
const SUPABASE_URL = vars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = vars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const ADZUNA_ID = vars['ADZUNA_APP_ID'];
const ADZUNA_KEY = vars['ADZUNA_APP_KEY'];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'nl', 'sg', 'br', 'mx', 'nz', 'za', 'pl', 'at', 'be', 'es', 'se', 'ch'];

const COUNTRY_COORDS = {
  us: [-98, 38], gb: [-1.5, 52], ca: [-96, 56], au: [134, -25], de: [10, 51],
  fr: [2.3, 46], in: [78, 20], it: [12, 42], nl: [5.3, 52.1], sg: [103.8, 1.35],
  br: [-51, -10], mx: [-102, 23], nz: [174, -41], za: [25, -29], pl: [19, 52],
  at: [14, 47], be: [4.5, 50.5], es: [-3.7, 40], se: [18, 60], ch: [8.2, 46.8],
};

const REMOTE_COORDS = [
  [-122.4, 37.7, 'us'], [-73.9, 40.7, 'us'], [-0.1, 51.5, 'gb'], [13.4, 52.5, 'de'],
  [2.35, 48.85, 'fr'], [4.9, 52.37, 'nl'], [18.07, 59.33, 'se'], [103.8, 1.35, 'sg'],
  [151.2, -33.8, 'au'], [-79.4, 43.7, 'ca'], [72.88, 19.07, 'in'],
];

const QUERIES = [
  'software engineer', 'frontend developer', 'backend developer', 'full stack developer',
  'react developer', 'node developer', 'python developer', 'java developer',
  'mobile developer', 'ios developer', 'android developer', 'typescript developer',
  'data scientist', 'machine learning engineer', 'ai engineer', 'data analyst',
  'data engineer', 'nlp engineer', 'deep learning', 'llm engineer',
  'devops engineer', 'cloud architect', 'site reliability engineer', 'platform engineer',
  'kubernetes', 'aws engineer', 'azure engineer', 'security engineer',
  'product manager', 'ux designer', 'ui designer', 'product designer',
  'quantitative analyst', 'fintech engineer', 'blockchain developer',
  'qa engineer', 'test automation', 'solutions architect', 'systems engineer',
  'golang developer', 'rust developer', 'c++ developer', 'php developer',
  'ruby developer', 'scala developer', 'kotlin developer', 'swift developer',
];

let totalInserted = 0;

async function upsert(jobs) {
  if (!jobs.length) return;
  for (let i = 0; i < jobs.length; i += 500) {
    const chunk = jobs.slice(i, i + 500);
    const { error } = await supabase.from('jobs').upsert(chunk, { onConflict: 'id' });
    if (error) console.error('  Upsert error:', error.message);
    else totalInserted += chunk.length;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ingestAdzuna(query, country) {
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const [baseLng, baseLat] = COUNTRY_COORDS[country] || [0, 0];
    return (data.results || []).map(job => ({
      id: `adzuna_${job.id}`,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location: job.location?.display_name || country.toUpperCase(),
      country,
      salary: job.salary_min ? `$${Math.round(job.salary_min).toLocaleString()} – $${Math.round(job.salary_max || job.salary_min).toLocaleString()}` : 'Salary not listed',
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      url: job.redirect_url,
      description: (job.description || '').slice(0, 2000),
      remote: false,
      source: 'adzuna',
      lng: job.longitude ?? baseLng + (Math.random() - 0.5) * 8,
      lat: job.latitude ?? baseLat + (Math.random() - 0.5) * 8,
      last_seen: new Date().toISOString(),
    }));
  } catch { return []; }
}

async function ingestRemoteOK() {
  try {
    console.log('  Fetching RemoteOK...');
    const res = await fetch('https://remoteok.com/api', { headers: { 'User-Agent': 'OpportuMap/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = (Array.isArray(data) ? data.slice(1) : []).filter(j => j.position && j.company);
    return jobs.map((job, i) => {
      const [lng, lat, country] = REMOTE_COORDS[i % REMOTE_COORDS.length];
      return {
        id: `remoteok_${job.id || i}`,
        title: job.position,
        company: job.company,
        location: job.location || 'Remote',
        country,
        salary: job.salary || 'Salary not listed',
        salary_min: null, salary_max: null,
        url: job.url || '',
        description: (job.description || '').slice(0, 2000),
        remote: true,
        source: 'remoteok',
        lng: lng + (Math.random() - 0.5) * 2,
        lat: lat + (Math.random() - 0.5) * 2,
        last_seen: new Date().toISOString(),
      };
    });
  } catch { return []; }
}

async function ingestRemotive() {
  try {
    console.log('  Fetching Remotive...');
    const cats = ['software-dev', 'data', 'devops-sysadmin', 'product', 'design', 'finance-legal', 'qa', 'backend'];
    const results = await Promise.allSettled(cats.map(c =>
      fetch(`https://remotive.com/api/remote-jobs?category=${c}&limit=100`).then(r => r.json())
    ));
    return results.flatMap((r, ri) => (r.status === 'fulfilled' ? r.value.jobs || [] : []))
      .map((job, i) => {
        const [lng, lat, country] = REMOTE_COORDS[i % REMOTE_COORDS.length];
        return {
          id: `remotive_${job.id}`,
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || 'Worldwide',
          country,
          salary: job.salary || 'Salary not listed',
          salary_min: null, salary_max: null,
          url: job.url,
          description: (job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 2000),
          remote: true,
          source: 'remotive',
          lng: lng + (Math.random() - 0.5) * 2,
          lat: lat + (Math.random() - 0.5) * 2,
          last_seen: new Date().toISOString(),
        };
      });
  } catch { return []; }
}

async function ingestArbeitnow() {
  try {
    console.log('  Fetching Arbeitnow...');
    const pages = [1, 2, 3, 4, 5, 6, 7, 8];
    const euCoords = [
      [13.4, 52.5, 'de'], [2.35, 48.85, 'fr'], [4.9, 52.37, 'nl'],
      [18.07, 59.33, 'se'], [16.37, 48.2, 'at'], [4.35, 50.85, 'be'], [21.0, 52.2, 'pl'],
    ];
    const results = await Promise.allSettled(pages.map(p =>
      fetch(`https://arbeitnow.com/api/job-board-api?page=${p}`, { headers: { Accept: 'application/json' } }).then(r => r.json())
    ));
    return results.flatMap(r => r.status === 'fulfilled' ? r.value.data || [] : [])
      .filter(j => j.title && j.company_name)
      .map((job, i) => {
        const [lng, lat, country] = euCoords[i % euCoords.length];
        return {
          id: `arbeitnow_${job.slug || i}`,
          title: job.title,
          company: job.company_name,
          location: job.location || 'Europe',
          country: job.remote ? 'de' : country,
          salary: 'Salary not listed',
          salary_min: null, salary_max: null,
          url: job.url,
          description: (job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 2000),
          remote: job.remote || false,
          source: 'arbeitnow',
          lng: lng + (Math.random() - 0.5) * 2,
          lat: lat + (Math.random() - 0.5) * 2,
          last_seen: new Date().toISOString(),
        };
      });
  } catch { return []; }
}

async function main() {
  console.log('🚀 OpportuMap Job Ingestion — Seeding Supabase\n');

  // Remote jobs first (fast)
  const [remoteOK, remotive, arbeitnow] = await Promise.all([
    ingestRemoteOK(),
    ingestRemotive(),
    ingestArbeitnow(),
  ]);
  await upsert([...remoteOK, ...remotive, ...arbeitnow]);
  console.log(`✓ Remote sources: ${remoteOK.length + remotive.length + arbeitnow.length} jobs → DB total: ${totalInserted}`);

  // Adzuna: all queries × all countries (the bulk)
  console.log(`\n📡 Adzuna: ${QUERIES.length} queries × ${COUNTRIES.length} countries...\n`);
  for (let qi = 0; qi < QUERIES.length; qi++) {
    const q = QUERIES[qi];
    process.stdout.write(`  [${qi + 1}/${QUERIES.length}] "${q}" ... `);
    const results = await Promise.allSettled(COUNTRIES.map(c => ingestAdzuna(q, c)));
    const jobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    await upsert(jobs);
    console.log(`${jobs.length} jobs → DB total: ${totalInserted}`);
    await sleep(300); // Respect Adzuna rate limits
  }

  console.log(`\n✅ Done! Total jobs in Supabase: ${totalInserted}`);
}

main().catch(console.error);
