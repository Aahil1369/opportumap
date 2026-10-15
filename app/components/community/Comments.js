'use client';

// A post's comments, loaded when they are opened: the list, then a one-line form for members
// or "Sign in to comment" for visitors. A failed load says so (with a retry), never "no
// comments yet"; a failed send keeps the text and says why.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from '../../../lib/fetchJson.js';
import { LIMITS } from '../../../lib/community.js';
import { ago } from '../../../lib/departures/lounge.js';
import { createLatest } from '../../../lib/departures/createLatest.js';
import Avatar from './Avatar';

export default function Comments({ id, postId, user, onSignIn, onCommented }) {
  const [list, setList] = useState(null); // null while loading
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const busy = useRef(false);
  const [latest] = useState(createLatest);

  const load = useCallback(() => {
    const req = latest.next();
    fetchJson(`/api/community/comments?postId=${encodeURIComponent(postId)}`)
      .then((d) => {
        if (latest.isCurrent(req)) setList(Array.isArray(d?.comments) ? d.comments : []);
      })
      .catch(() => {
        if (latest.isCurrent(req)) setLoadError(true);
      });
  }, [latest, postId]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setLoadError(false);
    setList(null);
    load();
  };

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy.current) return;
    busy.current = true;
    setSending(true);
    setSendError('');
    try {
      // The server sets the author's name from the session (lib/displayName.js).
      const d = await fetchJson('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content }),
      });
      if (d?.comment) {
        setList((prev) => [...(prev || []), d.comment]);
        setText('');
        onCommented?.();
      }
    } catch (err) {
      if (err?.status === 401) setSendError('Your session ended. Sign in again to comment.');
      else if (err?.status === 400) setSendError(err.message);
      else setSendError("Your comment didn't send. Check your connection and try again.");
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const inputId = `${id}-input`;
  return (
    <div className="lg-comments" id={id}>
      {loadError ? (
        <div className="lg-inline-alert" role="alert">
          <span>Comments didn&apos;t load.</span>
          <button type="button" className="lg-link" onClick={retry}>
            Try again
          </button>
        </div>
      ) : list == null ? (
        <p className="lg-note" role="status">
          Loading comments…
        </p>
      ) : list.length === 0 ? (
        <p className="lg-note">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="lg-clist">
          {list.map((c) => (
            <li key={c.id} className="lg-c">
              <Avatar name={c.user_name} src={c.user_avatar} size="sm" />
              <div className="lg-c-body">
                <p className="lg-c-head">
                  <span className="lg-c-name">{c.user_name || 'Member'}</span>
                  <time className="lg-c-time" dateTime={c.created_at}>
                    {ago(c.created_at)}
                  </time>
                </p>
                <p className="lg-c-text">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form className="lg-cform" onSubmit={send}>
          <label htmlFor={inputId} className="sr-only">
            Write a comment
          </label>
          <input
            id={inputId}
            className="lg-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            maxLength={LIMITS.comment}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="submit" className="lg-btn lg-btn-ghost lg-btn-sm" aria-disabled={sending || !text.trim() ? 'true' : undefined}>
            {sending ? 'Sending…' : 'Send'}
          </button>
          {sendError && (
            <p className="lg-error" role="alert">
              {sendError}
              {sendError.startsWith('Your session ended') && (
                <>
                  {' '}
                  <button type="button" className="lg-link" onClick={onSignIn}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          )}
        </form>
      ) : (
        <button type="button" className="lg-link lg-c-signin" onClick={onSignIn}>
          Sign in to comment
        </button>
      )}
    </div>
  );
}
