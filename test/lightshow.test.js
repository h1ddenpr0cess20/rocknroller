import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGig } from '../src/gig.js';
import { colorAt, levelAt, mountSign, neonWidth, spotTarget, STROBE_MAX_HZ, strobeAt } from '../src/lightshow.js';
import * as GFX from '../src/vendor/gfx/index.js';
import { VENUES } from '../src/venues/index.js';

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

test('every program has a colour before the downbeat too, as the band counts in', () => {
  for (const program of ['chase', 'pulse', 'rainbow', 'static']) {
    for (const beat of [-0.25, -3.7, -100.1]) {
      const c = colorAt({ colors: ['#ff0000', '#00ff00', '#0000ff'], program, shift: 1 }, beat);
      assert.ok(c.length === 3 && c.every((v) => v >= 0 && v <= 1), `${program} at beat ${beat}: ${c}`);
    }
  }
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

test('every neon sign is fixed to a wall that runs the whole width of it, below its top, clear of the gates and the speaker stacks', () => {
  const top = (c) => Math.max(...c.h);
  // Every one that is wrong, to say all at once.
  const wrong = [];
  const check = (ok, what) => { if (!ok) wrong.push(what); };
  for (let i = 0; i < VENUES.length; i++) {
    const gig = createGig(GFX, i), v = gig.venue;
    for (const f of v.fixtures.filter((q) => q.kind === 'neon')) {
      const size = f.size ?? 0.55, name = `${v.name}: ${f.text}`;
      const m = mountSign(v, f, size);
      // How far it reaches along the wall either way, its backing board and all.
      const half = (neonWidth(f.text, size) * 1.04) / 2;
      if (f.stand) {
        // On legs on top of the wall: wall under it all the way along, at the one height.
        check(m.base !== undefined && !m.face, `${name} stands on top of its wall`);
        const alongX = Math.abs(Math.cos(m.turn)) > 0.5, mid = alongX ? f.x : f.z;
        for (let k = Math.floor(mid - half); k < mid + half; k++) {
          const c = alongX ? v.cell(k, Math.floor(f.z)) : v.cell(Math.floor(f.x), k);
          check(c?.kind === 'wall' && top(c) === m.base, `${name} stands over the end of its wall at ${k}`);
        }
        continue;
      }
      check(m.face, `${name} is fixed to a wall, not stood on legs in the room`);
      if (!m.face) continue;
      const { x, z, dx, dz } = m.face;
      const mid = dx ? f.z : f.x, lo = mid - half, hi = mid + half;
      const [y0, y1] = [m.at[1] - size / 2, m.at[1] + size / 2];
      for (let k = Math.floor(lo); k < hi; k++) {
        const [wx, wz] = dx ? [x, k] : [k, z];
        const wall = v.cell(wx, wz), front = v.cell(wx + dx, wz + dz);
        check(wall?.kind === 'wall' && front && front.kind !== 'wall', `${name} hangs off the end of its wall at ${wx},${wz}`);
        check(y1 <= top(wall) && y0 >= top(front), `${name} sticks out above its wall or below the floor at ${wx},${wz}`);
        check(!front.crush, `${name} is where a speaker stack comes down, at ${wx + dx},${wz + dz}`);
      }
      // Nothing that shuts across the way stands in front of it.
      const face = dx ? x + 0.5 + dx * 0.5 : z + 0.5 + dz * 0.5;
      const box = dx
        ? { min: [Math.min(face, face + dx * 0.1), y0, lo], max: [Math.max(face, face + dx * 0.1), y1, hi] }
        : { min: [lo, y0, Math.min(face, face + dz * 0.1)], max: [hi, y1, Math.max(face, face + dz * 0.1)] };
      for (const d of gig.actors.doors) {
        const overlap = [0, 1, 2].every((a) => d.box.min[a] < box.max[a] && box.min[a] < d.box.max[a]);
        check(!overlap, `${name} is behind the ${d.kind} at ${d.x},${d.z}`);
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test('every light stands on something: lamps on walls, one to a post, and nothing over the dark that does not hang from a floor', () => {
  const posted = new Set(['bulb', 'par', 'spot', 'strobe', 'laser']);
  for (let i = 0; i < VENUES.length; i++) {
    const v = VENUES[i]();
    const taken = new Set();
    const post = (x, z, what) => {
      const key = `${Math.floor(x)},${Math.floor(z)}`;
      assert.ok(!taken.has(key), `${v.name}: the ${what} at ${key} shares a post`);
      taken.add(key);
    };
    for (const l of v.lamps) {
      assert.equal(v.cell(l.x, l.z)?.kind, 'wall', `${v.name}: the lamp at ${l.x},${l.z} is on a wall`);
      post(l.x, l.z, 'lamp');
    }
    for (const f of v.fixtures) {
      if (posted.has(f.kind)) post(f.x, f.z, f.kind);
      const ends = f.kind === 'festoon' ? [[f.x, f.z], [f.x + f.to[0], f.z + f.to[1]]] : [[f.x, f.z]];
      for (const [x, z] of ends) assert.ok(v.cell(Math.floor(x), Math.floor(z)) || f.floor !== undefined, `${v.name}: the ${f.kind} at ${x},${z} is over the dark`);
    }
  }
});

test('a moving head sweeps the floor in front of it: never the dark, and hardly ever a bare wall', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const v = VENUES[i]();
    for (const f of v.fixtures.filter((q) => q.kind === 'spot')) {
      let wall = 0, n = 0;
      for (let beat = 0; beat < 400; beat += 0.1, n++) {
        const [x, z] = spotTarget(f, beat);
        const c = v.cell(Math.floor(x), Math.floor(z));
        assert.ok(c, `${v.name}: the moving head at ${f.x},${f.z} shines into the dark at ${x.toFixed(1)},${z.toFixed(1)}`);
        // The stands, a barrier, a stack of gear are fair game: they stand on the floor.
        if (c.kind === 'wall' && !c.prop) wall++;
      }
      assert.ok(wall / n < 0.15, `${v.name}: the moving head at ${f.x},${f.z} spends ${Math.round((100 * wall) / n)}% of the time on the walls`);
    }
  }
});
