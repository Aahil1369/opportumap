'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';
import { isAdminUser } from '../../lib/admin.js';
import { mailtoHref } from '../../lib/contactForm.js';

function StatCard({ label, value }) {
  return (
    <div className="border border-paper-rule bg-paper-bg p-5">
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-3">{label}</div>
      <p className="font-display text-[40px] leading-none text-accent">{value?.toLocaleString() ?? '—'}</p>
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

  const smallBtn = 'font-mono text-[10px] tracking-[0.1em] uppercase px-2 py-1 border border-paper-rule text-paper-ink hover:border-paper-ink transition-colors disabled:opacity-50';

  return (
    <section className="border border-paper-rule p-5" aria-labelledby="admin-inbox-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="admin-inbox-heading" className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub">
          {'// INBOX'}
          {status === 'ready' && (
            <>
              {' '}
              <span className="ml-2 text-accent">{unread.toLocaleString()} unread</span>
            </>
          )}
        </h2>
        <button type="button" onClick={reload} disabled={status === 'loading'} className={smallBtn}>
          Refresh
        </button>
      </div>

      {status === 'loading' && (
        <p className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">LOADING…</p>
      )}

      {status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-paper-ink-dim">Could not load messages.</p>
          <button type="button" onClick={reload} className={smallBtn}>Try again</button>
        </div>
      )}

      {status === 'ready' && messages.length === 0 && (
        <p className="text-[13px] text-paper-ink-sub">No messages yet.</p>
      )}

      {status === 'ready' && messages.length > 0 && (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`border p-4 ${m.read ? 'border-paper-rule' : 'border-accent/50 bg-paper-bg-alt'}`}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-paper-ink break-words">
                    {!m.read && (
                      <>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-2 align-middle" aria-hidden="true" />
                        <span className="sr-only">Unread: </span>
                      </>
                    )}
                    {m.subject || '(no subject)'}
                  </p>
                  <p className="text-[12px] text-paper-ink-dim mt-1 break-words">
                    {m.name}
                    {' · '}
                    <a href={mailtoHref(m.email, m.subject)} className="text-accent underline underline-offset-2 break-all">
                      {m.email}
                    </a>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 border border-paper-rule text-paper-ink-sub">
                    {m.source}
                  </span>
                  <time dateTime={m.created_at} className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">
                    {formatDate(m.created_at)} · {timeAgo(m.created_at)}
                  </time>
                  <button type="button" onClick={() => toggleRead(m)} disabled={!!busy[m.id]} className={smallBtn}>
                    {m.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-paper-ink-dim leading-[1.55] whitespace-pre-wrap break-words">{m.message}</p>
              {rowErrors[m.id] && (
                <p role="alert" className="mt-2 font-mono text-[11px] text-accent">{rowErrors[m.id]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {status === 'ready' && messages.length >= INBOX_LIMIT && (
        <p className="mt-3 text-[12px] text-paper-ink-sub">Showing the newest {INBOX_LIMIT}.</p>
      )}
    </section>
  );
}

export default function AdminPage() {
  useScrollReveal();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveRefreshing, setLiveRefreshing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) { setLoading(false); return; }
    if (!isAdminUser(user)) { setLoading(false); return; }

    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setStats(d.stats);
        setRecentPosts(d.recentPosts);
        setTopPosts(d.topPosts);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load stats'); setLoading(false); });
  }, [user]);

  // Auto-refresh live users every 30s
  useEffect(() => {
    if (!isAdminUser(user)) return;
    const interval = setInterval(() => {
      setLiveRefreshing(true);
      fetch('/api/admin/stats')
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setStats((prev) => ({ ...prev, liveUsers: d.stats.liveUsers }));
        })
        .catch(() => {})
        .finally(() => setLiveRefreshing(false));
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-bg text-paper-ink">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">LOADING…</div>
        </div>
      </div>
    );
  }

  if (!isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-paper-bg text-paper-ink">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">// ACCESS DENIED</div>
          <p className="font-display text-[24px] leading-[1.15] text-paper-ink">Admin access only.</p>
          <p className="text-[13px] text-paper-ink-dim">You need to be signed in as the admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" />
          <span>§ ADMIN · DASHBOARD</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">The numbers.</h1>
      </section>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 space-y-8">
          {error && (
            <div className="border border-accent/40 bg-paper-bg-alt p-4">
              <span className="font-mono text-[10px] tracking-[0.12em] text-accent mr-2">// ERROR</span>
              <span className="text-[13px] text-paper-ink-dim">{error}</span>
            </div>
          )}

          <InboxSection />

          {/* Stats grid — platform metrics */}
          <div className="reveal grid grid-cols-2 lg:grid-cols-3 gap-px bg-paper-rule border border-paper-rule">
            <div className="bg-paper-bg p-5">
              <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-3">TOTAL USERS</div>
              <p className="font-display text-[40px] leading-none text-accent">{stats?.totalUsers?.toLocaleString() ?? '—'}</p>
            </div>
            <div className="bg-paper-bg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub">LIVE USERS</span>
                <span className={`inline-block w-1.5 h-1.5 rounded-full bg-accent ${liveRefreshing ? 'animate-pulse' : ''}`} />
              </div>
              <p className="font-display text-[40px] leading-none text-accent">{stats?.liveUsers?.toLocaleString() ?? '—'}</p>
              <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">active in last 5 min · refreshes 30s</p>
            </div>
            <div className="bg-paper-bg p-5">
              <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-3">TOTAL VISITS</div>
              <p className="font-display text-[40px] leading-none text-accent">{stats?.totalVisits?.toLocaleString() ?? '—'}</p>
            </div>
          </div>

          {/* Community stats grid */}
          <div className="reveal grid grid-cols-2 lg:grid-cols-4 gap-px bg-paper-rule border border-paper-rule">
            <StatCard label="POSTS" value={stats?.posts} />
            <StatCard label="LIKES" value={stats?.likes} />
            <StatCard label="FOLLOWS" value={stats?.follows} />
            <StatCard label="COMMENTS" value={stats?.comments} />
          </div>

          <div className="reveal grid lg:grid-cols-2 gap-5">
            {/* Recent posts */}
            <div className="border border-paper-rule p-5">
              <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-4">// RECENT POSTS</div>
              <div className="space-y-2">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex items-start justify-between gap-3 p-3 border border-paper-rule">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-paper-ink truncate">{post.title || 'Untitled'}</p>
                      <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-0.5">{post.user_name} · {timeAgo(post.created_at)}</p>
                    </div>
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 border border-paper-rule text-paper-ink-sub flex-shrink-0">
                      {TYPE_LABELS[post.type] || post.type}
                    </span>
                  </div>
                ))}
                {recentPosts.length === 0 && <p className="text-[13px] text-paper-ink-sub">No posts yet.</p>}
              </div>
            </div>

            {/* Top posts */}
            <div className="border border-paper-rule p-5">
              <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-4">// TOP POSTS BY LIKES</div>
              <div className="space-y-2">
                {topPosts.map((post, i) => (
                  <div key={post.id} className="flex items-start gap-3 p-3 border border-paper-rule">
                    <span className="font-mono text-[11px] font-medium text-accent w-6 flex-shrink-0">
                      №{String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-paper-ink truncate">{post.title || 'Untitled'}</p>
                      <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-0.5">{post.user_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[10px] text-paper-ink-sub">
                      <span>♥ {post.like_count ?? 0}</span>
                      <span>✉ {post.comment_count ?? 0}</span>
                    </div>
                  </div>
                ))}
                {topPosts.length === 0 && <p className="text-[13px] text-paper-ink-sub">No posts yet.</p>}
              </div>
            </div>
          </div>

          <Footnote>{FOOTNOTES.admin}</Footnote>
        </div>
      </main>
    </div>
  );
}
