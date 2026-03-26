const ALL_COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'nl', 'sg', 'br', 'mx', 'nz', 'za', 'pl', 'at', 'be', 'es', 'se', 'ch', 'ru'];

const COUNTRY_COORDS = {
  us: { lng: -98,   lat: 38   },
  gb: { lng: -1.5,  lat: 52   },
  ca: { lng: -96,   lat: 56   },
  au: { lng: 134,   lat: -25  },
  de: { lng: 10,    lat: 51   },
  fr: { lng: 2.3,   lat: 46   },
  in: { lng: 78,    lat: 20   },
  it: { lng: 12,    lat: 42   },
  nl: { lng: 5.3,   lat: 52.1 },
  sg: { lng: 103.8, lat: 1.35 },
  br: { lng: -51,   lat: -10  },
  mx: { lng: -102,  lat: 23   },
  nz: { lng: 174,   lat: -41  },
  za: { lng: 25,    lat: -29  },
  pl: { lng: 19,    lat: 52   },
  at: { lng: 14,    lat: 47   },
  be: { lng: 4.5,   lat: 50.5 },
  es: { lng: -3.7,  lat: 40   },
  se: { lng: 18,    lat: 60   },
  ch: { lng: 8.2,   lat: 46.8 },
  ru: { lng: 60,    lat: 55   },
};

// Scatter remote jobs across major tech hubs worldwide
const REMOTE_COORDS = [
  { lng: -122.4, lat: 37.7, country: 'us' },   // San Francisco
  { lng: -73.9,  lat: 40.7, country: 'us' },   // New York
  { lng: -0.1,   lat: 51.5, country: 'gb' },   // London
  { lng: 13.4,   lat: 52.5, country: 'de' },   // Berlin
  { lng: 2.35,   lat: 48.85,country: 'fr' },   // Paris
  { lng: 4.9,    lat: 52.37,country: 'nl' },   // Amsterdam
  { lng: 18.07,  lat: 59.33,country: 'se' },   // Stockholm
  { lng: 103.8,  lat: 1.35, country: 'sg' },   // Singapore
  { lng: 151.2,  lat: -33.8,country: 'au' },   // Sydney
  { lng: -43.1,  lat: -22.9,country: 'br' },   // Rio
  { lng: -79.4,  lat: 43.7, country: 'ca' },   // Toronto
  { lng: 72.88,  lat: 19.07,country: 'in' },   // Mumbai
  { lng: 77.2,   lat: 28.6, country: 'in' },   // Delhi
];

async function fetchAdzunaJobs(query, countries) {
  const results = await Promise.allSettled(
    countries.map(async (country) => {
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((job) => ({
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
      }));
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'software engineer';
  const countriesParam = searchParams.get('countries');
  const COUNTRIES = countriesParam
    ? countriesParam.split(',').filter((c) => ALL_COUNTRIES.includes(c))
    : ALL_COUNTRIES;

  try {
    const [adzunaJobs, remoteOKJobs, remotiveJobs] = await Promise.allSettled([
      fetchAdzunaJobs(query, COUNTRIES),
      fetchRemoteOKJobs(query),
      fetchRemotiveJobs(query),
    ]);

    const jobs = [
      ...(adzunaJobs.status === 'fulfilled' ? adzunaJobs.value : []),
      ...(remoteOKJobs.status === 'fulfilled' ? remoteOKJobs.value : []),
      ...(remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : []),
    ];

    // Deduplicate by title+company
    const seen = new Set();
    const deduped = jobs.filter((job) => {
      const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Response.json({ jobs: deduped, total: deduped.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
