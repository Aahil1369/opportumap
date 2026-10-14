// The one place a public display name is built. It is never derived from an
// email address. Rules match the startups BEFORE INSERT trigger in
// db/startups_rls_lockdown.sql: the first non-blank of user_metadata.full_name /
// .name, trimmed, cut to 60 characters; if that contains "@" (or there is no
// name) the user is shown as "Member " + the first 4 characters of their id.
const MAX_LEN = 60;

function pick(meta) {
  for (const key of ['full_name', 'name']) {
    const v = meta?.[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// The user's own chosen name, or '' (used to pre-fill forms).
export function realName(user) {
  const n = pick(user?.user_metadata);
  if (!n || n.includes('@')) return '';
  return Array.from(n).slice(0, MAX_LEN).join('');
}

export function displayName(user) {
  const n = realName(user);
  if (n) return n;
  const id = typeof user?.id === 'string' ? user.id : '';
  return id ? `Member ${id.slice(0, 4).toUpperCase()}` : 'Member';
}
