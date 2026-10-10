import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorAt, levelAt, STROBE_MAX_HZ, strobeAt } from '../src/lightshow.js';

test('a fixture with one colour, or on static, never changes colour', () => {
  assert.deepEqual(colorAt({ colors: ['#ff0000'] }, 17), [1, 0, 0]);
  assert.deepEqual(colorAt({ colors: ['#ff0000', '#0000ff'], program: 'static' }, 9), [1, 0, 0]);
});

test('a chase steps through its colours, one every `every` beats, and fades across the end of each step', () => {
  const f = { colors: ['#ff0000', '#00ff00', '#0000ff'], every: 2 };
  assert.deepEqual(colorAt(f, 0), [1, 0, 0]);
  assert.deepEqual(colorAt(f, 2.2), [0, 1, 0]);
  assert.deepEqual(colorAt(f, 4.2), [0, 0, 1]);
  assert.deepEqual(colorAt(f, 6.2), [1, 0, 0]);
  const fading = colorAt(f, 1.95);
  assert.ok(fading[0] < 1 && fading[1] > 0, 'part-way between red and green');
  // Out of step by `shift` steps.
  assert.deepEqual(colorAt({ ...f, shift: 1 }, 0), [0, 1, 0]);
});

test('a pulse kicks on the beat and dies away; other programs are steady', () => {
  const pulse = { program: 'pulse' };
  assert.ok(levelAt(pulse, 0) > levelAt(pulse, 0.5));
  assert.ok(levelAt(pulse, 0.5) > levelAt(pulse, 0.95));
  assert.ok(levelAt(pulse, 0.95) >= 0.35);
  assert.equal(levelAt({ program: 'chase' }, 3.3), 1);
});

test('a strobe never flashes more than three times a second, at any tempo', () => {
  for (const tempo of [60, 90, 120, 128, 140, 174, 200]) {
    const dt = 1 / 480;
    let last = 0, edges = 0, worst = 0, windowStart = 0, windowEdges = 0;
    const f = { cycle: 16, on: 4 };
    for (let t = 0; t < 60; t += dt) {
      const beat = (t * tempo) / 60;
      const level = strobeAt(f, beat, tempo, true);
      if (level > 0.5 && last <= 0.5) {
        edges++;
        windowEdges++;
      }
      last = level;
      if (t - windowStart >= 1) {
        worst = Math.max(worst, windowEdges);
        windowStart = t;
        windowEdges = 0;
      }
    }
    assert.ok(edges > 0, `a strobe flashes at ${tempo}`);
    assert.ok(worst <= STROBE_MAX_HZ, `${tempo} bpm flashes ${worst} times in a second`);
  }
});

test('with flashing off, a strobe never flashes', () => {
  for (let beat = 0; beat < 64; beat += 0.1) assert.equal(strobeAt({}, beat, 126, false), 0);
});

test('a strobe is on in bursts and off between them', () => {
  const f = { cycle: 16, on: 4 };
  let on = 0, off = 0;
  for (let beat = 0; beat < 64; beat += 0.25) (strobeAt(f, beat, 120, true) > 0 ? on++ : off++);
  assert.ok(on > 0 && off > on, 'bursts, with rests between');
});
