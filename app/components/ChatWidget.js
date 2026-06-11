'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'What visa do I need for the UK?',
  'How do I find a roommate in Toronto?',
  'Best neighborhoods in Berlin for tech workers?',
  'How long does H-1B take to process?',
];

export default function ChatWidget({ profile }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi${profile?.name ? ` ${profile.name}` : ''}! I'm your OpportuMap AI assistant. Ask me anything about visas, relocation, job searching, or settling in a new country.` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');

    const userMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, profile }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || `Error: ${data.error || 'Unknown error'}` }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">

      {/* Chat panel */}
      {open && (
        <div className="mb-3 w-80 border border-paper-rule bg-paper-bg shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-paper-rule">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink">OpportuMap AI</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-lg leading-none text-paper-ink-sub hover:text-paper-ink transition-colors">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 text-[12px] leading-relaxed ${
                  m.role === 'user' ? 'bg-paper-ink text-paper-bg' : 'border border-paper-rule bg-paper-bg-alt text-paper-ink'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 border border-paper-rule bg-paper-bg-alt text-[12px]">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-paper-ink-sub animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-paper-ink-sub animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-paper-ink-sub animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only on first message) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-[11px] font-mono px-3 py-1.5 border border-paper-rule text-paper-ink-sub hover:bg-paper-bg-alt transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-paper-rule">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 px-3 py-2 border border-paper-rule bg-paper-bg text-paper-ink placeholder-paper-ink-sub text-[12px] outline-none focus:border-accent transition-colors" />
              <button type="submit" disabled={!input.trim() || loading}
                className="px-3 py-2 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] disabled:opacity-40 text-[12px] font-medium transition-colors">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] shadow-lg flex items-center justify-center text-xl transition-colors">
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
