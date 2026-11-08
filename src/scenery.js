import { bill } from 'madness-engine/textures/venue';
import { createExit as exit } from 'madness-engine/venue/scenery';

export { createVenueMeshes } from 'madness-engine/venue/scenery';

// The rock clubs' posters: the bands every venue has had on its walls, two words of each to fit; staff only on the shutters.
bill({
  bands: ['THE DEAD BATTERIES', 'GRAVEL PIT', 'VELVET HAMMER', 'WET CONCRETE', 'THE FEEDBACKS', 'SKULL SOCKS', 'CRASH TEST', 'LOUD NEIGHBOURS', 'DEAD AIR', 'MOSH POTATO', 'SIXTH STRING', 'THE RIFFRAFF'].map((b) => b.split(' ').slice(0, 2).join(' ')),
  headline: null,
  colours: ['#e63a6a', '#2ac6e8', '#f5c518'],
  billColours: ['#8a4be8', '#3ae88a', '#ff7a1a'],
  billInk: '#101014',
  badge: 'LIVE',
  shutter: ['STAFF', 'ONLY'],
});

/** The way out of a venue: the engine's frame with a lit sign, with this game's words on it. */
export const createExit = (GFX, venue, options = {}) => exit(GFX, venue, { signs: { exit: 'GIG', last: 'OUT' }, ...options });
