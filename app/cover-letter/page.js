'use client';

import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and polished' },
  { id: 'enthusiastic', label: 'Enthusiastic', desc: 'Warm with personality' },
  { id: 'concise', label: 'Concise', desc: 'Short and punchy' },
];

export default function CoverLetterPage() {
  useScrollReveal();
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const fileObjRef = useRef(null);

  const hero = HERO_COPY['cover-letter'];

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
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['PASTE THE JOB DESCRIPTION', 'OPTIONAL RESUME PDF', '3 TONES TO PICK FROM']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 max-w-[760px]">
          {/* Input form */}
          <div className="border border-paper-rule bg-paper-bg-alt p-6 sm:p-8 mb-6">
            <div className="mb-6">
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">JOB DESCRIPTION *</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={8}
                className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink placeholder-paper-ink-sub text-sm outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="mb-6">
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">YOUR RESUME (OPTIONAL — PDF)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border border-dashed border-paper-rule p-4 text-center cursor-pointer transition-colors hover:border-accent"
              >
                {fileName ? (
                  <p className="text-xs font-medium text-paper-ink">{fileName}</p>
                ) : (
                  <p className="text-xs text-paper-ink-sub">Click to upload your resume PDF</p>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              <p className="text-xs mt-1.5 text-paper-ink-sub">If you have a saved profile, it will be used automatically.</p>
            </div>

            <div className="mb-6">
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">TONE</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`px-4 py-2 border text-xs font-medium transition-colors ${
                      tone === t.id
                        ? 'bg-paper-ink text-paper-bg border-paper-ink'
                        : 'border-paper-rule text-paper-ink hover:border-accent'
                    }`}
                  >
                    <span className="block font-semibold">{t.label}</span>
                    <span className="block opacity-70 text-[10px]">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-accent mb-3">{error}</p>}

            <Btn
              as="button"
              variant="primary"
              onClick={generate}
              disabled={loading || !jobDescription.trim()}
              className="w-full justify-center disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-paper-bg border-t-transparent rounded-full animate-spin" />
                  Writing your cover letter...
                </span>
              ) : 'Generate Cover Letter'}
            </Btn>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-5">
              {result.subjectLine && (
                <div className="border border-paper-rule bg-paper-bg-alt p-4">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1">SUGGESTED EMAIL SUBJECT</p>
                  <p className="text-sm font-medium text-paper-ink">{result.subjectLine}</p>
                </div>
              )}

              <div className="border border-paper-rule bg-paper-bg-alt p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-[22px] leading-[1.15] text-paper-ink">Your Cover Letter</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 border border-paper-rule text-xs font-medium text-paper-ink transition-colors hover:border-accent hover:text-accent"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadTxt}
                      className="px-3 py-1.5 border border-paper-rule text-xs font-medium text-paper-ink transition-colors hover:border-accent hover:text-accent"
                    >
                      Download .txt
                    </button>
                  </div>
                </div>
                <div className="whitespace-pre-line font-sans text-[14px] leading-[1.7] text-paper-ink-dim">
                  {result.coverLetter}
                </div>
              </div>

              {result.tailoringNotes?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5 sm:p-6">
                  <h3 className="font-display text-[20px] leading-[1.15] text-paper-ink mb-3">How This Was Tailored</h3>
                  <ul className="space-y-1.5">
                    {result.tailoringNotes.map((note, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-accent text-xs flex-shrink-0 mt-0.5">→</span>
                        <span className="text-xs text-paper-ink-dim">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Btn variant="secondary" as="button" onClick={generate} className="w-full justify-center">
                Regenerate (get a different version)
              </Btn>
            </div>
          )}

          <Footnote>{FOOTNOTES['cover-letter']}</Footnote>
        </div>
      </main>
    </div>
  );
}
