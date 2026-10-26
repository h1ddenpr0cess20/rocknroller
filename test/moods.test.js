import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MOODS } from '../src/moods.js';
import { loadVenue, VENUES } from '../src/venues/index.js';

test('every venue is dressed in its own mood, in the order of the tour', () => {
  assert.equal(MOODS.length, VENUES.length);
  VENUES.forEach((build, i) => {
    const venue = loadVenue(i);
    assert.ok(MOODS[i], `no mood for ${build.name}`);
    assert.equal(MOODS[i].name, venue.name);
    assert.deepEqual(MOODS[i].look, venue.look ?? {});
  });
});
