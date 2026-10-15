'use client';

// /admin — the owner's control room, in the hall: the Inbox (contact form messages, newest
// first, read/unread), then the platform's own numbers (users, visits, lounge activity). Admin
// only, by user id (lib/admin.js isAdminUser); the inbox is RLS-locked to the admin's session, and
// /api/admin/stats checks the same id on the server. Until the session is known the page says
// LOADING (no "access denied" flash for the admin). Metadata (noindex): ./layout.js.

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import { createClient } from '../../lib/supabase-browser';
import { isAdminUser } from '../../lib/admin.js';
import { mailtoHref } from '../../lib/contactForm.js';
import { FOOTNOTES } from '../lib/pageCopy';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign';
const kicker = 'font-mono text-[11px] font-medium tracking-[0.2em] uppercase text-ink-sub';
const panel = 'rounded-[14px] border border-rule bg-hall-2 p-5';

function StatCard({ label, value, children }) {
  return (
    <div className="bg-hall-2 p-5">
      <div className={`${kicker} mb-3 flex items-center justify-between gap-2`}>
        <span>{label}</span>
        {children}
      </div>
      <p className="font-mono text-[34px] font-medium leading-none text-sign">{value?.toLocaleString() ?? '—'}</p>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_LABELS = {
  story: 'STORY',
  job: 'JOB',
  question: 'QUESTION',
  advice: 'ADVICE',
};

// ---------- Inbox: contact form messages (public.contact_messages) ----------
// RLS lets only the admin's own session select / update(read) these rows, so the
// inbox uses the browser cookie client (the signed-in user's JWT), never a bare anon client.
const INBOX_LIMIT = 200;
const INBOX_FIELDS = 'id, created_at, source, name, email, subject, message, read';
const UPDATE_FAILED = 'Could not update — please try again.';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function without(obj, key) {
  const next = { ...obj };
  delete next[key];
  return next;
}

async function fetchInbox(supabase) {
  try {
    const [list, unread] = await Promise.all([
      supabase.from('contact_messages').select(INBOX_FIELDS)
        .order('created_at', { ascending: false }).limit(INBOX_LIMIT),
      supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('read', false),
    ]);
    const error = list.error || unread.error;
    if (error) {
      console.error('[admin inbox] load failed', error.code, error.message);
      return null;
    }
    return { messages: list.data ?? [], unread: unread.count ?? 0 };
  } catch (err) {
    console.error('[admin inbox] load failed', err);
    return null;
  }
}

const smallBtn = `inline-flex items-center min-h-[40px] px-3 rounded-[8px] font-mono text-[12px] font-medium tracking-[0.12em] uppercase border border-rule text-ink hover:border-ink-sub disabled:opacity-50 ${FOCUS}`;

function InboxSection() {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchInbox(supabase).then((res) => {
      if (cancelled) return;
      if (!res) { setStatus('error'); return; }
      setMessages(res.messages);
      setUnread(res.unread);
      setStatus('ready');
    });
    return () => { cancelled = true; };
  }, [supabase, reloadKey]);

  const reload = () => {
    setStatus('loading');
    setRowErrors({});
    setReloadKey((k) => k + 1);
  };

  const toggleRead = async (msg) => {
    if (busy[msg.id]) return;
    const next = !msg.read;
    setBusy((b) => ({ ...b, [msg.id]: true }));
    setRowErrors((e) => without(e, msg.id));
    let ok = false;
    try {
      const { data, error } = await supabase.from('contact_messages')
        .update({ read: next }).eq('id', msg.id).select('id, read');
      if (error) console.error('[admin inbox] update failed', error.code, error.message);
      // RLS turns a refused update into zero rows, so require the row back.
      ok = !error && Array.isArray(data) && data.length === 1 && data[0].read === next;
    } catch (err) {
      console.error('[admin inbox] update failed', err);
    }
    if (ok) {
      setMessages((list) => list.map((m) => (m.id === msg.id ? { ...m, read: next } : m)));
      setUnread((u) => Math.max(0, u + (next ? -1 : 1)));
    } else {
      setRowErrors((e) => ({ ...e, [msg.id]: UPDATE_FAILED }));
    }
    setBusy((b) => without(b, msg.id));
  };

  return (
    <section className={panel} aria-labelledby="admin-inbox-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="admin-inbox-heading" className="font-mono text-[12px] font-medium tracking-[0.22em] uppercase text-sign">
          INBOX
          {status === 'ready' && (
            <>
              {' '}
              <span className="ml-2 text-ink">{unread.toLocaleString()} unread</span>
            </>
          )}
        </h2>
        <button type="button" onClick={reload} disabled={status === 'loading'} className={smallBtn}>
          Refresh
        </button>
      </div>

      {status === 'loading' && (
        <p className="font-mono text-[12px] tracking-[0.16em] text-ink-sub">LOADING…</p>
      )}

      {status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-[16px] text-ink-dim">Could not load messages.</p>
          <button type="button" onClick={reload} className={smallBtn}>Try again</button>
        </div>
      )}

      {status === 'ready' && messages.length === 0 && (
        <p className="text-[16px] text-ink-sub">No messages yet.</p>
      )}

      {status === 'ready' && messages.length > 0 && (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-[10px] border p-4 ${m.read ? 'border-rule bg-hall-2' : 'border-sign/50 bg-hall-3'}`}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold text-ink break-words">
                    {!m.read && (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-sign mr-2 align-middle" aria-hidden="true" />
                        <span className="sr-only">Unread: </span>
                      </>
                    )}
                    {m.subject || '(no subject)'}
                  </p>
                  <p className="text-[15px] text-ink-dim mt-1 break-words">
                    {m.name}
                    {' · '}
                    <a href={mailtoHref(m.email, m.subject)} className="text-sign underline underline-offset-2 break-all">
                      {m.email}
                    </a>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0 max-w-full">
                  <span className="font-mono text-[11px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-[4px] border border-rule text-ink-sub">
                    {m.source}
                  </span>
                  <time dateTime={m.created_at} className="font-mono text-[12px] tracking-[0.08em] text-ink-sub">
                    {formatDate(m.created_at)} · {timeAgo(m.created_at)}
                  </time>
                  <button type="button" onClick={() => toggleRead(m)} disabled={!!busy[m.id]} className={smallBtn}>
                    {m.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[16px] text-ink-dim leading-[1.55] whitespace-pre-wrap break-words">{m.message}</p>
              {rowErrors[m.id] && (
                <p role="alert" className="mt-2 text-[15px] text-warn">{rowErrors[m.id]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {status === 'ready' && messages.length >= INBOX_LIMIT && (
        <p className="mt-3 text-[15px] text-ink-sub">Showing the newest {INBOX_LIMIT}.</p>
      )}
    </section>
  );
}

async function loadStats() {
  const res = await fetch('/api/admin/stats');
  const d = await res.json().catch(() => null);
  if (!res.ok || !d || d.error) throw new Error(d?.error || 'Failed to load stats');
  return d;
}

export default function AdminPage() {
  const [user, setUser] = useState(undefined); // undefined: not known yet; null: signed out
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [error, setError] = useState('');
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const admin = isAdminUser(user);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data }) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // The numbers load beside the inbox (which has its own loading line); the cards show — until then.
  useEffect(() => {
    if (!admin) return;
    loadStats()
      .then((d) => {
        setStats(d.stats);
        setRecentPosts(d.recentPosts ?? []);
        setTopPosts(d.topPosts ?? []);
      })
      .catch((err) => setError(err?.message || 'Failed to load stats')); // the stats route's own short errors
  }, [admin]);

  // Auto-refresh live users every 30s
  useEffect(() => {
    if (!admin) return undefined;
    const interval = setInterval(() => {
      setLiveRefreshing(true);
      loadStats()
        .then((d) => setStats((prev) => ({ ...prev, liveUsers: d.stats?.liveUsers })))
        .catch(() => {})
        .finally(() => setLiveRefreshing(false));
    }, 30000);
    return () => clearInterval(interval);
  }, [admin]);

  if (user === undefined) {
    return (
      <>
        <Navbar />
        <PageShell sign={{ label: 'Admin' }} title="Control" accent="room.">
          <p className="font-mono text-[12px] tracking-[0.16em] text-ink-sub" role="status">LOADING…</p>
        </PageShell>
      </>
    );
  }

  if (!admin) {
    return (
      <>
        <Navbar />
        <PageShell sign={{ label: 'Admin' }} title="Staff" accent="only." sub="This is the owner's control room. Sign in as the admin to see it.">
          <p className="font-mono text-[12px] font-medium tracking-[0.22em] text-warn">ACCESS DENIED</p>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageShell sign={{ label: 'Admin' }} title="Control" accent="room." sub="The inbox first, then the numbers." wide>
        <div className="space-y-6">
          {error && (
            <div role="alert" className="rounded-[12px] border border-warn/50 bg-hall-2 p-4">
              <span className="font-mono text-[12px] tracking-[0.16em] text-warn mr-2">ERROR</span>
              <span className="text-[16px] text-ink-dim">{error}</span>
            </div>
          )}

          <InboxSection />

          {/* Platform metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px rounded-[14px] overflow-hidden border border-rule bg-rule">
            <StatCard label="TOTAL USERS" value={stats?.totalUsers} />
            <StatCard label="LIVE USERS" value={stats?.liveUsers}>
              <span className={`inline-block w-2 h-2 rounded-full bg-ok ${liveRefreshing ? 'opacity-50' : ''}`} aria-hidden="true" />
            </StatCard>
            <StatCard label="TOTAL VISITS" value={stats?.totalVisits} />
          </div>
          <p className="-mt-3 font-mono text-[12px] tracking-[0.1em] text-ink-sub">Live: active in the last 5 min · refreshes every 30 s</p>

          {/* Lounge activity */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-[14px] overflow-hidden border border-rule bg-rule">
            <StatCard label="POSTS" value={stats?.posts} />
            <StatCard label="LIKES" value={stats?.likes} />
            <StatCard label="FOLLOWS" value={stats?.follows} />
            <StatCard label="COMMENTS" value={stats?.comments} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className={panel}>
              <h2 className="font-mono text-[12px] font-medium tracking-[0.22em] uppercase text-sign mb-4">RECENT POSTS</h2>
              <div className="space-y-2">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex items-start justify-between gap-3 p-3 rounded-[10px] border border-rule bg-hall-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold text-ink truncate">{post.title || 'Untitled'}</p>
                      <p className="font-mono text-[12px] tracking-[0.08em] text-ink-sub mt-0.5">{post.user_name} · {timeAgo(post.created_at)}</p>
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-[4px] border border-rule text-ink-sub flex-shrink-0">
                      {TYPE_LABELS[post.type] || post.type}
                    </span>
                  </div>
                ))}
                {recentPosts.length === 0 && <p className="text-[16px] text-ink-sub">No posts yet.</p>}
              </div>
            </div>

            <div className={panel}>
              <h2 className="font-mono text-[12px] font-medium tracking-[0.22em] uppercase text-sign mb-4">TOP POSTS BY LIKES</h2>
              <div className="space-y-2">
                {topPosts.map((post, i) => (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-[10px] border border-rule bg-hall-3">
                    <span className="font-mono text-[12px] font-medium text-sign w-7 flex-shrink-0">
                      №{String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold text-ink truncate">{post.title || 'Untitled'}</p>
                      <p className="font-mono text-[12px] tracking-[0.08em] text-ink-sub mt-0.5">{post.user_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[12px] text-ink-sub">
                      <span>♥ {post.like_count ?? 0}</span>
                      <span>✉ {post.comment_count ?? 0}</span>
                    </div>
                  </div>
                ))}
                {topPosts.length === 0 && <p className="text-[16px] text-ink-sub">No posts yet.</p>}
              </div>
            </div>
          </div>

          <p className="pt-5 border-t border-rule text-[16px] text-ink-sub">{FOOTNOTES.admin}</p>
        </div>
      </PageShell>
    </>
  );
}
