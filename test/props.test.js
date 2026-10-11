import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { createGig, STEP, stepGig } from '../src/gig.js';

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
