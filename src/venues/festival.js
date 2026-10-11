import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 8: The Festival. Day three, golden hour, and no walls to speak of:
 * the festival is on an island in the dark, and the edges are just edges.
 * The campsite is a maze of tents under festoon lights; the hill down to
 * the arena is a long slide of mud; the river is crossed on a boardwalk
 * that zig-zags without a rail; and the main-stage field is the biggest
 * open space on the tour — hay bales, mud, a pit of moshers, pyro along
 * the barrier and lasers off the stage. The pass is in the VIP tent; the
 * gate in the barrier is the way backstage.
 */

export const FESTIVAL = {
  tiles: ['#8ab858', '#78a44a', '#a08a58', '#6a9a48'],
  walls: ['#f0e0b8', '#e0d0a4', '#d4b888', '#e8d4a8'],
  ambient: [1.05, 1.0, 0.9], lamp: '#ffd890', trap: '#3a3226', lift: '#5a4a38', exit: '#ff3fa4', sticky: '#6a4a28', zapHue: 3.9, vary: 0.08,
};

const FEST = ['#ff2d95', '#ffc84a', '#2de2ff', '#7cff3a'];

export function festival() {
  const g = new Venue({
    name: 'The Festival', act: 8, cols: 140, rows: 130, palette: FESTIVAL, tempo: 112,
    intro: 'Day three. Nobody has showered. Rock is a rock, and is fine.',
    look: {
      theme: 'festival', floor: 'grass', wall: 'fence', lamp: 'bulb', sticky: 'mud', exitSign: 'GIG', ampName: 'FEST',
      hemi: ['#ffe8c8', '#6a5a38', 1.25], key: '#ffd8a0', keyK: 1.25, lantern: '#ffe8c0',
      skyColors: ['#1a1440', '#43246e', '#a8406a', '#ff8a4a', '#ffd070'],
      reflect: FEST, ceiling: '#a8406a',
      rig: { colors: FEST.slice(0, 3), program: 'chase', every: 2 },
    },
  });
  const sign = (p, along, text, color, height = 1.5, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });
  /** Bunting: a festoon of bulbs from one tile to another. */
  const festoon = (a, b, colors = [FEST[1], FEST[0], FEST[2]], height = 2.2) => g.light('festoon', ...a, { to: [b[0] - a[0], b[1] - a[1]], colors, height });

  // The campsite: a field of tents to find a way through, festoons strung over it, and the drum circle.
  g.room(2, 6, 5, 5, 64, { lamps: 3, floor: 'grass', wall: 'canvas' });
  g.start = { x: 4, z: 8 };
  const d = digger(g, { x: 7, z: 8, h: 64, heading: '+x' });
  const camp = d.room(19, 13, { floor: 'grass', wall: 'canvas', sides: 'x0 z0' });
  for (const [a, b] of [[2, -4], [2, 3], [5, -1], [6, 4], [8, -5], [9, 1], [11, -3], [12, 4], [14, 0], [15, -5], [16, 3]]) g.block(...camp.rect(a, 2, b, 2), 0.9, { prop: 'dome', seed: a * 3 + b });
  g.foe('hippie', ...camp.tile(7, -3), { range: 5 }).foe('hippie', ...camp.tile(10, 3), { range: 5 }).foe('drunk', ...camp.tile(13, -2), { range: 5 });
  g.pick(...camp.tile(4, 1), 5).pick(...camp.tile(8, -2), 5).pick(...camp.tile(11, 0), 5).pick(...camp.tile(14, -3), 10).pick(...camp.tile(17, 1), 10);
  festoon(camp.tile(1, -5), camp.tile(17, -5));
  festoon(camp.tile(3, 5), camp.tile(18, 5), [FEST[2], FEST[3], FEST[1]]);
  sign(camp, 4, 'CAMP', FEST[1], 1.6, 0.8);
  sign(camp, 12, 'DAY 3', FEST[0], 1.5, 0.7);
  // The lost-and-found tent, behind a canvas flap: the first record.
  const lost = branch(d, camp, 9, 'front', 7);
  const flap = lost.hall(9, { wall: 'canvas', floor: 'grass' });
  flat(g, flap, 8, { breakAt: 6.5, look: 'canvas' });
  const lostTent = lost.room(5, 5, { wall: 'canvas', floor: 'grass' });
  g.record(...lostTent.tile(3, 0));
  g.pick(...lostTent.tile(1, -1), 10).pick(...lostTent.tile(1, 1), 10);
  d.ledge(2, { width: 3, wall: false });

  // The hill: a long slide of mud down to the river, banked, the bottom sticky.
  const slide = d.chute(14, 5, { width: 5 });
  g.pick(...slide.tile(3, 0), 5).pick(...slide.tile(6, 0), 5).pick(...slide.tile(9, 0), 5).pick(...slide.tile(12, 0), 10);
  const foot = d.ledge(4, { width: 5, wall: false, floor: 'mud' });
  g.sticky(...foot.rect(0, 4, foot.lo, 5));
  g.foe('freebird', ...foot.tile(3, 0), { range: 3 });

  // The river: a boardwalk across, a plank wide, zig-zagging, nothing either side but the water's dark.
  const BOARDS = { floor: 'planks' };
  d.bridge(5, BOARDS);
  d.turn('+z', { ...BOARDS, walls: '' });
  const legA = d.bridge(5, BOARDS);
  g.foe('hippie', ...legA.tile(2, 0), { path: [legA.tile(0, 0), legA.tile(4, 0)] });
  d.turn('+x', BOARDS);
  const legB = d.bridge(6, BOARDS);
  g.pick(...legB.tile(1, 0), 5).pick(...legB.tile(3, 0), 5).pick(...legB.tile(5, 0), 5);
  // Off the boardwalk, an island with a willow on it and a record under the willow.
  const island = d.fork().jump({ heading: '-z' });
  island.bridge(4, BOARDS);
  const isle = island.ledge(5, { width: 5, wall: false });
  g.record(...isle.tile(3, 0));
  g.pillar(...isle.tile(4, 2), 1.4, { prop: 'bale' });
  d.turn('+z', BOARDS);
  const legC = d.bridge(5, BOARDS);
  g.foe('drone', ...legC.tile(2, 0), { path: [legC.tile(0, -2), legC.tile(4, -2), legC.tile(4, 2), legC.tile(0, 2)] });
  d.turn('+x', BOARDS);
  d.bridge(3, BOARDS);
  d.stairs(3, 1.5, { width: 3, walls: '' });

  // The main-stage field: huge and open, hay bales, mud, a mosh pit, the barrier with pyro along it.
  const field = d.room(27, 21, { wall: 'fence', sides: 'x0 z0' });
  g.floorOf(...field.rect(8, 8, -3, 7), 'mud');
  g.sticky(...field.rect(8, 8, -3, 7));
  for (const [a, b] of [[3, -7], [3, 6], [6, 0], [16, -8], [16, 8], [12, -6], [12, 7]]) g.block(...field.rect(a, 2, b, 1), 0.7, { prop: 'bale' });
  for (const k of [2, 4, 6]) g.pillar(...backTile(field, k), 1.3, { prop: 'loo' });
  g.foe('mosher', ...field.tile(10, -1), { range: 6 }).foe('mosher', ...field.tile(13, 2), { range: 6 }).foe('phone', ...field.tile(5, 4), { range: 6 });
  g.foe('drunk', ...field.tile(17, -4), { range: 6 }).foe('freebird', ...field.tile(18, 5), { range: 6 }).foe('mascot', ...field.tile(20, 0), { range: 6 });
  g.foe('diver', ...field.tile(14, 0), { path: [field.tile(9, -5), field.tile(19, -5), field.tile(19, 5), field.tile(9, 5)] });
  g.pick(...field.tile(2, 0), 10).pick(...field.tile(8, -6), 10).pick(...field.tile(11, 3), 10).pick(...field.tile(15, -2), 10).pick(...field.tile(19, 8), 10);
  g.road(...field.tile(21, -8), 60);
  // The lighter a tile short of the pyro along the barrier, not in it.
  g.tape(...field.tile(9, 8)).lighter(...field.tile(21, 8));
  // The barrier: right across the field, pyro in front of it on the beat, and the gate in the middle of it.
  const bar = 23;
  const fire = (from, n, offset) => {
    const [x, z, w, dd] = field.rect(bar - 1, 1, from, n);
    g.pyro(x, z, { w, d: dd, beats: 4, offset });
  };
  g.block(...field.rect(bar, 1, field.lo, 10 - 1), 1.0, { prop: 'barrier' });
  g.block(...field.rect(bar, 1, 2, 9), 1.0, { prop: 'barrier' });
  fire(field.lo, 9, 0);
  fire(2, 9, 0.5);
  g.gate(...field.rect(bar, 1, -1, 3), { axis: field.dir[0] ? 'x' : 'z' });
  // The VIP tent, off the side of the field: the pass, and a bouncer who isn't letting anyone in.
  const vip = branch(d, field, 12, 'front', 10);
  vip.hall(3, { wall: 'canvas', floor: 'carpet' });
  const vipTent = vip.room(7, 7, { wall: 'canvas', floor: 'carpet' });
  g.pass(...vipTent.tile(4, 0));
  g.foe('bouncer', ...vipTent.tile(3, 1), { range: 4 });
  g.pick(...vipTent.tile(5, -2), 10);
  sign(field, 12, 'MAIN STAGE', FEST[0], 2.0, 0.9);
  festoon(field.tile(2, -9), field.tile(21, -9), [FEST[1], FEST[3]]);
  festoon(field.tile(2, 9), field.tile(21, 9), [FEST[0], FEST[2]]);
  g.light('laser', ...field.tile(26, -6), { colors: [FEST[3]], aim: [-10, 6], height: 2.6 });
  g.light('laser', ...field.tile(26, 6), { colors: [FEST[0]], aim: [-10, -6], height: 2.6 });
  // On the stage, sweeping back over the crowd.
  g.light('spot', ...field.tile(25, 0), { colors: [FEST[1], FEST[2]], radius: 6, aim: field.dir.map((v) => -6 * v), height: 3.2 });
  wash(g, field, [FEST[0], FEST[1], FEST[2]], { cans: 4, program: 'chase', every: 2, glow: 0.6 });

  // Backstage: under the stage's scaffolding, the generators, and the last record in a flight case behind a ply wall.
  d.hall(2, { wall: 'fence' });
  const backstage = d.hall(10, { width: 5, wall: 'fence', floor: 'plate' });
  for (const k of [2, 6]) g.pillar(...backTile(backstage, k), 1.2, { prop: 'case' });
  g.foe('roadie', ...backstage.tile(5, 0), { range: 4 });
  const crate = branch(d, backstage, 7, 'front', 3);
  const crateHall = crate.hall(9, { wall: 'fence' });
  flat(g, crateHall, 8, { breakAt: 6.5, look: 'wood' });
  const store = crate.room(5, 5, { wall: 'fence', floor: 'plate' });
  g.record(...store.tile(3, 0));
  g.road(...store.tile(1, 1), 70);
  void across; void centre;
  d.hall(2, { wall: 'fence' });
  d.exit(3);
  return g;
}
