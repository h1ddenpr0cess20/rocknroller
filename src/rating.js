/**
 * How a night went, in stars. Three, and each is its own thing to go for:
 *
 *   ★  Show up: get to the stage door.
 *   ★  Crowd-pleaser: smash at least three in four of the people in the way.
 *   ★  Collector: find all three gold records.
 */

export const SMASH_SHARE = 0.75;
export const RECORDS = 3;

/** The goals, and whether `result` ({ smashed, foes, records }) met each. */
export function goals({ smashed = 0, foes = 0, records = 0 }) {
  return [
    { id: 'show', title: 'Show up', text: 'Get to the stage door.', met: true },
    { id: 'crowd', title: 'Crowd-pleaser', text: `Smash ${Math.ceil(foes * SMASH_SHARE)} of the ${foes} people in the way.`, met: foes === 0 || smashed >= Math.ceil(foes * SMASH_SHARE), progress: [Math.min(smashed, foes), foes] },
    { id: 'records', title: 'Collector', text: 'Find all three gold records.', met: records >= RECORDS, progress: [Math.min(records, RECORDS), RECORDS] },
  ];
}

/** Stars for a cleared venue: 1 to 3. */
export const stars = (result) => goals(result).filter((g) => g.met).length;
