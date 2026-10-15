// The lounge (/community) API's rules, pure so they are unit-tested: what a post or a comment
// may hold, and how a like or a follow reaches the state the user asked for.
// Used by app/api/community/* (server) and the lounge's composer (client: maxLength + tags).

export const POST_TYPE_VALUES = ['story', 'job', 'question', 'advice'];

export const LIMITS = { title: 120, content: 5000, comment: 1000, tag: 24, tags: 5 };

/** 'visa, #Canada ,tech' (or a list) -> ['visa', 'Canada', 'tech']: ≤ 5 tags, no '#', no repeats. */
export function tagsFrom(input) {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const tag = Array.from(item.trim().replace(/^#+/, '').trim()).slice(0, LIMITS.tag).join('');
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === LIMITS.tags) break;
  }
  return out;
}

const text = (v) => (typeof v === 'string' ? v.trim() : null);

/** A new post's body -> { value: { title, content, post_type, tags } } or { error }. */
export function postInput(body) {
  const content = text(body?.content);
  if (!content) return { error: 'Write something to post.' };
  if (content.length > LIMITS.content) return { error: `Keep the post under ${LIMITS.content} characters.` };
  const title = text(body?.title) || null;
  if (title && title.length > LIMITS.title) return { error: `Keep the title under ${LIMITS.title} characters.` };
  const post_type = POST_TYPE_VALUES.includes(body?.post_type) ? body.post_type : 'story';
  return { value: { title, content, post_type, tags: tagsFrom(body?.tags) } };
}

/** A new comment's body -> { value: { post_id, content } } or { error }. */
export function commentInput(body) {
  const post_id = text(body?.post_id);
  const content = text(body?.content);
  if (!post_id) return { error: 'Missing post' };
  if (!content) return { error: 'Write a comment first.' };
  if (content.length > LIMITS.comment) return { error: `Keep comments under ${LIMITS.comment} characters.` };
  return { value: { post_id, content } };
}

/** The state the client asked for ({ liked: true }), or undefined (then the edge toggles). */
export function wantFrom(body, key) {
  const v = body?.[key];
  return typeof v === 'boolean' ? v : undefined;
}

/**
 * Take a like/follow edge to `want` (true = there). `on` is whether it is there now; `add` and
 * `drop` write it and resolve to { error }. Without `want` it toggles. Already in the asked-for
 * state: nothing is written, so a double tap never undoes the first. A failed write is
 * { error } (never reported as done); a duplicate insert (23505) means it is already there.
 */
export async function setEdge({ on, want, add, drop }) {
  const target = typeof want === 'boolean' ? want : !on;
  if (target === Boolean(on)) return { on: target };
  const { error } = (await (target ? add() : drop())) || {};
  if (error && !(target && error.code === '23505')) return { error };
  return { on: target };
}
