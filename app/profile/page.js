'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

const VERIFIED_EMAILS = new Set(['aahilakbar567@gmail.com']);

function StatBox({ label, value }) {
  return (
    <div className="border border-paper-rule bg-paper-bg p-4 text-center">
      <p className="font-display text-[28px] leading-none text-accent">{value ?? '—'}</p>
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mt-1.5">{label}</p>
    </div>
  );
}

function PostCard({ post }) {
  const POST_TYPE_LABELS = {
    story: 'STORY',
    job: 'JOB POST',
    question: 'QUESTION',
    advice: 'ADVICE',
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
    <div className="border border-paper-rule p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub">
          {POST_TYPE_LABELS[post.post_type] || post.post_type}
        </span>
        <span className="font-mono text-[10px] text-paper-ink-sub">· {timeAgo(post.created_at)}</span>
        {post.like_count > 0 && <span className="font-mono text-[10px] text-paper-ink-sub ml-auto">♥ {post.like_count}</span>}
      </div>
      {post.title && <p className="text-[14px] font-medium text-paper-ink mb-1">{post.title}</p>}
      <p className="text-[13px] leading-[1.55] text-paper-ink-dim line-clamp-3">{post.content}</p>
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {post.tags.map((tag) => (
            <span key={tag} className="font-mono text-[10px] px-2 py-0.5 border border-paper-rule text-paper-ink-sub">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

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
      <div className="min-h-screen bg-paper-bg text-paper-ink">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">LOADING…</div>
        </div>
      </div>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" />
          <span>§ PROFILE</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">Your profile.</h1>
      </section>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 max-w-3xl">
          {/* Profile header card */}
          <div className="border border-paper-rule p-6 mb-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {avatar
                  ? <img src={avatar} alt={name} className="w-20 h-20 object-cover border border-paper-rule" />
                  : <div className="w-20 h-20 border border-paper-rule bg-paper-bg-alt flex items-center justify-center font-display text-[28px] text-accent">{initials}</div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-[24px] leading-[1.15] text-paper-ink">{name}</h2>
                  {VERIFIED_EMAILS.has(user.email) && (
                    <span title="Verified" className="inline-flex items-center justify-center w-5 h-5 border border-accent text-accent flex-shrink-0" style={{ fontSize: 10 }}>✓</span>
                  )}
                </div>
                <p className="text-[13px] text-paper-ink-dim mt-0.5">{user.email}</p>
                {joinDate && <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">JOINED {joinDate.toUpperCase()}</p>}
                <div className="flex gap-3 mt-4">
                  <Btn variant="primary" href="/community">+ New Post</Btn>
                  <Btn variant="secondary" href="/jobs">Browse Jobs</Btn>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-paper-rule border border-paper-rule mb-6">
            <StatBox label="FOLLOWERS" value={stats.followers} />
            <StatBox label="FOLLOWING" value={stats.following} />
            <StatBox label="POSTS" value={stats.posts} />
          </div>

          {/* Account info */}
          <div className="border border-paper-rule p-5 mb-6">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-4">// ACCOUNT DETAILS</div>
            <div className="space-y-0">
              <div className="flex justify-between py-2.5 border-b border-paper-rule text-[13px]">
                <span className="text-paper-ink-sub">Email</span>
                <span className="text-paper-ink">{user.email}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-paper-rule text-[13px]">
                <span className="text-paper-ink-sub">Sign-in method</span>
                <span className="text-paper-ink">{user.app_metadata?.provider === 'google' ? 'Google' : 'Email'}</span>
              </div>
              <div className="flex justify-between py-2.5 text-[13px]">
                <span className="text-paper-ink-sub">Member since</span>
                <span className="text-paper-ink">{joinDate}</span>
              </div>
            </div>
          </div>

          {/* Posts */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-4">// YOUR POSTS</div>
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-paper-rule p-4">
                    <div className="h-3 w-1/3 bg-paper-rule mb-2 animate-pulse" />
                    <div className="h-3 w-full bg-paper-rule mb-1 animate-pulse" />
                    <div className="h-3 w-2/3 bg-paper-rule animate-pulse" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="border border-paper-rule bg-paper-bg-alt p-10 text-center">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// NO POSTS YET</div>
                <p className="font-display text-[22px] leading-[1.15] text-paper-ink mb-1">No posts yet.</p>
                <p className="text-[13px] text-paper-ink-dim mb-5">Share your story with the community</p>
                <Btn variant="primary" href="/community">Go to Community</Btn>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </div>

          <Footnote>{FOOTNOTES.profile}</Footnote>
        </div>
      </main>
    </div>
  );
}
