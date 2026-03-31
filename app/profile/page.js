'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

function StatBox({ label, value, dark }) {
  const ui = {
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
  };
  return (
    <div className={`rounded-2xl border p-4 text-center ${ui.card}`}>
      <p className={`text-2xl font-bold ${ui.text}`}>{value ?? '—'}</p>
      <p className={`text-xs mt-0.5 ${ui.sub}`}>{label}</p>
    </div>
  );
}

function PostCard({ post, dark }) {
  const ui = {
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
  };
  const POST_TYPE_COLORS = {
    story: 'text-purple-400',
    job: 'text-blue-400',
    question: 'text-amber-400',
    advice: 'text-green-400',
  };
  const POST_TYPE_LABELS = {
    story: '📖 Story',
    job: '💼 Job Post',
    question: '❓ Question',
    advice: '💡 Advice',
  };
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d}d ago` : new Date(dateStr).toLocaleDateString();
  }
  return (
    <div className={`rounded-2xl border p-4 ${ui.card}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium ${POST_TYPE_COLORS[post.post_type] || 'text-zinc-400'}`}>
          {POST_TYPE_LABELS[post.post_type] || post.post_type}
        </span>
        <span className={`text-xs ${ui.sub}`}>· {timeAgo(post.created_at)}</span>
        {post.like_count > 0 && <span className={`text-xs ${ui.sub} ml-auto`}>❤️ {post.like_count}</span>}
      </div>
      {post.title && <p className={`text-sm font-semibold mb-1 ${ui.text}`}>{post.title}</p>}
      <p className={`text-sm leading-relaxed ${ui.sub} line-clamp-3`}>{post.content}</p>
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {post.tags.map((tag) => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-[#2a2a2e] text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { dark, toggleDark } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-100',
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return; }
      setUser(data.user);
      setLoading(false);

      // Load stats
      fetch(`/api/community/follows?userId=${data.user.id}`)
        .then((r) => r.json())
        .then((d) => setStats((prev) => ({ ...prev, followers: d.followers || 0, following: d.following || 0 })));

      // Load user's posts
      fetch(`/api/community/posts?userId=${data.user.id}&limit=20`)
        .then((r) => r.json())
        .then((d) => {
          const userPosts = (d.posts || []).filter((p) => p.user_id === data.user.id);
          setPosts(userPosts);
          setStats((prev) => ({ ...prev, posts: userPosts.length }));
          setPostsLoading(false);
        })
        .catch(() => setPostsLoading(false));
    });
  }, [router]);

  if (loading) {
    return (
      <div className={`min-h-screen ${ui.bg}`}>
        <Navbar dark={dark} onToggleDark={toggleDark} />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500'];
  const avatarColor = colors[(name.charCodeAt(0) || 0) % colors.length];
  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile header card */}
        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatar
                ? <img src={avatar} alt={name} className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500/30" />
                : <div className={`w-20 h-20 ${avatarColor} rounded-full flex items-center justify-center text-white text-2xl font-bold ring-2 ring-indigo-500/30`}>{initials}</div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl font-bold ${ui.text}`}>{name}</h1>
              </div>
              <p className={`text-sm mt-0.5 ${ui.sub}`}>{user.email}</p>
              {joinDate && <p className={`text-xs mt-1 ${ui.sub}`}>Joined {joinDate}</p>}
              <div className="flex gap-3 mt-3">
                <Link href="/community"
                  className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
                  + New Post
                </Link>
                <Link href="/jobs"
                  className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-all ${dark ? 'border-[#3a3a3e] text-zinc-300 hover:bg-[#2a2a2e]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  Browse Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatBox label="Followers" value={stats.followers} dark={dark} />
          <StatBox label="Following" value={stats.following} dark={dark} />
          <StatBox label="Posts" value={stats.posts} dark={dark} />
        </div>

        {/* Account info */}
        <div className={`rounded-2xl border p-5 mb-6 ${ui.card}`}>
          <h2 className={`text-sm font-bold mb-4 ${ui.text}`}>Account Details</h2>
          <div className={`space-y-3 text-sm`}>
            <div className={`flex justify-between py-2 border-b ${ui.divider}`}>
              <span className={ui.sub}>Email</span>
              <span className={ui.text}>{user.email}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${ui.divider}`}>
              <span className={ui.sub}>Sign-in method</span>
              <span className={ui.text}>{user.app_metadata?.provider === 'google' ? '🔵 Google' : '✉️ Email'}</span>
            </div>
            <div className={`flex justify-between py-2`}>
              <span className={ui.sub}>Member since</span>
              <span className={ui.text}>{joinDate}</span>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div>
          <h2 className={`text-sm font-bold mb-3 ${ui.text}`}>Your Posts</h2>
          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className={`rounded-2xl border p-4 ${ui.card}`}>
                  <div className={`h-3 w-1/3 rounded mb-2 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                  <div className={`h-3 w-full rounded mb-1 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                  <div className={`h-3 w-2/3 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className={`rounded-2xl border p-10 text-center ${ui.card}`}>
              <p className="text-3xl mb-3">✍️</p>
              <p className={`text-sm font-semibold ${ui.text}`}>No posts yet</p>
              <p className={`text-xs mt-1 mb-4 ${ui.sub}`}>Share your story with the community</p>
              <Link href="/community"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
                Go to Community
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => <PostCard key={post.id} post={post} dark={dark} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
