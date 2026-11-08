import { createActors } from './actors.js';
import { createGig as create } from 'madness-engine/venue/gig';
import { loadVenue } from './venues/index.js';

export * from 'madness-engine/venue/gig';

/** What each kind of pickup does in this game. */
export const PICKUPS = Object.freeze({
  pick: { score: 1 },
  case: { score: 5 },
  tape: { heal: true },
  lighter: { revive: true },
  pass: { pass: true },
  record: { token: true },
});

/** Starts venue `index`. */
export const createGig = (GFX, index, options = {}) => create(GFX, index, { loadVenue, createActors, pickups: PICKUPS, ...options });

/** The rating inputs for this venue as it stands. */
export const resultOf = (gig) => ({ smashed: gig.stats.smashed, foes: gig.stats.foes, records: gig.stats.tokens });
