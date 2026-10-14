import { safeHttpUrl } from '../../lib/safeUrl.js';

// Map popup content built from DOM nodes. Job fields come from third-party feeds,
// so they only ever go in as text (textContent / append(string)); a link is
// added only for an absolute http(s) URL. Class names match globals.css.
function node(doc, tag, className, text) {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (text !== null && text !== undefined) el.textContent = String(text);
  return el;
}

export function buildJobPopup(doc, job, { nationality, emoji = '', label = '', score = 0 } = {}) {
  const root = node(doc, 'div', 'popup-inner');
  root.append(
    node(doc, 'p', 'popup-title', job?.title),
    node(doc, 'p', 'popup-company', job?.company),
    node(doc, 'p', 'popup-location', job?.location),
    node(doc, 'p', 'popup-salary', job?.salary),
  );

  if (nationality) {
    const visa = node(doc, 'p', 'popup-visa');
    visa.append(`${emoji} ${label}`);
    if (score > 0) {
      const match = node(doc, 'span', null, `${score}% match`);
      match.style.color = '#6366f1';
      visa.append(' · ', match);
    }
    root.append(visa);
  }

  const href = safeHttpUrl(job?.url);
  if (href) {
    const link = node(doc, 'a', 'popup-link', 'View job →');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    root.append(link);
  }

  return root;
}
