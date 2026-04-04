'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase-browser';

function timeStr(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StartupChat({ startupId, receiverId, currentUser, dark }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Load messages on mount
  useEffect(() => {
    if (!startupId || !receiverId) return;
    fetch(`/api/messages/${startupId}?with=${receiverId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }, [startupId, receiverId]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!startupId || !currentUser) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${startupId}:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'startup_messages',
          filter: `startup_id=eq.${startupId}`,
        },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [startupId, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      startup_id: startupId,
      content: input.trim(),
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startupId, receiverId, content: optimistic.content }),
    });
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const inputCls = dark
    ? 'bg-[#1a1a28] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600'
    : 'bg-zinc-50 border-zinc-300 text-zinc-900';

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className={`text-xs text-center mt-8 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isMine ? 'bg-indigo-600 text-white' : dark ? 'bg-[#2a2a3e] text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                {isMine ? 'Y' : 'F'}
              </div>
              <div className={`max-w-xs rounded-2xl px-3 py-2 ${isMine
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : dark ? 'bg-[#1a1a28] border border-[#2a2a3e] text-zinc-200 rounded-bl-sm' : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-200' : dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {timeStr(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-4 py-3 border-t ${dark ? 'border-[#1e1e2e]' : 'border-zinc-200'}`}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Write a message..."
            rows={1}
            className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${inputCls}`}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
            ↑
          </button>
        </div>
        <p className={`text-[10px] mt-1.5 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
