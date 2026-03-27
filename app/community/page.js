'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

const POST_TYPES = [
  { value: 'story', label: '📖 Story', color: 'text-purple-400' },
  { value: 'job', label: '💼 Job Post', color: 'text-blue-400' },
  { value: 'question', label: '❓ Question', color: 'text-amber-400' },
  { value: 'advice', label: '💡 Advice', color: 'text-green-400' },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Avatar({ name, avatar, size = 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}>{initials}</div>;
}

function FollowButton({ targetUserId, targetName, currentUser, dark }) {
  const [following, setFollowing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId || !currentUser) return;
    fetch(`/api/community/follows?userId=${targetUserId}`)
      .then((r) => r.json())
      .then((d) => setFollowing(d.is_following));
  }, [targetUserId, currentUser]);

  if (!currentUser || currentUser.id === targetUserId) return null;

  const toggle = async () => {
    setLoading(true);
    const res = await fetch('/api/community/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        following_id: targetUserId,
        following_name: targetName,
        follower_name: currentUser.fullName || currentUser.username || '',
      }),
    });
    const data = await res.json();
    if (data.following !== undefined) setFollowing(data.following);
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-full font-medium transition-all border ${
        following
          ? dark ? 'border-zinc-600 text-zinc-400 hover:border-red-500/50 hover:text-red-400' : 'border-zinc-300 text-zinc-500 hover:border-red-300 hover:text-red-500'
          : 'border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white'
      }`}
    >
      {loading ? '...' : following ? 'Following' : '+ Follow'}
    </button>
  );
}

function CommentSection({ postId, dark, currentUser, onSignIn }) {
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/community/comments?postId=${postId}`)
      .then((r) => r.json())
      .then((d) => { setComments(d.comments || []); setLoaded(true); });
  }, [postId]);

  const submit = async () => {
    if (!input.trim() || !currentUser) return;
    setSubmitting(true);
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: postId,
        content: input.trim(),
        user_name: currentUser.fullName || currentUser.username || 'Anonymous',
        user_avatar: currentUser.imageUrl || '',
      }),
    });
    const data = await res.json();
    if (data.comment) {
      setComments((prev) => [...prev, data.comment]);
      setInput('');
    }
    setSubmitting(false);
  };

  const ui = {
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400',
    comment: dark ? 'bg-[#222226]' : 'bg-zinc-50',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
  };

  return (
    <div className="mt-3 space-y-3">
      {!loaded ? (
        <p className={`text-xs ${ui.sub}`}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className={`text-xs ${ui.sub}`}>No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className={`flex gap-2.5 p-3 rounded-xl ${ui.comment}`}>
              <Avatar name={c.user_name} avatar={c.user_avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xs font-semibold ${ui.text}`}>{c.user_name}</span>
                  <span className={`text-xs ${ui.sub}`}>{timeAgo(c.created_at)}</span>
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${ui.sub}`}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentUser ? (
        <div className="flex gap-2">
          <Avatar name={currentUser.fullName || currentUser.username} avatar={currentUser.imageUrl} size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Write a comment..."
              className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${ui.input}`}
            />
            <button
              onClick={submit}
              disabled={!input.trim() || submitting}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition-all"
            >
              {submitting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => onSignIn?.()} className={`text-xs ${ui.sub} hover:text-indigo-400 transition-colors`}>Sign in to comment</button>
      )}
    </div>
  );
}

function PostCard({ post, dark, currentUser, likedIds, onLike, onSignIn }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [localCommentCount, setLocalCommentCount] = useState(post.comment_count || 0);
  const isLiked = likedIds.has(post.id);
  const isLong = post.content.length > 300;
  const typeInfo = POST_TYPES.find((t) => t.value === post.post_type) || POST_TYPES[0];

  const ui = {
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-100',
    action: (active) => active
      ? 'text-indigo-400'
      : dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600',
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const res = await fetch('/api/community/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id }),
    });
    const data = await res.json();
    if (data.like_count !== undefined) {
      setLocalLikeCount(data.like_count);
      onLike(post.id, data.liked);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 transition-all ${ui.card}`}>
      {/* Author row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={post.user_name} avatar={post.user_avatar} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${ui.text}`}>{post.user_name}</span>
              <FollowButton targetUserId={post.user_id} targetName={post.user_name} currentUser={currentUser} dark={dark} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xs ${typeInfo.color} font-medium`}>{typeInfo.label}</span>
              <span className={`text-xs ${ui.sub}`}>· {timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className={`text-base font-bold mb-2 leading-snug ${ui.text}`}>{post.title}</h3>
      )}

      {/* Content */}
      <p className={`text-sm leading-relaxed ${ui.sub}`}>
        {isLong && !expanded ? post.content.slice(0, 300) + '...' : post.content}
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="ml-1 text-indigo-400 hover:text-indigo-300 text-xs font-medium">
            {expanded ? 'show less' : 'read more'}
          </button>
        )}
      </p>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-[#2a2a2e] text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className={`flex items-center gap-4 mt-4 pt-3 border-t ${ui.divider}`}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ui.action(isLiked)} ${!currentUser ? 'opacity-50 cursor-default' : ''}`}
        >
          <span className={isLiked ? 'text-red-400' : ''}>{isLiked ? '❤️' : '🤍'}</span>
          {localLikeCount > 0 && <span>{localLikeCount}</span>}
          <span>Like</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ui.action(showComments)}`}
        >
          <span>💬</span>
          {localCommentCount > 0 && <span>{localCommentCount}</span>}
          <span>{showComments ? 'Hide' : 'Comment'}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection
          postId={post.id}
          dark={dark}
          currentUser={currentUser}
          onSignIn={onSignIn}
        />
      )}
    </div>
  );
}

function CreatePost({ dark, currentUser, onPost }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('story');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ui = {
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    pill: (a) => a ? 'bg-indigo-600 text-white border-indigo-600' : dark ? 'bg-[#2a2a2e] text-zinc-400 border-[#3a3a3e]' : 'bg-white text-zinc-500 border-zinc-200',
  };

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim() || undefined,
        content: content.trim(),
        post_type: postType,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        user_name: currentUser.fullName || currentUser.username || 'Anonymous',
        user_avatar: currentUser.imageUrl || '',
      }),
    });
    const data = await res.json();
    if (data.post) {
      onPost(data.post);
      setTitle(''); setContent(''); setTags(''); setPostType('story'); setOpen(false);
    }
    setSubmitting(false);
  };

  if (!currentUser) {
    return (
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${ui.card}`}>
        <div className="w-9 h-9 rounded-full bg-zinc-300 dark:bg-zinc-700 flex-shrink-0" />
        <button onClick={() => onSignIn?.()} className={`flex-1 text-left text-sm px-4 py-2.5 rounded-xl border transition-all ${ui.input}`}>
          Share your story, post a job, ask a question...
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${ui.card}`}>
      <div className="p-4 flex items-center gap-3">
        <Avatar name={currentUser.fullName || currentUser.username} avatar={currentUser.imageUrl} />
        <button
          onClick={() => setOpen(true)}
          className={`flex-1 text-left text-sm px-4 py-2.5 rounded-xl border transition-all ${ui.input}`}
        >
          Share your story, post a job, ask a question...
        </button>
      </div>

      {open && (
        <div className={`px-4 pb-4 space-y-3 border-t ${dark ? 'border-[#2a2a2e]' : 'border-zinc-100'} pt-4`}>
          {/* Post type */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map((t) => (
              <button key={t.value} onClick={() => setPostType(t.value)}
                className={`px-3 py-1 rounded-full text-xs border font-medium transition-all ${ui.pill(postType === t.value)}`}>
                {t.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`}
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated): visa, canada, tech..."
            className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)}
              className={`px-4 py-2 rounded-xl text-sm border font-medium transition-all ${dark ? 'border-[#3a3a3e] text-zinc-400 hover:bg-[#2a2a2e]' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
              Cancel
            </button>
            <button onClick={submit} disabled={!content.trim() || submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const { dark, toggleDark } = useTheme();
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PER_PAGE = 20;

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const loadPosts = useCallback(async (offset = 0) => {
    setLoading(true);
    const res = await fetch(`/api/community/posts?limit=${PER_PAGE}&offset=${offset}`);
    const data = await res.json();
    const newPosts = data.posts || [];
    if (offset === 0) setPosts(newPosts);
    else setPosts((prev) => [...prev, ...newPosts]);
    setHasMore(newPosts.length === PER_PAGE);
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(0); }, [loadPosts]);

  // Load liked post IDs for current user
  useEffect(() => {
    if (!user) return;
    fetch('/api/community/likes')
      .then((r) => r.json())
      .then((d) => setLikedIds(new Set(d.liked_post_ids || [])));
  }, [user]);

  const handlePost = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleLike = (postId, liked) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(postId);
      else next.delete(postId);
      return next;
    });
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage * PER_PAGE);
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      {showAuth && <AuthModal dark={dark} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${ui.text}`}>Community</h1>
          <p className={`text-sm mt-1 ${ui.sub}`}>Share stories, post jobs, ask questions — connect with people navigating global careers</p>
        </div>

        <div className="flex gap-6">
          {/* Main feed */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Create post */}
            <CreatePost dark={dark} currentUser={user} onPost={handlePost} onSignIn={() => setShowAuth(true)} />

            {/* Post feed */}
            {loading && posts.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`rounded-2xl border p-5 ${ui.card}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                      <div className="space-y-1.5 flex-1">
                        <div className={`h-3 w-1/4 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                        <div className={`h-2.5 w-1/3 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className={`h-3 w-full rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                      <div className={`h-3 w-3/4 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center ${ui.card}`}>
                <p className="text-3xl mb-3">🌍</p>
                <p className={`text-sm font-semibold ${ui.text}`}>No posts yet</p>
                <p className={`text-xs mt-1 ${ui.sub}`}>Be the first to share your story!</p>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    dark={dark}
                    currentUser={user}
                    likedIds={likedIds}
                    onLike={handleLike}
                    onSignIn={() => setShowAuth(true)}
                  />
                ))}
                {hasMore && (
                  <div className="text-center pt-2">
                    <button onClick={loadMore} disabled={loading}
                      className={`px-6 py-2.5 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#2a2a2e] text-zinc-300 hover:bg-[#1a1a1d]' : 'border-zinc-200 text-zinc-700 hover:bg-white'}`}>
                      {loading ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            {/* About */}
            <div className={`rounded-2xl border p-4 ${ui.card}`}>
              <h3 className={`text-sm font-bold mb-2 ${ui.text}`}>About Community</h3>
              <p className={`text-xs leading-relaxed ${ui.sub}`}>
                Share career stories, job opportunities, visa experiences, and advice for working globally.
                Connect with people on the same journey.
              </p>
              <div className={`mt-3 pt-3 border-t ${dark ? 'border-[#2a2a2e]' : 'border-zinc-100'} space-y-1`}>
                {POST_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2">
                    <span className={`text-xs ${t.color}`}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* User stats */}
            {user && <UserStats user={user} dark={dark} ui={ui} />}
            {!user && (
              <div className={`rounded-2xl border p-4 text-center ${ui.card}`}>
                <p className="text-2xl mb-2">✨</p>
                <p className={`text-xs font-semibold mb-3 ${ui.text}`}>Join the community</p>
                <p className={`text-xs mb-3 ${ui.sub}`}>Sign in to post, comment, like, and follow others.</p>
                <button onClick={() => setShowAuth(true)} className="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
                  Sign in / Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserStats({ user, dark, ui }) {
  const [stats, setStats] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!user) return;
    fetch(`/api/community/follows?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => setStats({ followers: d.followers || 0, following: d.following || 0 }));
  }, [user]);

  return (
    <div className={`rounded-2xl border p-4 ${ui.card}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar name={user.fullName || user.username} avatar={user.imageUrl} />
        <div>
          <p className={`text-sm font-semibold ${ui.text}`}>{user.fullName || user.username}</p>
          <p className={`text-xs ${ui.sub}`}>{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
      <div className={`flex gap-4 pt-3 border-t ${dark ? 'border-[#2a2a2e]' : 'border-zinc-100'}`}>
        <div>
          <p className={`text-sm font-bold ${ui.text}`}>{stats.followers}</p>
          <p className={`text-xs ${ui.sub}`}>Followers</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${ui.text}`}>{stats.following}</p>
          <p className={`text-xs ${ui.sub}`}>Following</p>
        </div>
      </div>
    </div>
  );
}
