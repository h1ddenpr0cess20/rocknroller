import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FOES } from '../src/foes.js';
import { RECORDS } from '../src/rating.js';
import { VENUES, loadVenue } from '../src/venues/index.js';
import * as GFX from '../src/vendor/gfx/index.js';
import { createGig } from '../src/gig.js';
import { drive, graph, plan } from './helpers/autopilot.js';

/** The boss of each venue that has one. */
const bossOf = (venue) => venue.foes.filter((f) => FOES[f.kind].boss).map((f) => f.kind);

test('every venue can be played through to the stage door in one piece, with all its records', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const r = drive(i);
    const name = r.gig.venue.name;
    assert.ok(r.finished, `${name}: the autopilot got stuck (${JSON.stringify(r.stuck)})`);
    const records = r.gig.actors.pickups.filter((p) => p.kind === 'record');
    assert.equal(records.length, RECORDS, `${name} hides ${RECORDS} records`);
    assert.ok(records.every((p) => p.taken), `${name}: every record can be got`);
    assert.ok(r.gig.rock.hp > 0, `${name}: Rock got there whole`);
  }
});

test('no two venues have the same boss, and the mirror ball hangs in the Club and nowhere else', () => {
  const bosses = VENUES.map((_, i) => bossOf(loadVenue(i))).flat();
  assert.equal(new Set(bosses).size, bosses.length, `bosses: ${bosses.join(', ')}`);
  for (let i = 0; i < VENUES.length; i++) {
    const v = loadVenue(i);
    const balls = v.fixtures.filter((f) => f.kind === 'ball').length;
    assert.equal(balls, v.name === 'The Club' ? 1 : 0, `${v.name} has ${balls} mirror balls`);
  }
});

test('everything lying about can be got to, from where Rock starts, and leaves him a way on to the stage door', () => {
  for (let i = 0; i < VENUES.length; i++) {
    const gig = createGig(GFX, i);
    const v = gig.venue, net = graph(v);
    let exit = null;
    for (let z = 0; z < v.rows && !exit; z++) for (let x = 0; x < v.cols && !exit; x++) if (v.cell(x, z)?.kind === 'exit') exit = [x, z];
    for (const p of gig.actors.pickups) {
      const at = [Math.floor(p.x), Math.floor(p.z)];
      const c = v.cell(...at);
      const where = `${v.name}: the ${p.kind} at ${at}`;
      assert.ok(c && c.kind === 'floor' && !c.prop && !c.crush, `${where} is on open floor`);
      assert.ok(plan(gig, net, [v.start.x, v.start.z], at, 99), `${where} can be reached`);
      assert.ok(plan(gig, net, at, exit, 99), `${where} doesn't strand him`);
    }
  }
});
