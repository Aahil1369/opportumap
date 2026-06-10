'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';

function ScoreBadge({ score }) {
  return (
    <span className="font-display text-[40px] leading-none text-accent">
      {score}<span className="font-mono text-[12px] text-paper-ink-sub ml-1">/10</span>
    </span>
  );
}

export default function InterviewPage() {
  useScrollReveal();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('bank');
  const [expandedQ, setExpandedQ] = useState(null);

  const [mockIndex, setMockIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [feedbacks, setFeedbacks] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [mockDone, setMockDone] = useState(false);

  const generateQuestions = async () => {
    if (!jobTitle.trim() || !company.trim()) { setError('Job title and company name are required.'); return; }
    setLoading(true);
    setError('');
    setQuestions([]);
    setFeedbacks({});
    setMockIndex(0);
    setMockDone(false);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, company, jobDescription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions || []);
    } catch (e) {
      setError(e.message || 'Failed to generate questions.');
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    const q = questions[mockIndex];
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, answer: currentAnswer, jobTitle, category: q.category }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFeedbacks((prev) => ({ ...prev, [mockIndex]: data }));
    } catch (e) {
      setError(e.message);
    }
    setFeedbackLoading(false);
  };

  const nextQuestion = () => {
    setCurrentAnswer('');
    if (mockIndex + 1 >= questions.length) {
      setMockDone(true);
    } else {
      setMockIndex(mockIndex + 1);
    }
  };

  const avgScore = Object.values(feedbacks).length > 0
    ? Math.round(Object.values(feedbacks).reduce((s, f) => s + f.score, 0) / Object.values(feedbacks).length * 10) / 10
    : null;

  const hero = HERO_COPY.interview;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['15 TAILORED QUESTIONS', 'AI-SCORED MOCK INTERVIEW', '~30 SECONDS']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 max-w-[820px]">
          {/* Setup form */}
          <div className="border border-paper-rule p-6 mb-8">
            <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// ROLE DETAILS</div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub block mb-1.5">Job Title *</label>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-[14px] text-paper-ink placeholder-paper-ink-sub outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub block mb-1.5">Company *</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google"
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-[14px] text-paper-ink placeholder-paper-ink-sub outline-none focus:border-accent transition-colors" />
              </div>
            </div>
            <div className="mb-4">
              <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub block mb-1.5">Job Description (optional — makes questions more specific)</label>
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={4}
                className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-[14px] text-paper-ink placeholder-paper-ink-sub outline-none focus:border-accent transition-colors resize-none" />
            </div>
            {error && (
              <div className="mb-4 px-4 py-3 border border-accent/40 bg-paper-bg-alt text-[13px] text-paper-ink-dim">
                <span className="font-mono text-[10px] tracking-[0.12em] text-accent mr-2">// ERROR</span>
                {error}
              </div>
            )}
            <Btn
              variant="primary"
              as="button"
              onClick={generateQuestions}
              disabled={loading || !jobTitle.trim() || !company.trim()}
              className="w-full justify-center disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.12em]">
                  <span className="w-3.5 h-3.5 border-2 border-paper-bg border-t-transparent rounded-full animate-spin" />
                  GENERATING QUESTIONS…
                </span>
              ) : 'Generate Interview Questions →'}
            </Btn>
          </div>

          {questions.length > 0 && (
            <div>
              {/* Mode toggle */}
              <div className="flex gap-2 mb-8">
                {['bank', 'mock'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`font-mono text-[10px] tracking-[0.12em] uppercase px-4 py-2 transition-colors ${
                      activeTab === tab
                        ? 'bg-paper-ink text-paper-bg'
                        : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'
                    }`}
                  >
                    {tab === 'bank' ? 'Question Bank' : 'Mock Interview'}
                  </button>
                ))}
              </div>

              {/* Question Bank */}
              {activeTab === 'bank' && (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="border border-paper-rule">
                      <button className="w-full p-4 text-left hover:bg-paper-bg-alt transition-colors" onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-[10px] tracking-[0.1em] uppercase border border-paper-rule px-2 py-0.5 flex-shrink-0 mt-0.5 text-paper-ink-sub">
                            {q.category}
                          </span>
                          <p className="text-[14px] font-medium flex-1 text-left text-paper-ink">{q.question}</p>
                          <span className="font-mono text-[11px] text-paper-ink-sub flex-shrink-0">{expandedQ === i ? '−' : '+'}</span>
                        </div>
                      </button>
                      {expandedQ === i && (
                        <div className="px-4 pb-4 border-t border-paper-rule pt-3 space-y-3">
                          {q.why && (
                            <div>
                              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-accent mb-1">What they&apos;re assessing</p>
                              <p className="text-[13px] leading-[1.55] text-paper-ink-dim">{q.why}</p>
                            </div>
                          )}
                          {q.howToAnswer && (
                            <div>
                              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1">How to answer</p>
                              <p className="text-[13px] leading-[1.55] text-paper-ink-dim">{q.howToAnswer}</p>
                            </div>
                          )}
                          {q.exampleAnswer && (
                            <div>
                              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1">Example strong answer</p>
                              <p className="text-[13px] leading-[1.55] text-paper-ink-dim whitespace-pre-line">{q.exampleAnswer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mock Interview — in progress */}
              {activeTab === 'mock' && !mockDone && (
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5">
                      <span>Question {mockIndex + 1} of {questions.length}</span>
                      <span>{Object.keys(feedbacks).length} answered</span>
                    </div>
                    <div className="h-1.5 bg-paper-rule">
                      <div className="h-1.5 bg-accent transition-all duration-500"
                        style={{ width: `${(mockIndex / questions.length) * 100}%` }} />
                    </div>
                  </div>

                  <div className="border border-paper-rule p-6">
                    <span className="font-mono text-[10px] tracking-[0.1em] uppercase border border-paper-rule px-2 py-0.5 inline-block mb-3 text-paper-ink-sub">
                      {questions[mockIndex]?.category}
                    </span>
                    <p className="font-display text-[22px] leading-[1.2] mb-5 text-paper-ink">{questions[mockIndex]?.question}</p>

                    {!feedbacks[mockIndex] ? (
                      <>
                        <textarea
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          placeholder="Type your answer here — write it as you'd actually say it in an interview..."
                          rows={6}
                          className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-[14px] text-paper-ink placeholder-paper-ink-sub outline-none focus:border-accent transition-colors resize-none mb-4"
                        />
                        <Btn
                          variant="primary"
                          as="button"
                          onClick={submitAnswer}
                          disabled={feedbackLoading || !currentAnswer.trim()}
                          className="w-full justify-center disabled:opacity-40"
                        >
                          {feedbackLoading ? (
                            <span className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.12em]">
                              <span className="w-3.5 h-3.5 border-2 border-paper-bg border-t-transparent rounded-full animate-spin" />
                              EVALUATING…
                            </span>
                          ) : 'Submit Answer for Feedback'}
                        </Btn>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-paper-rule bg-paper-bg-alt">
                          <div>
                            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-0.5">Your Score</p>
                            <ScoreBadge score={feedbacks[mockIndex].score} />
                          </div>
                          <p className="text-[13px] max-w-xs text-right text-paper-ink-dim">{feedbacks[mockIndex].verdict}</p>
                        </div>

                        {feedbacks[mockIndex].whatWorked?.length > 0 && (
                          <div>
                            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5">What worked</p>
                            {feedbacks[mockIndex].whatWorked.map((w, i) => (
                              <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-accent">✓</span>{w}</p>
                            ))}
                          </div>
                        )}

                        {feedbacks[mockIndex].whatToImprove?.length > 0 && (
                          <div>
                            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5">What to improve</p>
                            {feedbacks[mockIndex].whatToImprove.map((w, i) => (
                              <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-accent">→</span>{w}</p>
                            ))}
                          </div>
                        )}

                        {feedbacks[mockIndex].strongerVersion && (
                          <div className="p-4 border border-paper-rule bg-paper-bg-alt">
                            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-accent mb-2">Stronger version of your answer</p>
                            <p className="text-[13px] leading-[1.55] text-paper-ink-dim">{feedbacks[mockIndex].strongerVersion}</p>
                          </div>
                        )}

                        <Btn variant="primary" as="button" onClick={nextQuestion} className="w-full justify-center">
                          {mockIndex + 1 >= questions.length ? 'See Final Results' : 'Next Question →'}
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mock Interview — complete */}
              {activeTab === 'mock' && mockDone && (
                <div className="border border-paper-rule p-8 text-center">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// MOCK INTERVIEW COMPLETE</div>
                  <h2 className="font-display text-[28px] leading-[1.15] mb-2 text-paper-ink">Nice work.</h2>
                  {avgScore !== null && (
                    <p className="text-[14px] mb-6 text-paper-ink-dim">
                      You answered {Object.keys(feedbacks).length} of {questions.length} questions.
                      Average score: <span className="font-display text-[20px] text-accent">{avgScore}/10</span>
                    </p>
                  )}
                  <div className="space-y-3 text-left max-w-lg mx-auto mb-6">
                    {Object.entries(feedbacks).map(([idx, fb]) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-paper-rule bg-paper-bg-alt">
                        <p className="text-[13px] flex-1 mr-3 text-paper-ink-dim">{questions[parseInt(idx)]?.question?.slice(0, 60)}...</p>
                        <ScoreBadge score={fb.score} />
                      </div>
                    ))}
                  </div>
                  <Btn
                    variant="secondary"
                    as="button"
                    onClick={() => { setMockIndex(0); setFeedbacks({}); setMockDone(false); setCurrentAnswer(''); }}
                  >
                    Practice Again
                  </Btn>
                </div>
              )}
            </div>
          )}

          <Footnote>{FOOTNOTES.interview}</Footnote>
        </div>
      </main>
    </div>
  );
}
