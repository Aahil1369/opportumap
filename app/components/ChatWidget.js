'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'What visa do I need for the UK?',
  'How do I find a roommate in Toronto?',
  'Best neighborhoods in Berlin for tech workers?',
  'How long does H-1B take to process?',
];

export default function ChatWidget({ dark, profile }) {
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

  const ui = {
    bg: dark ? 'bg-[#1a1a1d]' : 'bg-white',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900',
    userBubble: 'bg-indigo-600 text-white',
    aiBubble: dark ? 'bg-[#2a2a2e] text-zinc-100' : 'bg-zinc-100 text-zinc-900',
    suggestion: dark ? 'bg-[#2a2a2e] text-zinc-400 hover:bg-[#333] border-[#3a3a3e]' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border-zinc-200',
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">

      {/* Chat panel */}
      {open && (
        <div className={`mb-3 w-80 rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${ui.bg} ${ui.border}`}
          style={{ height: '480px' }}>

          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${ui.border}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className={`text-sm font-semibold ${ui.text}`}>OpportuMap AI</span>
            </div>
            <button onClick={() => setOpen(false)} className={`text-lg leading-none ${ui.sub}`}>✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? ui.userBubble : ui.aiBubble}`}
                  style={{ borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className={`px-3 py-2 rounded-2xl text-xs ${ui.aiBubble}`}>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
                  className={`text-left text-xs px-3 py-1.5 rounded-xl border transition-all ${ui.suggestion}`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className={`px-4 pb-4 pt-2 border-t ${ui.border}`}>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              <button type="submit" disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg flex items-center justify-center text-white text-xl transition-all hover:scale-105">
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
