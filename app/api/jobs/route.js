// Countries with Adzuna API support
const ADZUNA_COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'nl', 'sg', 'br', 'mx', 'nz', 'za', 'pl', 'at', 'be', 'es', 'se', 'ch', 'ru'];

// All 100 countries for remote job placement
const ALL_COUNTRIES = [
  'us','ca','mx','br','ar','co','cl','pe','ve','ec','bo','uy','cr','pa','gt','do','cu','jm','tt','bs',
  'gb','de','fr','it','es','nl','se','ch','pl','at','be','pt','no','dk','fi','ie','gr','hu','ro','cz','ru','ua','hr','sk','bg','lt','lv','ee','si','rs',
  'in','cn','jp','kr','sg','ae','sa','il','tr','id','my','ph','th','vn','pk','bd','lk','np','kz','uz','qa','kw','om','jo','lb',
  'za','ng','ke','eg','et','gh','tz','ug','ma','dz','tn','cm','ci','sn','rw',
  'au','nz','pg','fj',
];

const COUNTRY_COORDS = {
  us:[-98,38],    ca:[-96,56],    mx:[-102,23],  br:[-51,-10],  ar:[-64,-34],  co:[-74,4],
  cl:[-71,-30],   pe:[-76,-9],    ve:[-66,8],    ec:[-78,-2],   bo:[-65,-17],  uy:[-56,-33],
  cr:[-84,10],    pa:[-80,9],     gt:[-90,15],   do:[-70,19],   cu:[-80,22],   jm:[-77,18],
  tt:[-61,11],    bs:[-77,25],    gb:[-1.5,52],  de:[10,51],    fr:[2.3,46],   it:[12,42],
  es:[-3.7,40],   nl:[5.3,52.1],  se:[18,60],    ch:[8.2,46.8], pl:[19,52],    at:[14,47],
  be:[4.5,50.5],  pt:[-8,39.5],   no:[10,62],    dk:[10,56],    fi:[26,64],    ie:[-8,53],
  gr:[22,39],     hu:[19,47],     ro:[25,46],    cz:[15.5,50],  ru:[60,55],    ua:[32,49],
  hr:[15.5,45],   sk:[19.5,48.7], bg:[25,43],    lt:[24,56],    lv:[25,57],    ee:[25,59],
  si:[14.8,46.1], rs:[21,44],     in:[78,20],    cn:[105,35],   jp:[138,36],   kr:[128,37],
  sg:[103.8,1.35],ae:[54,24],     sa:[45,24],    il:[35,31.5],  tr:[35,39],    id:[118,-5],
  my:[109,4],     ph:[122,12],    th:[101,15],   vn:[108,16],   pk:[70,30],    bd:[90,23.7],
  lk:[80.7,7.9],  np:[84,28],     kz:[68,48],    uz:[64,41],    qa:[51.5,25.3],kw:[47.5,29.3],
  om:[57,22],     jo:[37,31],     lb:[35.9,33.9],za:[25,-29],   ng:[8,9],      ke:[37.9,-1],
  eg:[30,27],     et:[40,9],      gh:[-1,8],     tz:[35,-6],    ug:[32,1],     ma:[-7,32],
  dz:[3,28],      tn:[9,34],      cm:[12,4],     ci:[-5.5,7.5], sn:[-14,14],   rw:[30,-2],
  au:[134,-25],   nz:[174,-41],   pg:[145,-6],   fj:[178,-18],
};

// Scatter remote jobs across all 100 countries
const REMOTE_COORDS = ALL_COUNTRIES.map((code) => {
  const [lng, lat] = COUNTRY_COORDS[code] || [0, 0];
  return { lng, lat, country: code };
});

