import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 10: The Stadium. The last night of the tour. Floodlights, a sky full
 * of stars and a stage the size of a block, with a Headliner on it who has
 * a flying V, a smoke machine and no idea who Rock is. Everything the tour
 * has thrown at Rock is here at once: the PA coming down, pyro, moving
 * walkways, a lift down into the pit, a chicane of live cable, the crowd to
 * carry him over the moat, and a gate and its pass. Then the stage, and the
 * show.
 */

export const STADIUM = {
  tiles: ['#9a96a6', '#848092', '#a89870', '#767286'],
  walls: ['#6a5a86', '#5a4c76', '#7a5a7a', '#52467a'],
  ambient: [0.95, 0.9, 1.15], lamp: '#fff0d0', trap: '#22182e', lift: '#3a3050', exit: '#ffd23a', zapHue: 0.4, vary: 0.06,
};

const GOLD = '#ffc84a';
const SHOW = ['#ff2d95', '#2de2ff', '#ffd23a', '#7cff3a', '#a23aff'];

export function stadium() {
  const g = new Venue({
    name: 'The Stadium', act: 10, cols: 180, rows: 170, palette: STADIUM, tempo: 128,
    intro: 'Last night of the tour. The rock is the show.',
    look: {
      theme: 'stadium', floor: 'concrete', wall: 'block', lamp: 'spot', exitSign: 'GIG', ampName: 'HEADLINER', stars: 160,
      hemi: ['#d8d0ff', '#3a2a5a', 1.2], key: '#f0e8ff', keyK: 1.2, lantern: '#fff0d0',
      skyColors: ['#02020a', '#06061a', '#0e0e34', '#1c1a58', '#38206e'],
      reflect: SHOW, ceiling: '#1a1440',
      rig: { colors: SHOW.slice(0, 4), program: 'rainbow', every: 6 },
    },
  });
  const sign = (p, along, text, color, height = 1.6, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });
  const facing = (p) => (p.back > 0 ? Math.PI / 2 : -Math.PI / 2);

  // The gates.
  g.room(2, 4, 5, 5, 50, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const gates = d.hall(13);
  g.foe('scalper', ...gates.tile(7, 0), { range: 5, path: [gates.tile(4, 0), gates.tile(10, 0)] });
  g.pick(...gates.tile(3, 0), 5).pick(...gates.tile(4, 1), 5).pick(...gates.tile(5, -1), 5).pick(...gates.tile(11, 0), 10);
  sign(gates, 4, 'FINAL', GOLD, 1.6, 0.8);
  sign(gates, 9, 'NIGHT', SHOW[0], 1.6, 0.8);
  d.turn('+z');
  g.tape(...d.hall(3).tile(1, 0));
  d.stairs(4, 2);

  // The plaza: walkways, stands, and the whole tour's worth of people.
  const plaza = d.room(21, 15, { floor: 'checker' });
  g.belt(...plaza.rect(5, 6, plaza.lo + 3, 9), plaza.back > 0 ? '+x' : '-x');
  g.belt(...plaza.rect(13, 6, plaza.lo + 3, 9), plaza.back > 0 ? '-x' : '+x');
  for (const k of [2, 6, 10, 14, 18]) g.pillar(...backTile(plaza, k), 0.9, { prop: 'table', rot: facing(plaza) });
  for (const [a, b] of [[3, -4], [3, 4], [11, 0], [19, -4]]) g.pillar(...plaza.tile(a, b), 0.7, { prop: 'case', rot: facing(plaza) });
  g.foe('security', ...plaza.tile(3, 0), { range: 6 }).foe('merch', ...plaza.tile(9, -3), { range: 6 });
  g.foe('mascot', ...plaza.tile(12, 3), { range: 5 }).foe('phone', ...plaza.tile(18, 0), { range: 6 });
  g.pick(...plaza.tile(2, 0), 10).pick(...plaza.tile(8, 2), 10).pick(...plaza.tile(11, -4), 10).pick(...plaza.tile(17, 3), 10);
  g.road(...plaza.tile(19, 5), 50).tape(...plaza.tile(20, 0));
  g.light('spot', ...centre(plaza), { colors: ['#fff0d0'], height: 3.2, reach: 10 });
  wash(g, plaza, [SHOW[0], SHOW[1]], { cans: 4, program: 'chase', every: 1 });
  sign(plaza, 5, 'MERCH', SHOW[2], 1.6, 0.8);
  sign(plaza, 14, 'GATE 9', SHOW[1], 1.6, 0.8);
  const shop = branch(d, plaza, 8);
  const shopHall = shop.hall(9);
  flat(g, shopHall, 8, { breakAt: 6.5, look: 'flat' });
  const store = shop.room(5, 5);
  g.tape(...store.tile(3, 0)).road(...store.tile(1, 1), 60);
  g.pick(...store.tile(1, -1), 10).pick(...store.tile(3, 2), 10);
  d.hall(4);
  d.turn('+x');

  // The service tunnel: PA and pyro on the beat, and a lift down into the pit.
  const tunnel = d.hall(21);
  g.speaker(...across(tunnel, 4, { beats: 4 }));
  g.pyro(...across(tunnel, 9, { beats: 4, offset: 0.5 }));
  g.speaker(...across(tunnel, 14, { beats: 4 }));
  g.pyro(...across(tunnel, 18, { beats: 4, offset: 0.25 }));
  g.pick(...tunnel.tile(2, 0), 5).pick(...tunnel.tile(6, 1), 5).pick(...tunnel.tile(6, -1), 5).pick(...tunnel.tile(11, 0), 10).pick(...tunnel.tile(16, 0), 10);
  g.light('strobe', ...wallTile(tunnel, 7), { colors: ['#ffffff'], reach: 8, height: 1.3 });
  g.light('laser', ...wallTile(tunnel, 12), { colors: [SHOW[1]], aim: [0, -tunnel.back * 3], height: 1.8 });
  g.foe('security', ...tunnel.tile(11, 0), { range: 3 });
  g.tape(...tunnel.tile(20, 0));
  d.hall(3);
  d.hall(2);
  d.shaft(2.5, { size: 3, period: 8 });
  d.hall(3);

  // The pit: a chicane of live cable across the floor, the whole rig over it, and people crowd-surfing with no crowd.
  const pit = d.room(21, 17, { floor: 'panels' });
  const run = (along, gapAcross) => {
    const lo = pit.lo, hi = pit.lo + pit.width;
    const left = gapAcross - 2, right = gapAcross + 2;
    if (left > lo) g.zap(...pit.rect(along, 2, lo, left - lo), pit.h);
    if (hi > right) g.zap(...pit.rect(along, 2, right, hi - right), pit.h);
  };
  run(6, 5);
  run(10, -5);
  run(14, 5);
  g.foe('mosher', ...pit.tile(3, -3), { range: 6 }).foe('mosher', ...pit.tile(8, 0), { range: 6 }).foe('hipster', ...pit.tile(12, 3), { range: 6 });
  g.foe('diver', ...pit.tile(10, 0), { path: [pit.tile(5, -5), pit.tile(16, -5), pit.tile(16, 5), pit.tile(5, 5)] });
  g.foe('ball', ...pit.tile(12, 0), { path: [pit.tile(8, 0), pit.tile(17, 0)] });
  g.pick(...pit.tile(2, 3), 10).pick(...pit.tile(6, 5), 10).pick(...pit.tile(10, -5), 10).pick(...pit.tile(15, 5), 10).pick(...pit.tile(18, 0), 10);
  g.tape(...pit.tile(18, -5)).tape(...pit.tile(1, 0)).tape(...pit.tile(19, 0));
  g.light('ball', ...centre(pit), { colors: SHOW, radius: 9, height: 3.4 });
  g.light('laser', ...wallTile(pit, 5), { colors: [SHOW[3]], aim: [3, -pit.back * 7], height: 2.4 });
  g.light('laser', ...wallTile(pit, 16), { colors: [SHOW[0]], aim: [-3, -pit.back * 7], height: 2.4 });
  g.light('strobe', ...wallTile(pit, 10), { colors: ['#ffffff'], reach: 10, height: 1.3 });
  wash(g, pit, [SHOW[0], SHOW[4], SHOW[1]], { cans: 4, program: 'chase', every: 1 });
  sign(pit, 10, 'THE PIT', SHOW[0], 1.7, 0.9);
  const merch = branch(d, pit, 8, 'front', 8);
  const merchHall = merch.hall(9);
  flat(g, merchHall, 8, { breakAt: 6.5, look: 'steel' });
  const cage = merch.room(5, 5);
  g.record(...cage.tile(3, 0));
  g.road(...cage.tile(1, 1), 70);
  d.hall(4);
  d.turn('+x');

  // The moat: the way across is on the crowd's hands.
  d.hall(3);
  const moat = d.ferry(11, { size: 3, period: 8, style: 'crowd' });
  g.zap(...moat.rect(0, 11, moat.lo - 2, 7), d.h - 1.6, { fill: true });
  d.hall(3);

  // Backstage: a gate, the pass in the production office, and a record over the rigging on a plank.
  const back = d.room(15, 13);
  for (const k of [2, 6, 10]) g.pillar(...backTile(back, k), 1.0, { prop: 'case', rot: facing(back) });
  g.foe('bouncer', ...back.tile(5, 0), { range: 6 }).foe('influencer', ...back.tile(9, 3), { range: 6 }).foe('roadie', ...back.tile(11, -3), { range: 6 });
  g.pick(...back.tile(2, 0), 10).pick(...back.tile(7, -3), 10).pick(...back.tile(10, 5), 10);
  g.lighter(...back.tile(13, -5));
  g.tape(...back.tile(3, 5));
  wash(g, back, [SHOW[2], SHOW[0]], { cans: 3, program: 'chase', every: 2 });
  g.light('ball', ...centre(back), { colors: SHOW, radius: 6, height: 2.8 });
  sign(back, 7, 'BACKSTAGE', GOLD, 1.6, 0.9);
  const office = branch(d, back, 7, 'front', 7);
  office.hall(3);
  const production = office.room(7, 7);
  g.pass(...production.tile(4, 0));
  g.foe('security', ...production.tile(3, 1), { range: 5 });
  g.pick(...production.tile(5, -2), 10);
  const plankSide = branch(d, back, 12, 'back', 7);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), plankSide.h - 1.6, { fill: true });
  g.foe('diver', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const rigging = plankSide.room(5, 5);
  g.record(...rigging.tile(2, 0));
  d.hall(4);
  const door = d.hall(6);
  barred(g, door, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // The stage: the Headliner, far end of a long, long stage, with the whole of the rig coming down on it.
  const stage = d.room(25, 17, { floor: 'planks', wall: 'curtain' });
  g.foe('headliner', ...stage.tile(18, 0), { range: 3 });
  g.pick(...stage.tile(2, 4), 10).pick(...stage.tile(7, 0), 10).pick(...stage.tile(9, -5), 10).tape(...stage.tile(4, 0));
  g.tape(...stage.tile(3, -6)).tape(...stage.tile(3, 6)).tape(...stage.tile(10, 6));
  for (const k of [3, 8, 13]) g.pillar(...backTile(stage, k), 1.0, { prop: 'amp', rot: facing(stage) });
  for (const k of [18, 21]) g.pillar(...backTile(stage, k), 1.0, { prop: 'amp', rot: facing(stage) });
  g.light('ball', ...stage.tile(8, 0), { colors: SHOW, radius: 9, height: 3.4 });
  g.light('laser', ...wallTile(stage, 6), { colors: [SHOW[0]], aim: [3, -stage.back * 7], height: 2.4 });
  g.light('laser', ...wallTile(stage, 12), { colors: [SHOW[1]], aim: [-3, -stage.back * 7], height: 2.4 });
  g.light('laser', ...wallTile(stage, 18), { colors: [SHOW[3]], aim: [3, -stage.back * 7], height: 2.4 });
  g.light('strobe', ...wallTile(stage, 14), { colors: ['#ffffff'], reach: 12, height: 1.3 });
  wash(g, stage, SHOW, { cans: 5, program: 'chase', every: 1 });
  sign(stage, 12, 'HEADLINER', GOLD, 1.8, 1.0);
  const wings = branch(d, stage, 7, 'front', 8);
  const wingsHall = wings.hall(9);
  flat(g, wingsHall, 8, { breakAt: 6.5, look: 'curtain' });
  const green = wings.room(5, 5);
  g.record(...green.tile(3, 0));
  g.road(...green.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
