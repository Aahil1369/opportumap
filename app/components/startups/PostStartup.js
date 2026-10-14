'use client';

// "Post a startup": one form in a kit Dialog (focus trap, Esc, focus back to the opener). The
// draft lives in the hangar (draft / setDraft), so closing the dialog by accident — Esc, a tap
// on the backdrop — keeps what was typed. Inputs are 16px with real labels. Stage and sector
// are radio chips. The pitch deck (optional PDF, under 10 MB) uploads when picked and never
// overwrites (upsert: false). The body is postPayload(draft): the server takes the owner from
// the session, the database sets the founder's name and the counters.

import { useState } from 'react';
import Dialog from '../kit/Dialog';
import { fetchJson } from '../../../lib/fetchJson.js';
import { SECTORS, STAGES, postPayload } from '../../../lib/departures/hangar.js';
import { STARTUP_LIMITS } from '../../../lib/startups.js';

const DECK_MAX_BYTES = 10 * 1024 * 1024;

export default function PostStartup({ open, onClose, onPosted, draft, setDraft, returnFocusRef }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deck, setDeck] = useState({ state: draft.pitch_deck_url ? 'done' : 'idle', message: '' });

  const field = (key) => ({
    value: draft[key],
    onChange: (e) => setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  const uploadDeck = async (file) => {
    if (!file) return;
    setError('');
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setDeck({ state: 'error', message: 'The pitch deck must be a PDF.' });
      return;
    }
    if (file.size > DECK_MAX_BYTES) {
      setDeck({ state: 'error', message: 'The pitch deck must be under 10 MB.' });
      return;
    }
    setDeck({ state: 'uploading', message: '' });
    try {
      const { createClient } = await import('../../../lib/supabase-browser');
      const supabase = createClient();
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
      // upsert:false: never overwrite an existing object (there is no UPDATE policy on storage).
      const { data, error: uploadError } = await supabase.storage
        .from('pitch-decks')
        .upload(`${Date.now()}-${safeName}`, file, { upsert: false, contentType: 'application/pdf' });
      if (uploadError || !data) throw uploadError || new Error('Upload failed');
      const {
        data: { publicUrl },
      } = supabase.storage.from('pitch-decks').getPublicUrl(data.path);
      setDraft((d) => ({ ...d, pitch_deck_url: publicUrl, deck_name: file.name }));
      setDeck({ state: 'done', message: '' });
    } catch (err) {
      setDraft((d) => ({ ...d, pitch_deck_url: '', deck_name: '' }));
      setDeck({
        state: 'error',
        message: `The pitch deck didn't upload${err?.message ? ` (${err.message})` : ''}. You can post without it or try again.`,
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy || deck.state === 'uploading') return;
    setBusy(true);
    setError('');
    try {
      const data = await fetchJson('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload(draft)),
      });
      if (!data?.startup) throw new Error('Could not post your startup. Please try again.');
      setDeck({ state: 'idle', message: '' });
      onPosted(data.startup);
    } catch (err) {
      setError(
        err?.status === 401
          ? 'Your session ended. Sign in again to post your startup.'
          : err?.message || 'Could not post your startup. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="hg-post-title" returnFocusRef={returnFocusRef} className="hg-post">
      <form className="hg-post-form" onSubmit={submit}>
        <header className="hg-post-head">
          <div>
            <p className="hg-kicker">E · HANGAR · NEW STAND</p>
            <h2 id="hg-post-title" className="hg-post-title">
              Post your startup
            </h2>
          </div>
          <button type="button" className="hg-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="hg-post-body">
          <div className="hg-field">
            <label htmlFor="hg-name" className="hg-label">Startup name</label>
            <input id="hg-name" className="hg-input" required maxLength={STARTUP_LIMITS.name} autoComplete="organization" placeholder="e.g. NeuralHire" {...field('name')} />
          </div>
          <div className="hg-field">
            <label htmlFor="hg-tagline" className="hg-label">One-line tagline</label>
            <input id="hg-tagline" className="hg-input" required maxLength={STARTUP_LIMITS.tagline} placeholder="What you do, in one line" {...field('tagline')} />
          </div>
          <div className="hg-field">
            <label htmlFor="hg-description" className="hg-label">What you&apos;re building</label>
            <textarea id="hg-description" className="hg-input hg-textarea" required rows={4} maxLength={STARTUP_LIMITS.description} placeholder="The problem, how you solve it, any traction so far." {...field('description')} />
          </div>

          <fieldset className="hg-fieldset">
            <legend className="hg-label">Stage</legend>
            <div className="hg-radios">
              {STAGES.map((s, i) => (
                <label key={s.value} className="hg-radio">
                  <input type="radio" name="hg-stage" value={s.value} required={i === 0} checked={draft.stage === s.value} onChange={() => setDraft((d) => ({ ...d, stage: s.value }))} />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="hg-fieldset">
            <legend className="hg-label">Sector</legend>
            <div className="hg-radios">
              {SECTORS.map((s, i) => (
                <label key={s} className="hg-radio">
                  <input type="radio" name="hg-sector" value={s} required={i === 0} checked={draft.sector === s} onChange={() => setDraft((d) => ({ ...d, sector: s }))} />
                  <span>{s.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="hg-grid2">
            <div className="hg-field">
              <label htmlFor="hg-raise" className="hg-label">Raising (USD)</label>
              <input id="hg-raise" className="hg-input" type="number" inputMode="numeric" min="0" step="1000" placeholder="500000" {...field('raise_amount')} />
            </div>
            <div className="hg-field">
              <label htmlFor="hg-equity" className="hg-label">Equity offered (%)</label>
              <input id="hg-equity" className="hg-input" type="number" inputMode="decimal" min="0" max="100" step="any" placeholder="10" {...field('equity_offered')} />
            </div>
            <div className="hg-field">
              <label htmlFor="hg-team" className="hg-label">Team size</label>
              <input id="hg-team" className="hg-input" type="number" inputMode="numeric" min="1" step="1" placeholder="3" {...field('team_size')} />
            </div>
            <div className="hg-field">
              <label htmlFor="hg-location" className="hg-label">Based in</label>
              <input id="hg-location" className="hg-input" maxLength={STARTUP_LIMITS.location} placeholder="Toronto, Canada" autoComplete="address-level2" {...field('location')} />
            </div>
          </div>
          <div className="hg-field">
            <label htmlFor="hg-website" className="hg-label">Website</label>
            <input id="hg-website" className="hg-input" type="url" inputMode="url" placeholder="https://yourstartup.com" {...field('website')} />
          </div>
          <div className="hg-field">
            <label htmlFor="hg-deck" className="hg-label">Pitch deck (PDF, optional)</label>
            <input
              id="hg-deck"
              className="hg-file"
              type="file"
              accept="application/pdf,.pdf"
              aria-describedby="hg-deck-status"
              onChange={(e) => {
                uploadDeck(e.target.files?.[0]);
                e.target.value = ''; // the same file can be picked again after an error
              }}
            />
            <p id="hg-deck-status" className="hg-deck-status" data-state={deck.state} aria-live="polite">
              {deck.state === 'uploading' && 'Uploading the deck…'}
              {deck.state === 'done' && `✓ ${draft.deck_name || 'Pitch deck'} uploaded. Passengers on standby can open it.`}
              {deck.state === 'error' && deck.message}
              {deck.state === 'idle' && 'Passengers see it once they stand by.'}
            </p>
          </div>
        </div>

        <footer className="hg-post-foot">
          {error && (
            <p role="alert" className="hg-alert">
              {error}
            </p>
          )}
          <div className="hg-post-actions">
            <button type="button" className="hg-btn hg-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="hg-btn hg-btn-sign" aria-disabled={busy || deck.state === 'uploading' ? 'true' : undefined}>
              {busy ? 'Posting…' : 'Post to the hangar →'}
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