async function fetchAdzunaJobs(query, countries) {
  const results = await Promise.allSettled(
    countries.map(async (country) => {
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((job) => {
        const postedAt = job.created || null;
        const expiresAt = postedAt ? new Date(new Date(postedAt).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString() : null;
        return {
          id: `adzuna_${job.id}`,
          title: job.title,
          company: job.company?.display_name || 'Unknown',
          location: job.location?.display_name || country.toUpperCase(),
          salary: job.salary_min
            ? `$${Math.round(job.salary_min).toLocaleString()} – $${Math.round(job.salary_max || job.salary_min).toLocaleString()}`
            : 'Salary not listed',
          url: job.redirect_url,
          lng: job.longitude ?? COUNTRY_COORDS[country].lng + (Math.random() - 0.5) * 8,
          lat: job.latitude ?? COUNTRY_COORDS[country].lat + (Math.random() - 0.5) * 8,
          country,
          remote: false,
          source: 'adzuna',
          description: job.description || '',
          posted_at: postedAt,
          expires_at: expiresAt,
        };
      });
    })
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function fetchRemoteOKJobs(query) {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'OpportuMap/1.0 (https://opportumap.vercel.app)' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // First item is metadata, skip it
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    const q = query.toLowerCase();

    return jobs
      .filter((job) => {
        if (!job.position || !job.company) return false;
        const text = `${job.position} ${job.company} ${(job.tags || []).join(' ')} ${job.description || ''}`.toLowerCase();
        // Filter by query keywords
        const keywords = q.split(' ').filter((k) => k.length > 2);
        return keywords.length === 0 || keywords.some((k) => text.includes(k));
      })
      .slice(0, 200)
      .map((job, i) => {
        const coords = REMOTE_COORDS[i % REMOTE_COORDS.length];
        return {
          id: `remoteok_${job.id || i}`,
          title: job.position,
          company: job.company,
          location: job.location || 'Remote',
          salary: job.salary || 'Salary not listed',
          url: job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
          lng: coords.lng + (Math.random() - 0.5) * 2,
          lat: coords.lat + (Math.random() - 0.5) * 2,
          country: coords.country,
          remote: true,
          source: 'remoteok',
          description: job.description || '',
        };
      });
  } catch {
    return [];
  }
}

async function fetchRemotiveJobs(query) {
  try {
    const categories = ['software-dev', 'data', 'devops-sysadmin', 'product', 'design', 'finance-legal'];
    const results = await Promise.allSettled(
      categories.map(async (cat) => {
        const res = await fetch(
          `https://remotive.com/api/remote-jobs?category=${cat}&limit=50`,
          { next: { revalidate: 600 } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.jobs || [];
      })
    );

    const allJobs = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const q = query.toLowerCase();
    const keywords = q.split(' ').filter((k) => k.length > 2);

    return allJobs
      .filter((job) => {
        const text = `${job.title} ${job.company_name} ${(job.tags || []).join(' ')} ${job.description || ''}`.toLowerCase();
        return keywords.length === 0 || keywords.some((k) => text.includes(k));
      })
      .slice(0, 300)
      .map((job, i) => {
        const coords = REMOTE_COORDS[i % REMOTE_COORDS.length];
        return {
          id: `remotive_${job.id}`,
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || 'Worldwide',
          salary: job.salary || 'Salary not listed',
          url: job.url,
          lng: coords.lng + (Math.random() - 0.5) * 2,
          lat: coords.lat + (Math.random() - 0.5) * 2,
          country: coords.country,
          remote: true,
          source: 'remotive',
          description: job.description || '',
        };
      });
  } catch {
    return [];
  }
}

async function fetchArbeitnowJobs(query) {
  try {
    // Arbeitnow is a free European tech jobs API - no auth needed
    const pages = [1, 2, 3, 4];
    const results = await Promise.allSettled(
      pages.map((p) =>
        fetch(`https://arbeitnow.com/api/job-board-api?page=${p}`, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 600 },
        }).then((r) => r.ok ? r.json() : { data: [] })
      )
    );

    const allJobs = results.flatMap((r) => r.status === 'fulfilled' ? (r.value.data || []) : []);
    const q = query.toLowerCase();
    const keywords = q.split(' ').filter((k) => k.length > 2);

    return allJobs
      .filter((job) => {
        if (!job.title || !job.company_name) return false;
        const text = `${job.title} ${job.company_name} ${(job.tags || []).join(' ')}`.toLowerCase();
        return keywords.length === 0 || keywords.some((k) => text.includes(k));
      })
      .slice(0, 200)
      .map((job, i) => {
        // Arbeitnow jobs are primarily Germany/EU
        const euCoords = [
          { lng: 13.4, lat: 52.5, country: 'de' },
          { lng: 2.35, lat: 48.85, country: 'fr' },
          { lng: 4.9, lat: 52.37, country: 'nl' },
          { lng: 18.07, lat: 59.33, country: 'se' },
          { lng: 16.37, lat: 48.2, country: 'at' },
          { lng: 4.35, lat: 50.85, country: 'be' },
          { lng: 21.0, lat: 52.2, country: 'pl' },
        ];
        const coords = euCoords[i % euCoords.length];
        return {
          id: `arbeitnow_${job.slug || i}`,
          title: job.title,
          company: job.company_name,
          location: job.location || 'Europe',
          salary: 'Salary not listed',
          url: job.url,
          lng: coords.lng + (Math.random() - 0.5) * 2,
          lat: coords.lat + (Math.random() - 0.5) * 2,
          country: job.remote ? 'de' : coords.country,
          remote: job.remote || false,
          source: 'arbeitnow',
          description: job.description || '',
        };
      });
  } catch {
    return [];
  }
}

async function fetchHimalayasJobs(query) {
  try {
    const res = await fetch('https://himalayas.app/jobs/api?limit=100', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const allJobs = data.jobs || [];
    const q = query.toLowerCase();
    const keywords = q.split(' ').filter((k) => k.length > 2);

    return allJobs
      .filter((job) => {
        if (!job.title || !job.company) return false;
        const text = `${job.title} ${job.company} ${(job.skills || []).join(' ')}`.toLowerCase();
        return keywords.length === 0 || keywords.some((k) => text.includes(k));
      })
      .map((job, i) => {
        const coords = REMOTE_COORDS[i % REMOTE_COORDS.length];
        return {
          id: `himalayas_${job.id || i}`,
          title: job.title,
          company: job.company,
          location: job.location || 'Remote',
          salary: job.salary || 'Salary not listed',
          url: job.applicationLink || job.url || `https://himalayas.app/jobs/${job.slug}`,
          lng: coords.lng + (Math.random() - 0.5) * 2,
          lat: coords.lat + (Math.random() - 0.5) * 2,
          country: coords.country,
          remote: true,
          source: 'himalayas',
          description: job.description || '',
        };
      });
  } catch {
    return [];
  }
}

async function fetchFromSupabase(query, countries) {
  try {
    const { supabase, hasSupabase } = await import('../../../lib/supabase.js');
    if (!hasSupabase) return null;

    // Check if DB has any jobs
    const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    if (!count || count === 0) return null;

    // Build query
    const now = new Date().toISOString();
    let q = supabase
      .from('jobs')
      .select('id, title, company, location, country, salary, url, remote, source, lng, lat, description, posted_at, expires_at, last_seen')
      .or(`expires_at.gt.${now},expires_at.is.null`)
      .limit(2000);

    // Full-text search
    if (query && query.trim()) {
      q = q.textSearch('fts', query.trim().split(/\s+/).join(' & '), { type: 'plain', config: 'english' });
    }

    // Country filter
    if (countries && countries.length < ALL_COUNTRIES.length) {
      q = q.in('country', countries);
    }

    const { data, error } = await q;
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'software engineer';
  const countriesParam = searchParams.get('countries');
  const requestedCountries = countriesParam
    ? countriesParam.split(',').filter((c) => ALL_COUNTRIES.includes(c))
    : ALL_COUNTRIES;

  // Only query Adzuna for countries it supports
  const adzunaCountries = requestedCountries.filter((c) => ADZUNA_COUNTRIES.includes(c));

  try {
    // Try Supabase first (fast, 100K+ jobs)
    const dbJobs = await fetchFromSupabase(query, requestedCountries);
    if (dbJobs && dbJobs.length > 0) {
      return Response.json({ jobs: dbJobs, total: dbJobs.length, source: 'db' });
    }

    // Fall back to live APIs
    const [adzunaJobs, remoteOKJobs, remotiveJobs, arbeitnowJobs, himalayasJobs] = await Promise.allSettled([
      fetchAdzunaJobs(query, adzunaCountries),
      fetchRemoteOKJobs(query),
      fetchRemotiveJobs(query),
      fetchArbeitnowJobs(query),
      fetchHimalayasJobs(query),
    ]);

    const jobs = [
      ...(adzunaJobs.status === 'fulfilled' ? adzunaJobs.value : []),
      ...(remoteOKJobs.status === 'fulfilled' ? remoteOKJobs.value : []),
      ...(remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : []),
      ...(arbeitnowJobs.status === 'fulfilled' ? arbeitnowJobs.value : []),
      ...(himalayasJobs.status === 'fulfilled' ? himalayasJobs.value : []),
    ];

    // Deduplicate by title+company
    const seen = new Set();
    const deduped = jobs.filter((job) => {
      const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Response.json({ jobs: deduped, total: deduped.length, source: 'live' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
