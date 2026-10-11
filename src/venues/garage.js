import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, flat, loop, pick } from './helpers.js';

/**
 * Act 1: The Garage. Where Rock starts. A two-car garage with a band in it
 * and not much else — concrete, plywood, bare bulbs, amps, a drum kit — and
 * a basement under it. Everything is taught here: rolling over picks,
 * running at somebody to smash them, a speaker stack that comes down on the
 * beat, a gate and its pass, and a flimsy panel that someone ought to run at,
 * with a gold record behind it. Little brothers and a neighbour with a broom.
 * The band's light show is two strings of fairy lights and a couple of cans.
 */

export const GARAGE = {
  tiles: ['#d6cdbd', '#c0b5a2', '#a88f64', '#9a9285'],
  walls: ['#f0d09a', '#e0bf86', '#c29c62', '#d4b073'],
  ambient: [0.95, 0.9, 0.92], lamp: '#ffb766', trap: '#3a3632', lift: '#4a4a52', exit: '#ff3fa4', vary: 0.07,
};

/** The party colours the band has up: pink, cyan, yellow. */
const PARTY = ['#ff2d95', '#2de2ff', '#ffd23a'];

export function garage() {
  const g = new Venue({
    name: 'The Garage', act: 1, cols: 100, rows: 118, palette: GARAGE, tempo: 124,
    intro: 'Rock has a band now. Rock did not ask for one.',
    look: {
      theme: 'garage', floor: 'concrete', wall: 'plywood', lamp: 'bulb', exitSign: 'GIG', ampName: 'GARAGE',
      hemi: ['#d8c8e8', '#5a4a48', 1.05], key: '#fff0e0', keyK: 1.15, lantern: '#ffe6c8',
      skyColors: ['#0a0614', '#140a22', '#220c30', '#34123a', '#4a1a3a'],
      reflect: ['#ff2d95', '#2de2ff', '#ffd23a'], ceiling: '#3a2a48',
      rig: { colors: PARTY, program: 'chase', every: 2 },
    },
  });

  // The corner the band leaves its gear in.
  g.room(2, 4, 5, 5, 40, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 40, heading: '+x' });
  const cable = d.hall(8);
  for (const a of [2, 3, 4]) g.pick(...cable.tile(a, 0), 5);
  g.pick(...cable.tile(6, 1), 5);
  d.turn('+z');
  const steps = d.hall(4);
  g.tape(...steps.tile(2, 1));
  d.stairs(4, 2);

  // The band room: amps along the back, a drum kit on a riser, two little brothers.
  const room = d.room(15, 11, { floor: 'planks', wall: 'posters' });
  for (const k of [1, 3, 5, 7, 9]) g.pillar(...backTile(room, k), 1.0, { prop: 'amp', rot: Math.PI / 2 });
  g.block(...room.rect(11, 2, room.back * 5 - (room.back > 0 ? 1 : 0), 2), 0.35, { prop: 'drums', rot: Math.PI / 2 });
  g.foe('brother', ...room.tile(5, -2), { range: 6 }).foe('brother', ...room.tile(8, 2), { range: 6 });
  g.pick(...room.tile(3, 3), 10).pick(...room.tile(12, -3), 10).pick(...room.tile(6, 0), 5);
  g.road(...room.tile(13, -4), 50);
  // The band's party rig: a wash of colour on the drums, fairy lights strung across the room, neon on the wall.
  g.light('festoon', ...room.tile(1, -4), { to: [12 * room.dir[0] + 8 * room.across[0], 12 * room.dir[1] + 8 * room.across[1]], colors: PARTY, height: 2.3 });
  g.light('festoon', ...room.tile(1, 4), { to: [12 * room.dir[0] - 8 * room.across[0], 12 * room.dir[1] - 8 * room.across[1]], colors: [PARTY[2], PARTY[0], PARTY[1]], height: 2.3 });
  g.light('par', ...room.tile(13, room.back * 2), { colors: [PARTY[0], PARTY[1]], aim: [-2.2 * room.back, 0], shift: 0, glow: 0.7, reach: 7 });
  g.light('par', ...room.tile(1, room.back * -3), { colors: [PARTY[1], PARTY[2]], aim: [0, 2.5], shift: 1, glow: 0.7, reach: 7 });
  g.light('neon', ...backTile(room, 4), { text: 'ROCK', color: PARTY[0], height: 1.6, size: 0.7 });
  g.light('neon', ...backTile(room, 8), { text: 'LIVE', color: PARTY[1], height: 1.5, size: 0.6 });
  // Off the front of the room, a bay behind a sheet of ply: the first gold record. Run at it.
  const bay = d.fork().jump(pick(room.tile(7, -room.back * 6), room.back > 0 ? '+x' : '-x'));
  const bayHall = bay.hall(3, { width: 3 });
  flat(g, bayHall, 1);
  const closet = bay.room(5, 5);
  g.record(...closet.tile(3, 0));
  g.pick(...closet.tile(1, -1), 10).pick(...closet.tile(1, 1), 10);
  d.hall(5);
  d.turn('+x');

  // Along the side of the house, the neighbour on patrol.
  const side = d.hall(11);
  g.foe('neighbour', ...side.tile(5, 0), { range: 5, path: [side.tile(2, 0), side.tile(9, 0)] });
  g.pick(...side.tile(9, 1), 10).pick(...side.tile(3, -1), 5);
  g.tape(...side.tile(10, 0));
  // The practice amp's rigged up over the passage: it comes down on the beat.
  const rig = d.hall(11);
  g.speaker(...across(rig, 4, { beats: 4 }));
  g.pick(...rig.tile(5, 0), 5).pick(...rig.tile(5, 1), 5).pick(...rig.tile(5, -1), 5);
  g.speaker(...across(rig, 8, { beats: 4, offset: 0.5 }));
  g.pick(...rig.tile(9, 0), 10);
  d.turn('+z');
  d.hall(3);
  d.stairs(5, 2.5);

  // The basement: boxes on the floor, a neighbour guarding it, the way out barred.
  const cellar = d.room(13, 13);
  for (const [a, b] of [[2, 3], [2, -3], [8, 4], [8, -4]]) g.pillar(...cellar.tile(a, b), 0.8, { prop: 'case' });
  g.foe('neighbour', ...cellar.tile(5, 0), { range: 6 }).foe('brother', ...cellar.tile(9, 3), { range: 6 }).foe('brother', ...cellar.tile(10, -3), { range: 6 });
  g.road(...cellar.tile(11, 5), 60).pick(...cellar.tile(1, -5), 10).pick(...cellar.tile(6, 5), 10);
  g.lighter(...cellar.tile(11, -5));
  // The workbench: the pass is in a side room off the cellar.
  const bench = d.fork().jump(pick(cellar.tile(6, -7), '+x'));
  bench.hall(3);
  const shop = bench.room(6, 7);
  g.pass(...shop.tile(3, 0));
  g.foe('brother', ...shop.tile(2, 2), { range: 4 });
  g.pick(...shop.tile(4, -2), 10);
  // And over a gap, on a plank, a second record.
  const pit = d.fork().jump(pick(cellar.tile(10, room.back * 7), room.back > 0 ? '-x' : '+x'));
  pit.hall(2);
  const plank = pit.bridge(7);
  g.foe('brother', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const alcove = pit.room(5, 5);
  g.record(...alcove.tile(2, 0));
  d.hall(4);
  const gate = d.hall(6);
  barred(g, gate, 3);
  d.turn('+x');
  d.ramp(7, 3);

  // The last stretch: a ramp to run down, and a second sheet of ply across a side room with the last record behind it.
  const run = d.hall(9);
  const strongbox = d.fork().jump(pick(run.tile(4, -2), '-z'));
  const sbHall = strongbox.hall(9);
  flat(g, sbHall, 8, { breakAt: 6.5, look: 'drywall' });
  const lock = strongbox.room(5, 5);
  g.record(...lock.tile(3, 0));
  g.road(...lock.tile(1, -1), 70);
  g.foe('neighbour', ...run.tile(6, 1), { range: 5 });
  g.speaker(...across(run, 8, { beats: 4 }));
  const last = d.room(9, 9);
  g.foe('brother', ...last.tile(3, -2), { range: 5 }).foe('brother', ...last.tile(4, 2), { range: 5 });
  g.pick(...last.tile(6, 0), 10).tape(...last.tile(1, 3));
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  void loop;
  return g;
}
