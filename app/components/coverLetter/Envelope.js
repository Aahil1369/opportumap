// The PAR AVION envelope the letter folds into (art only: aria-hidden; the page says in text what
// happened). Its final state is the sealed envelope, front up: airmail stripes, the PAR AVION
// label, the address, the stamp and the postmark. That is what renders when `play` is false, and
// under reduced motion, where the CSS never animates.
//
// With `play`, it plays once (coverLetter.css, transform and opacity only):
//   the sheet folds in thirds (bottom up, then top down: each fold a scaleY on the panel and on
//   its back), the envelope rises in under it, the folded sheet slides into the pocket, the flap
//   closes, the envelope turns over (scaleX), and the stamp and the postmark land.
// `onDone` runs when the postmark has landed.
//
//   <Envelope play subject="Application: Software Engineer" from="Ada" date="14 OCT 26" onDone={…} />

export default function Envelope({ play = false, subject, from, date, onDone }) {
  const onAnimationEnd = (e) => {
    if (e.animationName === 'env-mark') onDone?.();
  };
  return (
    <div className="env" data-play={play ? '' : undefined} onAnimationEnd={onAnimationEnd} aria-hidden="true">
      {/* The back, while the letter goes in. Each part of the case rises on its own wrapper so the
          sheet can pass between the open flap (behind it) and the pocket (in front of it). */}
      <div className="env-back">
        <div className="env-rise">
          <span className="env-flap-open" />
        </div>
        <div className="env-sheet">
          <span className="env-p env-p-top" />
          <span className="env-p env-p-mid" />
          <span className="env-p env-p-bot" />
          <span className="env-p-back env-p-bot-back" />
          <span className="env-p-back env-p-top-back" />
        </div>
        <div className="env-rise">
          <span className="env-pocket" />
        </div>
        <div className="env-rise">
          <span className="env-flap-shut">
            <span className="env-wax">F</span>
          </span>
        </div>
      </div>

      {/* The front: what stays on the desk. */}
      <div className="env-front">
        <span className="env-label">
          <b>PAR AVION</b>
          <small>BY AIRMAIL</small>
        </span>
        <span className="env-stamp">
          <b>F</b>
          <small>AIRMAIL</small>
        </span>
        <span className="env-mark">
          <small>OPPORTUMAP</small>
          <b>{date}</b>
        </span>
        <span className="env-addr">
          <small>TO</small>
          <b>THE HIRING TEAM</b>
          {subject && <span className="env-re">RE: {subject}</span>}
          {from && <span className="env-from">FROM {from}</span>}
        </span>
      </div>
    </div>
  );
}
