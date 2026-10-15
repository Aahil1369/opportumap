// The salary model behind the board's pay column (spec §7, "AI quota fix"). Rows ask only while
// they are on screen; this queue makes sure that, however many ask, each role and country
// (title|country) is asked once, at most `concurrency` requests are in flight, and every answer
// is kept for the session. A failure (a 429, a 500, a network error, an empty answer) resolves
// null and stays null: the same role is never asked again, so a rate limit cannot turn into a
// retry storm.
//
//   const queue = createPayQueue({ fetcher: (job) => fetchPay(job) });
//   const pay = await queue.request({ title, country, company, location }); // 'C$88K–102K' | null

/** The cache key: one prediction per role and country. */
export const payKey = (job) => `${job?.title ?? ''}|${job?.country ?? ''}`;

const settle = (value) => (value == null || value === '' ? null : value);

/**
 * createPayQueue({ fetcher, concurrency = 3, cache = new Map() }) -> { request(job), size() }
 *   fetcher(job): a pay (any non-empty value) or null; it may throw or reject (-> null).
 *   cache: title|country -> pay | null | Promise of one (a pre-filled Map is honoured).
 *   request(job): Promise<pay | null>, shared by every request for the same key.
 *   size(): how many keys are known (asked, in flight or waiting).
 */
export function createPayQueue({ fetcher, concurrency = 3, cache = new Map() } = {}) {
  const limit = Math.max(1, Math.floor(concurrency) || 1);
  const waiting = []; // [{ job, resolve }] in the order they were asked
  let active = 0;

  function pump() {
    while (active < limit && waiting.length) {
      const { job, resolve } = waiting.shift();
      active += 1;
      let answer;
      try {
        answer = Promise.resolve(fetcher(job));
      } catch {
        answer = Promise.resolve(null);
      }
      answer
        .then(settle, () => null)
        .then((pay) => {
          active -= 1;
          resolve(pay);
          pump();
        });
    }
  }

  return {
    request(job) {
      const key = payKey(job);
      if (cache.has(key)) return Promise.resolve(cache.get(key)).then(settle, () => null);
      const pay = new Promise((resolve) => waiting.push({ job, resolve }));
      cache.set(key, pay);
      pump();
      return pay;
    },
    size: () => cache.size,
  };
}
