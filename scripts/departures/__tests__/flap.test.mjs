// The split-flap engine's pure core: which characters change between two board strings
// (only those flip), when each tile starts (left -> right, rows staggered), which characters
// each tile shows on its way (a forward walk through the drum, capped), how a cell is fitted to
// its fixed tile count, and the queue that keeps at most N tiles flipping at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { FLAP_CHARS, flapDiff, flapSchedule, fitFlap, createFlapQueue } = await import(
  new URL('../../../lib/departures/flap.js', import.meta.url)
);

test('FLAP_CHARS is the drum order the tiles cycle through', () => {
  assert.equal(FLAP_CHARS, ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:$€£¥→✓-/.,');
});

test('flapDiff marks only the characters that differ', () => {
  const diff = flapDiff('YYZ', 'YVR');
  assert.equal(diff.length, 3);
  assert.deepEqual(diff.map((d) => d.changed), [false, true, true]);
  assert.deepEqual(diff[1], { index: 1, from: 'Y', to: 'V', changed: true });
});

test('flapDiff pads the shorter string with spaces', () => {
  const grow = flapDiff('AB', 'ABCD');
  assert.equal(grow.length, 4);
  assert.deepEqual(grow.filter((d) => d.changed).map((d) => d.index), [2, 3]);
  assert.equal(grow[2].from, ' ');

  const shrink = flapDiff('ABCD', 'AB');
  assert.equal(shrink.length, 4);
  assert.deepEqual(shrink.filter((d) => d.changed).map((d) => d.to), [' ', ' ']);
});

test('flapDiff of two empty strings is empty', () => {
  assert.deepEqual(flapDiff('', ''), []);
  assert.deepEqual(flapDiff(undefined, null), []);
});

test('flapDiff counts characters, not UTF-16 units', () => {
  assert.equal(flapDiff('', '✓→€').length, 3);
  assert.equal(flapDiff('', '😀A').length, 2);
});

test('flapSchedule keeps only changed cells, left to right with growing delays', () => {
  const plan = flapSchedule(flapDiff('08:40', '09:15'));
  assert.deepEqual(plan.map((p) => p.index), [1, 3, 4]);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].delayMs > plan[i - 1].delayMs);
  const to = '09:15';
  for (const p of plan) {
    assert.ok(p.steps.length >= 1 && p.steps.length <= 6, `steps ${p.steps}`);
    assert.equal(p.steps.at(-1), to[p.index]);
  }
});

test('flapSchedule delay is rowDelayMs + index * stepMs', () => {
  const plan = flapSchedule(flapDiff('', 'AB'), { stepMs: 50, rowDelayMs: 240 });
  assert.deepEqual(plan.map((p) => p.delayMs), [240, 290]);
});

test('flapSchedule of an unchanged string is empty', () => {
  assert.deepEqual(flapSchedule(flapDiff('YYZ', 'YYZ')), []);
});

test('steps walk forward through the drum from the old character', () => {
  const [one] = flapSchedule(flapDiff('8', '9'));
  assert.deepEqual(one.steps, ['9']);
  const [abc] = flapSchedule(flapDiff(' ', 'C'));
  assert.deepEqual(abc.steps, ['A', 'B', 'C']);
  // A long walk keeps only its last maxSteps characters.
  const [wrap] = flapSchedule(flapDiff('4', '1'));
  assert.deepEqual(wrap.steps, ['W', 'X', 'Y', 'Z', '0', '1']);
});

test('lowercase targets walk the same drum in lowercase', () => {
  const [p] = flapSchedule(flapDiff(' ', 'c'));
  assert.deepEqual(p.steps, ['a', 'b', 'c']);
});

test('maxSteps caps every walk', () => {
  const plan = flapSchedule(flapDiff('', 'ZZZ'), { maxSteps: 3 });
  for (const p of plan) {
    assert.ok(p.steps.length <= 3);
    assert.equal(p.steps.at(-1), 'Z');
  }
});

test('unknown characters still end on themselves', () => {
  for (const ch of ['Ō', '–', 'é', '₹', '😀']) {
    const [p] = flapSchedule(flapDiff('A', ch));
    assert.ok(p.steps.length >= 1 && p.steps.length <= 6, `${ch}: ${p.steps}`);
    assert.equal(p.steps.at(-1), ch);
  }
  const [fromUnknown] = flapSchedule(flapDiff('Ō', 'B'));
  assert.equal(fromUnknown.steps.at(-1), 'B');
});

test('a 200-character target never yields more than 200 entries', () => {
  const long = 'Senior Staff Software Engineer, Platform Ōsaka – '.repeat(5).slice(0, 200);
  const plan = flapSchedule(flapDiff('', long));
  assert.ok(plan.length <= 200);
  for (const p of plan) assert.ok(p.steps.length <= 6);
});

test('fitFlap pads or truncates a cell to exactly its tile count', () => {
  assert.equal(fitFlap('YYZ', 5), 'YYZ  ');
  assert.equal(fitFlap('', 3), '   ');
  assert.equal(fitFlap(null, 2), '  ');
  const cut = fitFlap('Senior Software Engineer', 10);
  assert.equal(cut, 'Senior So…');
  assert.equal([...fitFlap('✓'.repeat(40), 8)].length, 8);
});

test('createFlapQueue starts due jobs in order, never more than maxActive', () => {
  const q = createFlapQueue({ maxActive: 120 });
  for (let i = 0; i < 200; i++) q.add({ id: i, due: i });
  assert.equal(q.pending, 200);

  const first = q.take(500);
  assert.equal(first.length, 120);
  assert.deepEqual(first.slice(0, 3).map((j) => j.id), [0, 1, 2]);
  assert.equal(q.active, 120);
  assert.equal(q.take(500).length, 0);

  first.slice(0, 5).forEach((j) => q.done(j));
  const next = q.take(500);
  assert.deepEqual(next.map((j) => j.id), [120, 121, 122, 123, 124]);
  assert.equal(q.active, 120);
  assert.equal(q.pending, 75);
});

test('createFlapQueue does not start jobs before they are due', () => {
  const q = createFlapQueue({ maxActive: 10 });
  q.add({ id: 'late', due: 300 });
  q.add({ id: 'early', due: 100 });
  assert.deepEqual(q.take(50), []);
  assert.deepEqual(q.take(150).map((j) => j.id), ['early']);
  assert.deepEqual(q.take(299), []);
  assert.deepEqual(q.take(300).map((j) => j.id), ['late']);
});

test('createFlapQueue cancel drops a job whether pending or running', () => {
  const q = createFlapQueue({ maxActive: 1 });
  const a = { due: 0 };
  const b = { due: 0 };
  q.add(a);
  q.add(b);
  assert.deepEqual(q.take(0), [a]);
  q.cancel(b);
  assert.equal(q.pending, 0);
  q.cancel(a);
  assert.equal(q.active, 0);
  q.done(a); // finishing a cancelled job is a no-op
  assert.equal(q.active, 0);
});
