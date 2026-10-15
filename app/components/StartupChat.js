'use client';

// One conversation in gate chat (/messages): this startup, the signed-in user <-> receiverId.
// The parent keys it by conversation, so state starts fresh per thread.
//
// - Loads the thread (GET /api/messages/[startupId]?with=…, which also marks it read) and says so
//   (onLoaded), so the inbox clears that thread's unread badge. A failed load says so, with a
//   retry (a 401 offers sign-in), never an endless "loading".
// - Realtime: only the other person's messages in this thread (acceptIncoming). My own sends come
//   back from the POST, so their echo is ignored; everything is de-duplicated by id. A message
//   that arrives while the thread is open is marked read with a quiet re-fetch (after a moment,
//   and only while the page is visible), so it is not "unread" on the next visit.
// - Sending: shown at once ("Sending…"); a failed send stays in the thread marked "Not sent" with
//   Retry and Edit, plus an alert saying why (a 401 offers sign-in, then Retry).
// - Scrolling happens inside the message container only (data-lenis-prevent; scrollTop, never
//   scrollIntoView, which scrolls the page too). It follows new messages while you are at the
//   bottom; scrolled up, a "New messages" button appears instead of a jump.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { fetchJson } from '../../lib/fetchJson.js';
import { isUuid } from '../../lib/uuid.js';
import { displayName } from '../../lib/displayName.js';
import { initials } from '../../lib/departures/lounge.js';
import { dayLabel } from '../../lib/departures/gateChat.js';
import { acceptIncoming, appendUnique, markFailed, markPending, replaceTemp } from './chatMessages.js';

const MAX_MESSAGE = 4000; // the startup_messages_content_len constraint
const TIMEOUT_MS = 15000;
const SEEN_DELAY_MS = 1500;
const STICK_PX = 48;

const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};

