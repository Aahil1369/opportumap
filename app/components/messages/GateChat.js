'use client';

// Gate chat (/messages): the inbox and the open conversation.
// - Who is looking (useSession): a still skeleton while that is checked (never a flash of "sign
//   in"), a Sign in button when signed out, "couldn't check" with a retry when the check fails.
// - Phones: the list, then a conversation with a back button (one pane at a time). From 768px:
//   two panes, and the newest conversation opens by itself. The open conversation lives in the
//   URL (?startup=…&with=…, the "Message the founder" link on a stand): opening one from the
//   list is a history entry, so the iPhone's swipe back returns to the list.
// - The inbox (GET /api/messages) follows new messages sent to me live (Realtime): the thread
//   moves to the top and its unread badge counts up, unless it is the open one. The badge clears
//   when a conversation opens (once its messages have loaded, which marks them read). Coming
//   back to the page (another tab, the phone waking up) fetches the inbox again: iOS drops the
//   Realtime socket while a tab sleeps.
// - A deep link to a conversation that has no messages yet is checked against the startup first
//   (only a conversation with its founder can exist), then opens empty; the first message sent
//   puts it in the inbox.
// - Avatars are the initials of display names: the founder's public name, "Member 1A2B" for
//   anyone else (other members' names are private), mine from my session.
// Signature moment: the gate board over a conversation clacks in the startup's name (and
// re-flaps on desktop when you switch); the empty and signed-out screens' board line once.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchJson } from '../../../lib/fetchJson.js';
import { createLatest } from '../../../lib/departures/createLatest.js';
import {
  bumpInbox,
  draftThread,
  markOpened,
  onPageVisible,
  partnerName,
  partnerRole,
  threadFromParams,
  threadKey,
  unreadLabel,
} from '../../../lib/departures/gateChat.js';
import { ago, initials } from '../../../lib/departures/lounge.js';
import { standFor } from '../../../lib/departures/hangar.js';
import { isUuid } from '../../../lib/uuid.js';
import SignatureMoment from '../kit/SignatureMoment';
import FlapText from '../kit/FlapText';
import { useSession } from '../community/useSession';
import { useSignIn } from '../community/SignIn';
import StartupChat from '../StartupChat';

const TIMEOUT_MS = 15000;
const BOARD_TILES = 16;
const LOADING = { userId: null, status: 'loading', list: [], auth: false };

const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};

const hrefFor = (c) => `/messages?startup=${encodeURIComponent(c.startup_id)}&with=${encodeURIComponent(c.other_user_id)}`;
const shown = (el) => Boolean(el && el.getClientRects().length);

function Bubbles() {
  return (
    <svg className="gc-bubbles" viewBox="0 0 280 104" aria-hidden="true">
      <g className="gc-bub">
        <rect x="8" y="8" width="132" height="54" rx="16" />
        <path d="M30 62 L24 82 L50 62" />
        <circle cx="52" cy="35" r="5" />
        <circle cx="74" cy="35" r="5" />
        <circle cx="96" cy="35" r="5" />
      </g>
      <g className="gc-bub gc-bub-you">
        <rect x="140" y="34" width="132" height="54" rx="16" />
        <path d="M250 88 L256 100 L232 88" />
        <text x="206" y="66" textAnchor="middle">
          HELLO?
        </text>
      </g>
    </svg>
  );
}

/** The still skeleton (also the page's Suspense fallback): nothing pulses. */
export function GateChatSkeleton() {
  return (
    <div className="gc" data-view="list">
      <p className="sr-only" role="status">
        Loading your messages…
      </p>
      <div className="gc-panel" aria-hidden="true">
        <div className="gc-inbox">
          <span className="gc-cap">Conversations</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="gc-row gc-row-skel">
              <span className="gc-skel gc-skel-av" />
              <span className="gc-row-main">
                <span className="gc-skel gc-skel-line" style={{ width: '46%' }} />
                <span className="gc-skel gc-skel-line" />
              </span>
            </div>
          ))}
        </div>
        <div className="gc-thread" />
      </div>
    </div>
  );
}

