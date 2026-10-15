'use client';

// The departure lounge (/community): the composer, the feed and the side panel.
// - Feed: GET /api/community/posts, 20 at a time ("Load more" appends without repeats).
//   Loading is a still skeleton; a failed load says so with a retry (never an empty lounge);
//   an empty lounge is the main screen ("The lounge is quiet — be the first…").
// - Likes and follows ask the API for a state (liked: true/false, following: true/false), not
//   a toggle, so a double tap or a stale button never undoes what the member meant. They are
//   shown at once and put back, with a message, if the API says no.
// - Visitors: every action opens sign-in (useSignIn), nothing is disabled or silently ignored.
// - Route chips: the member's own route (their job profile) on their own posts and composer.
//   Other members' profiles are private, so their posts carry none.
// Signature moment: the first time the lounge fills, the first posts' type words (STORY,
// QUESTION …) clack onto their tiles once; an empty lounge's board line does the same.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchJson } from '../../../lib/fetchJson.js';
import { createLatest } from '../../../lib/departures/createLatest.js';
import { POST_TYPES, mergePosts, prependPost } from '../../../lib/departures/lounge.js';
import { displayName } from '../../../lib/displayName.js';
import SignatureMoment from '../kit/SignatureMoment';
import FlapText from '../kit/FlapText';
import { useSession } from './useSession';
import { useOwnRoute } from './useOwnRoute';
import { useSignIn } from './SignIn';
import Composer from './Composer';
import PostCard from './PostCard';
import Avatar from './Avatar';
import RouteChip from './RouteChip';

const PER_PAGE = 20;
const FLAP_POSTS = 6; // posts whose type word clacks in on the first fill
const TIMEOUT_MS = 15000;
const NONE = new Set();

const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};

const postJson = (url, body) =>
  fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...withTimeout() });

const failText = (err, what) =>
  err?.status === 401 ? `Your session ended. Sign in again to ${what}.` : "That didn't save. Check your connection and try again.";

