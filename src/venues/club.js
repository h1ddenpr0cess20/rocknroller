import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { backTile, barred, branch, centre, flat, toBack, wallTile, wash } from './helpers.js';

/**
 * Act 4: The Club. A basement dance club at two in the morning. It starts
 * in the queue: a velvet rope doubling back and forth along the street,
 * brass posts that throw Rock about, a scalper working the line. Down the
 * stairs is the cloakroom, and then the dance floor — the only mirror ball
 * on the tour, go-go podiums to bounce off, lasers raking the room, the DJ
 * on a riser with a record in the booth behind him. The way across the
 * mosh pit is on the crowd's hands; past it, a bar with the floor sticky
 * in front, the VIP rope (its pass is in the toilets, with a bouncer), and
 * the Promoter's office, where he lunges for his cut.
 */

export const CLUB = {
  tiles: ['#6a4a9a', '#563a86', '#8a4aa8', '#7a5aa6'],
  walls: ['#5a3a8a', '#4a2e7a', '#7a3a90', '#6a4a96'],
  ambient: [0.9, 0.85, 1.05], lamp: '#ff7ad0', trap: '#22182e', lift: '#3a2a52', exit: '#2de2ff', zapHue: 5.3, vary: 0.06,
};

/** The club's colours: hot pink, cyan, violet, acid green. */
const NEON = ['#ff2d95', '#2de2ff', '#a23aff', '#7cff3a'];

