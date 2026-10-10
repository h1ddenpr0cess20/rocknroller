import { arena } from './arena.js';
import { club } from './club.js';
import { dive } from './dive.js';
import { dock } from './dock.js';
import { festival } from './festival.js';
import { garage } from './garage.js';
import { opera } from './opera.js';
import { rehearsal } from './rehearsal.js';
import { stadium } from './stadium.js';
import { studio } from './studio.js';

/**
 * The venues, in the order of the tour: each a night further along, and
 * each dug with `dig.js` a piece at a time, with the people, hazards and
 * treasure put into the pieces by where they are in them.
 */
export const VENUES = [garage, rehearsal, dive, club, dock, studio, opera, festival, arena, stadium];

export function loadVenue(index) {
  return VENUES[index]();
}
