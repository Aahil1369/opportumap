'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import StartupChat from '../components/StartupChat';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

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

function MessagesInner() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // { startup_id, other_user_id, startup_name }

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => {
        const convs = d.conversations ?? [];
        setConversations(convs);
        // Auto-select from query params (coming from startup page "Message Founder" button)
        const startupId = searchParams.get('startup');
        const withId = searchParams.get('with');
        if (startupId && withId) {
          const existing = convs.find((c) => c.startup_id === startupId && c.other_user_id === withId);
          setActive(existing ?? { startup_id: startupId, other_user_id: withId, startup_name: 'Startup' });
        } else if (convs.length > 0) {
          setActive(convs[0]);
        }
        setLoading(false);
      });
  }, [user, searchParams]);

  if (!user) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">// SIGN IN REQUIRED</div>
        <p className="text-[14px] text-paper-ink-dim">Sign in to view messages</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-8">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-3 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" />
          <span>§ MESSAGES · INBOX</span>
        </div>
        <h1 className="font-display text-[36px] sm:text-[48px] leading-[1.0] text-paper-ink">Your conversations.</h1>
      </section>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-10">
          <div className="border border-paper-rule flex" style={{ height: '65vh' }}>
            {/* Conversation list */}
            <div className="w-64 flex-shrink-0 border-r border-paper-rule flex flex-col">
              <div className="px-4 py-3 border-b border-paper-rule">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-paper-ink-sub">Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex justify-center py-8">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub animate-pulse">LOADING…</div>
                  </div>
                )}
                {!loading && conversations.length === 0 && (
                  <p className="text-[12px] text-center py-8 px-4 text-paper-ink-sub leading-[1.5]">
                    No messages yet. Find a startup and say hello!
                  </p>
                )}
                {conversations.map((conv) => {
                  const isActive = active?.startup_id === conv.startup_id && active?.other_user_id === conv.other_user_id;
                  return (
                    <button key={`${conv.startup_id}::${conv.other_user_id}`}
                      onClick={() => setActive(conv)}
                      className={`w-full text-left px-4 py-3 border-b border-paper-rule border-l-2 transition-colors duration-160 ${
                        isActive ? 'bg-paper-bg-alt border-l-accent' : 'border-l-transparent hover:bg-paper-bg-alt'
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-display text-[15px] truncate ${isActive ? 'text-accent' : 'text-paper-ink'}`}>{conv.startup_name}</p>
                        {conv.unread > 0 && (
                          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center font-mono text-[9px] font-bold bg-accent text-paper-bg">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] truncate mt-0.5 text-paper-ink-dim">{conv.last_message}</p>
                      <p className="font-mono text-[10px] mt-1 text-paper-ink-sub">{timeAgo(conv.last_at)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              {active ? (
                <>
                  <div className="px-5 py-3 border-b border-paper-rule flex items-center gap-3">
                    <div className="w-7 h-7 flex items-center justify-center text-base bg-paper-bg-alt border border-paper-rule">🚀</div>
                    <div>
                      <p className="font-display text-[16px] text-paper-ink">{active.startup_name}</p>
                      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">Real-time chat</p>
                    </div>
                  </div>
                  <StartupChat
                    startupId={active.startup_id}
                    receiverId={active.other_user_id}
                    currentUser={user}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">// NO THREAD SELECTED</div>
                    <p className="text-[14px] text-paper-ink-dim">Select a conversation</p>
                    <p className="text-[12px] mt-1 text-paper-ink-sub">or find a startup to message</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Footnote>{FOOTNOTES.messages}</Footnote>
        </div>
      </main>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
