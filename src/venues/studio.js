import { digger } from '../dig.js';
import { Venue } from '../venue.js';
import { across, backTile, barred, branch, facingRot, toBack, wallTile, wash } from './helpers.js';

/**
 * Act 6: The Studio. A recording studio at the hour when everyone has
 * stopped being polite: acoustic foam on the walls, a red light that says
 * ON AIR, racks of gear blinking. Past reception is the long corridor of
 * isolation booths, doors on either side, monitor wedges slamming down on
 * the beat — and what you need is in the booths: two gold records and the
 * pass for the live room. The live room's floor is a chicane of live cable
 * with kick drums to bounce off; the control room is down a floor; and the
 * way out is round and round and down the echo chamber.
 */

export const STUDIO = {
  tiles: ['#6a6a78', '#5a5a68', '#7a6a58', '#4e4e5c'],
  walls: ['#5a5a6a', '#4a4a5a', '#6a5a52', '#42424e'],
  ambient: [0.9, 0.92, 1.05], lamp: '#ffd8a0', trap: '#26262e', lift: '#3a3a48', exit: '#ff3a4a', zapHue: 3.4, vary: 0.06,
};

const LIGHTS = ['#ff3a4a', '#ffb02a', '#2de2ff'];

export function studio() {
  const g = new Venue({
    name: 'The Studio', act: 6, cols: 120, rows: 120, palette: STUDIO, tempo: 100,
    intro: 'Take one. Take two. Take forty-one. Rock is a perfectionist.',
    look: {
      theme: 'studio', floor: 'carpet', wall: 'foam', lamp: 'bulb', exitSign: 'GIG', ampName: 'STUDIO',
      hemi: ['#d0d8f0', '#3a3446', 1.05], key: '#fff4e4', keyK: 1.1, lantern: '#ffe8c8',
      skyColors: ['#06060e', '#0c0c1c', '#14142c', '#1e1c3c', '#2c2448'],
      reflect: LIGHTS, ceiling: '#26283a',
      rig: { colors: [LIGHTS[2], LIGHTS[0]], program: 'pulse', every: 4 },
    },
  });
  const sign = (p, along, text, color, height = 1.5, size = 0.7) => g.light('neon', ...wallTile(p, along), { text, color, height, size });

  // Reception: gold records on the wall, and a receptionist who is in no way impressed.
  g.room(2, 4, 5, 5, 60, { lamps: 3, wall: 'posters', floor: 'carpet' });
  g.start = { x: 4, z: 6 };
  const d = digger(g, { x: 7, z: 6, h: 60, heading: '+x' });
  const lobby = d.hall(6, { wall: 'posters', floor: 'carpet' });
  g.pick(...lobby.tile(2, 0), 5).pick(...lobby.tile(4, 0), 5);
  sign(lobby, 3, 'STUDIO A', LIGHTS[1], 1.6, 0.8);
  d.turn('+z', { wall: 'posters', floor: 'carpet' });
  d.stairs(3, 1.5);

  // The booth corridor: long, foam all the way, wedges slamming down, and a booth off it every few steps.
  const hall = d.hall(30, { floor: 'carpet' });
  g.speaker(...across(hall, 9, { beats: 4 }));
  g.speaker(...across(hall, 20, { beats: 4, offset: 0.5 }));
  g.foe('critic', ...hall.tile(4, 0), { range: 4 }).foe('suit', ...hall.tile(15, 0), { range: 4 }).foe('hipster', ...hall.tile(26, 0), { range: 4 });
  g.pick(...hall.tile(2, 0), 5).pick(...hall.tile(11, 0), 5).pick(...hall.tile(13, 0), 5).pick(...hall.tile(22, 0), 5).pick(...hall.tile(24, 0), 5);
  // Over each of the wedges, shining down the middle of the corridor where it comes down.
  const down = toBack(hall).map((v) => -2 * v);
  g.light('par', ...wallTile(hall, 9), { colors: [LIGHTS[0]], program: 'pulse', aim: down, glow: 0.8, reach: 7, height: 1.4 });
  g.light('par', ...wallTile(hall, 20), { colors: [LIGHTS[0]], program: 'pulse', aim: down, glow: 0.8, reach: 7, height: 1.4, shift: 2 });
  /**
   * A booth off the corridor, `along` it, on `which` side: a short way in and
   * a small foam room. Its sign is on the corridor's back wall, the tall one:
   * across from the door of a booth on the front, beside it at `signAt` for
   * one on the back, whose door is through that wall.
   */
  const booth = (along, which, label, color, signAt = along) => {
    const b = branch(d, hall, along, which, 2);
    b.hall(2, { floor: 'carpet' });
    const room = b.room(5, 5, { floor: 'carpet' });
    sign(hall, signAt, label, color, 1.4, 0.45);
    return room;
  };
  const a = booth(5, 'back', 'BOOTH A', LIGHTS[2], 2);
  g.record(...a.tile(3, 0));
  g.pillar(...a.tile(4, 1), 0.9, { prop: 'amp' });
  const bb = booth(13, 'front', 'BOOTH B', LIGHTS[1]);
  g.pass(...bb.tile(3, 0));
  g.foe('security', ...bb.tile(2, 1), { range: 3 });
  const c = booth(18, 'back', 'BOOTH C', LIGHTS[2], 22);
  g.road(...c.tile(3, 0), 50);
  g.foe('drum', ...c.tile(2, 0), { path: [c.tile(1, -1), c.tile(3, -1), c.tile(3, 1), c.tile(1, 1)] });
  const dd = booth(25, 'front', 'VOX', LIGHTS[0]);
  g.record(...dd.tile(3, 0));
  g.foe('critic', ...dd.tile(2, -1), { range: 3 });
  g.tape(...dd.tile(1, 1));
  const door = d.hall(4, { floor: 'carpet' });
  barred(g, door, 2);
  // Beside the studio door, this side of it.
  sign(door, 0, 'ON AIR', LIGHTS[0], 1.6, 0.8);
  d.hall(5, { floor: 'carpet' });
  d.turn('+x');

  // The live room: kit and amps along the back, a chicane of live cable, kick drums on their sides to bounce off.
  // The gear stands between the runs of cable (at 5, 10 and 15), not on them.
  const live = d.room(21, 15, { floor: 'planks' });
  const deck = live.back * 6 - (live.back > 0 ? 1 : 0);
  g.block(...live.rect(17, 4, deck, 2), 0.35, { prop: 'drums' });
  for (const k of [2, 4, 7, 9]) g.pillar(...backTile(live, k), 1.0, { prop: 'amp' });
  for (const k of [12, 13]) g.pillar(...backTile(live, k), 1.1, { prop: 'rack' });
  // Cable: whole-width runs with a gap to get through, each on the other side from the last.
  const run = (along, gapAcross) => {
    const lo = live.lo, hi = lo + live.width;
    const left = gapAcross - 2, right = gapAcross + 2;
    if (left > lo) g.zap(...live.rect(along, 2, lo, left - lo), live.h);
    if (hi > right) g.zap(...live.rect(along, 2, right, hi - right), live.h);
  };
  run(5, 4);
  run(10, -4);
  run(15, 4);
  for (const [al, ac] of [[7, 0], [8, 4], [12, -1], [13, 3]]) g.bumper(...live.tile(al, ac), { radius: 0.55, look: 'drum' });
  g.foe('critic', ...live.tile(2, -2), { range: 5 }).foe('suit', ...live.tile(8, -4), { range: 5 });
  g.foe('hipster', ...live.tile(13, -5), { range: 5 }).foe('influencer', ...live.tile(18, 2), { range: 5 });
  g.pick(...live.tile(2, 4), 10).pick(...live.tile(7, -5), 10).pick(...live.tile(12, 5), 10).pick(...live.tile(17, -4), 10);
  g.lighter(...live.tile(19, 6));
  wash(g, live, [LIGHTS[2], LIGHTS[1]], { cans: 4, program: 'chase', every: 4 });
  sign(live, 3, 'REC', LIGHTS[0], 1.5, 0.9);
  d.hall(2);
  // Down a floor to the control room, on the gear lift.
  d.shaft(2.5, { size: 3, period: 8 });
  d.hall(2);

  // The control room: the desk across the back, racks, and the people who say "love it, but".
  const control = d.room(15, 13, { wall: 'plywood' });
  g.block(...control.rect(4, 7, control.back * 5 - (control.back > 0 ? 1 : 0), 2), 0.82, { prop: 'console' });
  for (const k of [1, 2, 12, 13]) g.pillar(...backTile(control, k), 1.1, { prop: 'rack' });
  for (const [al, ac] of [[4, 2], [10, -1]]) g.pillar(...control.tile(al, ac), 0.8, { prop: 'seat', rot: facingRot(toBack(control)) });
  g.foe('suit', ...control.tile(4, -1), { range: 6 }).foe('critic', ...control.tile(9, 3), { range: 6 }).foe('suit', ...control.tile(12, -3), { range: 6 });
  g.pick(...control.tile(2, 3), 10).pick(...control.tile(7, -2), 10).pick(...control.tile(11, 4), 10);
  g.tape(...control.tile(13, 4));
  wash(g, control, [LIGHTS[2], LIGHTS[0]], { cans: 3, program: 'pulse', every: 2 });
  sign(control, 7, 'ON AIR', LIGHTS[0], 1.6, 0.9);
  d.hall(2);
  d.turn('+z');

  // The echo chamber: a stairwell zig-zagging down, a flight each way, a landing at every turn.
  const STAIRWELL = { wall: 'block', floor: 'concrete' };
  d.turn('+z', STAIRWELL);
  const flights = [];
  for (const [i, way] of [['+z', 0], ['-z', 1], ['+z', 2]].map(([h], i) => [i, h])) {
    if (i > 0) {
      d.turn('+x', STAIRWELL);
      d.hall(1, STAIRWELL);
      d.turn(way, STAIRWELL);
    }
    const top = d.hall(2, STAIRWELL);
    flights.push(top);
    g.pick(...top.tile(1, 0), 5);
    d.stairs(4, 1.4, STAIRWELL);
  }
  g.foe('critic', ...flights[1].tile(0, 0), { range: 3 });
  g.foe('drum', ...flights[2].tile(0, 0), { path: [flights[2].tile(0, -1), flights[2].tile(1, -1), flights[2].tile(1, 1), flights[2].tile(0, 1)] });
  const out = d.hall(6, STAIRWELL);
  g.foe('suit', ...out.tile(3, 0), { range: 3 });
  g.tape(...out.tile(1, 0));
  // Off the bottom of the stairwell, across the reverb plate's catwalk: the last record.
  const plate = branch(d, out, 3, 'front', 2);
  const walk = plate.bridge(6);
  g.zap(...walk.rect(0, 6, walk.lo - 2, 5), plate.h - 1.6, { fill: true });
  const end = plate.room(4, 4, { wall: 'block', floor: 'plate' });
  g.record(...end.tile(2, 0));
  d.exit(3);
  return g;
}
