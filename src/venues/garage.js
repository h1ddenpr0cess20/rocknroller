import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, flat, loop, pick } from './helpers.js';

/**
 * Act 1: The Garage. Where Rock starts. A two-car garage with a band in it
 * and not much else — concrete, plywood, bare bulbs, amps, a drum kit —
 * and a basement under it. Everything is taught here: rolling over picks,
 * running at somebody to smash them, the speaker stack that comes down on
 * the beat, a gate and its pass, and a flimsy panel that someone ought to
 * run at, with a gold record behind it.
 */

export const GARAGE = {
  tiles: ['#b9b2a6', '#9f988c', '#8f7c5c', '#7a746a'],
  walls: ['#b89a68', '#a58a5c', '#8a7048', '#98805a'],
  ambient: [0.46, 0.42, 0.38], lamp: '#ffb766', trap: '#3a3632', lift: '#4a4a52', exit: '#ff3fa4', zap: '#ffb04a',
};

export function garage() {
  const g = new Venue({
    name: 'The Garage', act: 1, cols: 96, rows: 116, palette: GARAGE, tempo: 112,
    intro: 'Rock has a band now. Rock did not ask for one.',
    look: { floor: 'concrete', wall: 'plywood', lamp: 'bulb', sky: 'basement', exitSign: 'GIG' },
  });
  // The corner the band leaves its gear in.
  g.room(2, 4, 5, 5, 40, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 40, heading: '+x' });
  const cable = d.hall(8);
  for (const a of [2, 3, 4]) g.pick(...cable.tile(a, 0), 5);
  g.tape(...cable.tile(6, 0));
  d.turn('+z');
  d.hall(4);
  d.stairs(4, 2);
  // The band room: amps along the back, a drum kit on a riser, two little brothers.
  const room = d.room(13, 11, { floor: 'concrete' });
  for (const k of [1, 3, 5, 7, 9]) g.pillar(...backTile(room, k), 1.0, { prop: 'amp', rot: Math.PI / 2 });
  g.pillar(...room.tile(11, room.back * 4), 0.5, { prop: 'drums' });
  g.floorOf(...room.rect(9, 4, room.back * 5 - (room.back > 0 ? 0 : 1), 2), 'planks');
  g.foe('brother', ...room.tile(5, -2), { range: 6 }).foe('brother', ...room.tile(7, 2), { range: 6 });
  g.pick(...room.tile(3, 3), 10).pick(...room.tile(10, -3), 10);
  g.road(...room.tile(11, -4), 50);
  // The first panel: a sheet of ply across a bay off the side of the room, and a gold record in it.
  const bay = d.fork().jump(pick(room.tile(6, -room.back * 6), room.back > 0 ? '+x' : '-x'));
  void bay;
  d.hall(4);
  d.turn('+x');
  // Along the side of the house, the neighbour on patrol.
  const side = d.hall(10);
  g.foe('neighbour', ...side.tile(5, 0), { range: 5, path: [side.tile(2, 0), side.tile(8, 0)] });
  g.pick(...side.tile(9, 1), 10);
  // The practice amp's rigged up over the passage: it comes down on the beat.
  const rig = d.hall(10);
  g.speaker(...across(rig, 4, { beats: 4 }));
  g.speaker(...across(rig, 7, { beats: 4, offset: 0.5 }));
  g.tape(...rig.tile(9, 0));
  d.stairs(4, 2);
  // The basement.
  const cellar = d.room(11, 11);
  for (const [a, b] of [[2, 2], [2, -2], [6, 2], [6, -2]]) g.pillar(...cellar.tile(a, b), 0.8, { prop: 'case' });
  g.foe('neighbour', ...cellar.tile(4, 0), { range: 5 }).foe('brother', ...cellar.tile(8, 3), { range: 5 });
  g.road(...cellar.tile(9, 4), 60).pick(...cellar.tile(1, -4), 10);
  d.hall(4);
  d.turn('+x');
  d.hall(5);
  const stair = d.stairs(5, 2.5);
  void stair;
  const exitHall = d.hall(4);
  void exitHall;
  d.exit(3);
  return g;
}

export { loop, barred, flat };
