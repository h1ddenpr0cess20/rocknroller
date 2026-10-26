import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from 'madness-engine/gfx';
import { openSide } from '../src/decor.js';
import { createGig, STEP, stepGig } from '../src/gig.js';
import { VENUES, loadVenue } from '../src/venues/index.js';

/** Rock rolled at the middle of `prop`'s near side from `back` tiles off, going `speed`. */
function charge(gig, prop, speed, back = 0.9) {
  const b = gig.ball;
  const [cx, , cz] = prop.centre;
  b.x = prop.box.min[0] - back; b.z = cz; b.y = prop.spec.base + b.r + 0.01;
  b.vx = speed; b.vy = 0; b.vz = 0;
  void cx;
  for (let t = 0; t < 0.5; t += STEP) stepGig(gig, [1, 0], STEP);
}

/** A prop with a clear tile or two of floor to the -x side of it to come at it from. */
function propWithRoom(gig) {
  const v = gig.venue;
  return gig.actors.props.find((p) => {
    const z = Math.floor(p.centre[2]);
    return [1, 2].every((k) => {
      const c = v.cell(p.spec.x - k, z);
      return c && c.kind === 'floor' && !c.prop && Math.abs(Math.max(...c.h) - p.spec.base) < 0.01;
    });
  });
}

test('props are smashed by a run at them, and stand up to a nudge', () => {
  const slow = createGig(GFX, 0);
  const p1 = propWithRoom(slow);
  assert.ok(p1, 'the Garage has a prop to try');
  charge(slow, p1, 1.5);
  assert.equal(p1.broken, -1, 'a nudge leaves it standing');
  assert.ok(slow.ball.x < p1.box.min[0] + 0.05, 'and Rock does not go through it');

  const fast = createGig(GFX, 0);
  const p2 = fast.actors.props.find((p) => p.spec.x === p1.spec.x && p.spec.z === p1.spec.z);
  const before = fast.hype.score;
  charge(fast, p2, p2.breakAt + 1.5);
  assert.ok(p2.broken >= 0, 'a run at it smashes it');
  assert.equal(p2.box.solid, false);
  assert.ok(fast.hype.score > before, 'and that is worth some hype');
});

test('the building is not furniture: crowd barriers and the stands do not break', () => {
  for (const i of [7, 8]) {
    const gig = createGig(GFX, i);
    const sturdy = gig.venue.props.filter((p) => p.kind === 'barrier' || p.kind === 'stands');
    assert.ok(sturdy.length > 0);
    assert.ok(sturdy.every((p) => !p.breakAt), `${gig.venue.name}: no breakable barriers or stands`);
  }
});

const tilesOf = (p) => Array.from({ length: p.w * p.d }, (_, k) => [p.x + (k % p.w), p.z + Math.floor(k / p.w)]);

test('a prop with a front faces open floor, and one against a wall turns its back to it', () => {
  const garage = loadVenue(0);
  const amps = garage.props.filter((p) => p.kind === 'amp');
  assert.ok(amps.length > 1);
  for (const a of amps) assert.deepEqual(openSide(garage, a), [1, 0], `the amp at ${a.x},${a.z} faces into the band room`);
  for (let i = 0; i < VENUES.length; i++) {
    const v = loadVenue(i);
    for (const p of v.props.filter((q) => ['amp', 'drums', 'speaker', 'rack', 'jukebox', 'pinball', 'loo'].includes(q.kind))) {
      const [dx, dz] = p.face ?? openSide(v, p);
      const ahead = dx ? Array.from({ length: p.d }, (_, j) => [dx > 0 ? p.x + p.w : p.x - 1, p.z + j]) : Array.from({ length: p.w }, (_, k) => [p.x + k, dz > 0 ? p.z + p.d : p.z - 1]);
      assert.ok(ahead.some(([x, z]) => v.cell(x, z) && v.cell(x, z).kind !== 'wall'), `${v.name}: the ${p.kind} at ${p.x},${p.z} faces a wall`);
    }
  }
});

test('nothing is stood or left lying where a speaker stack comes down, pyro goes up or a gate shuts', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const v = loadVenue(i);
    for (const p of v.props.filter((q) => !q.free)) {
      for (const [x, z] of tilesOf(p)) {
        const c = v.cell(x, z);
        assert.ok(!c?.crush && !c?.trap && !c?.door, `${v.name}: the ${p.kind} at ${p.x},${p.z} is in the way of a hazard at ${x},${z}`);
      }
    }
    for (const p of v.pickups) {
      const c = v.cell(Math.floor(p.x), Math.floor(p.z));
      assert.ok(!c?.crush && !c?.trap && !c?.door, `${v.name}: the ${p.kind} at ${p.x},${p.z} lies in a hazard`);
    }
  }
});

test('nothing is laid over a prop once it is put down: no live cable, no floor, under any of it', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const v = loadVenue(i);
    for (const p of v.props.filter((q) => !q.free)) {
      for (const [x, z] of tilesOf(p)) {
        const c = v.cell(x, z);
        assert.equal(c?.prop, p.kind, `${v.name}: the ${p.kind} at ${p.x},${p.z} has ${c ? c.kind : 'nothing'} laid over it at ${x},${z}`);
      }
    }
  }
});

test('gates and panels close off the whole way: no getting round the ends', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const v = loadVenue(i);
    for (const g of v.doors) {
      const ends = g.axis === 'x' ? [[g.x, g.z - 1], [g.x, g.z + g.d]] : [[g.x - 1, g.z], [g.x + g.w, g.z]];
      for (const [x, z] of ends) {
        const c = v.cell(x, z);
        assert.ok(!c || c.kind === 'wall' || (c.prop && !c.breakable), `${v.name}: the ${g.kind} at ${g.x},${g.z} can be got round at ${x},${z}`);
      }
    }
  }
});