function Gate({ cap, line, title, children, actions, headingProps }) {
  return (
    <SignatureMoment className="gc-gate" playWhen="inView">
      {({ play }) => (
        <>
          <div className="gc-board gc-board-wide" aria-hidden="true">
            <span className="gc-board-cap">{cap}</span>
            <FlapText text={line} play={play} />
          </div>
          <Bubbles />
          <h2 className="gc-gate-t" {...headingProps}>
            {title}
          </h2>
          <p className="gc-gate-s">{children}</p>
          <div className="gc-actions">{actions}</div>
        </>
      )}
    </SignatureMoment>
  );
}

function Row({ conv, me, current, onOpen }) {
  const name = partnerName(conv);
  const role = partnerRole(conv, me);
  const badge = unreadLabel(conv.unread);
  return (
    <li>
      <a
        className="gc-row"
        href={hrefFor(conv)}
        data-key={threadKey(conv)}
        aria-current={current ? 'true' : undefined}
        onClick={(e) => onOpen(conv, e)}
      >
        <span className="gc-av" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="gc-row-main">
          <span className="gc-row-top">
            <span className="gc-row-name">{name}</span>
            {conv.last_at && <span className="gc-row-time">{ago(conv.last_at)}</span>}
          </span>
          <span className="gc-row-sub">
            {role && <span className="gc-role">{role}</span>}
            <span className="gc-row-startup">{conv.startup_name}</span>
          </span>
          {conv.last_message && (
            <span className="gc-row-last">
              {conv.last_mine ? 'You: ' : ''}
              {conv.last_message}
            </span>
          )}
        </span>
        {badge && (
          <span className="gc-badge">
            <span aria-hidden="true">{badge}</span>
            <span className="sr-only">{conv.unread === 1 ? '1 unread message' : `${conv.unread} unread messages`}</span>
          </span>
        )}
      </a>
    </li>
  );
}

function GateBoard({ conv }) {
  return (
    <SignatureMoment className="gc-board" aria-hidden="true">
      {({ play }) => (
        <>
          <span className="gc-board-cap">GATE CHAT · STAND {standFor(conv.startup_id)}</span>
          <FlapText text={conv.startup_name} width={BOARD_TILES} play={play} />
        </>
      )}
    </SignatureMoment>
  );
}

function ThreadState({ title, children, alert, action }) {
  return (
    <div className="gc-chat">
      <div className="gc-thread-state" role={alert ? 'alert' : undefined}>
        <p className="gc-thread-state-t">{title}</p>
        {children && <p className="gc-thread-state-s">{children}</p>}
        {action}
      </div>
    </div>
  );
}

