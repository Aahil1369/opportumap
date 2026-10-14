'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase-browser';
import { fetchJson } from '../../lib/fetchJson.js';
import { isUuid } from '../../lib/uuid.js';
import { acceptIncoming, appendUnique, replaceTemp } from './chatMessages.js';

function timeStr(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// One conversation: this startup, the signed-in user <-> receiverId.
// The parent keys this component by conversation, so state starts fresh per thread.
export default function StartupChat({ startupId, receiverId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sendError, setSendError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const currentUserId = currentUser?.id;

  // Load the thread
  useEffect(() => {
    if (!startupId || !receiverId) return;
    let active = true;
    fetchJson(`/api/messages/${encodeURIComponent(startupId)}?with=${encodeURIComponent(receiverId)}`)
      // History first, then anything that arrived meanwhile (Realtime / pending sends).
      .then((d) => { if (active) setMessages((prev) => prev.reduce(appendUnique, d.messages ?? [])); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [startupId, receiverId]);

  // Realtime: only the other person's messages in this thread. Our own sends
  // come back from the POST, so their echo is ignored (no double messages).
  useEffect(() => {
    if (!isUuid(startupId) || !isUuid(receiverId) || !currentUserId) return;
    const supabase = createClient();
    const ctx = { currentUserId, otherUserId: receiverId, startupId };
    const channel = supabase
      .channel(`chat:${startupId}:${currentUserId}:${receiverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'startup_messages', filter: `startup_id=eq.${startupId}` },
        (payload) => {
          const msg = payload.new;
          if (acceptIncoming(msg, ctx)) setMessages((prev) => appendUnique(prev, msg));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [startupId, receiverId, currentUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending || !currentUserId) return;
    setSending(true);
    setSendError('');
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      pending: true,
      sender_id: currentUserId,
      receiver_id: receiverId,
      startup_id: startupId,
      content,
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      const data = await fetchJson('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId, receiverId, content }),
      });
      setMessages((prev) => replaceTemp(prev, tempId, data.message ?? null));
    } catch (err) {
      setMessages((prev) => replaceTemp(prev, tempId, null));
      setInput((cur) => cur || content);
      setSendError(err?.message && err.status && err.status < 500 ? err.message : 'Could not send — please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {loading && messages.length === 0 && (
          <p className="font-mono text-[10px] tracking-[0.12em] text-center mt-8 text-paper-ink-sub animate-pulse">LOADING…</p>
        )}
        {!loading && loadError && (
          <p role="alert" className="text-[12px] text-center mt-8 text-accent">
            Could not load this conversation. Please refresh.
          </p>
        )}
        {!loading && !loadError && messages.length === 0 && (
          <p className="text-[12px] text-center mt-8 text-paper-ink-sub">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
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
              } ${msg.pending ? 'opacity-60' : ''}`}>
                <p className="text-[13px] leading-relaxed">{msg.content}</p>
                <p className={`font-mono text-[10px] mt-1 ${isMine ? 'text-paper-bg/60' : 'text-paper-ink-sub'}`}>
                  {msg.pending ? 'Sending…' : timeStr(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-paper-rule">
        {sendError && <p role="alert" className="font-mono text-[11px] text-accent mb-2">{sendError}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Write a message..."
            rows={1}
            maxLength={4000}
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
