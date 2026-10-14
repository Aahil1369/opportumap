// fetch + JSON that fails loudly: rejects on network errors, non-2xx responses
// (using the API's { error } message when there is one) and non-JSON bodies, so
// callers can .catch() into an error state instead of spinning forever.
export async function fetchJson(url, init) {
  const res = await fetch(url, init);
  let data = null;
  let parseError = null;
  try {
    data = await res.json();
  } catch (err) {
    parseError = err;
  }
  if (!res.ok) {
    const err = new Error((data && typeof data.error === 'string' && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (parseError) throw new Error('Unexpected response from the server');
  return data;
}
