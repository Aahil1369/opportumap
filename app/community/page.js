'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

const VERIFIED_EMAILS = new Set(['aahilakbar567@gmail.com']);

function VerifiedBadge() {
  return (
    <span title="Verified" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-paper-bg flex-shrink-0" style={{ fontSize: 9 }}>✓</span>
  );
}

const POST_TYPES = [
  { value: 'story', label: '📖 Story' },
  { value: 'job', label: '💼 Job Post' },
  { value: 'question', label: '❓ Question' },
  { value: 'advice', label: '💡 Advice' },
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
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[12px]';
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} ${sz} bg-paper-ink text-paper-bg rounded-full flex items-center justify-center font-mono font-medium flex-shrink-0`}>
      {initials}
    </div>
  );
}

function FollowButton({ targetUserId, targetName, currentUser }) {
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
        follower_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '',
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
      className={`font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 border transition-colors ${
        following
          ? 'border-paper-rule text-paper-ink-sub hover:border-accent/50 hover:text-accent'
          : 'border-accent text-accent hover:bg-accent hover:text-paper-bg'
      }`}
    >
      {loading ? '...' : following ? 'Following' : '+ Follow'}
    </button>
  );
}

function CommentSection({ postId, currentUser, onSignIn }) {
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
        user_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Anonymous',
        user_avatar: currentUser.user_metadata?.avatar_url || '',
      }),
    });
    const data = await res.json();
    if (data.comment) {
      setComments((prev) => [...prev, data.comment]);
      setInput('');
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-3 pl-4 border-l border-paper-rule space-y-3">
      {!loaded ? (
        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">LOADING COMMENTS…</p>
      ) : comments.length === 0 ? (
        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">NO COMMENTS YET. BE THE FIRST!</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.user_name} avatar={c.user_avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[13px] font-medium text-paper-ink">{c.user_name}</span>
                  <span className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-[13px] mt-0.5 leading-[1.5] text-paper-ink-dim">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentUser ? (
        <div className="flex gap-2 items-start">
          <Avatar name={currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0]} avatar={currentUser.user_metadata?.avatar_url} size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-1.5 bg-paper-bg border border-paper-rule text-paper-ink placeholder:text-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors"
            />
            <Btn variant="secondary" as="button" onClick={submit} disabled={!input.trim() || submitting} className="!px-4 !py-1.5 !text-[12px]">
              {submitting ? '...' : 'Post'}
            </Btn>
          </div>
        </div>
      ) : (
        <button onClick={() => onSignIn?.()} className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub hover:text-accent transition-colors">
          SIGN IN TO COMMENT
        </button>
      )}
    </div>
  );
}

function PostCard({ post, currentUser, likedIds, onLike, onSignIn }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [localCommentCount] = useState(post.comment_count || 0);
  const isLiked = likedIds.has(post.id);
  const isLong = post.content.length > 300;
  const typeInfo = POST_TYPES.find((t) => t.value === post.post_type) || POST_TYPES[0];

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
    <div className="border border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors p-5">
      {/* Author row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={post.user_name} avatar={post.user_avatar} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-paper-ink">{post.user_name}</span>
              {VERIFIED_EMAILS.has(post.user_email) && <VerifiedBadge />}
              <FollowButton targetUserId={post.user_id} targetName={post.user_name} currentUser={currentUser} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">
              <span>{typeInfo.label}</span>
              <span>· {timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="font-display text-[20px] leading-[1.2] mb-2 text-paper-ink">{post.title}</h3>
      )}

      {/* Content */}
      <p className="text-[13px] leading-[1.55] text-paper-ink-dim">
        {isLong && !expanded ? post.content.slice(0, 300) + '...' : post.content}
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="ml-1 text-accent hover:text-accent/80 font-mono text-[10px] tracking-[0.1em] uppercase">
            {expanded ? 'show less' : 'read more'}
          </button>
        )}
      </p>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className="font-mono text-[10px] tracking-[0.1em] px-2 py-0.5 border border-paper-rule text-paper-ink-sub">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-paper-rule">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors ${isLiked ? 'text-accent' : 'text-paper-ink-sub hover:text-paper-ink'} ${!currentUser ? 'opacity-50 cursor-default' : ''}`}
        >
          <span>{isLiked ? '●' : '○'}</span>
          {localLikeCount > 0 && <span>{localLikeCount}</span>}
          <span>Like</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors ${showComments ? 'text-accent' : 'text-paper-ink-sub hover:text-paper-ink'}`}
        >
          <span>▢</span>
          {localCommentCount > 0 && <span>{localCommentCount}</span>}
          <span>{showComments ? 'Hide' : 'Comment'}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          onSignIn={onSignIn}
        />
      )}
    </div>
  );
}

function CreatePost({ currentUser, onPost, onSignIn }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('story');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        user_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Anonymous',
        user_avatar: currentUser.user_metadata?.avatar_url || '',
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
      <div className="border border-paper-rule bg-paper-bg p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-paper-rule flex-shrink-0" />
        <button onClick={() => onSignIn?.()} className="flex-1 text-left text-[13px] px-4 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink-sub hover:border-accent/60 transition-colors">
          Share your story, post a job, ask a question...
        </button>
      </div>
    );
  }

  return (
    <div className="border border-paper-rule bg-paper-bg">
      <div className="p-4 flex items-center gap-3">
        <Avatar name={currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0]} avatar={currentUser.user_metadata?.avatar_url} />
        <button
          onClick={() => setOpen(true)}
          className="flex-1 text-left text-[13px] px-4 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink-sub hover:border-accent/60 transition-colors"
        >
          Share your story, post a job, ask a question...
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-paper-rule pt-4">
          {/* Post type */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map((t) => (
              <button key={t.value} onClick={() => setPostType(t.value)}
                className={`font-mono text-[10px] tracking-[0.1em] uppercase px-3 py-1 border transition-colors ${postType === t.value ? 'bg-paper-ink text-paper-bg border-paper-ink' : 'border-paper-rule text-paper-ink-sub hover:border-accent/50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 bg-paper-bg border border-paper-rule text-paper-ink placeholder:text-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full px-3 py-2 bg-paper-bg border border-paper-rule text-paper-ink placeholder:text-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors resize-none"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated): visa, canada, tech..."
            className="w-full px-3 py-2 bg-paper-bg border border-paper-rule text-paper-ink placeholder:text-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors"
          />
          <div className="flex gap-2 justify-end">
            <Btn variant="secondary" as="button" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" as="button" onClick={submit} disabled={!content.trim() || submitting}>
              {submitting ? 'Posting...' : 'Post'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  useScrollReveal();
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PER_PAGE = 20;

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const hero = HERO_COPY.community;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['STORIES + JOBS + QUESTIONS', 'NO RECRUITERS, NO PITCHES', 'LIKES, COMMENTS, FOLLOWS']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Main feed */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Create post */}
              <CreatePost currentUser={user} onPost={handlePost} onSignIn={() => setShowAuth(true)} />

              {/* Post feed */}
              {loading && posts.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-paper-rule bg-paper-bg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-paper-rule animate-pulse" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-1/4 bg-paper-rule animate-pulse" />
                          <div className="h-2.5 w-1/3 bg-paper-rule animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-paper-rule animate-pulse" />
                        <div className="h-3 w-3/4 bg-paper-rule animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="border border-paper-rule bg-paper-bg-alt p-12 text-center">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// NO POSTS YET</div>
                  <p className="font-display text-[24px] leading-[1.15] text-paper-ink">Be the first to share your story.</p>
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={user}
                      likedIds={likedIds}
                      onLike={handleLike}
                      onSignIn={() => setShowAuth(true)}
                    />
                  ))}
                  {hasMore && (
                    <div className="text-center pt-2">
                      <Btn variant="secondary" as="button" onClick={loadMore} disabled={loading}>
                        {loading ? 'Loading...' : 'Load more'}
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right sidebar */}
            <div className="lg:w-64 flex-shrink-0 space-y-4">
              {/* About */}
              <div className="border border-paper-rule bg-paper-bg p-4">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">// ABOUT</div>
                <h3 className="font-display text-[18px] leading-[1.2] mb-2 text-paper-ink">Community</h3>
                <p className="text-[12px] leading-[1.55] text-paper-ink-dim">
                  Share career stories, job opportunities, visa experiences, and advice for working globally.
                  Connect with people on the same journey.
                </p>
                <div className="mt-3 pt-3 border-t border-paper-rule space-y-1.5">
                  {POST_TYPES.map((t) => (
                    <div key={t.value} className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* User stats */}
              {user && <UserStats user={user} />}
              {!user && (
                <div className="border border-paper-rule bg-paper-bg-alt p-4 text-center">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// JOIN</div>
                  <p className="font-display text-[18px] leading-[1.2] mb-3 text-paper-ink">Join the community.</p>
                  <p className="text-[12px] mb-3 text-paper-ink-dim">Sign in to post, comment, like, and follow others.</p>
                  <Btn variant="primary" as="button" onClick={() => setShowAuth(true)} className="w-full justify-center">
                    Sign in / Sign up
                  </Btn>
                </div>
              )}
            </div>
          </div>

          <Footnote>{FOOTNOTES.community}</Footnote>
        </div>
      </main>
    </div>
  );
}

function UserStats({ user }) {
  const [stats, setStats] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!user) return;
    fetch(`/api/community/follows?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => setStats({ followers: d.followers || 0, following: d.following || 0 }));
  }, [user]);

  return (
    <div className="border border-paper-rule bg-paper-bg p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar name={user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]} avatar={user.user_metadata?.avatar_url} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-paper-ink truncate">{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}</p>
          <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub truncate">{user.email}</p>
        </div>
      </div>
      <div className="flex gap-6 pt-3 border-t border-paper-rule">
        <div>
          <p className="font-display text-[20px] leading-none text-paper-ink">{stats.followers}</p>
          <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">FOLLOWERS</p>
        </div>
        <div>
          <p className="font-display text-[20px] leading-none text-paper-ink">{stats.following}</p>
          <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">FOLLOWING</p>
        </div>
      </div>
    </div>
  );
}
