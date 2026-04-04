'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import StartupChat from '../components/StartupChat';
import { useTheme } from '../hooks/useTheme';
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
  const { dark, toggleDark } = useTheme();
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

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';

  if (!user) return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-3xl">🔒</p>
        <p className={`text-sm ${text}`}>Sign in to view messages</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <h1 className={`text-2xl font-black tracking-tight mb-5 ${text}`}>Messages</h1>
        <div className={`rounded-2xl border overflow-hidden flex ${card}`} style={{ height: '65vh' }}>
          {/* Conversation list */}
          <div className={`w-64 flex-shrink-0 border-r ${divider} flex flex-col`}>
            <div className={`px-4 py-3 border-b ${divider}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${sub}`}>Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loading && conversations.length === 0 && (
                <p className={`text-xs text-center py-8 px-4 ${sub}`}>No messages yet. Find a startup and say hello!</p>
              )}
              {conversations.map((conv) => {
                const isActive = active?.startup_id === conv.startup_id && active?.other_user_id === conv.other_user_id;
                return (
                  <button key={`${conv.startup_id}::${conv.other_user_id}`}
                    onClick={() => setActive(conv)}
                    className={`w-full text-left px-4 py-3 border-b transition-all ${divider} ${
                      isActive ? dark ? 'bg-indigo-500/10' : 'bg-indigo-50' : dark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-400' : text}`}>{conv.startup_name}</p>
                      {conv.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${sub}`}>{conv.last_message}</p>
                    <p className={`text-[10px] mt-1 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>{timeAgo(conv.last_at)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {active ? (
              <>
                <div className={`px-5 py-3 border-b ${divider} flex items-center gap-3`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-base ${dark ? 'bg-[#1a1a28]' : 'bg-indigo-50'}`}>🚀</div>
                  <div>
                    <p className={`text-sm font-bold ${text}`}>{active.startup_name}</p>
                    <p className={`text-xs ${sub}`}>Real-time chat</p>
                  </div>
                </div>
                <StartupChat
                  startupId={active.startup_id}
                  receiverId={active.other_user_id}
                  currentUser={user}
                  dark={dark}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-4xl mb-3">💬</p>
                  <p className={`text-sm ${text}`}>Select a conversation</p>
                  <p className={`text-xs mt-1 ${sub}`}>or find a startup to message</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
