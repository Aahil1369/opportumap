// The visitor's profile as /jobs, /map and /saved read it: their account's (signed in), else the
// one kept on this device ("Remember my profile on this device", lib/saveProfile.js), else null.
// One loader for the three pages (JobsBoard, ControlTower, Itinerary). Pure apart from what it is
// handed, and tested (scripts/departures/__tests__/15b-m.test.mjs).
//
//   loadVisitorProfile({ account, storage }) -> Promise<profile | null>, never rejects
//     account: () => the account's profile or null, or a promise of it (the pages pass
//              loadHomeProfile); throwing or rejecting counts as null
//     storage: anything with getItem (left out: localStorage); null: no device copy
//   deviceProfile(storage)      -> the profile kept on this device, or null
//   searchOnArrival(asked, q)   -> the search once the profile lands: the visitor's, else the URL's
//   inputOnArrival(typed, q)    -> the search box once the profile lands: their text, else the URL's

import { PROFILE_KEY } from '../saveProfile.js';

/** A profile is a plain object; anything else (a list, a string, null) is none. */
function asProfile(p) {
  return p && typeof p === 'object' && !Array.isArray(p) ? p : null;
}

/** The profile kept on this device, or null (none, not JSON, not an object, or storage blocked). */
export function deviceProfile(storage) {
  try {
    const store = storage === undefined ? globalThis.localStorage : storage;
    const raw = store ? store.getItem(PROFILE_KEY) : null;
    return raw ? asProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** The account's profile (signed in), else the one kept on this device, else null. */
export async function loadVisitorProfile({ account, storage } = {}) {
  let remote = null;
  try {
    remote = asProfile(typeof account === 'function' ? await account() : null);
  } catch {
    remote = null;
  }
  return remote || deviceProfile(storage);
}

/**
 * The search once the profile lands (a signed-in visitor's can take a moment): a search the
 * visitor already asked for stays; else the URL's ?q= ('' asks for the profile's own search).
 */
export function searchOnArrival(asked, q) {
  return asked ?? { text: q, n: 0 };
}

/** The search box once the profile lands: what the visitor already typed stays; else the URL's ?q=. */
export function inputOnArrival(typed, q) {
  return typed || q;
}
