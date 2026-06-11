'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

const ADMIN_EMAIL = 'aahilakbar567@gmail.com';

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

export default function AdminPage() {
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
    if (user.email !== ADMIN_EMAIL) { setLoading(false); return; }

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
    if (!user || user.email !== ADMIN_EMAIL) return;
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

  if (!user || user.email !== ADMIN_EMAIL) {
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

          {/* Stats grid — platform metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-paper-rule border border-paper-rule">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-paper-rule border border-paper-rule">
            <StatCard label="POSTS" value={stats?.posts} />
            <StatCard label="LIKES" value={stats?.likes} />
            <StatCard label="FOLLOWS" value={stats?.follows} />
            <StatCard label="COMMENTS" value={stats?.comments} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
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
