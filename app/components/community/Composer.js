'use client';

// The lounge's composer. Members: a "Share your story…" bar that opens the form (type, title,
// text, tags; every field 16px with a label). Visitors: a sign-in card in its place. The draft
// survives closing the form; it clears once the post is up. Errors stay on screen (role=alert)
// and an expired session asks to sign in again.

import { useEffect, useRef, useState } from 'react';
import { fetchJson } from '../../../lib/fetchJson.js';
import { LIMITS } from '../../../lib/community.js';
import { POST_TYPES } from '../../../lib/departures/lounge.js';
import { displayName } from '../../../lib/displayName.js';
import Avatar from './Avatar';
import RouteChip from './RouteChip';
import { SignInPrompt } from './SignIn';

const EMPTY = { post_type: 'story', title: '', content: '', tags: '' };

export default function Composer({ session, ownRoute, open, onOpenChange, onSignIn, onPosted }) {
  const [draft, setDraft] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const textRef = useRef(null);
  const barRef = useRef(null);

  // Opening the form (the bar, or "Write the first post" on an empty lounge) puts the caret in it.
  useEffect(() => {
    if (open) textRef.current?.focus();
  }, [open]);

  if (session.status === 'loading') {
    return (
      <div className="lg-compose lg-compose-wait" aria-hidden="true">
        <span className="lg-skel lg-skel-av" />
        <span className="lg-skel lg-skel-bar" />
      </div>
    );
  }
  if (session.status === 'error') {
    return (
      <div className="lg-prompt" role="alert">
        <p className="lg-prompt-t">We couldn&apos;t check your sign-in.</p>
        <p className="lg-prompt-s">The lounge is still here to read. Try again to post, like or comment.</p>
        <div className="lg-prompt-a">
          <button type="button" className="lg-btn lg-btn-ghost" onClick={session.retry}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!session.user) {
    return (
      <SignInPrompt id="lg-compose-signin" title="Sign in to post in the lounge" button="Sign in to post" onSignIn={onSignIn}>
        Share a story, a role you&apos;ve seen, a question before you move, or advice that worked.
      </SignInPrompt>
    );
  }

  const user = session.user;
  const name = displayName(user);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const empty = !draft.content.trim();

  const openForm = () => onOpenChange(true);
  const closeForm = () => {
    onOpenChange(false);
    setError('');
    requestAnimationFrame(() => barRef.current?.focus());
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy.current) return;
    if (empty) {
      setError('Write something to post.');
      textRef.current?.focus();
      return;
    }
    busy.current = true;
    setSending(true);
    setError('');
    try {
      // The server sets the author's name from the session (lib/displayName.js) and checks
      // the type, the lengths and the tags (lib/community.js).
      const d = await fetchJson('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: draft.post_type,
          title: draft.title.trim() || undefined,
          content: draft.content.trim(),
          tags: draft.tags,
        }),
      });
      if (!d?.post) throw new Error('No post came back');
      setDraft(EMPTY);
      onOpenChange(false);
      onPosted(d.post);
      requestAnimationFrame(() => barRef.current?.focus());
    } catch (err) {
      if (err?.status === 401) setError('Your session ended. Sign in again to post.');
      else if (err?.status === 400) setError(err.message);
      else setError("Your post didn't go up. Check your connection and try again.");
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return (
    <section className="lg-compose" aria-labelledby="lg-compose-h">
      <h2 className="sr-only" id="lg-compose-h">
        Post in the lounge
      </h2>
      <div className="lg-compose-bar">
        <Avatar name={name} src={user.user_metadata?.avatar_url} />
        <button
          ref={barRef}
          type="button"
          className="lg-compose-open"
          data-after-signin=""
          aria-expanded={open}
          aria-controls="lg-compose-form"
          onClick={open ? closeForm : openForm}
        >
          {open ? 'Writing a post…' : 'Share your story, post a role, ask a question…'}
        </button>
      </div>

      {open && (
        <form className="lg-form" id="lg-compose-form" onSubmit={submit} noValidate>
          <p className="lg-as">
            <span>Posting as {name}</span>
            <RouteChip ends={ownRoute} />
          </p>

          <fieldset className="lg-types">
            <legend className="lg-label">What are you posting?</legend>
            <div className="lg-type-row">
              {POST_TYPES.map((t) => (
                <label key={t.value} className="lg-type-opt">
                  <input
                    type="radio"
                    name="lg-post-type"
                    value={t.value}
                    checked={draft.post_type === t.value}
                    onChange={set('post_type')}
                  />
                  <span>{t.word}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="lg-label" htmlFor="lg-f-title">
            Title <span className="lg-opt">(optional)</span>
          </label>
          <input
            id="lg-f-title"
            className="lg-input"
            value={draft.title}
            onChange={set('title')}
            maxLength={LIMITS.title}
            autoComplete="off"
          />

          <label className="lg-label" htmlFor="lg-f-content">
            Your post
          </label>
          <textarea
            id="lg-f-content"
            ref={textRef}
            className="lg-input lg-textarea"
            value={draft.content}
            onChange={set('content')}
            maxLength={LIMITS.content}
            rows={5}
            placeholder="What happened, what you learned, or what you want to ask."
            aria-invalid={error && empty ? 'true' : undefined}
          />

          <label className="lg-label" htmlFor="lg-f-tags">
            Tags <span className="lg-opt">(optional)</span>
          </label>
          <input
            id="lg-f-tags"
            className="lg-input"
            value={draft.tags}
            onChange={set('tags')}
            placeholder="visa, canada, tech"
            aria-describedby="lg-f-tags-hint"
            autoComplete="off"
          />
          <p className="lg-hint" id="lg-f-tags-hint">
            Up to {LIMITS.tags}, separated by commas.
          </p>

          {error && (
            <p className="lg-error" role="alert">
              {error}
              {error.startsWith('Your session ended') && (
                <>
                  {' '}
                  <button type="button" className="lg-link" onClick={onSignIn}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          )}

          <div className="lg-form-a">
            <button type="button" className="lg-btn lg-btn-ghost" onClick={closeForm}>
              Not now
            </button>
            <button type="submit" className="lg-btn lg-btn-sign" aria-disabled={sending ? 'true' : undefined}>
              {sending ? 'Posting…' : 'Post to the lounge'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
