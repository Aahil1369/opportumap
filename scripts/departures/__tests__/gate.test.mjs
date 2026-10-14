// The job-detail gate header: OM <number> · GATE <letter><number>, derived from the job id so a
// role always opens at the same gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { gateFor } = await import(new URL('../../../lib/departures/gate.js', import.meta.url));

const FLIGHT = /^OM \d{4}$/;
const GATE = /^[A-F]([1-9]|[12]\d|30)$/;

test('gateFor is stable and well formed', () => {
  const a = gateFor('adzuna_123');
  assert.deepEqual(gateFor('adzuna_123'), a);
  assert.match(a.flight, FLIGHT);
  assert.match(a.gate, GATE);
  assert.deepEqual(Object.keys(a).sort(), ['flight', 'gate']);
});

test('every id gets a number 1000-9999 and a gate A1-F30, and ids spread out', () => {
  const flights = new Set();
  const gates = new Set();
  for (let i = 0; i < 3000; i++) {
    const { flight, gate } = gateFor(`remotive_${i}`);
    assert.match(flight, FLIGHT);
    const n = Number(flight.slice(3));
    assert.ok(n >= 1000 && n <= 9999, flight);
    assert.match(gate, GATE);
    flights.add(flight);
    gates.add(gate);
  }
  assert.ok(flights.size > 2000, `${flights.size} distinct numbers`);
  assert.equal(gates.size, 180, `${gates.size} distinct gates`);
});

test('odd ids still work', () => {
  for (const id of [undefined, null, '', 0, 42, 'x'.repeat(500), '東京_1']) {
    const { flight, gate } = gateFor(id);
    assert.match(flight, FLIGHT, String(id));
    assert.match(gate, GATE, String(id));
  }
  assert.deepEqual(gateFor(42), gateFor('42'));
});
