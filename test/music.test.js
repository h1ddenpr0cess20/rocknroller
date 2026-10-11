import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBand, LOOKAHEAD, THEMES } from '../src/music.js';

/**
 * An AudioContext that plays nothing: every node takes connections and
 * scheduling calls, and each sound's `start(when)` is written down, so what
 * the band would play, and when, can be checked.
 */
function fakeContext() {
  const starts = [];
  const param = () => {
    const p = { value: 0 };
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) {
      p[m] = (...a) => {
        assert.ok(a.every(Number.isFinite), `${m} given ${a}`);
        return p;
      };
    }
    return p;
  };
  const node = () => {
    const params = new Map();
    return new Proxy({}, {
      get(target, key) {
        if (key in target) return target[key];
        if (key === 'connect') return (to) => to;
        if (key === 'disconnect') return () => {};
        if (key === 'start') return (when = 0) => { starts.push(when); };
        if (key === 'stop') return () => {};
        if (typeof key === 'symbol') return undefined;
        if (!params.has(key)) params.set(key, param());
        return params.get(key);
      },
      set(target, key, value) { target[key] = value; return true; },
    });
  };
  const ctx = { currentTime: 0, sampleRate: 44100, destination: node(), starts };
  for (const k of ['Gain', 'Oscillator', 'BiquadFilter', 'WaveShaper', 'StereoPanner', 'Delay', 'Convolver', 'DynamicsCompressor', 'BufferSource']) ctx[`create${k}`] = () => node();
  ctx.createBuffer = (channels, length) => ({ length, getChannelData: () => new Float32Array(length) });
  return ctx;
}

test('the band never goes quiet while it plays, a stall of the page notwithstanding, and never plays into the past', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const ctx = fakeContext();
  const band = createBand(ctx, ctx.destination, ctx.createBuffer(1, 1000));
  band.start(THEMES.garage, 124, 0);
  const notesIn = (a, b) => ctx.starts.filter((w) => w >= a && w < b).length;
  assert.ok(notesIn(0, 1) > 0, 'it starts at once');
  assert.ok(ctx.starts.some((w) => w > LOOKAHEAD - 1), 'and is scheduled well ahead');

  // A minute of play, the scheduler getting its turn four times a second...
  for (let k = 0; k < 240; k++) {
    ctx.currentTime += 0.25;
    t.mock.timers.tick(250);
  }
  for (let s = 0; s < 60; s++) assert.ok(notesIn(s, s + 1) > 0, `something is playing at ${s} s`);

  // ...then the page hangs for three seconds (a bake, shaders compiling): the music already scheduled carries it.
  const hungAt = ctx.currentTime;
  ctx.currentTime += 3;
  for (let s = hungAt; s < hungAt + 3; s += 0.5) assert.ok(notesIn(s, s + 0.5) > 0, `still playing ${(s - hungAt).toFixed(1)} s into the hang`);

  // A hang longer than that: nothing that should have started already is crammed in late.
  ctx.currentTime += 10;
  const before = ctx.starts.length;
  t.mock.timers.tick(250);
  const fresh = ctx.starts.slice(before);
  assert.ok(fresh.length > 0, 'it picks up again');
  assert.ok(fresh.every((w) => w >= ctx.currentTime - 1e-9), 'nothing scheduled in the past');
  assert.ok(Math.min(...fresh) < ctx.currentTime + 3, 'and on the next downbeat, not later');
  band.stop();
});

test('every theme plays a whole song through without a number Web Audio would throw on', () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    const ctx = fakeContext();
    const band = createBand(ctx, ctx.destination, ctx.createBuffer(1, 1000));
    assert.doesNotThrow(() => band.sketch(theme, 120, 60), name);
  }
});
