import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 9: The Arena. Twenty thousand seats, a concourse that smells of hot
 * dogs, moving walkways, a tunnel with the pyro on a timer, and a big rig
 * over the floor: lasers, moving heads, mirror balls and strobes, all of it
 * chasing the beat. Security is everywhere, the mascot is working a shift,
 * and the way across the players' tunnel is on a stage riser.
 */

export const ARENA = {
  tiles: ['#9aa2ae', '#868e9c', '#a89a7a', '#7a8290'],
  walls: ['#6a7a98', '#5a6a88', '#7a6a88', '#56648a'],
  ambient: [0.9, 0.95, 1.1], lamp: '#cfe4ff', trap: '#242a3a', lift: '#3a4260', exit: '#ffb02a', zapHue: 5.0, vary: 0.06,
};

const TEAM = ['#2d8aff', '#ff8a1a', '#ffffff'];
const RIG = ['#ff2d95', '#2de2ff', '#ffd23a', '#7cff3a'];

export function arena() {
  const g = new Venue({
    name: 'The Arena', act: 9, cols: 170, rows: 160, palette: ARENA, tempo: 120,
    intro: 'Twenty thousand seats. Rock only needs the one.',
    look: {
      theme: 'arena', floor: 'concrete', wall: 'block', lamp: 'spot', exitSign: 'GIG', ampName: 'ARENA',
      hemi: ['#c8d8ff', '#2a3050', 1.15], key: '#e8f0ff', keyK: 1.15, lantern: '#e8f0ff',
      skyColors: ['#04060e', '#080c1e', '#101838', '#1a2250', '#2a2a68'],
      reflect: RIG, ceiling: '#1a2040',
      rig: { colors: RIG.slice(0, 3), program: 'rainbow', every: 8 },
    },
  });
  const sign = (p, along, text, color, height = 1.6, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });
  const facing = (p) => (p.back > 0 ? Math.PI / 2 : -Math.PI / 2);

  // The car park, and the gate.
  g.room(2, 4, 5, 5, 50, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const lot = d.hall(13);
  g.foe('scalper', ...lot.tile(7, 0), { range: 5, path: [lot.tile(4, 0), lot.tile(10, 0)] });
  g.pick(...lot.tile(3, 0), 5).pick(...lot.tile(4, 1), 5).pick(...lot.tile(5, -1), 5).pick(...lot.tile(11, 0), 10);
  sign(lot, 4, 'ARENA', TEAM[1], 1.6, 0.8);
  sign(lot, 9, 'SOLD OUT', RIG[0], 1.5, 0.6);
  d.turn('+z');
  g.tape(...d.hall(3).tile(1, 0));
  d.stairs(4, 2);

  // The concourse: merch stands, a ticket booth, and moving walkways.
  const concourse = d.room(21, 15, { floor: 'checker' });
  g.belt(...concourse.rect(5, 6, concourse.lo + 3, 9), concourse.back > 0 ? '+x' : '-x');
  g.belt(...concourse.rect(13, 6, concourse.lo + 3, 9), concourse.back > 0 ? '-x' : '+x');
  for (const k of [2, 6, 10, 14, 18]) g.pillar(...backTile(concourse, k), 0.9, { prop: 'table', rot: facing(concourse) });
  for (const [a, b] of [[3, -4], [3, 4], [11, 0], [19, -4]]) g.pillar(...concourse.tile(a, b), 0.7, { prop: 'case', rot: facing(concourse) });
  g.foe('security', ...concourse.tile(3, 0), { range: 6 }).foe('merch', ...concourse.tile(9, -3), { range: 6 });
  g.foe('mascot', ...concourse.tile(12, 3), { range: 5 }).foe('scalper', ...concourse.tile(18, 0), { range: 6 });
  g.pick(...concourse.tile(2, 0), 10).pick(...concourse.tile(8, 2), 10).pick(...concourse.tile(11, -4), 10).pick(...concourse.tile(17, 3), 10);
  g.road(...concourse.tile(19, 5), 50);
  g.light('spot', ...centre(concourse), { colors: ['#e8f0ff'], height: 3.2, reach: 10 });
  wash(g, concourse, [TEAM[0], TEAM[1]], { cans: 4, program: 'chase', every: 2 });
  sign(concourse, 4, 'GATE A', TEAM[0], 1.6, 0.8);
  sign(concourse, 14, 'MERCH', TEAM[1], 1.6, 0.8);
  // Off the front, behind a sheet of ply: the first record, in the team shop.
  const shop = branch(d, concourse, 8);
  const shopHall = shop.hall(9);
  flat(g, shopHall, 8, { breakAt: 6.5, look: 'flat' });
  const store = shop.room(5, 5);
  g.record(...store.tile(3, 0));
  g.pick(...store.tile(1, -1), 10).pick(...store.tile(1, 1), 10);
  d.hall(4);
  d.turn('+x');

  // The tunnel: pyro and PA on the beat.
  const tunnel = d.hall(21);
  g.speaker(...across(tunnel, 4, { beats: 4 }));
  g.pyro(...across(tunnel, 9, { beats: 4, offset: 0.5 }));
  g.speaker(...across(tunnel, 14, { beats: 4 }));
  g.pyro(...across(tunnel, 18, { beats: 4, offset: 0.25 }));
  g.pick(...tunnel.tile(2, 0), 5).pick(...tunnel.tile(6, 1), 5).pick(...tunnel.tile(6, -1), 5).pick(...tunnel.tile(11, 0), 10).pick(...tunnel.tile(16, 0), 10);
  g.light('strobe', ...wallTile(tunnel, 7), { colors: ['#ffffff'], reach: 8, height: 1.3 });
  g.light('laser', ...wallTile(tunnel, 12), { colors: [RIG[1]], aim: [0, -tunnel.back * 3], height: 1.8 });
  g.foe('security', ...tunnel.tile(11, 0), { range: 3 });
  d.hall(3);

  // The players' tunnel: a stage riser carries you across.
  d.hall(3);
  const pit = d.ferry(11, { size: 3, period: 8 });
  g.zap(...pit.rect(0, 11, pit.lo - 2, 7), d.h - 1.6, { fill: true });
  d.hall(3);

  // The floor: the big rig over a hardwood court, seating all round, and moshers with a lot of room.
  const floor = d.room(21, 17, { floor: 'planks' });
  for (const k of [2, 4, 6, 8, 10, 12, 14, 16, 18]) g.pillar(...backTile(floor, k), 0.9, { prop: 'seat', rot: facing(floor) + Math.PI });
  for (const [a, b] of [[6, -5], [10, 5], [15, -5]]) g.pillar(...floor.tile(a, b), 0.7, { prop: 'case', rot: facing(floor) });
  g.foe('mosher', ...floor.tile(4, -3), { range: 6 }).foe('mosher', ...floor.tile(8, 3), { range: 6 }).foe('bouncer', ...floor.tile(12, -2), { range: 6 });
  g.foe('diver', ...floor.tile(10, 0), { path: [floor.tile(6, -4), floor.tile(14, -4), floor.tile(14, 4), floor.tile(6, 4)] });
  g.pick(...floor.tile(2, 3), 10).pick(...floor.tile(7, 0), 10).pick(...floor.tile(11, 5), 10).pick(...floor.tile(17, -3), 10);
  g.lighter(...floor.tile(18, 5));
  g.light('ball', ...floor.tile(6, 0), { colors: RIG, radius: 8, height: 3.3 });
  g.light('ball', ...floor.tile(15, 0), { colors: RIG.slice().reverse(), radius: 8, height: 3.3 });
  g.light('laser', ...wallTile(floor, 5), { colors: [RIG[3]], aim: [3, -floor.back * 7], height: 2.4 });
  g.light('laser', ...wallTile(floor, 16), { colors: [RIG[0]], aim: [-3, -floor.back * 7], height: 2.4 });
  g.light('strobe', ...wallTile(floor, 10), { colors: ['#ffffff'], reach: 10, height: 1.3 });
  g.light('spot', ...wallTile(floor, 8), { colors: ['#ffffff'], height: 2.6, reach: 10 });
  wash(g, floor, [RIG[0], RIG[1], RIG[2]], { cans: 4, program: 'chase', every: 1 });
  sign(floor, 10, 'HOME', TEAM[1], 1.6, 0.9);
  // The pass is in the locker room, with a bouncer on it.
  const locker = branch(d, floor, 7, 'front', 8);
  locker.hall(3);
  const lockers = locker.room(7, 7);
  g.pass(...lockers.tile(4, 0));
  g.foe('bouncer', ...lockers.tile(3, 1), { range: 5 });
  g.pick(...lockers.tile(5, -2), 10);
  // The second record: over the court on a plank.
  const plankSide = branch(d, floor, 14, 'back', 8);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), plankSide.h - 1.6, { fill: true });
  g.foe('mosher', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const box = plankSide.room(5, 5);
  g.record(...box.tile(2, 0));
  d.hall(4);
  const door = d.hall(6);
  barred(g, door, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // The dressing rooms: the last of security, and a sheet of ply across the last record.
  const dressing = d.room(15, 13);
  for (const k of [2, 6, 10]) g.pillar(...backTile(dressing, k), 1.0, { prop: 'case', rot: facing(dressing) });
  g.foe('security', ...dressing.tile(5, -3), { range: 6 }).foe('security', ...dressing.tile(8, 3), { range: 6 }).foe('mascot', ...dressing.tile(11, 0), { range: 6 });
  g.pick(...dressing.tile(2, 3), 10).pick(...dressing.tile(6, 0), 10).pick(...dressing.tile(10, -4), 10);
  g.tape(...dressing.tile(3, -4));
  wash(g, dressing, [TEAM[0], TEAM[1]], { cans: 3, program: 'chase', every: 2 });
  const vaultSide = branch(d, dressing, 6);
  const vaultHall = vaultSide.hall(9);
  flat(g, vaultHall, 8, { breakAt: 6.5, look: 'steel' });
  const vault = vaultSide.room(5, 5);
  g.record(...vault.tile(3, 0));
  g.road(...vault.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
