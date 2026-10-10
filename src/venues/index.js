import { dive } from './dive.js';
import { garage } from './garage.js';
import { rehearsal } from './rehearsal.js';

/**
 * The venues, in the order of the tour: each a night further along, and
 * each dug with `dig.js` a piece at a time, with the people, hazards and
 * treasure put into the pieces by where they are in them.
 */
export const VENUES = [garage, rehearsal, dive];

export function loadVenue(index) {
  return VENUES[index]();
}
