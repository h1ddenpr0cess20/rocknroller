import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FOES } from '../src/foes.js';
import { RECORDS } from '../src/rating.js';
import { VENUES, loadVenue } from '../src/venues/index.js';
import { drive } from './helpers/autopilot.js';

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
