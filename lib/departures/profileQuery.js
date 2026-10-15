// The search a visitor's profile stands for: its first job type, then up to three skills
// ("software engineer react node typescript"). /jobs searches it, and the homepage's personal
// board asks /api/jobs for the same roles. Tiny on purpose: the homepage imports it up front.

export const DEFAULT_QUERY = 'software engineer';

const JOB_TYPE_QUERIES = {
  'Software Engineering': 'software engineer',
  'Data Science / ML': 'data scientist machine learning',
  'Product Management': 'product manager',
  Design: 'UX designer',
  'DevOps / Cloud': 'devops cloud engineer',
  Research: 'research engineer',
  'Finance / Fintech': 'fintech engineer',
};

/** The profile's search, or 'software engineer' when it says nothing. */
export function profileQuery(profile) {
  const parts = [];
  const type = profile?.jobTypes?.[0];
  if (type && JOB_TYPE_QUERIES[type]) parts.push(JOB_TYPE_QUERIES[type]);
  if (typeof profile?.skills === 'string') {
    parts.push(...profile.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3));
  }
  return parts.slice(0, 5).join(' ') || DEFAULT_QUERY;
}
