'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase-browser';

function timeStr(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StartupChat({ startupId, receiverId, currentUser }) {
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-[12px] text-center mt-8 text-paper-ink-sub">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold ${
                isMine ? 'bg-paper-ink text-paper-bg' : 'bg-paper-bg-alt border border-paper-rule text-paper-ink-sub'
              }`}>
                {isMine ? 'Y' : 'F'}
              </div>
              <div className={`max-w-xs rounded px-3 py-2 ${isMine
                ? 'bg-paper-ink text-paper-bg'
                : 'bg-paper-bg-alt border border-paper-rule text-paper-ink'
              }`}>
                <p className="text-[13px] leading-relaxed">{msg.content}</p>
                <p className={`font-mono text-[10px] mt-1 ${isMine ? 'text-paper-bg/60' : 'text-paper-ink-sub'}`}>
                  {timeStr(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-paper-rule">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 px-3 py-2 bg-paper-bg border border-paper-rule text-paper-ink text-[13px] outline-none focus:border-accent resize-none placeholder:text-paper-ink-sub"
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="px-4 py-2 bg-paper-ink text-paper-bg text-[13px] font-medium font-sans transition-colors duration-160 hover:bg-[#2a3a2f] disabled:opacity-40">
            ↑
          </button>
        </div>
        <p className="font-mono text-[10px] mt-1.5 text-paper-ink-sub">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
