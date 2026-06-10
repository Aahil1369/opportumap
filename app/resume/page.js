'use client';

import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';

function ScoreRing({ score, size = 120 }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = '#c75d2c';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-paper-rule" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-[28px] leading-none text-accent">{score}</p>
        <p className="font-mono text-[10px] text-paper-ink-sub">/100</p>
      </div>
    </div>
  );
}

function SectionBar({ label, score }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">{label}</span>
        <span className="font-mono text-[11px] font-medium text-paper-ink">{score}</span>
      </div>
      <div className="h-1.5 bg-paper-rule">
        <div className="h-1.5 bg-accent transition-all duration-700" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ResumePage() {
  useScrollReveal();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const analyze = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('resume', file);
      const res = await fetch('/api/resume-grade', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyze(file);
  };

  const hero = HERO_COPY.resume;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['SECTION-BY-SECTION SCORING', 'ATS KEYWORD CHECK', '~15 SECONDS']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 max-w-[820px]">
          {/* Upload zone */}
          {!result && (
            <div
              className={`border border-dashed p-12 text-center cursor-pointer transition-colors mb-6 ${dragOver ? 'border-accent bg-paper-bg-alt' : 'border-paper-rule bg-paper-bg-alt hover:border-accent/60'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => analyze(e.target.files?.[0])} />
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="w-12 h-12 border-2 border-paper-rule rounded-full" />
                    <div className="absolute inset-0 w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">
                    ANALYZING WITH AI…
                  </p>
                  <p className="text-[13px] text-paper-ink-dim">Reading sections, scoring, matching jobs · ~15 seconds</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1">// UPLOAD</div>
                  <div>
                    <p className="font-display text-[24px] leading-[1.15] text-paper-ink">Drop your resume here</p>
                    <p className="text-[13px] text-paper-ink-dim mt-1">or click to browse</p>
                  </div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">PDF ONLY · MAX 10MB</p>
                  <Btn variant="primary" as="button" className="mt-1">Choose file →</Btn>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 border border-accent/40 bg-paper-bg-alt text-[13px] text-paper-ink-dim">
              <span className="font-mono text-[10px] tracking-[0.12em] text-accent mr-2">// ERROR</span>
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-10">
              {/* Re-upload bar */}
              <div className="flex items-center justify-between px-5 py-4 border border-paper-rule bg-paper-bg-alt">
                <div>
                  <p className="text-[13px] font-medium text-paper-ink">{fileName}</p>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-0.5">RESUME ANALYZED</p>
                </div>
                <Btn
                  variant="secondary"
                  as="button"
                  onClick={() => { setResult(null); setFileName(''); setError(''); }}
                >
                  ↑ Upload new resume
                </Btn>
              </div>

              {/* Score card */}
              <div className="border border-paper-rule p-7">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                  <ScoreRing score={result.score} size={130} />
                  <div className="flex-1 text-center sm:text-left">
                    {result.name && <p className="font-display text-[22px] leading-[1.15] text-paper-ink mb-1">{result.name}</p>}
                    <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
                      <span className="font-display text-[40px] leading-none text-accent">{result.grade}</span>
                      <span className="font-mono text-[10px] tracking-[0.1em] uppercase border border-paper-rule px-2.5 py-1 text-paper-ink-dim">
                        {result.score >= 80 ? 'Strong Resume' : result.score >= 60 ? 'Good Resume' : result.score >= 40 ? 'Needs Work' : 'Major Issues'}
                      </span>
                    </div>
                    <p className="text-[14px] leading-[1.55] text-paper-ink-dim">{result.summary}</p>
                  </div>
                </div>

                {/* Section scores */}
                {result.sectionScores && (
                  <div className="mt-6 pt-6 border-t border-paper-rule grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    {Object.entries(result.sectionScores).map(([key, val]) => (
                      <SectionBar key={key} label={key.replace(/_/g, ' ')} score={val} />
                    ))}
                  </div>
                )}
              </div>

              {/* Two-col layout */}
              <div className="grid sm:grid-cols-2 gap-5">
                {/* Strengths */}
                <div className="border border-paper-rule p-6">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// WHAT'S WORKING</div>
                  <ul className="space-y-2.5">
                    {result.strengths?.map((s, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-accent text-[10px] mt-1 flex-shrink-0">●</span>
                        <span className="text-[13px] leading-[1.55] text-paper-ink-dim">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing keywords */}
                {result.keywords_missing?.length > 0 && (
                  <div className="border border-paper-rule p-6">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// MISSING KEYWORDS</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords_missing.map((k, i) => (
                        <span key={i} className="font-mono text-[11px] px-2 py-1 border border-paper-rule text-paper-ink-dim">
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="text-[12px] text-paper-ink-sub mt-4">Add these keywords to improve ATS ranking.</p>
                  </div>
                )}
              </div>

              {/* Improvements */}
              <div className="border border-paper-rule p-6">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// WHAT TO FIX</div>
                <div className="space-y-3">
                  {result.improvements?.map((item, i) => (
                    <div key={i} className="border border-paper-rule p-4">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[9px] tracking-[0.1em] uppercase mt-0.5 px-1.5 py-0.5 border border-paper-rule text-paper-ink-sub shrink-0">
                          {item.priority}
                        </span>
                        <div>
                          <p className="text-[13px] font-medium text-paper-ink">{item.issue}</p>
                          <p className="text-[13px] mt-1 leading-[1.55] text-paper-ink-dim">
                            <span className="font-medium text-paper-ink">Fix: </span>{item.fix}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Flags */}
              {result.redFlags?.length > 0 && (
                <div className="border border-accent/40 p-6">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// RED FLAGS — FIX THESE FIRST</div>
                  <ul className="space-y-2.5">
                    {result.redFlags.map((flag, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-accent text-[12px] flex-shrink-0 mt-0.5">✗</span>
                        <span className="text-[13px] leading-[1.55] text-paper-ink-dim">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clichés Found */}
              {result.clichesFound?.length > 0 && (
                <div className="border border-paper-rule p-6">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// BUZZWORDS &amp; CLICHÉS DETECTED</div>
                  <p className="text-[13px] text-paper-ink-dim mb-4">These phrases are meaningless to recruiters. Replace them with specific achievements and numbers.</p>
                  <div className="flex flex-wrap gap-2">
                    {result.clichesFound.map((c, i) => (
                      <span key={i} className="font-mono text-[11px] px-2 py-1 border border-paper-rule text-paper-ink-sub line-through">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewritten Bullets */}
              {result.rewrittenBullets?.length > 0 && (
                <div className="border border-paper-rule p-6">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1">// BULLET POINT REWRITES</div>
                  <p className="text-[13px] text-paper-ink-dim mb-4 mt-2">Here&apos;s how to rewrite your weakest bullets to actually land interviews.</p>
                  <div className="space-y-4">
                    {result.rewrittenBullets.map((b, i) => (
                      <div key={i} className="border border-paper-rule p-4 bg-paper-bg-alt">
                        <div className="mb-2">
                          <span className="font-mono text-[10px] tracking-[0.1em] text-accent block mb-1">BEFORE</span>
                          <p className="text-[13px] text-paper-ink-sub line-through">{b.original}</p>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub block mb-1">AFTER</span>
                          <p className="text-[13px] text-paper-ink">{b.rewritten}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job matches */}
              <div className="border border-paper-rule p-6">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1">// JOBS YOU QUALIFY FOR</div>
                <p className="text-[13px] text-paper-ink-dim mb-4 mt-2">Based on your resume, here are roles you match well for right now:</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.jobMatches?.map((job, i) => (
                    <div key={i} className="border border-paper-rule p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-medium text-paper-ink">{job.title}</span>
                        <span className="font-mono text-[11px] text-accent">{job.matchScore}%</span>
                      </div>
                      <div className="h-1.5 bg-paper-rule mb-2">
                        <div className="h-1.5 bg-accent" style={{ width: `${job.matchScore}%` }} />
                      </div>
                      <p className="text-[12px] text-paper-ink-dim leading-[1.5]">{job.reason}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-paper-rule">
                  <Btn variant="primary" href="/jobs">Browse matching jobs →</Btn>
                </div>
              </div>
            </div>
          )}

          <Footnote>{FOOTNOTES.resume}</Footnote>
        </div>
      </main>
    </div>
  );
}