export function club() {
  const g = new Venue({
    name: 'The Club', act: 4, cols: 120, rows: 120, palette: CLUB, tempo: 126,
    intro: 'Doors at ten. Nobody told Rock about the dress code.',
    look: {
      theme: 'club', floor: 'panels', wall: 'curtain', lamp: 'par', exitSign: 'OUT', ampName: 'CLUB',
      hemi: ['#d8c4ff', '#4a2a70', 1.15], key: '#ffe8ff', keyK: 1.1, lantern: '#ffd8f4',
      skyColors: ['#06020e', '#0e0620', '#1a0a38', '#2c1058', '#44186a'],
      reflect: NEON, ceiling: '#2a1648',
      rig: { colors: NEON.slice(0, 3), program: 'chase', every: 1 },
    },
  });
  /** A sign on the back wall of a piece, `along` it. */
  const sign = (p, along, text, color, height = 1.5, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });
  const STREET = { wall: 'posters', floor: 'concrete' };
  const rope = (p, along, across = 0) => g.bumper(...p.tile(along, across), { radius: 0.4, look: 'rope' });

  // The street, and the queue: three lengths of it, doubling back, with the rope's posts down the middle.
  g.room(2, 4, 5, 5, 60, { lamps: 3, ...STREET });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 60, heading: '+x' });
  const leg1 = d.hall(12, STREET);
  for (const a of [3, 6, 9]) rope(leg1, a, 0);
  g.pick(...leg1.tile(2, 0), 5).pick(...leg1.tile(4, 1), 5).pick(...leg1.tile(8, -1), 5).pick(...leg1.tile(11, 0), 10);
  g.foe('phone', ...leg1.tile(7, 1), { range: 4 });
  sign(leg1, 4, 'CLUB', NEON[0], 1.6, 0.8);
  sign(leg1, 10, 'NO TRAINERS', NEON[1], 1.5, 0.45);
  // Straight on past where the queue turns, round the back of the bins: a record somebody dropped.
  const bins = d.fork();
  d.turn('+z', STREET);
  bins.hall(7, STREET);
  const binRoom = bins.room(5, 5, STREET);
  g.record(...binRoom.tile(3, 0));
  g.foe('drunk', ...binRoom.tile(1, 1), { range: 3 });
  g.pillar(...binRoom.tile(4, 2), 0.8, { prop: 'case' });
  d.hall(2, STREET);
  d.turn('-x', STREET);
  const leg2 = d.hall(8, STREET);
  for (const a of [2, 5]) rope(leg2, a, 0);
  g.foe('scalper', ...leg2.tile(4, 1), { range: 5 });
  g.pick(...leg2.tile(1, 0), 5).pick(...leg2.tile(3, -1), 5).pick(...leg2.tile(7, 0), 5);
  g.tape(...leg2.tile(6, 1));
  d.turn('+z', STREET);
  const door = d.hall(3, STREET);
  g.foe('hipster', ...door.tile(1, 0), { range: 3 });
  d.stairs(4, 2, { wall: 'curtain' });

  // The cloakroom: racks of coats along the back, and a tip jar's worth of picks.
  const cloak = d.room(7, 9, { floor: 'carpet' });
  for (const k of [1, 3, 5]) g.pillar(...backTile(cloak, k), 1.1, { prop: 'rack' });
  g.pick(...cloak.tile(2, 2), 10).pick(...cloak.tile(4, -2), 10);
  g.foe('hipster', ...cloak.tile(4, 1), { range: 4 });
  d.turn('+x');

  // The dance floor: lit panels, go-go podiums to bounce off, the DJ on a riser against the back wall, the ball over it all.
  const floor = d.room(21, 17, { floor: 'panels' });
  const deck = floor.back * 7 - (floor.back > 0 ? 1 : 0);
  g.block(...floor.rect(8, 6, deck, 2), 0.6, { prop: 'console', face: toBack(floor) });
  for (const k of [5, 15]) g.pillar(...backTile(floor, k), 1.2, { prop: 'speaker' });
  for (const [a, b] of [[5, -3], [10, 2], [15, -3], [7, 4], [13, 5]]) g.bumper(...floor.tile(a, b), { radius: 0.5, look: 'podium' });
  for (const [a, b] of [[2, -6], [19, -6], [2, 6], [19, 6]]) g.pillar(...floor.tile(a, b), 0.62, { prop: 'table' });
  g.foe('influencer', ...floor.tile(4, 0), { range: 6 }).foe('influencer', ...floor.tile(12, -5), { range: 6 });
  g.foe('mosher', ...floor.tile(16, 2), { range: 6 }).foe('hipster', ...floor.tile(9, 6), { range: 6 });
  g.foe('diver', ...floor.tile(10, 0), { path: [floor.tile(4, -5), floor.tile(17, -5), floor.tile(17, 5), floor.tile(4, 5)] });
  g.foe('drone', ...floor.tile(11, 0), { path: [floor.tile(6, 0), floor.tile(15, 0)] });
  g.pick(...floor.tile(3, 3), 10).pick(...floor.tile(8, -2), 10).pick(...floor.tile(12, 0), 10).pick(...floor.tile(18, -2), 10);
  g.road(...floor.tile(19, 0), 50);
  g.light('ball', ...centre(floor), { colors: NEON, radius: 8, height: 3.3 });
  g.light('laser', ...wallTile(floor, 3), { colors: [NEON[3]], aim: [4, -floor.back * 7], height: 2.3 });
  g.light('laser', ...wallTile(floor, 18), { colors: [NEON[0]], aim: [-4, -floor.back * 7], height: 2.3 });
  wash(g, floor, [NEON[0], NEON[2], NEON[1]], { cans: 3, program: 'chase', every: 1 });
  sign(floor, 10, 'DJ ROCK', NEON[3], 1.9, 0.8);
  // Through a curtain off the front of the floor: the DJ's stockroom, and a record in his crate.
  const booth = branch(d, floor, 15, 'front', 8);
  const boothHall = booth.hall(8, { wall: 'curtain' });
  flat(g, boothHall, 7, { breakAt: 6.5, look: 'curtain' });
  const crate = booth.room(5, 5, { floor: 'carpet' });
  g.record(...crate.tile(3, 0));
  g.pick(...crate.tile(1, -1), 10).pick(...crate.tile(1, 1), 10);
  d.hall(2);

  // The mosh pit: no floor to speak of, live cable under it, and the way across is on the crowd's hands.
  const pit = d.ferry(11, { size: 3, period: 8, style: 'crowd' });
  g.zap(...pit.rect(0, 11, pit.lo - 2, 7), d.h - 1.6, { fill: true });
  // Stood down among the cables, tall enough to reach up past the crowd's hands.
  g.light('strobe', ...pit.tile(5, -3), { colors: ['#ffffff'], reach: 9, height: 2.8 });
  d.hall(2);
  d.turn('+z');
  d.stairs(3, 1.2);

  // The bar: the counter down the back, the floor in front of it sticky with what was spilt, the bass bins slamming.
  const bar = d.hall(16, { width: 5, floor: 'checker', wall: 'posters' });
  g.block(...bar.rect(2, 12, bar.back * 2, 1), 0.9, { prop: 'bar' });
  g.sticky(...bar.rect(2, 12, bar.back * 1, 1));
  // The bins come down across the floor in front of the counter, not on it.
  for (const [along, offset] of [[6, 0], [12, 0.5]]) {
    const [x, z, w, dd] = bar.rect(along, 1, bar.back > 0 ? bar.lo : bar.lo + 1, bar.width - 1);
    g.speaker(x, z, { w, d: dd, beats: 4, offset });
  }
  g.foe('drunk', ...bar.tile(3, 0), { range: 4 }).foe('influencer', ...bar.tile(9, -1), { range: 4 });
  g.pick(...bar.tile(7, -1), 5).pick(...bar.tile(7, 0), 5).pick(...bar.tile(7, 1), 5).pick(...bar.tile(14, -1), 10);
  g.lighter(...bar.tile(15, -2));
  sign(bar, 4, 'BAR', NEON[1], 1.6, 0.8);
  sign(bar, 11, 'SHOTS', NEON[0], 1.6, 0.6);
  g.light('par', ...wallTile(bar, 8), { colors: [NEON[2]], program: 'static', glow: 0.8, reach: 7, aim: toBack(bar).map((v) => -3 * v), height: 1.4 });
  // The toilets, off the front of the bar: the VIP pass is in there, and so is a bouncer.
  const loo = branch(d, bar, 9, 'front', 3);
  loo.hall(3);
  const toilets = loo.room(7, 7, { floor: 'checker', wall: 'block' });
  g.pass(...toilets.tile(4, 0));
  g.foe('bouncer', ...toilets.tile(3, 1), { range: 4 });
  g.pick(...toilets.tile(5, -2), 10).tape(...toilets.tile(5, 2));
  d.turn('+x');
  const vip = d.hall(6, { wall: 'curtain', floor: 'carpet' });
  barred(g, vip, 3);
  rope(vip, 1, -1);
  // Past the shutter, over the VIP end: before it the wall is the bar's low one.
  sign(vip, 4, 'VIP', NEON[0], 1.6, 0.8);

  // The office: the promoter, his desk and his safe; tables to put between him and you.
  const office = d.room(17, 15, { floor: 'carpet', wall: 'damask' });
  g.block(...office.rect(11, 4, office.back * 6, 1), 0.82, { prop: 'console' });
  for (const [a, b] of [[4, -3], [4, 3], [9, 0], [13, -4], [13, 4]]) g.pillar(...office.tile(a, b), 0.62, { prop: 'table' });
  g.foe('promoter', ...office.tile(11, 0), { range: 5 });
  g.pick(...office.tile(2, 0), 10).pick(...office.tile(7, -5), 10).pick(...office.tile(7, 5), 10);
  g.tape(...office.tile(2, -5)).tape(...office.tile(2, 5));
  wash(g, office, ['#ffc84a', NEON[0]], { cans: 2, program: 'static' });
  sign(office, 13, 'CASH ONLY', NEON[3], 1.5, 0.5);
  // A plank over a gap to the fire escape, a diver on it: the last record.
  const escape = branch(d, office, 7, 'front', 7);
  const plank = escape.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), escape.h - 1.6, { fill: true });
  g.foe('diver', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const fire = escape.room(5, 5, STREET);
  g.record(...fire.tile(2, 0));
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
