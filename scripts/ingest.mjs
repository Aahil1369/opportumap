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
  // ── Software & Tech ──────────────────────────────────────────────
  'software engineer', 'frontend developer', 'backend developer', 'full stack developer',
  'react developer', 'node developer', 'python developer', 'java developer',
  'mobile developer', 'ios developer', 'android developer', 'typescript developer',
  'golang developer', 'rust developer', 'c++ developer', 'php developer',
  'ruby developer', 'scala developer', 'kotlin developer', 'swift developer',
  'embedded engineer', 'firmware engineer', 'game developer', 'unity developer',
  'wordpress developer', 'shopify developer', 'web developer',
  // ── Data / AI / ML ───────────────────────────────────────────────
  'data scientist', 'machine learning engineer', 'ai engineer', 'data analyst',
  'data engineer', 'nlp engineer', 'deep learning', 'llm engineer',
  'business intelligence analyst', 'data architect', 'ai researcher',
  'computer vision engineer', 'mlops engineer', 'analytics engineer',
  // ── DevOps / Cloud / Security ────────────────────────────────────
  'devops engineer', 'cloud architect', 'site reliability engineer', 'platform engineer',
  'aws engineer', 'azure engineer', 'gcp engineer', 'security engineer',
  'cybersecurity analyst', 'penetration tester', 'network engineer',
  'it administrator', 'systems administrator', 'it support',
  // ── Product / Design ─────────────────────────────────────────────
  'product manager', 'ux designer', 'ui designer', 'product designer',
  'ux researcher', 'graphic designer', 'motion designer', 'brand designer',
  'creative director', 'art director', 'visual designer', 'web designer',
  'technical writer', 'content strategist',
  // ── Finance & Business ───────────────────────────────────────────
  'financial analyst', 'accountant', 'auditor', 'investment banker',
  'quantitative analyst', 'fintech engineer', 'risk analyst', 'compliance officer',
  'financial controller', 'chief financial officer', 'tax advisor',
  'actuary', 'credit analyst', 'portfolio manager', 'wealth manager',
  'bookkeeper', 'payroll specialist', 'budget analyst', 'treasurer',
  // ── Healthcare & Medicine ────────────────────────────────────────
  'doctor', 'physician', 'surgeon', 'nurse', 'registered nurse',
  'nurse practitioner', 'pharmacist', 'dentist', 'physiotherapist',
  'occupational therapist', 'radiologist', 'cardiologist', 'pediatrician',
  'psychiatrist', 'psychologist', 'medical researcher', 'clinical researcher',
  'healthcare administrator', 'medical director', 'paramedic',
  'public health specialist', 'epidemiologist', 'nutritionist', 'dietitian',
  'speech therapist', 'optometrist', 'veterinarian', 'lab technician',
  'medical writer', 'health informatics',
  // ── Engineering (Non-tech) ───────────────────────────────────────
  'mechanical engineer', 'civil engineer', 'electrical engineer',
  'chemical engineer', 'aerospace engineer', 'structural engineer',
  'environmental engineer', 'biomedical engineer', 'industrial engineer',
  'manufacturing engineer', 'process engineer', 'quality engineer',
  'materials engineer', 'petroleum engineer', 'mining engineer',
  // ── Construction & Architecture ──────────────────────────────────
  'architect', 'urban planner', 'construction manager', 'project manager',
  'quantity surveyor', 'building surveyor', 'interior designer',
  'site manager', 'estimator', 'drafter',
  // ── Education & Research ─────────────────────────────────────────
  'teacher', 'professor', 'lecturer', 'research scientist', 'postdoc researcher',
  'curriculum developer', 'instructional designer', 'school principal',
  'education consultant', 'academic advisor', 'librarian', 'tutor',
  // ── Marketing & Sales ────────────────────────────────────────────
  'marketing manager', 'digital marketing', 'seo specialist', 'social media manager',
  'content marketing', 'growth hacker', 'performance marketing',
  'brand manager', 'sales manager', 'account executive', 'business development',
  'sales engineer', 'customer success manager', 'copywriter',
  'public relations', 'communications manager', 'email marketing',
  // ── Legal ────────────────────────────────────────────────────────
  'lawyer', 'attorney', 'legal counsel', 'paralegal', 'compliance manager',
  'contract manager', 'intellectual property lawyer', 'corporate lawyer',
  // ── HR & People ──────────────────────────────────────────────────
  'hr manager', 'human resources', 'talent acquisition', 'recruiter',
  'people operations', 'hr business partner', 'compensation analyst',
  'learning and development', 'organizational development',
  // ── Operations & Supply Chain ────────────────────────────────────
  'operations manager', 'supply chain manager', 'logistics manager',
  'procurement manager', 'warehouse manager', 'inventory analyst',
  'operations analyst', 'program manager', 'project coordinator',
  // ── Science & Research ───────────────────────────────────────────
  'biologist', 'chemist', 'physicist', 'geologist', 'marine biologist',
  'environmental scientist', 'climate scientist', 'materials scientist',
  'biotech researcher', 'pharmaceutical scientist', 'food scientist',
  // ── Hospitality & Tourism ────────────────────────────────────────
  'hotel manager', 'restaurant manager', 'chef', 'event coordinator',
  'travel consultant', 'tourism manager', 'hospitality manager',
  // ── Media & Entertainment ────────────────────────────────────────
  'journalist', 'editor', 'video producer', 'film director',
  'photographer', 'animator', '3d artist', 'game designer',
  'music producer', 'social media influencer manager',
  // ── Real Estate ──────────────────────────────────────────────────
  'real estate agent', 'property manager', 'real estate analyst',
  'facilities manager', 'asset manager',
  // ── Government & Non-profit ──────────────────────────────────────
  'policy analyst', 'government relations', 'ngo program manager',
  'social worker', 'community manager', 'nonprofit director',
];

let totalInserted = 0;

async function upsert(jobs) {
  if (!jobs.length) return;
  // Deduplicate by id before upserting
  const seen = new Set();
  const deduped = jobs.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true; });
  for (let i = 0; i < deduped.length; i += 500) {
    const chunk = deduped.slice(i, i + 500);
    const { error } = await supabase.from('jobs').upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
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
      salary_min: job.salary_min ? Math.round(job.salary_min) : null,
      salary_max: job.salary_max ? Math.round(job.salary_max) : null,
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
