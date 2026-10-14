// Contact form -> POST /api/contact -> public.submit_contact() (db/contact_messages_inbox.sql)
// -> the admin inbox on /admin. Pure helpers shared by the page, the route and the tests.
// The limits and the email pattern mirror the table's check constraints.
export const CONTACT_ENDPOINT = '/api/contact';
export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, message: 5000 };
// Request body cap (characters of JSON). Generous: escaped emoji can be 12 chars each.
export const CONTACT_MAX_BODY = 64_000;
export const CONTACT_SOURCE = 'opportumap';
export const SEND_FAILED = 'Could not send — please try again.';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const text = (v) => (typeof v === 'string' ? v.trim() : '');

// -> { ok: true, values: { name, email, subject, message } } | { ok: false, error }
export function validateContact(input) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const values = {
    name: text(src.name),
    email: text(src.email),
    subject: text(src.subject),
    message: text(src.message),
  };
  const fail = (error) => ({ ok: false, error });
  if (!values.name) return fail('Please enter your name.');
  if (values.name.length > CONTACT_LIMITS.name) return fail('Your name is too long (100 characters max).');
  if (!values.email) return fail('Please enter a valid email address.');
  if (values.email.length > CONTACT_LIMITS.email) return fail('Your email address is too long (254 characters max).');
  if (!EMAIL_RE.test(values.email)) return fail('Please enter a valid email address.');
  if (values.subject.length > CONTACT_LIMITS.subject) return fail('The subject is too long (150 characters max).');
  if (!values.message) return fail('Please write a message.');
  if (values.message.length > CONTACT_LIMITS.message) return fail('Your message is too long (5,000 characters max).');
  return { ok: true, values };
}

// Map a submit_contact() error (PostgREST error object, thrown Error or string) to
// { status, message } for the visitor. Raw database text is never passed through.
export function contactErrorResponse(err) {
  const raw = typeof err === 'string' ? err : String(err?.message ?? '');
  if (raw.includes('contact-too-many')) {
    return { status: 429, message: "You've sent a few messages already — please try again in an hour." };
  }
  if (raw.includes('contact-busy')) {
    return { status: 503, message: "We're getting a lot of messages — please try again later." };
  }
  const code = typeof err === 'object' && err ? err.code : undefined;
  if (code === '23514' || code === '22001') {
    return { status: 400, message: 'Please check your name, email address and message, then try again.' };
  }
  return { status: 500, message: SEND_FAILED };
}

function honeypotFilled(v) {
  return v !== undefined && v !== null && v !== false && String(v).trim() !== '';
}

// The whole POST /api/contact flow, with the RPC injected so it can be tested
// without Next or a database. `submit(args)` resolves to { error } like
// supabase.rpc(); pass null when the database is not configured.
// Logs only the error code and message (never the visitor's details).
export async function handleContactSubmission(raw, submit, log = console.error) {
  if (typeof raw !== 'string' || !raw) return { status: 400, body: { error: SEND_FAILED } };
  if (raw.length > CONTACT_MAX_BODY) {
    return { status: 413, body: { error: 'Your message is too long (5,000 characters max).' } };
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: SEND_FAILED } };
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { status: 400, body: { error: SEND_FAILED } };
  }

  // Honeypot: only bots fill the hidden "hp_ref" field. Pretend it worked.
  if (honeypotFilled(input.hp_ref)) return { status: 200, body: { ok: true } };

  const check = validateContact(input);
  if (!check.ok) return { status: 400, body: { error: check.error } };
  const { name, email, subject, message } = check.values;

  let error = null;
  if (typeof submit !== 'function') {
    error = new Error('contact database not configured');
  } else {
    try {
      ({ error } = (await submit({
        p_name: name, p_email: email, p_subject: subject, p_message: message, p_source: CONTACT_SOURCE,
      })) ?? {});
    } catch (err) {
      error = err ?? new Error('submit_contact threw');
    }
  }
  if (!error) return { status: 200, body: { ok: true } };

  const mapped = contactErrorResponse(error);
  if (mapped.status === 500 || mapped.status === 400) {
    log('[contact] submit_contact failed', { code: error?.code ?? null, message: String(error?.message ?? error) });
  }
  return { status: mapped.status, body: { error: mapped.message } };
}

// Browser side: POST JSON to /api/contact. Resolves on { ok: true }; otherwise throws
// an Error carrying the API's friendly message, or SEND_FAILED for anything else
// (network failure, non-JSON response, unexpected shape).
export async function submitContact({ name, email, subject, message, hp_ref } = {}, fetchImpl = globalThis.fetch) {
  let res;
  try {
    res = await fetchImpl(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name ?? '', email: email ?? '', subject: subject ?? '', message: message ?? '', hp_ref: hp_ref ?? '',
      }),
    });
  } catch {
    throw new Error(SEND_FAILED);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res && res.ok && data && data.ok === true) return;
  const friendly = data && typeof data.error === 'string' && data.error.length <= 200 ? data.error : '';
  throw new Error(friendly || SEND_FAILED);
}

// mailto: reply link for the admin inbox. The address is percent-encoded (except
// the @) so a crafted address cannot add cc/bcc/body parameters.
export function mailtoHref(email, subject = '') {
  const to = encodeURIComponent(String(email ?? '').trim()).replace(/%40/g, '@');
  const s = String(subject ?? '').trim();
  return `mailto:${to}?subject=${encodeURIComponent(s ? `Re: ${s}` : 'Re: your message')}`;
}
