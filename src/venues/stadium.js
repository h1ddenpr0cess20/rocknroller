import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { backTile, branch, centre, flat, toBack, wallTile, wash } from './helpers.js';

/**
 * Act 10: The Stadium. The last night of the tour. Floodlights, a sky
 * full of stars, and a long way down: Rock starts in the gods, at the top
 * of the stands, and comes down the stadium's ramps — three long flights
 * of switchback, fast enough at the bottom to go through a wall. Then the
 * pitch, the biggest floor on the tour, the stands along it, the crowd on
 * it, and the sound-desk tower in the middle (its gate needs the pass from
 * the family stand). The way to the stage is the thrust catwalk, out over
 * the pit; and on the stage, with a flying V and platform boots, the
 * Headliner, who stamps.
 */

export const STADIUM = {
  tiles: ['#9a96a6', '#848092', '#a89870', '#4e9a44', '#767286'],
  walls: ['#6a5a86', '#5a4c76', '#7a5a7a', '#52467a'],
  ambient: [0.95, 0.9, 1.15], lamp: '#fff0d0', trap: '#22182e', lift: '#3a3050', exit: '#ffd23a', zapHue: 0.4, vary: 0.06,
};

const GOLD = '#ffc84a';
const SHOW = ['#ff2d95', '#2de2ff', '#ffd23a', '#7cff3a', '#a23aff'];