export default function GateChat() {
  const session = useSession();
  const user = session.status === 'in' ? session.user : null;
  const me = user?.id ?? null;

  // ── the inbox ──
  const [inbox, setInbox] = useState(LOADING);
  const inboxRef = useRef(inbox);
  const commit = useCallback((change) => {
    const next = change(inboxRef.current);
    if (next === inboxRef.current) return;
    inboxRef.current = next;
    setInbox(next);
  }, []);
  const [attempt, setAttempt] = useState(0);
  const [latest] = useState(createLatest);
  const box = inbox.userId === me ? inbox : LOADING;

  useEffect(() => {
    if (!me) return;
    const req = latest.next();
    fetchJson('/api/messages', withTimeout())
      .then((d) => {
        if (!latest.isCurrent(req)) return;
        const list = Array.isArray(d?.conversations) ? d.conversations : [];
        commit(() => ({ userId: me, status: 'ready', list, auth: false }));
      })
      .catch((err) => {
        if (latest.isCurrent(req)) commit(() => ({ userId: me, status: 'error', list: [], auth: err?.status === 401 }));
      });
  }, [me, attempt, latest, commit]);

  const retryInbox = () => {
    commit(() => ({ ...LOADING, userId: me }));
    setAttempt((n) => n + 1);
  };

  // ── the open conversation (from the URL) ──
  const params = useSearchParams();
  const sel = useMemo(() => threadFromParams(params), [params]);
  const selKey = sel ? `${sel.startupId}::${sel.withId}` : null;
  const listRow = selKey && box.status === 'ready' ? box.list.find((c) => threadKey(c) === selKey) || null : null;

  // A deep link that is not in the inbox: check the startup, then open it empty.
  const [draft, setDraft] = useState(null); // { key, status: 'ready' | 'error', conversation?, error? }
  const [draftAttempt, setDraftAttempt] = useState(0);
  const needDraft = Boolean(sel && me && !listRow && (box.status === 'ready' || box.status === 'error'));
  useEffect(() => {
    if (!needDraft) return undefined;
    let live = true;
    fetchJson(`/api/startups/${encodeURIComponent(sel.startupId)}`, withTimeout())
      .then((d) => live && setDraft({ key: selKey, status: 'ready', ...draftThread(sel, d?.startup, me) }))
      .catch((err) =>
        live && setDraft(err?.status === 404 ? { key: selKey, status: 'ready', error: 'missing' } : { key: selKey, status: 'error' }),
      );
    return () => {
      live = false;
    };
  }, [needDraft, sel, selKey, me, draftAttempt]);
  const draftNow = draft && draft.key === selKey && !listRow ? draft : null;

  const open = listRow || draftNow?.conversation || null;
  const openKey = open ? selKey : null;
  const openKeyRef = useRef(openKey);
  useEffect(() => {
    openKeyRef.current = openKey;
  });

  // ── live: messages sent to me ──
  const reloadQuietly = useCallback(() => {
    const req = latest.next();
    fetchJson('/api/messages', withTimeout())
      .then((d) => {
        if (!latest.isCurrent(req)) return;
        const list = markOpened(Array.isArray(d?.conversations) ? d.conversations : [], openKeyRef.current);
        commit((s) => ({ ...s, userId: me, status: 'ready', list, auth: false }));
      })
      .catch(() => {}); // the inbox on screen stays; the next visit reloads it
  }, [latest, commit, me]);

  const onIncoming = useRef(() => {});
  useEffect(() => {
    onIncoming.current = (msg) => {
      const cur = inboxRef.current;
      if (cur.userId !== me || cur.status !== 'ready') return; // a load in flight will include it
      const r = bumpInbox(cur.list, msg, me, { openKey: openKeyRef.current });
      if (!r.known) reloadQuietly();
      else if (r.list !== cur.list) commit((s) => ({ ...s, list: r.list }));
    };
  });

  useEffect(() => {
    if (!isUuid(me)) return undefined;
    let live = true;
    let supabase;
    let channel;
    import('../../../lib/supabase-browser')
      .then(({ createClient }) => {
        if (!live) return;
        supabase = createClient();
        channel = supabase
          .channel(`inbox:${me}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'startup_messages', filter: `receiver_id=eq.${me}` },
            (payload) => onIncoming.current(payload.new),
          )
          .subscribe();
      })
      .catch(() => {}); // no live inbox; it still loads on every visit
    return () => {
      live = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me]);

  // Back from the background: iOS drops the Realtime socket while a tab sleeps, so the inbox is
  // fetched again and messages that arrived meanwhile show up (not only on the next visit).
  // Not while the first load is still out: its answer will have them.
  useEffect(() => {
    if (!me) return undefined;
    return onPageVisible(() => {
      const cur = inboxRef.current;
      if (cur.userId === me && cur.status !== 'loading') reloadQuietly();
    });
  }, [me, reloadQuietly]);

  // ── opening and leaving a conversation ──
  const pushed = useRef(false);
  const panel = useRef(null);
  const inboxPane = useRef(null);
  const threadPane = useRef(null);
  const threadHead = useRef(null);

  const openConversation = (conv, e) => {
    if (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    e?.preventDefault();
    if (threadKey(conv) === selKey) {
      if (!shown(inboxPane.current)) threadHead.current?.focus({ preventScroll: true });
      return;
    }
    window.history.pushState(null, '', hrefFor(conv));
    pushed.current = true;
  };

  const back = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', '/messages');
    }
  };

  // Phones swap panes: keep focus somewhere visible (the conversation's name, or the row it came from).
  // A conversation that opened by itself (desktop) leaves focus alone.
  const lastKey = useRef(selKey);
  const autoOpened = useRef(null);
  useEffect(() => {
    const prev = lastKey.current;
    lastKey.current = selKey;
    if (prev === selKey || (selKey && selKey === autoOpened.current)) return;
    const active = document.activeElement;
    const lost = !active || active === document.body || !shown(active);
    if (selKey && (lost || !shown(inboxPane.current))) threadHead.current?.focus({ preventScroll: true });
    else if (!selKey && prev && lost) inboxPane.current?.querySelector(`[data-key="${prev}"]`)?.focus({ preventScroll: true });
  }, [selKey]);

  // Phones: a conversation fills the screen under the navbar (the page itself stays put after).
  const scrolledFor = useRef(null);
  const isOpen = Boolean(open);
  useEffect(() => {
    if (!selKey) {
      scrolledFor.current = null;
      return;
    }
    if (!isOpen || scrolledFor.current === selKey) return;
    scrolledFor.current = selKey;
    if (!shown(inboxPane.current)) panel.current?.scrollIntoView({ block: 'start' });
  }, [selKey, isOpen]);

  // Desktop (two panes): the newest conversation opens by itself. Phones show the list first.
  useEffect(() => {
    if (sel || box.status !== 'ready' || !box.list.length || !shown(threadPane.current)) return;
    autoOpened.current = threadKey(box.list[0]);
    window.history.replaceState(null, '', hrefFor(box.list[0]));
  }, [sel, box.status, box.list]);

  const opened = useCallback(() => {
    const key = openKeyRef.current;
    commit((s) => (s.userId === me ? { ...s, list: markOpened(s.list, key) } : s));
  }, [commit, me]);

  const sent = useCallback(
    (row) => {
      const cur = inboxRef.current;
      if (cur.userId !== me || cur.status !== 'ready') return;
      const r = bumpInbox(cur.list, row, me, { openKey: openKeyRef.current, draft: draftNow?.conversation });
      if (r.known && r.list !== cur.list) commit((s) => ({ ...s, list: r.list }));
    },
    [commit, me, draftNow],
  );

  const afterSignIn = useRef(() => {});
  useEffect(() => {
    afterSignIn.current = () => {
      if (inboxRef.current.status === 'error') retryInbox();
    };
  });
  const [openSignIn, signInModal] = useSignIn(() => afterSignIn.current());

  // ── screens ──
  if (session.status === 'loading') return <GateChatSkeleton />;

  if (session.status === 'error') {
    return (
      <div className="gc-state" role="alert">
        <h2 className="gc-state-t">We couldn&apos;t check your sign-in.</h2>
        <p className="gc-state-s">Check your connection and try again. Your messages are safe.</p>
        <button type="button" className="gc-btn gc-btn-ghost" onClick={session.retry}>
          Try again
        </button>
      </div>
    );
  }

  if (session.status === 'out') {
    return (
      <div className="gc" data-view="list">
        {signInModal}
        <Gate
          cap="GATE CHAT · MEMBERS ONLY"
          line="SIGN IN TO CHAT"
          title="Sign in to see your messages"
          actions={
            <>
              <button type="button" className="gc-btn gc-btn-sign" onClick={openSignIn}>
                Sign in
              </button>
              <Link className="gc-btn gc-btn-ghost" href="/startups">
                Browse the hangar
              </Link>
            </>
          }
        >
          Your conversations with founders live here. Only you and the person you&apos;re talking to can read them.
        </Gate>
      </div>
    );
  }

  const view = sel ? 'thread' : 'list';
  const listOnly = !sel && box.status !== 'ready' ? box.status : null;

  if (listOnly === 'loading') return <GateChatSkeleton />;

  if (listOnly === 'error') {
    return (
      <div className="gc" data-view="list">
        {signInModal}
        <div className="gc-state" role="alert">
          <h2 className="gc-state-t" tabIndex={-1} data-after-signin="">
            Your messages didn&apos;t load.
          </h2>
          <p className="gc-state-s">
            {box.auth ? 'Your session ended. Sign in again to see them.' : 'Check your connection and try again.'}
          </p>
          <div className="gc-actions">
            {box.auth && (
              <button type="button" className="gc-btn gc-btn-sign" onClick={openSignIn}>
                Sign in
              </button>
            )}
            <button type="button" className="gc-btn gc-btn-ghost" onClick={retryInbox}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sel && box.list.length === 0) {
    return (
      <div className="gc" data-view="list">
        <Gate
          cap="GATE CHAT · ARRIVALS"
          line="NO MESSAGES YET"
          title="No conversations yet."
          headingProps={{ tabIndex: -1, 'data-after-signin': '' }}
          actions={
            <Link className="gc-btn gc-btn-sign" href="/startups">
              Browse the hangar →
            </Link>
          }
        >
          Find a startup in the hangar and message its founder. When someone writes to you about your own startup, the
          conversation lands here too.
        </Gate>
      </div>
    );
  }

  const name = open ? partnerName(open) : '';
  const role = open ? partnerRole(open, me) : '';

  let threadBody = null;
  if (open) {
    threadBody = (
      <StartupChat
        key={openKey}
        startupId={open.startup_id}
        receiverId={open.other_user_id}
        currentUser={user}
        partnerName={name}
        onLoaded={opened}
        onSent={sent}
        onSignIn={openSignIn}
      />
    );
  } else if (draftNow?.status === 'error') {
    threadBody = (
      <ThreadState
        alert
        title="We couldn't open this conversation."
        action={
          <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setDraftAttempt((n) => n + 1)}>
            Try again
          </button>
        }
      >
        Check your connection and try again.
      </ThreadState>
    );
  } else if (draftNow?.error === 'self') {
    threadBody = (
      <ThreadState title="This is your own startup.">
        When people message you about it, their conversations show up in your list.
      </ThreadState>
    );
  } else if (draftNow?.error === 'closed') {
    threadBody = (
      <ThreadState title="This conversation isn't open.">
        Conversations here are between a startup&apos;s founder and one other member.
      </ThreadState>
    );
  } else if (draftNow?.error === 'missing') {
    threadBody = (
      <ThreadState title="This startup isn't in the hangar any more.">Its founder may have taken it down.</ThreadState>
    );
  } else if (sel) {
    threadBody = (
      <div className="gc-chat">
        <p className="gc-note" role="status">
          Opening the conversation…
        </p>
      </div>
    );
  }

  return (
    <div className="gc" data-view={view}>
      {signInModal}
      <div className="gc-panel" ref={panel}>
        <section className="gc-inbox" ref={inboxPane} aria-labelledby="gc-inbox-h" data-lenis-prevent="">
          <h2 className="gc-cap" id="gc-inbox-h" tabIndex={-1} data-after-signin="">
            Conversations
          </h2>
          {box.status === 'loading' ? (
            <p className="gc-note" role="status">
              Loading your conversations…
            </p>
          ) : box.status === 'error' ? (
            <div className="gc-inline-alert" role="alert">
              <p className="gc-note">Your messages didn&apos;t load.</p>
              <button type="button" className="gc-link" onClick={retryInbox}>
                Try again
              </button>
            </div>
          ) : box.list.length === 0 ? (
            <p className="gc-note">No other conversations yet.</p>
          ) : (
            <ul className="gc-rows">
              {box.list.map((c) => (
                <Row key={threadKey(c)} conv={c} me={me} current={threadKey(c) === openKey} onOpen={openConversation} />
              ))}
            </ul>
          )}
        </section>

        <section className="gc-thread" ref={threadPane} aria-labelledby="gc-thread-h">
          {sel ? (
            <>
              <header className="gc-th">
                <button type="button" className="gc-back" onClick={back}>
                  ← All conversations
                </button>
                <div className="gc-th-who">
                  {open ? (
                    <span className="gc-av" aria-hidden="true">
                      {initials(name)}
                    </span>
                  ) : (
                    <span className="gc-skel gc-skel-av" aria-hidden="true" />
                  )}
                  <div className="gc-th-t">
                    <h2 className="gc-th-name" id="gc-thread-h" tabIndex={-1} ref={threadHead}>
                      {open ? name : 'Conversation'}
                    </h2>
                    {open && (
                      <p className="gc-th-sub">
                        {role && <span className="gc-role">{role}</span>}
                        <Link className="gc-th-link" href={`/startups/${encodeURIComponent(open.startup_id)}`}>
                          {open.startup_name}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
                {open && <GateBoard conv={open} />}
              </header>
              {threadBody}
            </>
          ) : (
            <div className="gc-pick">
              <h2 className="gc-pick-t" id="gc-thread-h">
                Pick a conversation
              </h2>
              <p className="gc-pick-s">It opens here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
