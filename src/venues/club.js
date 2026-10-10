import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, centre, flat, wallTile, wash } from './helpers.js';

/**
 * Act 4: The Club. A basement dance club at two in the morning: a lit
 * dance floor, drapes, a mirror ball over the middle of it, lasers raking
 * the room and strobes in the corridors. The people are the ones you get
 * at a club — stage divers with nobody to catch them, influencers filming
 * the lights, a hipster who knew the DJ before — and the way across the
 * mosh pit is on the crowd's hands. There is a velvet-rope lounge at the
 * back with a gate, and a promoter in the office behind it.
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
    name: 'The Club', act: 4, cols: 150, rows: 150, palette: CLUB, tempo: 126,
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

  // The street, and the queue.
  g.room(2, 4, 5, 5, 50, { lamps: 3, wall: 'posters', floor: 'concrete' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 50, heading: '+x' });
  const queue = d.hall(12, { wall: 'posters', floor: 'concrete' });
  g.foe('scalper', ...queue.tile(7, 0), { range: 5 });
  g.pick(...queue.tile(3, 0), 5).pick(...queue.tile(4, 1), 5).pick(...queue.tile(5, -1), 5).pick(...queue.tile(10, 0), 10);
  sign(queue, 4, 'CLUB', NEON[0], 1.6, 0.8);
  sign(queue, 9, 'LIVE', NEON[1], 1.5, 0.6);
  d.turn('+z', { wall: 'posters', floor: 'concrete' });
  const down = d.hall(3, { wall: 'posters', floor: 'concrete' });
  g.tape(...down.tile(1, 0));
  d.stairs(4, 2, { wall: 'curtain' });

  // The dance floor: a lit floor, tables round the edge, the DJ against the back wall, and a ball over it all.
  const floor = d.room(19, 15, { floor: 'panels' });
  const deck = floor.back * 6 - (floor.back > 0 ? 1 : 0);
  g.block(...floor.rect(7, 6, deck, 2), 0.9, { prop: 'bar', rot: floor.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (const k of [1, 3, 14, 16]) g.pillar(...backTile(floor, k), 1.0, { prop: 'amp', rot: floor.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (const [a, b] of [[3, -4], [6, 4], [11, -5], [14, 4]]) g.pillar(...floor.tile(a, b * (floor.back > 0 ? 1 : 1)), 0.62, { prop: 'table' });
  g.foe('influencer', ...floor.tile(4, -2), { range: 6 }).foe('influencer', ...floor.tile(9, 2), { range: 6 });
  g.foe('hipster', ...floor.tile(13, -3), { range: 6 }).foe('mosher', ...floor.tile(15, 3), { range: 6 });
  g.foe('diver', ...floor.tile(8, 0), { path: [floor.tile(4, -4), floor.tile(12, -4), floor.tile(12, 4), floor.tile(4, 4)] });
  g.foe('ball', ...floor.tile(10, 0), { path: [floor.tile(6, 0), floor.tile(14, 0)] });
  g.pick(...floor.tile(2, 3), 10).pick(...floor.tile(7, -3), 10).pick(...floor.tile(12, 2), 10).pick(...floor.tile(16, -4), 10);
  g.road(...floor.tile(17, 5), 50);
  g.light('ball', ...centre(floor), { colors: NEON, radius: 9, height: 3.3 });
  g.light('laser', ...wallTile(floor, 4), { colors: [NEON[3]], aim: [3, -floor.back * 6], height: 2.3 });
  g.light('laser', ...wallTile(floor, 14), { colors: [NEON[0]], aim: [-3, -floor.back * 6], height: 2.3 });
  g.light('strobe', ...wallTile(floor, 9), { colors: ['#ffffff'], reach: 10, height: 1.3 });
  wash(g, floor, [NEON[0], NEON[2], NEON[1]], { cans: 4, program: 'chase', every: 1 });
  sign(floor, 3, 'DANCE', NEON[1], 1.5, 0.8);
  sign(floor, 16, 'DJ', NEON[3], 1.5, 0.9);
  // Off the front of the floor, behind a sheet of ply: the first record, in the cloakroom.
  const cloak = branch(d, floor, 6);
  const cloakHall = cloak.hall(9, { wall: 'posters' });
  flat(g, cloakHall, 8, { breakAt: 6.5, look: 'flat' });
  const coats = cloak.room(5, 5);
  g.record(...coats.tile(3, 0));
  g.pick(...coats.tile(1, -1), 10).pick(...coats.tile(1, 1), 10);
  d.hall(4);
  d.turn('+x');

  // The strobe corridor: speakers coming down on the beat, in the flashing.
  const strobes = d.hall(15);
  g.speaker(...across(strobes, 5, { beats: 4 }));
  g.speaker(...across(strobes, 10, { beats: 4, offset: 0.5 }));
  g.light('strobe', ...wallTile(strobes, 2), { colors: ['#ffffff'], reach: 8, height: 1.3 });
  g.light('strobe', ...wallTile(strobes, 12), { colors: ['#ffffff'], reach: 8, height: 1.3, shift: 2 });
  wash(g, strobes, [NEON[0], NEON[1]], { cans: 2, program: 'pulse', every: 1 });
  g.pick(...strobes.tile(6, 0), 5).pick(...strobes.tile(6, 1), 5).pick(...strobes.tile(6, -1), 5).pick(...strobes.tile(13, 0), 10);
  g.tape(...strobes.tile(14, 0));
  d.hall(3);

  // The mosh pit: no floor to speak of, live cable under it, and the way across is on the crowd's hands.
  d.hall(3, { width: 3 });
  const pit = d.ferry(11, { size: 3, period: 8, style: 'crowd' });
  g.zap(...pit.rect(0, 11, pit.lo - 2, 7), d.h - 1.6, { fill: true });
  d.hall(3);

  // The lounge: a velvet rope, security on the sofas, a gate to the office, and the pass in the cloak of the DJ's room.
  const lounge = d.room(15, 13, { floor: 'carpet' });
  for (const [a, b] of [[3, -4], [3, 4], [8, -5], [8, 5], [12, 4]]) g.pillar(...lounge.tile(a, b), 0.62, { prop: 'table' });
  for (const k of [2, 6, 10]) g.pillar(...backTile(lounge, k), 1.0, { prop: 'case', rot: lounge.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  g.foe('security', ...lounge.tile(5, 0), { range: 6 }).foe('influencer', ...lounge.tile(9, 3), { range: 6 }).foe('hipster', ...lounge.tile(11, -3), { range: 6 });
  g.pick(...lounge.tile(2, 0), 10).pick(...lounge.tile(7, -3), 10).pick(...lounge.tile(10, 5), 10);
  g.lighter(...lounge.tile(13, -5));
  wash(g, lounge, [NEON[2], NEON[0]], { cans: 3, program: 'chase', every: 2 });
  g.light('ball', ...centre(lounge), { colors: [NEON[2], NEON[0], NEON[1]], radius: 6, height: 2.8 });
  sign(lounge, 7, 'VIP', NEON[0], 1.6, 0.9);
  // The pass is in the green room off the lounge; a bouncer stands on it.
  const green = branch(d, lounge, 7, 'front', 7);
  green.hall(3);
  const greenRoom = green.room(7, 7);
  g.pass(...greenRoom.tile(4, 0));
  g.foe('bouncer', ...greenRoom.tile(3, 1), { range: 5 });
  g.pick(...greenRoom.tile(5, -2), 10);
  // And the second record is over a gap on a plank, past a diver with nowhere to land.
  const plankSide = branch(d, lounge, 12, 'back', 7);
  plankSide.hall(2);
  const plank = plankSide.bridge(7);
  g.zap(...plank.rect(0, 7, plank.lo - 2, 5), plankSide.h - 1.6, { fill: true });
  g.foe('diver', ...plank.tile(3, 0), { path: [plank.tile(1, 0), plank.tile(5, 0)] });
  const booth = plankSide.room(5, 5);
  g.record(...booth.tile(2, 0));
  d.hall(4);
  const rope = d.hall(6);
  barred(g, rope, 3);
  d.turn('+z');
  d.stairs(3, 1.5);

  // The back office: the promoter, and a ply door across a side room with the last record.
  const office = d.room(19, 15);
  for (const k of [2, 6, 10, 14]) g.pillar(...backTile(office, k), 1.0, { prop: 'amp', rot: office.back > 0 ? Math.PI / 2 : -Math.PI / 2 });
  g.foe('promoter', ...office.tile(12, 0), { range: 3 });
  g.pick(...office.tile(2, 3), 10).pick(...office.tile(5, 0), 10).pick(...office.tile(8, -4), 10);
  g.tape(...office.tile(3, -5)).tape(...office.tile(3, 5));
  wash(g, office, [NEON[1], NEON[3]], { cans: 3, program: 'chase', every: 2 });
  sign(office, 5, 'OFFICE', NEON[2], 1.5, 0.6);
  const safe = branch(d, office, 6);
  const safeHall = safe.hall(9);
  flat(g, safeHall, 8, { breakAt: 6.5, look: 'steel' });
  const vault = safe.room(5, 5);
  g.record(...vault.tile(3, 0));
  g.road(...vault.tile(1, 1), 70);
  d.hall(3);
  d.stairs(3, 1.5);
  d.hall(2);
  d.exit(3);
  return g;
}
