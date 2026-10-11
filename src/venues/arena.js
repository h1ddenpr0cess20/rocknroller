import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { backTile, branch, centre, flat, toBack, wallTile, wash } from './helpers.js';

/**
 * Act 9: The Arena. Twenty thousand seats, and Rock has to go round all of
 * them to get in: through the turnstiles and onto the concourse, a ring
 * round the back of the seating bowl with two ways round it, moving
 * walkways, hot-dog stands and the merch stand, security everywhere. The
 * pass is in the security office off the ring; the vomitory down to the
 * floor is gated. Down on the floor it is the show: moving heads sweeping,
 * the pit in front of the stage, crowd barriers. Out through the players'
 * tunnel, with the pyro on a timer.
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
    name: 'The Arena', act: 9, cols: 130, rows: 130, palette: ARENA, tempo: 120,
    intro: 'Twenty thousand seats. Rock only needs the one.',
    look: {
      theme: 'arena', floor: 'concrete', wall: 'block', lamp: 'bulb', exitSign: 'GIG', ampName: 'ARENA',
      hemi: ['#c8d8ff', '#2a3050', 1.15], key: '#e8f0ff', keyK: 1.15, lantern: '#e8f0ff',
      skyColors: ['#04060e', '#080c1e', '#101838', '#1a2250', '#2a2a68'],
      reflect: RIG, ceiling: '#1a2040',
      rig: { colors: RIG.slice(0, 3), program: 'rainbow', every: 8 },
    },
  });
  const sign = (p, along, text, color, height = 1.5, size = 0.6) => g.light('neon', ...wallTile(p, along), { text, color, height, size });

  // The plaza and the turnstiles: brass posts to thread between, and the scalpers working the line.
  g.room(2, 24, 5, 5, 72, { lamps: 3, floor: 'concrete' });
  g.start = { x: 4, z: 26 };
  const d = digger(g, { x: 7, z: 26, h: 72, heading: '+x' });
  const plaza = d.hall(9, { width: 7 });
  for (const b of [-3, -1, 1, 3]) g.bumper(...plaza.tile(6, b), { radius: 0.4, look: 'rope' });
  g.foe('scalper', ...plaza.tile(3, -2), { range: 5 }).foe('scalper', ...plaza.tile(4, 2), { range: 5 });
  g.pick(...plaza.tile(2, 0), 5).pick(...plaza.tile(5, -2), 5).pick(...plaza.tile(5, 2), 5).pick(...plaza.tile(8, 0), 10);
  sign(plaza, 4, 'ENTRANCE B', TEAM[0], 1.7, 0.6);

  // The concourse: a ring round the back of the bowl, four or five tiles wide, two ways round.
  const ring = d.room(27, 21);
  g.block(...ring.rect(5, 17, -5, 11), 2.4, { prop: 'stands' });
  // Moving walkways along the long sides, carrying you on round whichever way you went.
  g.belt(...ring.rect(7, 13, -9, 3), ring.heading);
  g.belt(...ring.rect(7, 13, 7, 3), ring.heading);
  // Hot-dog stands and the merch stand against the outer wall.
  for (const k of [4, 12, 20]) g.block(...ring.rect(k, 3, ring.back * 10, 1), 0.95, { prop: 'bar' });
  for (const [a, b] of [[2, -7], [24, 7], [24, -7]]) g.pillar(...ring.tile(a, b), 0.62, { prop: 'table' });
  g.foe('security', ...ring.tile(3, 0), { range: 5 }).foe('merch', ...ring.tile(12, -8), { range: 5 }).foe('scalper', ...ring.tile(15, 8), { range: 5 });
  g.foe('mascot', ...ring.tile(23, 0), { range: 5 }).foe('phone', ...ring.tile(8, 8), { range: 5 });
  g.pick(...ring.tile(9, -8), 5).pick(...ring.tile(11, -8), 5).pick(...ring.tile(13, -8), 5).pick(...ring.tile(15, -8), 5);
  g.pick(...ring.tile(9, 8), 5).pick(...ring.tile(11, 8), 5).pick(...ring.tile(13, 8), 5).pick(...ring.tile(15, 8), 5);
  g.road(...ring.tile(25, -9), 50);
  g.tape(...ring.tile(2, 9));
  // Over the middle of each stand; the merch stand's just past its end, where the wall behind it stands tall again past the stock-room door.
  sign(ring, 5, 'HOT DOGS', TEAM[1], 1.6, 0.6);
  sign(ring, 15.5, 'MERCH', RIG[0], 1.6, 0.7);
  sign(ring, 21, 'BEER', RIG[2], 1.6, 0.7);
  g.light('spot', ...centre(ring), { colors: [TEAM[2]], radius: 3, height: 3.4 });
  // Behind the merch stand, through the stock-room door: a record in among the shirts.
  const stock = branch(d, ring, 12, 'back', 11);
  const stockHall = stock.hall(8);
  flat(g, stockHall, 7, { breakAt: 6.5, look: 'steel' });
  const shirts = stock.room(5, 5, { floor: 'carpet' });
  g.record(...shirts.tile(3, 0));
  g.pick(...shirts.tile(1, -1), 10).pick(...shirts.tile(1, 1), 10);
  // The security office, off the front of the ring: the pass, with a bouncer on it.
  const office = branch(d, ring, 20, 'front', 11);
  office.hall(3);
  const desk = office.room(7, 7, { floor: 'carpet' });
  g.pass(...desk.tile(4, 0));
  g.foe('bouncer', ...desk.tile(3, 1), { range: 4 });
  g.block(...desk.rect(1, 3, -3, 1), 0.82, { prop: 'console' });
  g.pick(...desk.tile(5, -2), 10);

  // The vomitory: a gate, and a tunnel of steps down through the seats onto the floor.
  const vom = d.hall(5);
  g.gate(...vom.span(2), { axis: vom.dir[0] ? 'x' : 'z' });
  sign(vom, 3, 'FLOOR', TEAM[0], 1.6, 0.6);
  d.stairs(6, 3.5, { wall: 'block' });
  d.hall(2);

  // The floor: the stage across the far end, crowd barriers, the pit, moving heads sweeping, everybody.
  const floor = d.room(25, 21, { floor: 'panels' });
  const stageAt = 21;
  g.block(...floor.rect(stageAt, 4, floor.lo, 21), 1.2, { prop: 'speaker' });
  // The wings' PA, either end of the stage, turned out to the crowd like the rest.
  for (const k of [0, 20]) g.pillar(...floor.tile(stageAt - 1, floor.lo + k), 1.4, { prop: 'speaker', face: [-floor.dir[0], -floor.dir[1]] });
  g.block(...floor.rect(stageAt - 3, 1, floor.lo, 8), 1.0, { prop: 'barrier' });
  g.block(...floor.rect(stageAt - 3, 1, 3, 8), 1.0, { prop: 'barrier' });
  g.block(...floor.rect(8, 1, -6, 5), 1.0, { prop: 'barrier' });
  g.block(...floor.rect(8, 1, 2, 5), 1.0, { prop: 'barrier' });
  g.foe('mosher', ...floor.tile(11, -3), { range: 6 }).foe('mosher', ...floor.tile(13, 3), { range: 6 }).foe('mosher', ...floor.tile(15, 0), { range: 6 });
  g.foe('security', ...floor.tile(19, -1), { range: 4 }).foe('security', ...floor.tile(5, 6), { range: 5 });
  g.foe('diver', ...floor.tile(14, 0), { path: [floor.tile(10, -6), floor.tile(18, -6), floor.tile(18, 6), floor.tile(10, 6)] });
  g.foe('drone', ...floor.tile(6, 0), { path: [floor.tile(3, -6), floor.tile(3, 6)] });
  g.pick(...floor.tile(3, 0), 10).pick(...floor.tile(10, -8), 10).pick(...floor.tile(10, 8), 10).pick(...floor.tile(16, -5), 10).pick(...floor.tile(16, 5), 10);
  g.lighter(...floor.tile(19, -8)).tape(...floor.tile(19, 8));
  // Between the wash's cans (at 5, 10, 15 and 20), not on top of them, and far enough along that they sweep the floor and not the way in.
  for (const [k, c] of [[6, RIG[0]], [11, RIG[1]], [16, RIG[2]]]) g.light('spot', ...wallTile(floor, k), { colors: [c, RIG[3]], radius: 6, aim: toBack(floor).map((v) => -7 * v), height: 3.2, shift: k });
  g.light('laser', ...floor.tile(stageAt - 1, -6), { colors: [RIG[3]], aim: [-12, 4], height: 2.8 });
  g.light('laser', ...floor.tile(stageAt - 1, 6), { colors: [RIG[0]], aim: [-12, -4], height: 2.8 });
  g.light('strobe', ...floor.tile(stageAt - 1, 0), { colors: ['#ffffff'], reach: 10, height: 1.8 });
  wash(g, floor, RIG, { cans: 4, program: 'chase', every: 2 });
  // Under the stage, past the monitor engineer: the second record.
  const under = branch(d, floor, 18, 'back', 11);
  const crawl = under.hall(8, { floor: 'plate' });
  flat(g, crawl, 7, { breakAt: 6.5, look: 'flat' });
  const den = under.room(5, 5, { floor: 'plate' });
  g.record(...den.tile(3, 0));
  g.road(...den.tile(1, 1), 60);
  // In the camera riser at the back of the floor, along a plank of decking: the third.
  const riser = branch(d, floor, 3, 'back', 11);
  const deck = riser.bridge(6, { floor: 'plate' });
  g.foe('drone', ...deck.tile(3, 0), { path: [deck.tile(0, 0), deck.tile(5, 0)] });
  const cam = riser.room(4, 5, { floor: 'plate' });
  g.record(...cam.tile(2, 0));
  void backTile;

  // The players' tunnel, off the side of the floor by the stage: out, past the pyro on its timer.
  const way = branch(d, floor, 19, 'front', 11);
  const tunnel = way.hall(16, { wall: 'block' });
  for (const [k, off] of [[3, 0], [6, 0.25], [9, 0.5], [12, 0.75]]) {
    const [x, z, w, dd] = tunnel.span(k);
    g.pyro(x, z, { w, d: dd, beats: 4, offset: off });
  }
  g.foe('security', ...tunnel.tile(14, 0), { range: 3 });
  g.pick(...tunnel.tile(1, 0), 5).pick(...tunnel.tile(4, 0), 5).pick(...tunnel.tile(7, 0), 5).pick(...tunnel.tile(10, 0), 5).pick(...tunnel.tile(13, 0), 5);
  way.exit(3);
  return g;
}
