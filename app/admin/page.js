'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

const ADMIN_EMAIL = 'aahilakbar567@gmail.com';

function StatCard({ label, value, icon, color, dark }) {
  return (
    <div className={`rounded-2xl border p-5 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{label}</span>
      </div>
      <p className={`text-3xl font-black ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{value?.toLocaleString() ?? '—'}</p>
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

const TYPE_COLORS = {
  story:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  job:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  question: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advice:   'text-green-400 bg-green-500/10 border-green-500/20',
};

export default function AdminPage() {
  const { dark, toggleDark } = useTheme();
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

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-200',
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${ui.bg}`}>
        <Navbar dark={dark} onToggleDark={toggleDark} />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className={`min-h-screen ${ui.bg}`}>
        <Navbar dark={dark} onToggleDark={toggleDark} />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <span className="text-4xl">🔒</span>
          <p className={`text-sm font-semibold ${ui.text}`}>Admin access only</p>
          <p className={`text-xs ${ui.sub}`}>You need to be signed in as the admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* Header */}
      <div className={`relative overflow-hidden border-b ${ui.divider}`}>
        {dark && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-[#080810] to-violet-950/30 pointer-events-none" />
            <div className="absolute -top-10 right-0 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
          </>
        )}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4 text-xs font-medium ${dark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 'border-indigo-200 bg-indigo-50 text-indigo-600'}`}>
            🛡️ Admin Panel
          </div>
          <h1 className={`text-3xl font-black mb-1 ${dark ? 'gradient-text' : 'text-zinc-900'}`}>Dashboard</h1>
          <p className={`text-sm ${ui.sub}`}>OpportuMap platform stats and activity</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Stats grid — platform metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers} icon="🧑‍💻" color="text-indigo-400 bg-indigo-500/10 border-indigo-500/20" dark={dark} />
          <div className={`rounded-2xl border p-5 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">🟢</span>
              <div className="flex items-center gap-2">
                {liveRefreshing && <div className="w-2.5 h-2.5 border border-green-400 border-t-transparent rounded-full animate-spin" />}
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium text-green-400 bg-green-500/10 border-green-500/20`}>Live Now</span>
              </div>
            </div>
            <p className={`text-3xl font-black ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{stats?.liveUsers?.toLocaleString() ?? '—'}</p>
            <p className={`text-xs mt-1 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>active in last 5 min · refreshes 30s</p>
          </div>
          <StatCard label="Total Visits" value={stats?.totalVisits} icon="📊" color="text-violet-400 bg-violet-500/10 border-violet-500/20" dark={dark} />
        </div>

        {/* Community stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Posts" value={stats?.posts} icon="📝" color="text-purple-400 bg-purple-500/10 border-purple-500/20" dark={dark} />
          <StatCard label="Likes" value={stats?.likes} icon="❤️" color="text-rose-400 bg-rose-500/10 border-rose-500/20" dark={dark} />
          <StatCard label="Follows" value={stats?.follows} icon="👥" color="text-blue-400 bg-blue-500/10 border-blue-500/20" dark={dark} />
          <StatCard label="Comments" value={stats?.comments} icon="💬" color="text-green-400 bg-green-500/10 border-green-500/20" dark={dark} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent posts */}
          <div className={`rounded-2xl border p-5 ${ui.card}`}>
            <h2 className={`text-sm font-bold mb-4 ${ui.text}`}>Recent Posts</h2>
            <div className="space-y-2">
              {recentPosts.map((post) => (
                <div key={post.id} className={`flex items-start justify-between gap-3 p-3 rounded-xl ${dark ? 'bg-[#080810]' : 'bg-zinc-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${ui.text}`}>{post.title || 'Untitled'}</p>
                    <p className={`text-xs ${ui.sub}`}>{post.user_name} · {timeAgo(post.created_at)}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${TYPE_COLORS[post.type] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'}`}>
                    {post.type}
                  </span>
                </div>
              ))}
              {recentPosts.length === 0 && <p className={`text-xs ${ui.sub}`}>No posts yet.</p>}
            </div>
          </div>

          {/* Top posts */}
          <div className={`rounded-2xl border p-5 ${ui.card}`}>
            <h2 className={`text-sm font-bold mb-4 ${ui.text}`}>Top Posts by Likes</h2>
            <div className="space-y-2">
              {topPosts.map((post, i) => (
                <div key={post.id} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-[#080810]' : 'bg-zinc-50'}`}>
                  <span className={`text-xs font-black w-5 flex-shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-orange-400' : ui.sub}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${ui.text}`}>{post.title || 'Untitled'}</p>
                    <p className={`text-xs ${ui.sub}`}>{post.user_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${ui.sub}`}>❤️ {post.like_count ?? 0}</span>
                    <span className={`text-xs ${ui.sub}`}>💬 {post.comment_count ?? 0}</span>
                  </div>
                </div>
              ))}
              {topPosts.length === 0 && <p className={`text-xs ${ui.sub}`}>No posts yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
