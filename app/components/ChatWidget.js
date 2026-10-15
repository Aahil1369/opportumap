'use client';

// The AI assistant on /jobs: the hall's information desk. A drawer (the kit's Dialog: focus
// trap, Esc, the page behind stays put) where a visitor asks about visas, moving and settling
// in; each question goes to /api/chat with the conversation so far and their profile. The
// conversation stays while the drawer is closed (JobsBoard keeps this mounted once opened).
// Replies are shown as plain text; a failed request says so in the desk's own words.
//
//   <ChatWidget open onClose profile returnFocusRef />

import { useEffect, useRef, useState } from 'react';
import Dialog from './kit/Dialog';
import './desk.css';

const SUGGESTIONS = [
  'What visa do I need for the UK?',
  'How do I find a roommate in Toronto?',
  'Best neighborhoods in Berlin for tech workers?',
  'How long does H-1B take to process?',
];

const UNAVAILABLE = "The desk couldn't answer just now. Try again in a moment.";

/** Reply text as the desk shows it: the model's **bold** markers dropped (it is plain text). */
const plain = (text) => String(text ?? '').replace(/\*\*(.+?)\*\*/g, '$1').trim();

export default function ChatWidget({ open, onClose, profile, returnFocusRef }) {
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content: `Hi${profile?.name ? ` ${profile.name}` : ''}! I'm OpportuMap's AI assistant. Ask me anything about visas, relocation, job searching, or settling in a new country.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const log = useRef(null);

  // Keep the newest message in view, inside the log only (never the page).
  useEffect(() => {
    const el = log.current;
    if (open && el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);
    let reply = UNAVAILABLE;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, profile }),
      });
      const data = res.ok ? await res.json() : null;
      if (typeof data?.reply === 'string' && data.reply.trim()) reply = plain(data.reply);
    } catch {
      // the network failed: the desk says it couldn't answer
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="desk-chat-title"
      placement="right"
      className="desk-chat"
      returnFocusRef={returnFocusRef}
    >
      <header className="desk-head">
        <span className="desk-i" aria-hidden="true">
          i
        </span>
        <h2 id="desk-chat-title" className="desk-title">
          Information · AI desk
        </h2>
        <button type="button" className="desk-x" onClick={onClose} aria-label="Close the AI desk">
          ✕
        </button>
      </header>

      <div ref={log} className="desk-log" role="log" aria-live="polite" aria-label="Conversation">
        {messages.map((m, i) => (
          <p key={i} className={`desk-msg ${m.role === 'user' ? 'desk-user' : 'desk-assistant'}`}>
            {m.content}
          </p>
        ))}
        {loading && (
          <p className="desk-msg desk-assistant">
            <span className="sr-only">The desk is answering…</span>
            <span className="desk-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
        )}
      </div>

      {messages.length === 1 && (
        <div className="desk-sugg" role="group" aria-labelledby="desk-sugg-k">
          <p id="desk-sugg-k" className="desk-sugg-k">
            Try asking
          </p>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="desk-form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="desk-q" className="sr-only">
          Your question
        </label>
        <input
          id="desk-q"
          className="desk-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className="desk-send" disabled={!input.trim() || loading}>
          Send
        </button>
      </form>
    </Dialog>
  );
}
