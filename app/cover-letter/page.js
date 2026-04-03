'use client';

import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and polished' },
  { id: 'enthusiastic', label: 'Enthusiastic', desc: 'Warm with personality' },
  { id: 'concise', label: 'Concise', desc: 'Short and punchy' },
];

export default function CoverLetterPage() {
  const { dark, toggleDark } = useTheme();
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const fileObjRef = useRef(null);

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#12121e] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    pill: (a) => a ? 'bg-indigo-600 text-white border-indigo-600' : dark ? 'bg-[#12121e] text-zinc-400 border-[#2a2a3e] hover:border-indigo-500/50' : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-300',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFileName(f.name); fileObjRef.current = f; }
  };

  const generate = async () => {
    if (!jobDescription.trim()) { setError('Please paste the job description.'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('jobDescription', jobDescription);
    form.append('tone', tone);
    if (fileObjRef.current) form.append('resume', fileObjRef.current);

    const saved = localStorage.getItem('opportumap_profile');
    if (saved) form.append('profile', saved);

    try {
      const res = await fetch('/api/cover-letter', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Failed to generate cover letter.');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([result.coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover-letter.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/30">✉️</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-0.5">AI Tool</p>
              <h1 className="text-3xl font-black gradient-text">Cover Letter Generator</h1>
            </div>
          </div>
          <p className={`text-sm max-w-lg ${ui.sub}`}>
            Paste a job description, optionally upload your resume, and get a tailored cover letter that actually gets read.
          </p>
        </div>

        {/* Input form */}
        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          <div className="mb-5">
            <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`}
            />
          </div>

          <div className="mb-5">
            <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Your Resume (optional — PDF)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${dark ? 'border-[#2a2a3e] hover:border-indigo-500/50' : 'border-zinc-200 hover:border-indigo-300'}`}
            >
              {fileName ? (
                <p className={`text-xs font-medium ${ui.text}`}>📄 {fileName}</p>
              ) : (
                <p className={`text-xs ${ui.sub}`}>Click to upload your resume PDF</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <p className={`text-xs mt-1.5 ${ui.sub}`}>If you have a saved profile, it will be used automatically.</p>
          </div>

          <div className="mb-5">
            <label className={`text-xs font-medium block mb-2 ${ui.sub}`}>Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium transition-all ${ui.pill(tone === t.id)}`}
                >
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block opacity-70 text-[10px]">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          <button
            onClick={generate}
            disabled={loading || !jobDescription.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Writing your cover letter...
              </span>
            ) : 'Generate Cover Letter'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-5">
            {result.subjectLine && (
              <div className={`rounded-2xl border p-4 ${ui.card}`}>
                <p className={`text-xs font-semibold mb-1 ${ui.sub}`}>Suggested Email Subject</p>
                <p className={`text-sm font-medium ${ui.text}`}>{result.subjectLine}</p>
              </div>
            )}

            <div className={`rounded-2xl border p-6 ${ui.card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${ui.text}`}>Your Cover Letter</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dark ? 'bg-[#1a1a2e] text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-400' : 'bg-zinc-100 text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadTxt}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dark ? 'bg-[#1a1a2e] text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-400' : 'bg-zinc-100 text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    Download .txt
                  </button>
                </div>
              </div>
              <div className={`whitespace-pre-line text-sm leading-relaxed ${ui.sub}`}>
                {result.coverLetter}
              </div>
            </div>

            {result.tailoringNotes?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>How This Was Tailored</h3>
                <ul className="space-y-1.5">
                  {result.tailoringNotes.map((note, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-indigo-400 text-xs flex-shrink-0 mt-0.5">→</span>
                      <span className={`text-xs ${ui.sub}`}>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={generate}
              className={`w-full py-3 rounded-xl border text-sm font-semibold transition-all ${dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400' : 'border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              Regenerate (get a different version)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
