import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, flat, toBack, wallTile } from './helpers.js';

/**
 * Act 3: Sticky's. A dive bar with a floor that has never been mopped:
 * checked lino gone sticky in patches (Rock goes slow in the spilled beer),
 * red and blue neon beer signs, a bar down one wall, a pool table, a jukebox
 * that only plays one song, pinball machines whose bumpers throw him about,
 * drunks, a bouncer on the staff door, and an 8-ball that rolled off the
 * table and has a grudge.
 */

export const DIVE = {
  tiles: ['#d8d0c0', '#bcb2a0', '#8a6a44', '#7a6c5a'],
  walls: ['#c88a6a', '#b87a5a', '#9a6044', '#a86c4c'],
  ambient: [0.92, 0.82, 0.86], lamp: '#ff8a5a', trap: '#3a3030', lift: '#4a3a3a', exit: '#2de2ff', sticky: '#9a6a30', vary: 0.07,
};

const NEONS = ['#ff2d4a', '#2de2ff', '#ffb02a', '#3aff7a'];

export function dive() {
  const g = new Venue({
    name: "Sticky's", act: 3, cols: 130, rows: 130, palette: DIVE, tempo: 96,
    intro: 'The floor is sticky. Nobody wants to know why.',
    look: {
      theme: 'dive', floor: 'checker', wall: 'posters', lamp: 'bulb', sticky: 'mud', exitSign: 'GIG', ampName: 'STICKY', barNeon: '#2de2ff',
      hemi: ['#e8c8c0', '#4a2a28', 1.0], key: '#ffe0d0', keyK: 1.1, lantern: '#ffd8b8',
      skyColors: ['#0a0408', '#160a12', '#26101a', '#3a1620', '#4a1a1a'],
      reflect: ['#ff2d4a', '#2de2ff', '#ffb02a'], ceiling: '#3a2028',
      rig: { colors: ['#ff2d4a', '#2de2ff', '#ffb02a'], program: 'chase', every: 4 },
    },
  });
  /** A neon sign on the back wall of a piece, `along` it. */
  const neon = (p, along, text, color, height = 1.5, size = 0.6) => g.light('neon', ...wallTile(p, along), { text, color, height, size });
  /** A light of the bar's, on the back wall of a piece, shining down onto the floor a few tiles out from it. */
  const glowAt = (p, along, color) => g.light('par', ...wallTile(p, along), { colors: [color], program: 'static', glow: 0.8, reach: 7, aim: toBack(p).map((v) => -3 * v), height: 1.4 });

  // The alley the bar's door is down.
  g.room(2, 4, 5, 5, 60, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 60, heading: '+x' });
  const alley = d.hall(8);
  g.pick(...alley.tile(3, 0), 5).pick(...alley.tile(5, 1), 5).pick(...alley.tile(6, -1), 5);
  g.foe('drunk', ...alley.tile(6, 0), { range: 4 });
  d.turn('+z');
  d.hall(3);
  d.stairs(3, 1.5);

  // The bar: a long counter down the back, tables, a jukebox, and drunks. Spilled beer in front of the counter.
  const bar = d.room(17, 13, { wall: 'posters' });
  g.block(...bar.rect(2, 12, bar.back * 6, 1), 0.9, { prop: 'bar' });
  // The two rows in front of the counter, not under it.
  g.sticky(...bar.rect(2, 12, bar.back > 0 ? 4 : -5, 2));
  for (const [a, b] of [[4, 0], [7, 3], [10, -1], [13, 2], [14, -3]]) g.pillar(...bar.tile(a, b), 0.6, { prop: 'table' });
  g.pillar(...bar.tile(15, bar.back * 5), 1.0, { prop: 'jukebox' });
  g.foe('drunk', ...bar.tile(5, 2), { range: 6 }).foe('drunk', ...bar.tile(9, -3), { range: 6 }).foe('freebird', ...bar.tile(13, bar.back * 3), { range: 5 }).foe('hipster', ...bar.tile(11, 3), { range: 6 });
  g.pick(...bar.tile(3, -2), 10).pick(...bar.tile(8, 0), 10).pick(...bar.tile(14, -5), 10);
  neon(bar, 3, 'COLD', NEONS[1], 1.5, 0.6);
  neon(bar, 7, 'BEER', NEONS[0], 1.6, 0.7);
  neon(bar, 11, 'OPEN', NEONS[3], 1.5, 0.6);
  // Between the signs, so their beams don't cross them; the second on the jukebox.
  glowAt(bar, 5, NEONS[0]);
  glowAt(bar, 14, NEONS[1]);
  // Off the front, behind a sheet of ply, the first record: the beer cooler.
  const cooler = branch(d, bar, 6);
  const coolHall = cooler.hall(9);
  flat(g, coolHall, 8, { look: 'steel', breakAt: 6.5 });
  const cool = cooler.room(5, 5);
  g.record(...cool.tile(3, 0));
  g.road(...cool.tile(1, 1), 50);
  d.hall(5);
  d.turn('+x');

  // The pool room: a table, an 8-ball loose on the floor, and more of the sticky stuff.
  const pool = d.room(15, 13);
  g.block(...pool.rect(5, 3, pool.back * 4 - (pool.back > 0 ? 1 : 0), 2), 0.7, { prop: 'pool' });
  g.sticky(...pool.rect(7, 4, 0, 5));
  g.foe('poolball', ...pool.tile(4, -2), { range: 7 }).foe('poolball', ...pool.tile(9, 3), { range: 7 }).foe('drunk', ...pool.tile(12, 0), { range: 6 }).foe('bouncer', ...pool.tile(11, -3), { range: 5 });
  g.pick(...pool.tile(2, 3), 10).pick(...pool.tile(8, -4), 10).pick(...pool.tile(13, 4), 10);
  // The pool room is open to the bar along the start of its back wall: the signs are where the wall is, POOL over the table.
  neon(pool, 7, 'POOL', NEONS[3], 1.5, 0.7);
  neon(pool, 11, 'DARTS', NEONS[2], 1.5, 0.6);
  glowAt(pool, 9, NEONS[3]);
  // The staff door is locked, and its pass is in the stock room off the pool room, with a bouncer standing on it, and tape for after him.
  const stock = branch(d, pool, 6, 'front', 7);
  stock.hall(3);
  const stockRoom = stock.room(7, 7);
  g.pass(...stockRoom.tile(4, 0));
  g.foe('bouncer', ...stockRoom.tile(3, 1), { range: 5 });
  g.pillar(...backTile(stockRoom, 1), 0.7, { prop: 'keg' });
  g.pick(...stockRoom.tile(5, -2), 10).tape(...stockRoom.tile(5, 2));
  d.hall(4);
  const door = d.hall(6);
  barred(g, door, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // The pinball room: machines along the wall, and bumpers in the middle of the floor.
  const arcade = d.room(15, 13);
  for (const k of [1, 3, 5, 7, 9]) g.pillar(...backTile(arcade, k), 0.9, { prop: 'pinball' });
  for (const [a, b] of [[4, 0], [6, 2], [6, -2], [9, 0], [11, 3], [11, -3]]) g.bumper(...arcade.tile(a, b), { radius: 0.55 });
  g.foe('mosher', ...arcade.tile(3, -3), { range: 6 }).foe('influencer', ...arcade.tile(8, 4), { range: 6 }).foe('drunk', ...arcade.tile(12, 0), { range: 6 });
  g.pick(...arcade.tile(2, 0), 10).pick(...arcade.tile(5, 4), 10).pick(...arcade.tile(13, -4), 10);
  g.lighter(...arcade.tile(13, 4));
  neon(arcade, 6, 'PINBALL', NEONS[0], 1.5, 0.7);
  neon(arcade, 11, 'HI-SCORE', NEONS[1], 1.5, 0.6);
  glowAt(arcade, 9, '#ff2d95');
  d.hall(5);
  d.turn('+x');

  // The kitchen passage: grease on the floor, a fan of pyro for the fryer, and speaker stacks that are only for the music.
  const grease = d.hall(14);
  g.sticky(...grease.rect(2, 4, -1, 3)).sticky(...grease.rect(9, 4, -1, 3));
  g.pyro(...across(grease, 6, { beats: 4 }));
  g.foe('merch', ...grease.tile(4, 0), { range: 5 });
  g.foe('suit', ...grease.tile(11, 0), { range: 5 });
  g.pick(...grease.tile(7, 1), 10).pick(...grease.tile(12, -1), 10);
  g.tape(...grease.tile(13, 0));
  // The second record, over a gap on a plank, past a drunk who is in no state to be on a plank.
  const plankSide = branch(d, grease, 3, 'front', 2);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.foe('drunk', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const nook = plankSide.room(5, 5);
  g.record(...nook.tile(2, 0));

  // The stage in the corner: a few steps up to the last room, and the stage door.
  const stage = d.room(13, 11);
  g.floorOf(...stage.rect(8, 4, -5, 11), 'planks');
  for (const [a, b] of [[2, 3], [2, -3]]) g.pillar(...stage.tile(a, b), 0.6, { prop: 'table' });
  g.foe('bouncer', ...stage.tile(5, 0), { range: 6 }).foe('drunk', ...stage.tile(9, 3), { range: 6 }).foe('mosher', ...stage.tile(10, -3), { range: 6 });
  g.pick(...stage.tile(3, 0), 10).pick(...stage.tile(8, 4), 10);
  // Either side of the way up to the cellar, through the back wall.
  g.light('strobe', ...wallTile(stage, 8), { colors: ['#ffffff'], reach: 8, height: 1.3 });
  neon(stage, 3, 'LIVE', NEONS[0], 1.5, 0.8);
  neon(stage, 10, 'MUSIC', NEONS[1], 1.5, 0.7);
  const lastRecord = branch(d, stage, 6, 'back', 6);
  const lrHall = lastRecord.hall(9);
  flat(g, lrHall, 8, { look: 'wood', breakAt: 6.5 });
  const cellar = lastRecord.room(5, 5);
  g.record(...cellar.tile(3, 0));
  g.road(...cellar.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
