import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, flat, pick, wash } from './helpers.js';

/**
 * Act 2: The Rehearsal Rooms. A converted warehouse with a corridor of
 * soundproofed practice rooms off it, a band in every one of them, all
 * playing at once through foam that doesn't help. Charcoal foam walls, a
 * different coloured light on every room, speaker stacks coming down in the
 * tight corridors, a gate and its pass, and a room with strobes in it where
 * everyone is headbanging, so it looks like a flip-book.
 */

export const REHEARSAL = {
  tiles: ['#7a7f8e', '#666b7a', '#4e5262', '#5a5e6e'],
  walls: ['#6a6e80', '#585c6c', '#464a5a', '#52566a'],
  ambient: [0.78, 0.8, 0.95], lamp: '#c8e4ff', trap: '#2a2a32', lift: '#40404c', exit: '#ff3fa4', vary: 0.06,
};

export function rehearsal() {
  const g = new Venue({
    name: 'The Rehearsal Rooms', act: 2, cols: 124, rows: 140, palette: REHEARSAL, tempo: 118,
    intro: 'Six practice rooms. Six bands. All of them at once.',
    look: {
      theme: 'rehearsal', floor: 'concrete', wall: 'foam', lamp: 'bulb', buzz: true, exitSign: 'GIG', ampName: 'REHEARSE',
      hemi: ['#b8c4ee', '#2a2840', 1.0], key: '#e4ecff', keyK: 1.1, lantern: '#f0f4ff',
      skyColors: ['#04050e', '#080a1c', '#0e1030', '#16143c', '#201a48'],
      reflect: ['#ff3a4a', '#2a8aff', '#3aff7a'], ceiling: '#2a3050',
      rig: { colors: ['#ff3a4a', '#2a8aff'], program: 'pulse', every: 2 },
    },
  });
  const hall = (d, n, o = {}) => d.hall(n, { wall: 'foam', ...o });
  const room = (d, l, w, o = {}) => d.room(l, w, { wall: 'foam', ...o });

  // The lobby.
  g.room(2, 4, 5, 5, 50, { lamps: 3, wall: 'foam' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const corridor = hall(d, 14);
  g.speaker(...across(corridor, 5, { beats: 4 }));
  g.speaker(...across(corridor, 9, { beats: 4, offset: 0.5 }));
  g.pick(...corridor.tile(3, 0), 5).pick(...corridor.tile(7, 1), 5).pick(...corridor.tile(7, -1), 5).pick(...corridor.tile(12, 0), 10);
  d.turn('+z', { wall: 'foam' });
  const down = hall(d, 3);
  g.tape(...down.tile(1, 0));
  d.stairs(3, 1.5, { wall: 'foam' });

  // Room 1: the red room. Two metalheads and a mosher, a kit on a riser, and a sheet of foam across a bay.
  const red = room(d, 15, 11);
  for (const k of [1, 3, 5, 7, 9, 11]) g.pillar(...backTile(red, k), 1.0, { prop: 'amp', rot: Math.PI / 2 });
  g.block(...red.rect(12, 2, red.back * 5 - (red.back > 0 ? 1 : 0), 2), 0.35, { prop: 'drums', rot: Math.PI / 2 });
  g.foe('metalhead', ...red.tile(5, -2), { range: 6 }).foe('metalhead', ...red.tile(9, 2), { range: 6 }).foe('mosher', ...red.tile(11, -3), { range: 6 });
  g.pick(...red.tile(3, 3), 10).pick(...red.tile(8, 0), 10).pick(...red.tile(13, -4), 10);
  wash(g, red, ['#ff3a4a', '#ff8a2a'], { cans: 3, program: 'pulse', every: 1 });
  const bay1 = d.fork().jump(pick(red.tile(8, -red.back * 6), red.back > 0 ? '+x' : '-x'));
  const bayHall = bay1.hall(9, { wall: 'foam' });
  flat(g, bayHall, 8, { look: 'foam', breakAt: 6.5 });
  const closet = bay1.room(5, 5, { wall: 'foam' });
  g.record(...closet.tile(3, 0));
  g.pick(...closet.tile(1, -1), 10).pick(...closet.tile(1, 1), 10);
  hall(d, 4);
  d.turn('+x', { wall: 'foam' });

  // A corridor a tile wide, with speakers coming down in it. Wait for them.
  const tight = hall(d, 12, { width: 1 });
  g.speaker(...across(tight, 3, { beats: 4 }));
  g.speaker(...across(tight, 7, { beats: 4, offset: 0.5 }));
  g.speaker(...across(tight, 10, { beats: 4 }));
  hall(d, 3);

  // Room 2: the blue room. Freebird guys and a roadie; the pass is in a cupboard off it.
  const blue = room(d, 13, 11);
  g.foe('freebird', ...blue.tile(4, -2), { range: 6 }).foe('freebird', ...blue.tile(8, 3), { range: 6 }).foe('roadie', ...blue.tile(10, -1), { range: 6 });
  for (const k of [2, 6, 10]) g.pillar(...backTile(blue, k), 1.0, { prop: 'amp', rot: Math.PI / 2 });
  g.pick(...blue.tile(2, 4), 10).pick(...blue.tile(7, 0), 10).pick(...blue.tile(11, -4), 10);
  g.road(...blue.tile(11, 4), 60);
  wash(g, blue, ['#2a8aff', '#2de2ff'], { cans: 3, program: 'chase', every: 2 });
  const cupboard = d.fork().jump(pick(blue.tile(6, -6 * -1 * -1), '+x'));
  const cupHall = cupboard.hall(3, { wall: 'foam' });
  void cupHall;
  const cup = cupboard.room(6, 7, { wall: 'foam' });
  g.pass(...cup.tile(3, 0));
  g.foe('roadie', ...cup.tile(2, 2), { range: 4 });
  g.pick(...cup.tile(4, -2), 10);
  // And over a gap on a plank, the second record.
  const gapSide = d.fork().jump(pick(blue.tile(9, blue.back * 6), blue.back > 0 ? '-x' : '+x'));
  gapSide.hall(2, { wall: 'foam' });
  const plank = gapSide.bridge(7);
  g.foe('mosher', ...plank.tile(4, 0), { path: [plank.tile(1, 0), plank.tile(6, 0)] });
  const alcove = gapSide.room(5, 5, { wall: 'foam' });
  g.record(...alcove.tile(2, 0));
  hall(d, 4);
  d.turn('+z', { wall: 'foam' });
  const gate = hall(d, 6);
  barred(g, gate, 3);
  d.stairs(4, 2, { wall: 'foam' });

  // Room 3: the strobe room. Everyone headbangs, and it looks like stills.
  const strobe = room(d, 15, 13);
  wash(g, strobe, ['#ff2d95', '#8a4be8'], { cans: 3, strobe: true, program: 'chase', every: 1 });
  g.light('strobe', ...strobe.tile(14, strobe.back * 7), { colors: ['#ffffff'], reach: 9, shift: 2, height: 1.3 });
  for (const [a, b] of [[3, 3], [3, -3], [8, 4], [8, -4]]) g.pillar(...strobe.tile(a, b), 0.9, { prop: 'speaker' });
  g.foe('metalhead', ...strobe.tile(4, 0), { range: 7 }).foe('metalhead', ...strobe.tile(7, 3), { range: 7 }).foe('mosher', ...strobe.tile(9, -3), { range: 7 }).foe('metalhead', ...strobe.tile(12, 1), { range: 7 }).foe('mosher', ...strobe.tile(13, -4), { range: 7 });
  g.pick(...strobe.tile(2, 0), 10).pick(...strobe.tile(6, -4), 10).pick(...strobe.tile(11, 4), 10);
  g.tape(...strobe.tile(13, 5)).lighter(...strobe.tile(1, -5));
  // Off the back of the room, another sheet of foam, a long run at it, and the last record.
  const backBay = d.fork().jump(pick(strobe.tile(5, strobe.back * 7), strobe.back > 0 ? '-x' : '+x'));
  const bbHall = backBay.hall(10, { wall: 'foam' });
  flat(g, bbHall, 9, { look: 'foam', breakAt: 6.5 });
  const stash = backBay.room(5, 5, { wall: 'foam' });
  g.record(...stash.tile(3, 0));
  g.road(...stash.tile(1, 1), 70);
  hall(d, 4);
  d.turn('+x', { wall: 'foam' });

  // The green room: a last few, and the stage door.
  const long = hall(d, 8);
  g.foe('roadie', ...long.tile(5, 0), { range: 5 });
  g.speaker(...across(long, 7, { beats: 4 }));
  const green = room(d, 9, 9);
  g.foe('roadie', ...green.tile(3, -2), { range: 5 }).foe('suit', ...green.tile(4, 2), { range: 5 }).foe('freebird', ...green.tile(6, 0), { range: 5 });
  g.pick(...green.tile(7, 3), 10).tape(...green.tile(1, -3));
  hall(d, 3);
  d.stairs(3, 1.5, { wall: 'foam' });
  hall(d, 2);
  d.exit(3);
  return g;
}
