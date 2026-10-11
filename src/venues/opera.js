import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { backTile, branch, centre, facingRot, flat, frontHeading, toBack, wallTile, wash } from './helpers.js';

/**
 * Act 7: The Opera House. Red velvet, gold leaf, damask on the walls and
 * chandeliers. Up the portico steps to the foyer, under the great
 * chandelier, and down the grand staircase; along the dress circle, a
 * balcony with nothing in front of it but the dark, an opera box at the
 * back with a record in it; then down into the stalls, raked toward the
 * stage, a slalom between the rows with the ushers in the aisles and
 * someone's loosened the chains on the little chandeliers over them. One
 * plank over the orchestra pit, and on the stage, conducting on the beat,
 * the Maestro.
 */

export const OPERA = {
  tiles: ['#9a3040', '#842838', '#b08a4a', '#7a2a3a'],
  walls: ['#8a3040', '#722838', '#a67a44', '#642234'],
  ambient: [1.05, 0.9, 0.9], lamp: '#ffd890', trap: '#2a1a1e', lift: '#5a3a30', exit: '#ffc84a', zapHue: 1.2, vary: 0.05,
};

const GOLD = '#ffc84a';
const WARM = ['#ffd890', '#ff8a5a', '#ffc84a'];

export function opera() {
  const g = new Venue({
    name: 'The Opera House', act: 7, cols: 130, rows: 120, palette: OPERA, tempo: 88,
    intro: 'Please silence your rock.',
    look: {
      theme: 'theatre', floor: 'carpet', wall: 'damask', lamp: 'bulb', exitSign: 'GIG', ampName: 'OPERA', crusher: 'chandelier',
      hemi: ['#ffe0c8', '#5a2a30', 1.15], key: '#fff0e0', keyK: 1.1, lantern: '#ffe0b0',
      skyColors: ['#0c0408', '#18080e', '#2a0c14', '#40121c', '#5a1a24'],
      reflect: WARM, ceiling: '#3a1620',
      rig: { colors: WARM, program: 'chase', every: 4 },
    },
  });
  const MARBLE = { floor: 'checker', wall: 'damask' };

  // The portico: steps up from the street between the columns.
  g.room(2, 8, 5, 5, 80, { lamps: 3, ...MARBLE });
  g.start = { x: 4, z: 10 };
  const d = digger(g, { x: 7, z: 10, h: 80, heading: '+x' });
  const portico = d.hall(7, { width: 5, ...MARBLE });
  for (const a of [1, 3, 5]) for (const b of [-2, 2]) g.pillar(...portico.tile(a, b), 2.0, { wall: 'block' });
  g.pick(...portico.tile(2, 0), 5).pick(...portico.tile(4, 0), 5).pick(...portico.tile(6, 0), 5);

  // The foyer: marble, a champagne bar, ushers, and the great chandelier.
  const foyer = d.room(13, 15, MARBLE);
  g.block(...foyer.rect(3, 7, foyer.back * 6, 1), 0.9, { prop: 'bar' });
  for (const [a, b] of [[3, -3], [3, 3], [9, -3], [9, 3]]) g.pillar(...foyer.tile(a, b), 2.2, { wall: 'block' });
  g.foe('usher', ...foyer.tile(6, -4), { range: 6 }).foe('critic', ...foyer.tile(5, 4), { range: 6 }).foe('suit', ...foyer.tile(10, 0), { range: 5 });
  g.pick(...foyer.tile(2, 0), 10).pick(...foyer.tile(6, 0), 10).pick(...foyer.tile(11, -5), 10).pick(...foyer.tile(11, 5), 10);
  g.light('chandelier', ...centre(foyer), { height: 3.4, radius: 4 });
  g.light('neon', ...wallTile(foyer, 6), { text: 'TONIGHT: ROCK', color: GOLD, height: 1.7, size: 0.5 });
  // The grand staircase: wide, and a long way down.
  const grand = d.stairs(6, 3, { width: 9, ...MARBLE });
  g.pick(...grand.tile(2, -3), 5).pick(...grand.tile(2, 3), 5);
  d.hall(2, { width: 9, ...MARBLE });
  d.turn('+z', { width: 3 });

  // The dress circle: a balcony along the auditorium, the dark in front of it; seats along the back.
  const circle = d.ledge(22, { width: 3, wallTex: 'damask' });
  for (const [from, n] of [[1, 5], [8, 4], [15, 5]]) g.block(...circle.rect(from, n, circle.back, 1), 0.8, { prop: 'seat', rot: facingRot(toBack(circle).map((v) => -v)) });
  g.foe('usher', ...circle.tile(6, 0), { range: 4, path: [circle.tile(2, 0), circle.tile(12, 0)] });
  g.foe('critic', ...circle.tile(18, 0), { range: 4 });
  g.pick(...circle.tile(4, 0), 5).pick(...circle.tile(10, 0), 5).pick(...circle.tile(13, 0), 5).pick(...circle.tile(20, 0), 10);
  // Out over the auditorium in front of the balcony, level with it.
  g.light('chandelier', ...circle.tile(11, -circle.back * 4), { height: 2.6, floor: circle.h, radius: 3, reach: 7 });
  // Box 5, at the back of the circle, behind its curtain: the first record.
  const box = branch(d, circle, 7, 'back', 2);
  const boxDoor = box.hall(6, { wall: 'damask' });
  flat(g, boxDoor, 5, { breakAt: 4, look: 'curtain' });
  const box5 = box.room(5, 5, { wall: 'damask' });
  g.record(...box5.tile(3, 0));
  // A row of chairs across the back of the box, looking out through the curtain.
  g.block(...box5.rect(4, 1, -1, 3), 0.8, { prop: 'seat', rot: facingRot(box5.dir.map((v) => -v)) });
  g.light('neon', ...wallTile(boxDoor, 2), { text: 'BOX 5', color: GOLD, height: 1.5, size: 0.4 });
  d.stairs(4, 2, MARBLE);
  d.hall(5, MARBLE);
  d.turn('+x', MARBLE);

  // The stalls: raked down toward the stage in shallow steps, the rows across it with an aisle in each that is never where the last one was.
  // Stepped, a shallow tread a tile deep, so every row of seats stands level.
  const stalls = d.stairs(20, 3.5, { width: 13, floor: 'carpet', wall: 'damask', color: 0 });
  // Wall the top of the rake where the landing doesn't meet it.
  g.enclose(stalls.x, stalls.z, stalls.w, stalls.d, { sides: 'x0', wall: 'damask' });
  const rows = [[3, -4], [6, 3], [9, -1], [12, 4], [15, -4], [18, 1]];
  for (const [along, aisle] of rows) {
    const lo = stalls.lo, hi = lo + stalls.width;
    const left = aisle - 1, right = aisle + 2;
    if (left > lo) g.block(...stalls.rect(along, 1, lo, left - lo), 0.7, { prop: 'seat', rot: facingRot(stalls.dir) });
    if (hi > right) g.block(...stalls.rect(along, 1, right, hi - right), 0.7, { prop: 'seat', rot: facingRot(stalls.dir) });
  }
  // Chandeliers on loose chains over three of the aisles, coming down on the beat.
  for (const [i, [along, aisle]] of [[0, rows[1]], [1, rows[3]], [2, rows[5]]]) g.speaker(...stalls.tile(along + 1, aisle), { w: 2, d: 2, beats: 4, offset: i * 0.33 });
  g.foe('usher', ...stalls.tile(4, 0), { range: 4 }).foe('usher', ...stalls.tile(10, 2), { range: 4 }).foe('critic', ...stalls.tile(14, -2), { range: 4 });
  g.foe('suit', ...stalls.tile(17, 3), { range: 4 });
  for (const [along, aisle] of rows) g.pick(...stalls.tile(along - 1, aisle), 10);
  g.tape(...stalls.tile(10, -5)).lighter(...stalls.tile(16, 5));
  wash(g, stalls, WARM, { cans: 3, program: 'chase', every: 4 });

  // The orchestra pit: one plank across, the cables of forty musicians live beneath it.
  d.hall(1, { width: 13, floor: 'planks', wall: 'damask' });
  const pit = d.bridge(7, { width: 1, floor: 'planks' });
  g.zap(...pit.rect(0, 7, pit.lo - 5, 11), d.h - 1.4, { fill: true });
  g.block(...pit.rect(2, 3, -4, 2), 0.88, { prop: 'piano' });
  g.light('par', ...pit.tile(3, 4), { colors: [GOLD], program: 'static', aim: [0, -4], height: 1.0, glow: 0.6, reach: 5 });

  // The stage: boards, the backdrop, the grand piano, and the Maestro.
  const stage = d.room(19, 15, { floor: 'planks', wall: 'curtain' });
  // Upstage, clear of the cases and of the ladder up to the flies.
  g.block(...stage.rect(8, 4, stage.back * 6 - (stage.back > 0 ? 1 : 0), 2), 0.88, { prop: 'piano' });
  for (const [a, b] of [[4, -5], [4, 5], [14, -5], [14, 5]]) g.pillar(...stage.tile(a, b), 0.8, { prop: 'case' });
  g.foe('maestro', ...stage.tile(11, 0), { range: 6 });
  g.foe('usher', ...stage.tile(16, 5), { range: 4 });
  g.pick(...stage.tile(2, 0), 10).pick(...stage.tile(7, -5), 10).pick(...stage.tile(7, 5), 10).pick(...stage.tile(12, -5), 10);
  g.tape(...stage.tile(2, -5)).tape(...stage.tile(2, 5));
  g.light('chandelier', ...centre(stage), { height: 3.6, radius: 4.5 });
  wash(g, stage, ['#ffd890', '#ff8a5a'], { cans: 3, program: 'static' });
  g.light('spot', ...wallTile(stage, 9), { colors: ['#fff4e0'], radius: 3, aim: toBack(stage).map((v) => -4 * v), height: 2.4 });
  // Under the stage, through a trap the prompter left open: the second record.
  const trap = branch(d, stage, 5, 'front', 7);
  const prompt = trap.hall(8, { wall: 'block', floor: 'planks' });
  flat(g, prompt, 7, { breakAt: 6.5, look: 'wood' });
  const under = trap.room(5, 5, { wall: 'block', floor: 'planks' });
  g.record(...under.tile(3, 0));
  g.road(...under.tile(1, 1), 60);
  // Up in the flies, along a catwalk over the dark: the third.
  const flies = branch(d, stage, 15, 'back', 7);
  const catwalk = flies.bridge(8, { floor: 'plate' });
  g.foe('usher', ...catwalk.tile(4, 0), { path: [catwalk.tile(1, 0), catwalk.tile(6, 0)] });
  const loft = flies.room(4, 5, { wall: 'block', floor: 'plate' });
  g.record(...loft.tile(2, 0));
  void backTile; void frontHeading;
  d.hall(3, { wall: 'curtain', floor: 'planks' });
  d.stairs(3, 1.5, { wall: 'block' });
  d.exit(3);
  return g;
}