export function stadium() {
  const g = new Venue({
    name: 'The Stadium', act: 10, cols: 150, rows: 150, palette: STADIUM, tempo: 128,
    intro: 'Last night of the tour. The rock is the show.',
    look: {
      theme: 'stadium', floor: 'concrete', wall: 'block', lamp: 'bulb', exitSign: 'GIG', ampName: 'HEADLINER', stars: 160,
      hemi: ['#d8d0ff', '#3a2a5a', 1.2], key: '#f0e8ff', keyK: 1.2, lantern: '#fff0d0',
      skyColors: ['#02020a', '#06061a', '#0e0e34', '#1c1a58', '#38206e'],
      reflect: SHOW, ceiling: '#1a1440',
      rig: { colors: SHOW.slice(0, 4), program: 'rainbow', every: 6 },
    },
  });
  const sign = (p, along, text, color, height = 1.6, size = 0.7, more = {}) => g.light('neon', ...wallTile(p, along), { text, color, height, size, ...more });

  // The gods: the top of the stands, the stadium laid out below.
  g.room(2, 4, 5, 5, 96, { lamps: 3 });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 96, heading: '+x' });
  const gods = d.hall(8, { width: 4 });
  g.foe('phone', ...gods.tile(5, 0), { range: 4 });
  g.pick(...gods.tile(2, 0), 5).pick(...gods.tile(3, 1), 5).pick(...gods.tile(6, -1), 5);
  sign(gods, 4, 'GATE 7', GOLD, 1.6, 0.6);

  // The ramps: three long flights, switching back, a landing at each turn.
  const RAMP = { width: 4, wall: 'block' };
  const flights = [];
  const ways = ['+z', '-z', '+z'];
  for (let i = 0; i < ways.length; i++) {
    d.turn(i === 0 ? '+z' : '+x', { width: 4 });
    if (i > 0) {
      d.hall(1, { width: 4 });
      d.turn(ways[i], { width: 4 });
    }
    const ramp = d.ramp(12, 3, RAMP);
    flights.push(ramp);
    g.pick(...ramp.tile(3, 0), 5).pick(...ramp.tile(6, 1), 5).pick(...ramp.tile(9, -1), 5);
  }
  g.foe('scalper', ...flights[0].tile(8, 0), { range: 4 });
  g.foe('drone', ...flights[1].tile(6, 0), { path: [flights[1].tile(1, 0), flights[1].tile(11, 0)] });
  g.foe('merch', ...flights[2].tile(8, 1), { range: 4 });
  // Straight on at the foot of the last flight, with all that speed: through the hoarding, and a record behind it.
  const foot = d.fork();
  const hoarding = foot.hall(7, { width: 4 });
  flat(g, hoarding, 5, { breakAt: 6.5, look: 'flat' });
  const cache = foot.room(5, 6);
  g.record(...cache.tile(3, 0));
  g.road(...cache.tile(1, 1), 70);
  d.turn('+x', { width: 4 });
  d.hall(3, { width: 4 });
  d.stairs(3, 1.5, { width: 4 });

  // The pitch: grass, the crowd, the stands along the back, floodlights, and the sound-desk tower in the middle.
  const pitch = d.room(31, 25, { floor: 'grass', color: 3 });
  g.block(...pitch.rect(3, 25, pitch.lo, 4), 2.4, { prop: 'stands' });
  const tower = pitch.rect(13, 5, 1, 5);
  g.block(tower[0], tower[1], tower[2], 1, 2.6, { wall: 'block' });
  g.block(tower[0], tower[1] + tower[3] - 1, tower[2], 1, 2.6, { wall: 'block' });
  g.block(...pitch.rect(17, 1, 1, 5), 2.6, { wall: 'block' });
  // The tower's gate faces back down the pitch; inside, on the sound desk, the second record.
  g.gate(...pitch.rect(13, 1, 2, 3), { axis: pitch.dir[0] ? 'x' : 'z' });
  g.pillar(...pitch.tile(16, 4), 0.82, { prop: 'console' });
  g.record(...pitch.tile(15, 3));
  for (const [a, b] of [[6, 3], [9, 9], [22, 4], [25, 10]]) g.block(...pitch.rect(a, 1, b, 2), 1.0, { prop: 'barrier' });
  g.foe('mosher', ...pitch.tile(7, 0), { range: 7 }).foe('mosher', ...pitch.tile(11, 8), { range: 7 }).foe('metalhead', ...pitch.tile(20, 2), { range: 7 });
  g.foe('security', ...pitch.tile(19, 9), { range: 6 }).foe('mascot', ...pitch.tile(25, 0), { range: 7 }).foe('influencer', ...pitch.tile(5, 9), { range: 6 });
  g.foe('diver', ...pitch.tile(16, 6), { path: [pitch.tile(8, -1), pitch.tile(26, -1), pitch.tile(26, 11), pitch.tile(8, 11)] });
  g.pick(...pitch.tile(2, 0), 10).pick(...pitch.tile(8, 6), 10).pick(...pitch.tile(12, 11), 10).pick(...pitch.tile(20, -1), 10).pick(...pitch.tile(24, 7), 10);
  g.tape(...pitch.tile(10, 11)).tape(...pitch.tile(28, 11)).lighter(...pitch.tile(28, -2));
  // Floodlights along the front of the pitch, turned in over it, far enough from the ends not to sweep off them.
  for (const k of [5, 15, 25]) g.light('spot', ...pitch.tile(k, 12), { colors: ['#fff6e0'], radius: 5, aim: pitch.across.map((v) => -6 * v), height: 3.6 });
  g.light('laser', ...pitch.tile(30, -1), { colors: [SHOW[3]], aim: [-14, 8], height: 3 });
  g.light('laser', ...pitch.tile(30, 11), { colors: [SHOW[0]], aim: [-14, -8], height: 3 });
  wash(g, pitch, SHOW, { cans: 4, program: 'rainbow', every: 6 });
  // A banner on posts along the top of the back wall, over the stands, facing the pitch.
  sign(pitch, 15, 'LAST NIGHT OF THE TOUR', SHOW[1], 2.6, 0.7, { stand: true });
  // The family stand, off the front of the pitch: the pass, with a bouncer who takes it very seriously.
  const family = branch(d, pitch, 8, 'front', 13);
  family.hall(3);
  const box = family.room(7, 7, { floor: 'carpet' });
  g.pass(...box.tile(4, 0));
  g.foe('bouncer', ...box.tile(3, 1), { range: 4 });
  g.pick(...box.tile(5, -2), 10).pick(...box.tile(5, 2), 10);
  d.hall(2);

  // The thrust: a catwalk out over the pit, live cable all round, pyro either side on the beat.
  const thrust = d.bridge(14, { width: 2, floor: 'plate' });
  g.zap(...thrust.rect(0, 14, thrust.lo - 4, 10), d.h - 1.6, { fill: true });
  for (const k of [4, 9]) {
    const [x, z, w, dd] = thrust.span(k);
    g.pyro(x, z, { w, d: dd, beats: 4, offset: k === 9 ? 0.5 : 0 });
  }
  g.foe('diver', ...thrust.tile(7, 0), { path: [thrust.tile(1, 0), thrust.tile(12, 0)] });
  // Off the side of the thrust, down the camera track: the last record, in the pit camera's dolly.
  const track = branch(d, thrust, 6, 'front', 1);
  const rail = track.bridge(6, { floor: 'plate' });
  void rail;
  const dolly = track.room(4, 4, { floor: 'plate' });
  g.record(...dolly.tile(2, 0));

  // The stage: the size of a block, speaker towers either side, and the Headliner.
  const stage = d.room(21, 19, { floor: 'planks' });
  for (const k of [2, 18]) g.block(...stage.rect(k, 2, stage.back * 8 - (stage.back > 0 ? 1 : 0), 2), 2.0, { prop: 'speaker' });
  g.block(...stage.rect(8, 6, stage.back * 7 - (stage.back > 0 ? 1 : 0), 3), 0.4, { prop: 'drums' });
  for (const k of [5, 15]) g.pillar(...backTile(stage, k), 1.2, { prop: 'amp' });
  g.foe('headliner', ...stage.tile(11, 0), { range: 7 });
  g.foe('roadie', ...stage.tile(18, 6), { range: 4 });
  g.pick(...stage.tile(2, 0), 10).pick(...stage.tile(6, -6), 10).pick(...stage.tile(6, 6), 10).pick(...stage.tile(15, -6), 10).pick(...stage.tile(15, 6), 10);
  g.tape(...stage.tile(4, -5)).tape(...stage.tile(4, 5));
  g.light('strobe', ...wallTile(stage, 10), { colors: ['#ffffff'], reach: 12, height: 2.2 });
  // Either side of the strobe, and clear of the wash's cans (at 4, 8, 13 and 17).
  for (const [k, c] of [[6, SHOW[0]], [11, SHOW[1]], [15, SHOW[2]]]) g.light('spot', ...wallTile(stage, k), { colors: [c, SHOW[4]], radius: 6, aim: toBack(stage).map((v) => -7 * v), height: 3.6, shift: k });
  g.light('laser', ...stage.tile(20, -8), { colors: [SHOW[3]], aim: [-12, 8], height: 3.4 });
  g.light('laser', ...stage.tile(20, 8), { colors: [SHOW[4]], aim: [-12, -8], height: 3.4 });
  wash(g, stage, SHOW, { cans: 4, program: 'rainbow', every: 4 });
  sign(stage, 10, 'ROCK', GOLD, 2.8, 1.4);
  void centre;
  d.hall(2, { floor: 'planks' });
  d.stairs(3, 1.5);
  d.exit(3);
  return g;
}