function Seats() {
  return (
    <svg className="lg-seats" viewBox="0 0 320 96" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${14 + i * 76} 8)`} className={i === 1 ? 'lg-seat lg-seat-you' : 'lg-seat'}>
          <rect x="6" y="0" width="52" height="34" rx="9" />
          <rect x="0" y="30" width="64" height="18" rx="6" />
          <path d="M9 48v16M55 48v16" />
        </g>
      ))}
      <text x="122" y="92" textAnchor="middle" className="lg-seat-tag">
        YOURS?
      </text>
    </svg>
  );
}

function Skeleton() {
  return (
    <div className="lg-skel-list">
      <p className="sr-only" role="status">
        Loading the lounge…
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="lg-card lg-skel-card" aria-hidden="true">
          <div className="lg-card-head">
            <span className="lg-skel lg-skel-av" />
            <span className="lg-skel lg-skel-line" style={{ width: '38%' }} />
          </div>
          <span className="lg-skel lg-skel-line" />
          <span className="lg-skel lg-skel-line" style={{ width: '72%' }} />
        </div>
      ))}
    </div>
  );
}

function MyBadge({ user, ownRoute }) {
  const [counts, setCounts] = useState(null); // { followers, following } | { error }
  const userId = user.id;
  useEffect(() => {
    let live = true;
    fetchJson(`/api/community/follows?userId=${userId}`, withTimeout())
      .then((d) => live && setCounts({ id: userId, followers: d.followers || 0, following: d.following || 0 }))
      .catch(() => live && setCounts({ id: userId, error: true }));
    return () => {
      live = false;
    };
  }, [userId]);
  const mine = counts?.id === userId ? counts : null;
  const name = displayName(user);
  return (
    <section className="lg-panel lg-mine" aria-labelledby="lg-mine-h">
      <h2 className="lg-panel-h" id="lg-mine-h">
        Your crew badge
      </h2>
      <div className="lg-mine-who">
        <Avatar name={name} src={user.user_metadata?.avatar_url} />
        <div className="lg-mine-t">
          <p className="lg-mine-name">{name}</p>
          {ownRoute ? <RouteChip ends={ownRoute} /> : <p className="lg-mine-sub">No route on your badge yet</p>}
        </div>
      </div>
      {mine?.error ? (
        <p className="lg-note">Your follower counts didn&apos;t load.</p>
      ) : (
        <dl className="lg-mine-stats">
          <div>
            <dt>Followers</dt>
            <dd>{mine ? mine.followers : '—'}</dd>
          </div>
          <div>
            <dt>Following</dt>
            <dd>{mine ? mine.following : '—'}</dd>
          </div>
        </dl>
      )}
      <Link className="lg-link lg-mine-link" href="/profile">
        Open your crew badge →
      </Link>
    </section>
  );
}

export default function Lounge() {
  const session = useSession();
  const user = session.status === 'in' ? session.user : null;
  const userId = user?.id ?? null;
  const own = useOwnRoute(userId);

  const [posts, setPosts] = useState(null); // null while the first page loads
  const [loadError, setLoadError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [more, setMore] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [liked, setLiked] = useState({ userId: null, ids: NONE });
  const [follows, setFollows] = useState({ userId: null, map: new Map() });
  const [busyFollow, setBusyFollow] = useState(() => new Set());
  const [errors, setErrors] = useState({}); // postId -> message
  // After signing in (from a prompt or a "session ended" alert) the old messages are stale.
  const [openSignIn, signInModal] = useSignIn(() => setErrors({}));
  const [notice, setNotice] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [latest] = useState(createLatest);
  const likeBusy = useRef(new Set());
  const followAsked = useRef(new Set());

  const likedIds = liked.userId === userId ? liked.ids : NONE;
  const followMap = follows.userId === userId ? follows.map : null;

  // ── the feed ──
  const loadPage = useCallback(
    (offset) => {
      const req = latest.next();
      return fetchJson(`/api/community/posts?limit=${PER_PAGE}&offset=${offset}`, withTimeout()).then((d) => {
        if (!latest.isCurrent(req)) return null;
        const page = Array.isArray(d?.posts) ? d.posts : [];
        setHasMore(page.length === PER_PAGE);
        return page;
      });
    },
    [latest],
  );

  const loadFirst = useCallback(() => {
    loadPage(0)
      .then((page) => {
        if (page) setPosts(page);
      })
      .catch(() => setLoadError(true));
  }, [loadPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const retry = () => {
    setLoadError(false);
    setPosts(null);
    loadFirst();
  };

  const loadMore = () => {
    if (more === 'loading' || !posts) return;
    setMore('loading');
    loadPage(posts.length)
      .then((page) => {
        if (page) setPosts((prev) => mergePosts(prev, page));
        setMore('idle');
      })
      .catch(() => setMore('error'));
  };

  // ── the member's likes, and whether they follow each author ──
  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    fetchJson('/api/community/likes', withTimeout())
      .then((d) => live && setLiked({ userId, ids: new Set(d.liked_post_ids || []) }))
      // Unknown likes show as not liked; a tap then asks for liked: true, which is safe.
      .catch(() => live && setLiked({ userId, ids: NONE }));
    return () => {
      live = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !posts?.length) return;
    const asked = followAsked.current;
    const authors = [...new Set(posts.map((p) => p.user_id))].filter((id) => id && id !== userId && !asked.has(`${userId}:${id}`));
    for (const id of authors) {
      asked.add(`${userId}:${id}`);
      fetchJson(`/api/community/follows?userId=${id}`, withTimeout())
        .then((d) => Boolean(d.is_following))
        // Unknown shows "+ Follow"; a tap asks for following: true, which is safe either way.
        .catch(() => null)
        .then((on) =>
          setFollows((f) => {
            const map = new Map(f.userId === userId ? f.map : undefined);
            if (!map.has(id) && on !== null) map.set(id, on);
            return { userId, map };
          }),
        );
    }
  }, [userId, posts]);

  const setError = (postId, message) =>
    setErrors((e) => {
      const next = { ...e };
      if (message) next[postId] = message;
      else delete next[postId];
      return next;
    });

  const like = async (post) => {
    if (!user) return openSignIn();
    if (likeBusy.current.has(post.id)) return;
    likeBusy.current.add(post.id);
    const want = !likedIds.has(post.id);
    const was = Math.max(0, Number(post.like_count) || 0);
    const show = (on, count) => {
      setLiked((l) => {
        const ids = new Set(l.userId === userId ? l.ids : NONE);
        if (on) ids.add(post.id);
        else ids.delete(post.id);
        return { userId, ids };
      });
      setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, like_count: count } : p)));
    };
    const guess = Math.max(0, was + (want ? 1 : -1));
    show(want, guess);
    setError(post.id, '');
    try {
      const d = await postJson('/api/community/likes', { post_id: post.id, liked: want });
      // The count the trigger keeps, read back after the write (the guess if that read failed).
      show(Boolean(d.liked), Number.isFinite(d.like_count) ? d.like_count : guess);
    } catch (err) {
      show(!want, was);
      setError(post.id, failText(err, 'like posts'));
    } finally {
      likeBusy.current.delete(post.id);
    }
  };

  const follow = async (post) => {
    const authorId = post.user_id;
    if (!user) return openSignIn();
    if (busyFollow.has(authorId)) return;
    const was = followMap?.get(authorId) === true;
    const want = !was;
    const show = (on) =>
      setFollows((f) => {
        const map = new Map(f.userId === userId ? f.map : undefined);
        map.set(authorId, on);
        return { userId, map };
      });
    setBusyFollow((s) => new Set(s).add(authorId));
    show(want);
    setError(post.id, '');
    try {
      const d = await postJson('/api/community/follows', { following_id: authorId, following: want });
      show(Boolean(d.following));
    } catch (err) {
      show(was);
      setError(post.id, failText(err, 'follow members'));
    } finally {
      setBusyFollow((s) => {
        const n = new Set(s);
        n.delete(authorId);
        return n;
      });
    }
  };

  const commented = (postId) =>
    setPosts((list) => list.map((p) => (p.id === postId ? { ...p, comment_count: (Number(p.comment_count) || 0) + 1 } : p)));

  const posted = (post) => {
    setPosts((list) => prependPost(list || [], post));
    setNotice('Your post is in the lounge.');
  };

  const empty = posts && posts.length === 0;

  return (
    <div className="lg">
      {signInModal}
      <div className="lg-cols">
        <div className="lg-main">
          <div id="compose" className="lg-compose-slot">
            <Composer
              session={session}
              ownRoute={own.ends}
              open={composeOpen}
              onOpenChange={setComposeOpen}
              onSignIn={openSignIn}
              onPosted={posted}
            />
          </div>
          <p className="lg-notice" role="status" aria-live="polite">
            {notice}
          </p>

          <section className="lg-feed-wrap" aria-labelledby="lg-feed-h">
            <h2 className="lg-cap" id="lg-feed-h">
              Latest in the lounge
            </h2>

            {loadError ? (
              <div className="lg-state" role="alert">
                <p className="lg-state-t">The lounge didn&apos;t load.</p>
                <p className="lg-state-s">Check your connection and try again.</p>
                <button type="button" className="lg-btn lg-btn-ghost" onClick={retry}>
                  Try again
                </button>
              </div>
            ) : posts == null ? (
              <Skeleton />
            ) : empty ? (
              <SignatureMoment className="lg-empty" playWhen="inView">
                {({ play }) => (
                  <>
                    <div className="lg-board" aria-hidden="true">
                      <p className="lg-board-cap">LOUNGE · ANNOUNCEMENTS</p>
                      <FlapText text="QUIET · BE THE FIRST" play={play} />
                    </div>
                    <Seats />
                    <h3 className="lg-empty-t">The lounge is quiet — be the first to share your story.</h3>
                    <p className="lg-empty-s">
                      Stories from people who moved, questions before you go, roles you&apos;ve seen, advice that worked.
                    </p>
                    {user ? (
                      <button type="button" className="lg-btn lg-btn-sign" onClick={() => setComposeOpen(true)}>
                        Write the first post
                      </button>
                    ) : session.status === 'out' ? (
                      <button type="button" className="lg-btn lg-btn-sign" onClick={openSignIn}>
                        Sign in to post
                      </button>
                    ) : null}
                  </>
                )}
              </SignatureMoment>
            ) : (
              <>
                <SignatureMoment as="ul" className="lg-feed">
                  {({ play }) =>
                    posts.map((post, i) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        index={i}
                        play={play && i < FLAP_POSTS}
                        user={user}
                        ownRoute={own.ends}
                        liked={likedIds.has(post.id)}
                        following={followMap?.get(post.user_id)}
                        followBusy={busyFollow.has(post.user_id)}
                        error={errors[post.id]}
                        onLike={() => like(post)}
                        onFollow={() => follow(post)}
                        onSignIn={openSignIn}
                        onCommented={() => commented(post.id)}
                      />
                    ))
                  }
                </SignatureMoment>
                {more === 'error' && (
                  <p className="lg-error lg-more-error" role="alert">
                    More posts didn&apos;t load. Try again.
                  </p>
                )}
                {hasMore && (
                  <div className="lg-more-row">
                    <button type="button" className="lg-btn lg-btn-ghost" onClick={loadMore} aria-disabled={more === 'loading' ? 'true' : undefined}>
                      {more === 'loading' ? 'Loading…' : 'Load more posts'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="lg-side" aria-label="About the lounge">
          <section className="lg-panel" aria-labelledby="lg-about-h">
            <h2 className="lg-panel-h" id="lg-about-h">
              About the lounge
            </h2>
            <p className="lg-panel-p">
              Career stories, roles you&apos;ve seen, visa experiences and advice for working abroad, from people on the same
              route as you.
            </p>
            <ul className="lg-kinds">
              {POST_TYPES.map((t) => (
                <li key={t.value}>{t.word}</li>
              ))}
            </ul>
          </section>
          {user && <MyBadge user={user} ownRoute={own.ends} />}
        </aside>
      </div>
    </div>
  );
}
