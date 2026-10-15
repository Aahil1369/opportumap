'use client';

// One post in the lounge: who (avatar, name, verified ✓, their route chip when we have it,
// Follow), the post type as board tiles + when, the title and text, tags, then Like and
// Comments. Visitors' taps on Like / Follow / Comment open sign-in instead of doing nothing.
// The type word is a FlapText: the first posts' words clack in once when the lounge first
// fills (`play`); the rest are simply there. Reduced motion: plain text.

import { useState } from 'react';
import FlapText from '../kit/FlapText';
import { ago, excerpt, postType } from '../../../lib/departures/lounge.js';
import { isVerifiedUserId } from '../../../lib/admin.js';
import Avatar from './Avatar';
import RouteChip from './RouteChip';
import Comments from './Comments';

const EXCERPT = 320;

function Heart({ on }) {
  return (
    <svg className="lg-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 20.3s-7.4-4.5-9.2-9C1.5 8 3.6 4.6 7 4.6c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.5 3.4 4.2 6.7-1.8 4.5-9.2 9-9.2 9z"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Bubble() {
  return (
    <svg className="lg-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 5.5h16v10.5H10l-4.5 3.6V16H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function FollowButton({ user, authorId, following, busy, onFollow, onSignIn }) {
  if (!authorId || user?.id === authorId) return null;
  if (!user) {
    return (
      <button type="button" className="lg-follow" onClick={onSignIn}>
        + Follow
      </button>
    );
  }
  return (
    <button
      type="button"
      className="lg-follow"
      aria-pressed={following === true}
      aria-disabled={busy ? 'true' : undefined}
      onClick={onFollow}
    >
      {following === true ? 'Following ✓' : '+ Follow'}
    </button>
  );
}

export default function PostCard({
  post,
  index,
  play,
  user,
  ownRoute,
  liked,
  following,
  followBusy,
  error,
  onLike,
  onFollow,
  onSignIn,
  onCommented,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [tapped, setTapped] = useState(false); // the heart pops on the member's own tap, not on load
  const type = postType(post.post_type);
  const name = post.user_name || 'Member';
  const mine = Boolean(user && post.user_id === user.id);
  const body = excerpt(post.content, EXCERPT);
  const likes = Math.max(0, Number(post.like_count) || 0);
  const comments = Math.max(0, Number(post.comment_count) || 0);
  const baseId = `post-${post.id}`;
  const tags = Array.isArray(post.tags) ? post.tags.filter((t) => typeof t === 'string' && t.trim()) : [];

  return (
    <li className="lg-post" id={baseId}>
      <article className="lg-card" aria-labelledby={`${baseId}-who`}>
        <header className="lg-card-head">
          <Avatar name={name} src={post.user_avatar} />
          <div className="lg-who">
            <p className="lg-name" id={`${baseId}-who`}>
              <span className="lg-name-t">{name}</span>
              {isVerifiedUserId(post.user_id) && (
                <span className="lg-verified" title="Verified">
                  <span aria-hidden="true">✓</span>
                  <span className="sr-only">Verified</span>
                </span>
              )}
              {mine && <RouteChip ends={ownRoute} />}
            </p>
            <p className="lg-meta">
              <span className="lg-type">
                <span className="sr-only">{`${type.label}, `}</span>
                <span aria-hidden="true">
                  <FlapText text={type.word} play={play} delayMs={index * 140} />
                </span>
              </span>
              <time className="lg-time" dateTime={post.created_at}>
                {ago(post.created_at)}
              </time>
            </p>
          </div>
          <FollowButton
            user={user}
            authorId={post.user_id}
            following={following}
            busy={followBusy}
            onFollow={onFollow}
            onSignIn={onSignIn}
          />
        </header>

        {post.title && <h3 className="lg-title">{post.title}</h3>}
        <p className="lg-text">
          {expanded || !body.cut ? post.content : body.text}
        </p>
        {body.cut && (
          <button type="button" className="lg-link lg-more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {tags.length > 0 && (
          <ul className="lg-tags" aria-label="Tags">
            {tags.map((t) => (
              <li key={t} className="lg-tag">
                #{t}
              </li>
            ))}
          </ul>
        )}

        <footer className="lg-actions">
          {user ? (
            <button
              type="button"
              className="lg-act"
              data-kind="like"
              data-pop={tapped ? '' : undefined}
              aria-pressed={liked}
              onClick={() => {
                setTapped(true);
                onLike();
              }}
            >
              <Heart on={liked} />
              <span>Like</span>
              {likes > 0 && <span className="lg-act-n">{likes}</span>}
            </button>
          ) : (
            <button type="button" className="lg-act" data-kind="like" onClick={onSignIn} aria-label={`Like (sign in)${likes ? `, ${likes}` : ''}`}>
              <Heart on={false} />
              <span>Like</span>
              {likes > 0 && <span className="lg-act-n">{likes}</span>}
            </button>
          )}
          <button
            type="button"
            className="lg-act"
            aria-expanded={showComments}
            aria-controls={`${baseId}-comments`}
            onClick={() => setShowComments((v) => !v)}
          >
            <Bubble />
            <span>{showComments ? 'Hide comments' : 'Comments'}</span>
            {comments > 0 && <span className="lg-act-n">{comments}</span>}
          </button>
        </footer>
        {error && (
          <p className="lg-error" role="alert">
            {error}
            {error.startsWith('Your session ended') && (
              <>
                {' '}
                <button type="button" className="lg-link" onClick={onSignIn}>
                  Sign in
                </button>
              </>
            )}
          </p>
        )}

        {showComments && (
          <Comments id={`${baseId}-comments`} postId={post.id} user={user} onSignIn={onSignIn} onCommented={onCommented} />
        )}
      </article>
    </li>
  );
}
