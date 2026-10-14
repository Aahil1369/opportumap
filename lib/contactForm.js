// Contact form -> Netlify Forms. On Next 16 + the Netlify plugin v5, Netlify only
// detects forms in static HTML, so the skeleton lives in public/__forms.html and
// the page POSTs there (urlencoded) instead of to the server-rendered page.
export const CONTACT_FORM_NAME = 'contact';
export const CONTACT_ENDPOINT = '/__forms.html';
export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, message: 5000 };

const field = (v, max) => String(v ?? '').slice(0, max);

export function encodeContactForm({ name, email, subject, message, botField } = {}) {
  const params = new URLSearchParams();
  params.set('form-name', CONTACT_FORM_NAME);
  params.set('bot-field', field(botField, 200));
  params.set('name', field(name, CONTACT_LIMITS.name));
  params.set('email', field(email, CONTACT_LIMITS.email));
  params.set('subject', field(subject, CONTACT_LIMITS.subject));
  params.set('message', field(message, CONTACT_LIMITS.message));
  return params.toString();
}

// Resolves on a 2xx from Netlify's form handler; throws otherwise.
export async function submitContactForm(fields, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(CONTACT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeContactForm(fields),
  });
  if (!res || !res.ok) throw new Error(`Form submission failed (${res ? res.status : 'no response'})`);
}
