'use client';

// /profile — the crew room. Signed in: the crew badge, the member's own numbers (followers,
// following, their posts: their own counts only), what they can do next, and their posts in
// the lounge. Signed out: a sign-in prompt (no silent redirect). A failed sign-in check says
// so with a retry (no endless LOADING); every fetch has an error state of its own.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchJson } from '../../../lib/fetchJson.js';
import { createLatest } from '../../../lib/departures/createLatest.js';
import { ago, excerpt, postType, postsLabel } from '../../../lib/departures/lounge.js';
import { useSession } from '../community/useSession';
import { useOwnRoute } from '../community/useOwnRoute';
import { SignInPrompt, useSignIn } from '../community/SignIn';
import CrewBadge from './CrewBadge';

const POSTS_PAGE = 20;
const TIMEOUT_MS = 15000;
const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function BadgeSkeleton({ label }) {
  return (
    <div className="cb-skel-wrap">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="cb cb-skel" aria-hidden="true">
        <div className="cb-card">
          <span className="cb-slot" />
          <div className="cb-band">
            <span>OPPORTUMAP</span>
            <span className="cb-band-r">CREW</span>
          </div>
          <div className="cb-main">
            <span className="lg-skel lg-skel-av lg-skel-av-lg" />
            <span className="lg-skel lg-skel-line" style={{ width: '60%' }} />
          </div>
          <span className="lg-skel lg-skel-line" />
          <span className="lg-skel lg-skel-line" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}

/** A blank badge waiting for its member (signed-out visitors): dashed, no data. */
function VacantBadge() {
  return (
    <div className="cb cb-vacant" aria-hidden="true">
      <div className="cb-card">
        <span className="cb-slot" />
        <div className="cb-band">
          <span>OPPORTUMAP</span>
          <span className="cb-band-r">CREW</span>
        </div>
        <div className="cb-main">
          <span className="lg-av" data-size="lg">
            ?
          </span>
          <div className="cb-id">
            <p className="cb-k">CREW MEMBER</p>
            <p className="cb-name">Your name here</p>
          </div>
        </div>
        <div className="cb-fields">
          <div className="cb-field cb-field-route">
            <span className="cb-k">ROUTE</span>
            <span className="cb-wait">··· → ···</span>
          </div>
        </div>
        <span className="cb-bars" />
      </div>
    </div>
  );
}

function useMemberData(userId) {
  const [counts, setCounts] = useState(null); // { followers, following } | { error }
  const [posts, setPosts] = useState(null); // { list } | { error }
  const [latestCounts] = useState(createLatest);
  const [latestPosts] = useState(createLatest);

  const loadCounts = useCallback(() => {
    const req = latestCounts.next();
    fetchJson(`/api/community/follows?userId=${userId}`, withTimeout())
      .then((d) => latestCounts.isCurrent(req) && setCounts({ followers: d.followers || 0, following: d.following || 0 }))
      .catch(() => latestCounts.isCurrent(req) && setCounts({ error: true }));
  }, [latestCounts, userId]);

  const loadPosts = useCallback(() => {
    const req = latestPosts.next();
    fetchJson(`/api/community/posts?userId=${userId}&limit=${POSTS_PAGE}`, withTimeout())
      .then((d) => {
        if (!latestPosts.isCurrent(req)) return;
        const list = (Array.isArray(d?.posts) ? d.posts : []).filter((p) => p.user_id === userId);
        setPosts({ list, more: list.length === POSTS_PAGE });
      })
      .catch(() => latestPosts.isCurrent(req) && setPosts({ error: true }));
  }, [latestPosts, userId]);

  useEffect(() => {
    loadCounts();
    loadPosts();
  }, [loadCounts, loadPosts]);

  return {
    counts,
    posts,
    retryCounts: () => {
      setCounts(null);
      loadCounts();
    },
    retryPosts: () => {
      setPosts(null);
      loadPosts();
    },
  };
}

function Stat({ label, value }) {
  return (
    <div className="cb-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CrewRoom({ user }) {
  const route = useOwnRoute(user.id);
  const { counts, posts, retryCounts, retryPosts } = useMemberData(user.id);
  const provider = user.app_metadata?.provider === 'google' ? 'Google' : 'Email and password';
  const postCount = posts?.list ? postsLabel(posts.list.length, posts.more) : '—';

  return (
    <div className="cb-room">
      <div className="cb-top">
        <CrewBadge user={user} route={route} />

        <div className="cb-side">
          <section className="lg-panel" aria-labelledby="cb-numbers-h">
            <h2 className="lg-panel-h" id="cb-numbers-h">
              Your numbers
            </h2>
            <dl className="cb-stats">
              <Stat label="Followers" value={counts && !counts.error ? counts.followers : '—'} />
              <Stat label="Following" value={counts && !counts.error ? counts.following : '—'} />
              <Stat label="Posts" value={posts?.error ? '—' : postCount} />
            </dl>
            {counts?.error && (
              <p className="lg-inline-alert" role="alert">
                <span>Your follower counts didn&apos;t load.</span>
                <button type="button" className="lg-link" onClick={retryCounts}>
                  Try again
                </button>
              </p>
            )}
          </section>

          {route.ready && !route.ends && !route.failed && (
            <section className="lg-panel" aria-labelledby="cb-route-h">
              <h2 className="lg-panel-h" id="cb-route-h">
                Put a route on your badge
              </h2>
              <p className="lg-panel-p">
                Add where you live and where you want to work to your job profile. Your route then shows on your badge and
                your posts.
              </p>
              <Link className="lg-link" href="/jobs">
                Set it on the jobs board →
              </Link>
            </section>
          )}

          <section className="lg-panel" aria-labelledby="cb-next-h">
            <h2 className="lg-panel-h" id="cb-next-h">
              What next
            </h2>
            <div className="cb-actions">
              <Link className="lg-btn lg-btn-sign" href="/community#compose">
                + New post
              </Link>
              <Link className="lg-btn lg-btn-ghost" href="/jobs">
                Browse jobs
              </Link>
            </div>
            <dl className="cb-account">
              <div>
                <dt>Signed in with</dt>
                <dd>{provider}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <section className="cb-posts" aria-labelledby="cb-posts-h">
        <h2 className="lg-cap" id="cb-posts-h">
          Your posts in the lounge
        </h2>
        {posts?.error ? (
          <div className="lg-state" role="alert">
            <p className="lg-state-t">Your posts didn&apos;t load.</p>
            <button type="button" className="lg-btn lg-btn-ghost" onClick={retryPosts}>
              Try again
            </button>
          </div>
        ) : posts == null ? (
          <p className="lg-note" role="status">
            Loading your posts…
          </p>
        ) : posts.list.length === 0 ? (
          <div className="lg-state">
            <p className="lg-state-t">No posts yet.</p>
            <p className="lg-state-s">Share your story in the lounge: what moving was like, or what you want to ask first.</p>
            <Link className="lg-btn lg-btn-sign" href="/community#compose">
              Go to the lounge
            </Link>
          </div>
        ) : (
          <ul className="cb-post-list">
            {posts.list.map((p) => {
              const likes = Math.max(0, Number(p.like_count) || 0);
              const comments = Math.max(0, Number(p.comment_count) || 0);
              return (
                <li key={p.id} className="lg-card cb-post">
                  <p className="lg-meta">
                    <span className="cb-post-type">{postType(p.post_type).word}</span>
                    <time className="lg-time" dateTime={p.created_at}>
                      {ago(p.created_at)}
                    </time>
                  </p>
                  {p.title && <h3 className="lg-title">{p.title}</h3>}
                  <p className="lg-text cb-post-text">{excerpt(p.content, 220).text}</p>
                  <p className="cb-post-n">
                    {plural(likes, 'like', 'likes')} · {plural(comments, 'comment', 'comments')}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Crew() {
  const session = useSession();
  const [openSignIn, signInModal] = useSignIn();

  let body;
  if (session.status === 'loading') body = <BadgeSkeleton label="Checking your sign-in…" />;
  else if (session.status === 'error') {
    body = (
      <div className="lg-state" role="alert">
        <p className="lg-state-t">We couldn&apos;t check your sign-in.</p>
        <p className="lg-state-s">Check your connection and try again.</p>
        <button type="button" className="lg-btn lg-btn-ghost" onClick={session.retry}>
          Try again
        </button>
      </div>
    );
  } else if (!session.user) {
    body = (
      <div className="cb-top cb-out">
        <VacantBadge />
        <SignInPrompt
          id="cb-signin-h"
          title="Sign in to see your crew badge"
          button="Sign in"
          onSignIn={openSignIn}
          extra={
            <Link className="lg-btn lg-btn-ghost" href="/community">
              Browse the lounge
            </Link>
          }
        >
          Your badge carries your name, your route and your posts in the lounge.
        </SignInPrompt>
      </div>
    );
  } else body = <CrewRoom key={session.user.id} user={session.user} />;

  return (
    <div className="lg cb-page">
      {signInModal}
      {body}
    </div>
  );
}