function clock(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Why a send failed, in words; `auth` when signing in again would fix it. */
function sendFailure(err) {
  const status = err?.status;
  if (status === 401) return { text: 'Your session ended. Sign in again, then tap Retry.', auth: true };
  if (status === 400 && err.message && err.message !== 'Missing fields') return { text: `${err.message}.` };
  if (status === 403) return { text: "You can't send messages in this conversation." };
  if (status === 404) return { text: "This startup isn't in the hangar any more." };
  return { text: "Your message didn't send. Check your connection and tap Retry." };
}

export default function StartupChat({ startupId, receiverId, currentUser, partnerName = 'them', onLoaded, onSent, onSignIn }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadAuth, setLoadAuth] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [announce, setAnnounce] = useState(false); // new messages are announced; the history on load is not
  const [sendError, setSendError] = useState(null); // { text, auth }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const scroller = useRef(null);
  const box = useRef(null);
  const stick = useRef(true);
  const seenTimer = useRef(0);
  const seenLater = useRef(false);
  const inputId = useId();
  const currentUserId = currentUser?.id;
  const myName = displayName(currentUser);
  const callbacks = useRef({ onLoaded, onSent });
  useEffect(() => {
    callbacks.current = { onLoaded, onSent };
  });

  const threadUrl = `/api/messages/${encodeURIComponent(startupId)}?with=${encodeURIComponent(receiverId)}`;

  // Load the thread
  useEffect(() => {
    if (!startupId || !receiverId) return undefined;
    let active = true;
    fetchJson(threadUrl, withTimeout())
      // History first, then anything that arrived meanwhile (Realtime / pending sends).
      .then((d) => {
        if (!active) return;
        setMessages((prev) => prev.reduce(appendUnique, d.messages ?? []));
        setStatus('ready');
        callbacks.current.onLoaded?.();
      })
      .catch((err) => {
        if (!active) return;
        setLoadAuth(err?.status === 401);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [threadUrl, startupId, receiverId, attempt]);

  useEffect(() => {
    if (status === 'ready') setAnnounce(true);
  }, [status]);

  // Mark what arrived while the thread is open as read: a quiet re-fetch of the thread.
  const refresh = useCallback(() => {
    fetchJson(threadUrl, withTimeout())
      .then((d) => setMessages((prev) => prev.reduce(appendUnique, d.messages ?? [])))
      .catch(() => {}); // only a read receipt: the messages are already on screen
  }, [threadUrl]);

  const markSeenSoon = useCallback(() => {
    clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      if (document.visibilityState === 'visible') refresh();
      else seenLater.current = true;
    }, SEEN_DELAY_MS);
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && seenLater.current) {
        seenLater.current = false;
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(seenTimer.current);
    };
  }, [refresh]);

  // Realtime: only the other person's messages in this thread. Our own sends
  // come back from the POST, so their echo is ignored (no double messages).
  useEffect(() => {
    if (!isUuid(startupId) || !isUuid(receiverId) || !currentUserId) return undefined;
    const ctx = { currentUserId, otherUserId: receiverId, startupId };
    let live = true;
    let supabase;
    let channel;
    // supabase-js on demand: the session check has already loaded this chunk.
    import('../../lib/supabase-browser')
      .then(({ createClient }) => {
        if (!live) return;
        supabase = createClient();
        channel = supabase
          .channel(`chat:${startupId}:${currentUserId}:${receiverId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'startup_messages', filter: `startup_id=eq.${startupId}` },
            (payload) => {
              const msg = payload.new;
              if (acceptIncoming(msg, ctx)) {
                setMessages((prev) => appendUnique(prev, { ...msg, fresh: true }));
                if (!stick.current) setUnseen(true);
                markSeenSoon();
              }
            }
          )
          .subscribe();
      })
      .catch(() => {}); // no live updates; the thread still loads and sends

    return () => {
      live = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [startupId, receiverId, currentUserId, markSeenSoon]);

  // Follow new messages while at the bottom, inside the container (the page never scrolls).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
    if (stick.current) setUnseen(false);
  };

  const toBottom = () => {
    const el = scroller.current;
    stick.current = true;
    setUnseen(false);
    if (el) el.scrollTop = el.scrollHeight;
  };

  // The message box grows with what is typed (up to a few lines), and shrinks back after sending.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    if (input) el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    else el.style.height = '';
  }, [input]);

  const post = async (row) => {
    setSending(true);
    setSendError(null);
    try {
      const data = await fetchJson('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId, receiverId, content: row.content }),
        ...withTimeout(),
      });
      const saved = data?.message;
      if (!saved?.id) throw new Error('Unexpected response from the server');
      setMessages((prev) => replaceTemp(prev, row.id, saved));
      callbacks.current.onSent?.(saved);
    } catch (err) {
      setMessages((prev) => markFailed(prev, row.id));
      setSendError(sendFailure(err));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content || sending || !currentUserId) return;
    const row = {
      id: `tmp-${Date.now()}`,
      pending: true,
      fresh: true,
      sender_id: currentUserId,
      receiver_id: receiverId,
      startup_id: startupId,
      content,
      created_at: new Date().toISOString(),
      read: false,
    };
    stick.current = true;
    setMessages((prev) => [...prev, row]);
    setInput('');
    post(row);
  };

  const retry = (row) => {
    if (sending) return;
    setMessages((prev) => markPending(prev, row.id));
    post(row);
  };

  // Edit: the failed message goes back into the box (ahead of anything typed since).
  const edit = (row) => {
    setMessages((prev) => replaceTemp(prev, row.id, null));
    setInput((cur) => (cur.trim() ? `${row.content}\n${cur}` : row.content));
    setSendError(null);
    box.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reload = () => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  const now = Date.now();

  return (
    <div className="gc-chat">
      <div
        className="gc-scroll"
        ref={scroller}
        onScroll={onScroll}
        data-lenis-prevent=""
        tabIndex={0}
        role="log"
        aria-label={`Messages with ${partnerName}`}
        aria-live={announce ? 'polite' : 'off'}
        aria-relevant="additions"
      >
        {status === 'loading' && messages.length === 0 && (
          <p className="gc-note" role="status">
            Loading the conversation…
          </p>
        )}
        {status === 'error' && (
          <div className="gc-load-err" role="alert">
            <p className="gc-load-err-t">This conversation didn&apos;t load.</p>
            <p className="gc-load-err-s">
              {loadAuth ? 'Your session ended. Sign in again to read it.' : 'Check your connection and try again.'}
            </p>
            <div className="gc-load-err-a">
              {loadAuth && onSignIn ? (
                <button type="button" className="gc-btn gc-btn-sign" onClick={onSignIn}>
                  Sign in
                </button>
              ) : null}
              <button type="button" className="gc-btn gc-btn-ghost" onClick={reload}>
                Try again
              </button>
            </div>
          </div>
        )}
        {status === 'ready' && messages.length === 0 && (
          <div className="gc-hello">
            <p className="gc-hello-t">Say hello to {partnerName}.</p>
            <p className="gc-hello-s">Introduce yourself and say what caught your eye. Only the two of you can read this conversation.</p>
          </div>
        )}
        <ol className="gc-msgs">
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === currentUserId;
            const prev = messages[i - 1];
            const day = dayLabel(msg.created_at, now);
            const newDay = !prev || dayLabel(prev.created_at, now) !== day;
            const first = newDay || prev.sender_id !== msg.sender_id;
            const who = isMine ? myName : partnerName;
            const state = msg.failed ? 'failed' : msg.pending ? 'pending' : undefined;
            return (
              <li
                key={msg.id}
                className="gc-msg"
                data-mine={isMine ? '' : undefined}
                data-first={first ? '' : undefined}
                data-state={state}
                data-fresh={msg.fresh ? '' : undefined}
              >
                {newDay && day && <p className="gc-day">{day}</p>}
                <div className="gc-msg-row">
                  <span className="gc-av gc-av-sm" aria-hidden="true">
                    {first ? initials(who) : ''}
                  </span>
                  <div className="gc-bubble">
                    <p className="gc-text">
                      <span className="sr-only">{isMine ? 'You' : who}: </span>
                      {msg.content}
                    </p>
                    <p className="gc-meta">
                      {msg.failed ? (
                        <span className="gc-failed">Not sent</span>
                      ) : msg.pending ? (
                        'Sending…'
                      ) : (
                        <time dateTime={msg.created_at}>{clock(msg.created_at)}</time>
                      )}
                    </p>
                  </div>
                </div>
                {msg.failed && (
                  <div className="gc-fix">
                    <button type="button" className="gc-fix-btn" onClick={() => retry(msg)} aria-disabled={sending ? 'true' : undefined}>
                      Retry
                    </button>
                    <button type="button" className="gc-fix-btn" onClick={() => edit(msg)}>
                      Edit
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="gc-unseen-at">
        {unseen && (
          <button type="button" className="gc-unseen" onClick={toBottom}>
            New messages ↓
          </button>
        )}
      </div>

      <form
        className="gc-compose"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        {sendError && (
          <p role="alert" className="gc-alert">
            {sendError.text}
            {sendError.auth && onSignIn ? (
              <>
                {' '}
                <button type="button" className="gc-link" onClick={onSignIn}>
                  Sign in
                </button>
              </>
            ) : null}
          </p>
        )}
        <div className="gc-compose-row">
          <label htmlFor={inputId} className="sr-only">
            Message {partnerName}
          </label>
          <textarea
            id={inputId}
            ref={box}
            className="gc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${partnerName}…`}
            rows={1}
            maxLength={MAX_MESSAGE}
            enterKeyHint="send"
          />
          <button type="submit" className="gc-send" disabled={!input.trim() || sending}>
            Send
          </button>
        </div>
        <p className="gc-keys">ENTER TO SEND · SHIFT+ENTER FOR A NEW LINE</p>
      </form>
    </div>
  );
}
