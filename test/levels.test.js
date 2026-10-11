import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FOES } from '../src/foes.js';
import { THEMES } from '../src/music.js';
import { loadVenue, VENUES } from '../src/venues/index.js';
import { drive } from './helpers/autopilot.js';

test('there are ten venues, and each has three gold records, a theme the band can play and people who exist', () => {
  assert.equal(VENUES.length, 10);
  for (let i = 0; i < VENUES.length; i++) {
    const venue = loadVenue(i);
    assert.equal(venue.act, i + 1, `${venue.name} is act ${i + 1}`);
    assert.equal(venue.pickups.filter((p) => p.kind === 'record').length, 3, `${venue.name} has three records`);
    assert.ok(THEMES[venue.look.theme], `${venue.name} has a theme the band can play`);
    assert.ok(venue.tempo > 60 && venue.tempo < 200, `${venue.name} has a tempo`);
    for (const f of venue.foes) assert.ok(FOES[f.kind], `${venue.name}: no such person as ${f.kind}`);
  }
});

for (let i = 0; i < VENUES.length; i++) {
  test(`venue ${i + 1}, ${loadVenue(i).name}, can be cleared start to finish with all three gold records`, () => {
    const result = drive(i);
    assert.ok(result.finished, `stuck: ${JSON.stringify(result.stuck)}`);
    assert.equal(result.gig.stats.records, 3);
    assert.ok(result.gig.rock.hp > 0);
  });
}
